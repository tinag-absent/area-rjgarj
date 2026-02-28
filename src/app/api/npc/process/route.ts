/**
 * /api/npc/process
 * POST: { chatId, messageText, senderUsername }
 *
 * - global / division_* チャット: 単一NPC返答
 * - npc_group チャット: 複数NPC連鎖返答
 *
 * NOTE: サーバーレス環境では setTimeout はレスポンス後に実行が保証されないため、
 * DB書き込みはすべて await で完了してからレスポンスを返す。
 * delayMs はフロント側のタイピングインジケーター表示にのみ使用する。
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import {
  NPC_USERNAMES,
  generateNpcResponse,
  generateGroupResponses,
  randomDelay,
  NPCS,
} from "@/lib/npc-engine";

const NPC_GROUP_CHAT_ID = "npc_group";

// アイドルインデックスをチャットIDごとにメモリ管理（同一インスタンス内で有効）
const idleIndexMap: Record<string, number> = {};
// スパム防止: 同一チャット2秒以内は無視（同一インスタンス内で有効）
const lastProcessedAt: Record<string, number> = {};

async function insertNpcMessage(chatId: string, npc: (typeof NPCS)[string], text: string) {
  const db = getDb();
  // 直前5秒に同NPCが同チャットに書いていたら重複送信しない
  const recent = await query<{ cnt: number }>(db,
    `SELECT COUNT(*) AS cnt FROM chat_logs
     WHERE chat_id = ? AND user_id = ? AND created_at > datetime('now', '-5 seconds')`,
    [chatId, npc.id]
  );
  if ((recent[0]?.cnt ?? 0) > 0) return;
  await execute(db,
    `INSERT INTO chat_logs (chat_id, user_id, username, message, message_type, created_at)
     VALUES (?, ?, ?, ?, 'npc', datetime('now'))`,
    [chatId, npc.id, npc.username, text]
  );
}

export async function POST(req: NextRequest) {
  // 認証チェック（senderUsername 偽装防止）
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const { chatId, messageText, senderUsername } = await req.json().catch(() => ({}));

  if (!chatId || !messageText || !senderUsername) {
    return NextResponse.json({ ok: false, reason: "missing params" }, { status: 400 });
  }
  // senderUsername がトークンのagentIdと一致するか検証
  if (authUser.agentId !== senderUsername) {
    return NextResponse.json({ ok: false, reason: "sender mismatch" }, { status: 403 });
  }
  if (NPC_USERNAMES.has(senderUsername)) {
    return NextResponse.json({ ok: false, reason: "sender is npc" });
  }

  const now = Date.now();
  if (lastProcessedAt[chatId] && now - lastProcessedAt[chatId] < 2000) {
    return NextResponse.json({ ok: false, reason: "too fast" });
  }
  lastProcessedAt[chatId] = now;

  const idleIndex = idleIndexMap[chatId] ?? 0;

  // ── グループチャット: 複数NPC返答 ─────────────────────────────────────
  if (chatId === NPC_GROUP_CHAT_ID) {
    const { responses, nextIdleIndex, triggered } = generateGroupResponses(messageText, idleIndex);
    idleIndexMap[chatId] = nextIdleIndex;

    if (responses.length === 0) {
      return NextResponse.json({ ok: true, responded: false });
    }

    // サーバーレス対応: 全DB書き込みを await で完了させてからレスポンスを返す
    // delayMs はフロントのタイピングインジケーター表示にのみ使用
    await Promise.allSettled(
      responses.map(r => insertNpcMessage(chatId, r.npc, r.text))
    );

    const first = responses[0];
    const maxDelay = Math.max(...responses.map(r => r.delayMs));
    return NextResponse.json({
      ok: true, responded: true, triggered,
      npc: first.npc.username,
      delayMs: Math.round(first.delayMs),
      totalResponses: responses.length,
      maxDelayMs: Math.round(maxDelay),
    });
  }

  // ── 通常チャット: 単一NPC返答 ─────────────────────────────────────────
  const { npc, text, nextIdleIndex: nextIdle, triggered } = generateNpcResponse(messageText, idleIndex);
  idleIndexMap[chatId] = nextIdle;

  if (!text) {
    return NextResponse.json({ ok: true, responded: false });
  }

  const delay = randomDelay(npc);

  // サーバーレス対応: DB書き込みを await で完了させてからレスポンスを返す
  try {
    await insertNpcMessage(chatId, npc, text);
  } catch (err) {
    console.error("[npc/process]", err);
  }

  return NextResponse.json({
    ok: true, responded: true, triggered,
    npc: npc.username,
    delayMs: Math.round(delay),
  });
}

export async function GET() {
  return NextResponse.json(
    Object.values(NPCS).map(n => ({
      username: n.username,
      displayName: n.displayName,
      division: n.division,
      personality: n.personality,
    }))
  );
}

