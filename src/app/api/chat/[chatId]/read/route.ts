/**
 * src/app/api/chat/[chatId]/read/route.ts
 *
 * POST /api/chat/:chatId/read — 既読位置を更新
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getDb, execute } from "@/lib/db";
import { ALLOWED_CHAT_CHANNELS } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { chatId } = await params;

  // [FIX] 部門チャンネルは所属部門のユーザーのみ既読マークを更新できるようにする。
  // 以前は ALLOWED_CHAT_CHANNELS.has() のみで、他部門チャンネルへのアクセスを防いでいなかった。
  if (!ALLOWED_CHAT_CHANNELS.has(chatId)) {
    return forbidden("無効なチャンネルです");
  }
  if (chatId.startsWith("division_") && user.division !== chatId.replace("division_", "")) {
    return forbidden("このチャンネルにはアクセスできません");
  }

  let body: { lastMessageId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  const lastMessageId = parseInt(String(body.lastMessageId ?? "0"), 10);
  if (isNaN(lastMessageId) || lastMessageId < 0) {
    return Response.json({ error: "lastMessageId が不正です" }, { status: 400 });
  }

  const db = getDb();
  await execute(
    db,
    `INSERT INTO chat_read_markers (user_id, chat_id, last_message_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT (user_id, chat_id)
     DO UPDATE SET
       last_message_id = MAX(last_message_id, excluded.last_message_id),
       updated_at = excluded.updated_at`,
    [user.id, chatId, lastMessageId]
  );

  return Response.json({ ok: true });
}
