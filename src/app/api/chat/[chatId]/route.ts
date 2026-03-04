/**
 * src/app/api/chat/[chatId]/route.ts
 *
 * GET  /api/chat/:chatId        — メッセージ一覧取得
 * POST /api/chat/:chatId        — メッセージ送信
 *
 * セキュリティ対応:
 * - [SECURITY FIX #6] chatId をサーバー側でホワイトリスト検証
 * - [SECURITY FIX #7] メッセージ長をサーバー側でも検証
 * - [SECURITY FIX #4] sender_name はセッションの agentId から取得（クライアント値は無視）
 * - 認証必須（getAuthUser で検証）
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getDb, query, execute } from "@/lib/db";
import { ALLOWED_CHAT_CHANNELS, MAX_CHAT_MESSAGE_LENGTH } from "@/lib/constants";
import { sanitizeMultilineText } from "@/lib/sanitize";
import { loadRules } from "@/lib/rule-engine";

interface AnomalyRule {
  id: string; name: string; triggerType: "keyword"|"flag"|"action"|"score_threshold";
  triggerValue: string; delta: number; maxPerDay: number;
  effectStatusThreshold: number; effectStatusChange: string;
  notifyAdminThreshold: number; notifyMessage: string;
}

async function ensureAnomalyLogs(db: ReturnType<typeof getDb>) {
  await execute(db, `CREATE TABLE IF NOT EXISTS anomaly_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    rule_id    TEXT NOT NULL,
    delta      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
}

async function applyAnomalyRules(db: ReturnType<typeof getDb>, userId: string, text: string) {
  try {
    await ensureAnomalyLogs(db);
    const rules = await loadRules<AnomalyRule>("anomaly_rule");
    const keywordRules = rules.filter(r => r.triggerType === "keyword" && r.delta !== 0);
    if (keywordRules.length === 0) return;

    const lower = text.toLowerCase();
    let totalDelta = 0;

    for (const rule of keywordRules) {
      const patterns = rule.triggerValue.split("|").map(k => k.trim()).filter(Boolean);
      if (!patterns.some(p => lower.includes(p.toLowerCase()))) continue;

      if (rule.maxPerDay > 0) {
        const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString().replace("T"," ").slice(0,19);
        const cnt = await query<{ cnt: number }>(db,
          "SELECT COUNT(*) as cnt FROM anomaly_logs WHERE user_id=? AND rule_id=? AND created_at>?",
          [userId, rule.id, oneDayAgo]
        ).catch(() => [] as { cnt: number }[]);
        if ((cnt[0]?.cnt || 0) >= rule.maxPerDay) continue;
      }

      totalDelta += rule.delta;
      await execute(db,
        `INSERT INTO anomaly_logs (user_id, rule_id, delta, created_at) VALUES (?,?,?,datetime('now'))`,
        [userId, rule.id, rule.delta]
      ).catch(() => {});
    }

    if (totalDelta === 0) return;

    await execute(db,
      `UPDATE users SET anomaly_score = MAX(0, MIN(100, anomaly_score + ?)) WHERE id=?`,
      [totalDelta, userId]
    ).catch(() => {});

    // スコア閾値によるステータス変更
    const thresholdRules = rules.filter(r => r.triggerType === "score_threshold" && r.effectStatusThreshold > 0 && r.effectStatusChange);
    if (thresholdRules.length > 0) {
      const rows = await query<{ anomaly_score: number }>(db,
        "SELECT anomaly_score FROM users WHERE id=?", [userId]
      ).catch(() => [] as { anomaly_score: number }[]);
      const score = rows[0]?.anomaly_score || 0;
      for (const tr of thresholdRules.sort((a,b) => b.effectStatusThreshold - a.effectStatusThreshold)) {
        if (score >= tr.effectStatusThreshold && tr.effectStatusChange) {
          await execute(db, "UPDATE users SET status=? WHERE id=?", [tr.effectStatusChange, userId]).catch(()=>{});
          break;
        }
      }
    }
  } catch { /* anomaly rules are non-critical */ }
}

// ── チャンネルアクセス権チェック ─────────────────────────────────
function canAccessChannel(chatId: string, userDivision: string): boolean {
  if (!ALLOWED_CHAT_CHANNELS.has(chatId)) return false;
  // 部門チャンネルは所属部門のみアクセス可
  if (chatId.startsWith("division_")) {
    const divisionSuffix = chatId.replace("division_", "");
    return userDivision === divisionSuffix;
  }
  return true;
}

// ── GET: メッセージ一覧 ──────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { chatId } = await params;

  // [SECURITY FIX #6] chatId ホワイトリスト検証
  if (!canAccessChannel(chatId, user.division)) {
    return forbidden("このチャンネルにはアクセスできません");
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit") ?? "50";
  const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 50));

  const db = getDb();
  const messages = await query<{
    id: number; sender_id: string; sender_name: string;
    text: string; type: string; created_at: string;
  }>(
    db,
    `SELECT id, sender_id, sender_name, text, type, created_at
     FROM chat_messages
     WHERE chat_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [chatId, limit]
  );

  // 古い順に並び替えて返す
  const sorted = [...messages].reverse();

  return Response.json(
    sorted.map(m => ({
      id:          String(m.id),
      senderId:    m.sender_id,
      senderName:  m.sender_name,
      text:        m.text,
      type:        m.type,
      timestamp:   m.created_at,
    })),
    {
      headers: {
        // チャットメッセージはキャッシュしない
        "Cache-Control": "no-store, no-cache",
        "Pragma":        "no-cache",
      },
    }
  );
}

// ── POST: メッセージ送信 ─────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { chatId } = await params;

  // [SECURITY FIX #6] chatId ホワイトリスト検証
  if (!canAccessChannel(chatId, user.division)) {
    return forbidden("このチャンネルにはアクセスできません");
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  // [SECURITY FIX #7] メッセージテキストのサーバー側バリデーション
  if (typeof body.text !== "string") {
    return Response.json({ error: "text は文字列で指定してください" }, { status: 400 });
  }
  // [SECURITY FIX] XSS 対策: HTMLタグ・危険プロトコルを除去してからDBに保存
  const text = sanitizeMultilineText(body.text.trim());
  if (text.length === 0) {
    return Response.json({ error: "メッセージを入力してください" }, { status: 400 });
  }
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
    return Response.json(
      { error: `メッセージは${MAX_CHAT_MESSAGE_LENGTH}文字以内にしてください` },
      { status: 400 }
    );
  }

  const db = getDb();

  // [SECURITY FIX #4] sender_name はセッション（DB）の agentId を使う。
  // クライアントが送ってきた値は一切使用しない。
  await execute(
    db,
    `INSERT INTO chat_messages (chat_id, sender_id, sender_name, text, type, created_at)
     VALUES (?, ?, ?, ?, 'user', datetime('now'))`,
    [chatId, user.id, user.agent_id, text]
  );

  // ⑥ 異常スコア変動ルール評価（非同期・非ブロッキング）
  applyAnomalyRules(db, user.id, text).catch(() => {});

  return Response.json({ ok: true }, { status: 201 });
}
