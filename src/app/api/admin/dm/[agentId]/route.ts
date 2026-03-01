/**
 * GET  /api/admin/dm/[agentId]  — 特定ユーザーとのDMを取得
 * POST /api/admin/dm/[agentId]  — 管理者としてメッセージ送信
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { sanitizeMultilineText } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { agentId } = await params;
  const chatId = `dm_admin_${agentId}`;
  const db = getDb();

  try {
    const rows = await query<{
      id: number; user_id: string; username: string;
      message: string; message_type: string; created_at: string;
    }>(db, `
      SELECT id, user_id, username, message, message_type, created_at
      FROM chat_logs WHERE chat_id = ?
      ORDER BY created_at ASC LIMIT 500
    `, [chatId]);

    return NextResponse.json(rows.map(r => ({
      id: String(r.id),
      senderId: r.user_id,
      senderName: r.username,
      text: r.message,
      type: r.message_type,
      timestamp: r.created_at,
    })));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { user: adminUser } = auth;
  const { agentId } = await params;
  const chatId = `dm_admin_${agentId}`;

  const { text: rawText } = await req.json().catch(() => ({}));
  const text = sanitizeMultilineText(rawText);

  if (!text) return NextResponse.json({ error: "メッセージ本文は必須です" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "1000文字以内にしてください" }, { status: 400 });

  const db = getDb();
  try {
    const result = await execute(db, `
      INSERT INTO chat_logs (chat_id, user_id, username, message, message_type, created_at)
      VALUES (?, ?, ?, ?, 'admin', datetime('now'))
    `, [chatId, adminUser.userId, adminUser.agentId, text]);

    // 対象ユーザーへの通知
    const targetUser = await query<{ id: string }>(db,
      `SELECT id FROM users WHERE username = ? AND deleted_at IS NULL`, [agentId]);
    if (targetUser[0]) {
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
        VALUES (?, 'admin_dm', '管理局からの通信', ?, 0, datetime('now'))
      `, [targetUser[0].id, text.slice(0, 80) + (text.length > 80 ? "…" : "")]).catch(() => {});
    }

    return NextResponse.json({
      id: String(result.lastInsertRowid),
      senderId: adminUser.userId,
      senderName: adminUser.agentId,
      text,
      type: "admin",
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/dm POST]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
