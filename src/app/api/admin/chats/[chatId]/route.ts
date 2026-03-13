import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

// [FIX-NEW-03] chatId のバリデーションパターン
const CHAT_ID_PATTERN = /^[\w\-:]{1,128}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { chatId } = await params;

  // [FIX-NEW-03] chatId を検証して任意チャンネル読み取りを防止
  if (!CHAT_ID_PATTERN.test(chatId)) {
    return NextResponse.json({ error: "無効な chatId です" }, { status: 400 });
  }

  const db = getDb();
  try {
    const rows = await query<{
      id: number; sender_id: string; sender_name: string; text: string;
      type: string; created_at: string;
    }>(db, `
      SELECT id, sender_id, sender_name, text, type, created_at
      FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 500
    `, [chatId]);
    return NextResponse.json(rows.map(r => ({
      id: String(r.id), senderId: r.sender_id, senderName: r.sender_name,
      text: r.text, type: r.type, timestamp: r.created_at,
    })));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { chatId } = await params;

  // [FIX-NEW-03] chatId を検証
  if (!CHAT_ID_PATTERN.test(chatId)) {
    return NextResponse.json({ error: "無効な chatId です" }, { status: 400 });
  }

  const db = getDb();
  try {
    await execute(db, `DELETE FROM chat_messages WHERE chat_id = ?`, [chatId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
