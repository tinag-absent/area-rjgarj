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

  return Response.json({ ok: true }, { status: 201 });
}
