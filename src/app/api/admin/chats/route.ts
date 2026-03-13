import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  try {
    const rows = await query<{
      chat_id: string; msg_count: number; last_msg: string;
      last_at: string; participant_count: number;
    }>(db, `
      SELECT
        m.chat_id,
        COUNT(*) AS msg_count,
        (
          SELECT text FROM chat_messages
          WHERE chat_id = m.chat_id
          ORDER BY created_at DESC LIMIT 1
        ) AS last_msg,
        MAX(m.created_at) AS last_at,
        COUNT(DISTINCT m.sender_id) AS participant_count
      FROM chat_messages m
      GROUP BY m.chat_id
      ORDER BY last_at DESC
      LIMIT 200
    `);
    return NextResponse.json(rows.map(r => ({
      chatId: r.chat_id,
      msgCount: Number(r.msg_count),
      lastMsg: r.last_msg,
      lastAt: r.last_at,
      participantCount: Number(r.participant_count),
    })));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
