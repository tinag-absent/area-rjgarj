import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { sanitizeMultilineText } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { chatId } = await params;

  if (chatId !== "global" && chatId !== "lobby") {
    const participants = chatId.split("_");
    if (!participants.includes(authUser.agentId)) {
      return NextResponse.json({ error: "このチャットにアクセスできません" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before");
  const db = getDb();

  try {
    const sql = before
      ? `SELECT id, user_id, username, message, message_type, created_at FROM chat_logs WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT id, user_id, username, message, message_type, created_at FROM chat_logs WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?`;
    const args = before ? [chatId, before, limit] : [chatId, limit];
    const rows = await query<{ id: number; user_id: string; username: string; message: string; message_type: string; created_at: string }>(db, sql, args);

    const msgs = rows.reverse().map((r) => ({
      id: String(r.id), senderId: r.user_id, senderName: r.username,
      text: r.message, type: r.message_type, timestamp: r.created_at,
    }));
    return NextResponse.json(msgs);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { chatId } = await params;

  // 参加者チェック（GETと同様）
  if (chatId !== "global" && chatId !== "lobby") {
    const participants = chatId.split("_");
    if (!participants.includes(authUser.agentId)) {
      return NextResponse.json({ error: "このチャットに書き込めません" }, { status: 403 });
    }
  }

  const { text: rawText, messageType = "text" } = await req.json().catch(() => ({}));
  const text = sanitizeMultilineText(rawText);

  if (!text) return NextResponse.json({ error: "メッセージ本文は必須です" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "メッセージは1000文字以内にしてください" }, { status: 400 });

  const db = getDb();
  try {
    const result = await execute(db, `
      INSERT INTO chat_logs (chat_id, user_id, username, message, message_type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [chatId, authUser.userId, authUser.agentId, text, messageType]);

    return NextResponse.json({
      id: String(result.lastInsertRowid), senderId: authUser.userId,
      senderName: authUser.agentId, text, type: messageType,
      timestamp: new Date().toISOString(), chatId,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
