/**
 * GET /api/chat/unread
 * 各チャンネルの未読メッセージ数を返す
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();

  try {
    const rows = await query<{ chat_id: string; unread: number }>(db, `
      SELECT cm.chat_id, COUNT(*) AS unread
      FROM chat_messages cm
      LEFT JOIN chat_read_markers cr
        ON cr.user_id = ? AND cr.chat_id = cm.chat_id
      WHERE (cr.last_read_message_id IS NULL OR cm.rowid > cr.last_read_message_id)
        AND cm.sender_id != ?
      GROUP BY cm.chat_id
    `, [authUser.userId, authUser.userId]).catch(() => []);

    const result: Record<string, number> = {};
    for (const r of rows) result[r.chat_id] = r.unread;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
