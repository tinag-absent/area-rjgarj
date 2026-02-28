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
    const tableCheck = await query<{ name: string }>(db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name='chat_reads'`
    ).catch(() => []);

    if (!tableCheck.length) return NextResponse.json({ global: 0 });

    const rows = await query<{ chat_id: string; unread: number }>(db, `
      SELECT cl.chat_id, COUNT(*) AS unread
      FROM chat_logs cl
      LEFT JOIN chat_reads cr ON cr.user_id = ? AND cr.chat_id = cl.chat_id
      WHERE (cr.last_read_message_id IS NULL OR cl.id > cr.last_read_message_id)
        AND cl.user_id != ?
      GROUP BY cl.chat_id
    `, [authUser.userId, authUser.userId]).catch(() => []);

    const result: Record<string, number> = {};
    for (const r of rows) result[r.chat_id] = r.unread;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
