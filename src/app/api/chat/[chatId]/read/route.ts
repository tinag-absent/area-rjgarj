/**
 * POST /api/chat/[chatId]/read
 * そのチャンネルの未読カウントをリセットする（最終既読IDを記録）
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { chatId } = await params;
  const { lastMessageId } = await req.json().catch(() => ({}));

  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO chat_reads (user_id, chat_id, last_read_message_id, read_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT (user_id, chat_id) DO UPDATE
        SET last_read_message_id = excluded.last_read_message_id,
            read_at = excluded.read_at
    `, [authUser.userId, chatId, lastMessageId ?? null]);
    return NextResponse.json({ ok: true });
  } catch {
    // テーブルが未作成でも無視（graceful）
    return NextResponse.json({ ok: true });
  }
}
