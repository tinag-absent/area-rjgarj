import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { chatId } = await params;
  const db = getDb();
  try {
    const rows = await query<{
      id: number; user_id: string; username: string; message: string;
      message_type: string; created_at: string;
    }>(db, `
      SELECT id, user_id, username, message, message_type, created_at
      FROM chat_logs WHERE chat_id = ? ORDER BY created_at ASC LIMIT 500
    `, [chatId]);
    return NextResponse.json(rows.map(r => ({
      id: String(r.id), senderId: r.user_id, senderName: r.username,
      text: r.message, type: r.message_type, timestamp: r.created_at,
    })));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { chatId } = await params;
  const db = getDb();
  try {
    await execute(db, `DELETE FROM chat_logs WHERE chat_id = ?`, [chatId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
