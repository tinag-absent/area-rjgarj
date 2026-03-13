import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { ALLOWED_CHAT_CHANNELS } from "@/lib/constants";
import { NPCS } from "@/lib/npc-engine";

export async function POST(req: NextRequest) {
  // [Q-002] 一般ユーザーがNPCになりすますのを防ぐため管理者権限を要求
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: { chatId?: string; npcKey?: string; text?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 }); }

  const { chatId, npcKey, text: rawText } = body;
  if (!chatId || !npcKey || !rawText) {
    return NextResponse.json({ error: "chatId, npcKey, text は必須です" }, { status: 400 });
  }
  // [FIX-NEW-06] NPC テキストの長さ制限とサニタイズ
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return NextResponse.json({ error: "text は空にできません" }, { status: 400 });
  }
  const { sanitizeMultilineText } = await import("@/lib/sanitize");
  const text = sanitizeMultilineText(rawText.trim());
  if (text.length > 1000) {
    return NextResponse.json({ error: "text は1000文字以内にしてください" }, { status: 400 });
  }
  if (!ALLOWED_CHAT_CHANNELS.has(chatId) || chatId.startsWith("dm_admin")) {
    return NextResponse.json({ error: "無効なチャットチャンネルです" }, { status: 400 });
  }
  const npc = NPCS[npcKey];
  if (!npc) {
    return NextResponse.json({ error: "無効なNPCキーです" }, { status: 400 });
  }

  const db = getDb();
  const nowSql = new Date().toISOString().replace("T", " ").slice(0, 19);

  // [N-001] id を crypto.randomUUID() で明示付与（TEXT PRIMARY KEY にNULLを挿入しない）
  const npcMsgId = crypto.randomUUID();
  const result = await execute(db,
    `INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, text, type, created_at)
     VALUES (?, ?, ?, ?, ?, 'npc', ?)`,
    [npcMsgId, chatId, `npc_${npcKey}`, npcKey, text, nowSql]
  );

  return NextResponse.json({ success: true, messageId: npcMsgId });
}
