import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { sanitizeMultilineText } from "@/lib/sanitize";
import { AGENT_ID_REGEX } from "@/lib/constants";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { agentId } = await params;

  // [FIX-NEW-07] agentId を検証して任意の chatId 構築を防止
  if (!AGENT_ID_REGEX.test(agentId)) {
    return NextResponse.json({ error: "無効な agentId です" }, { status: 400 });
  }

  const chatId = `dm_admin_${agentId}`;
  const db = getDb();

  try {
    const rows = await query<{
      id: number; sender_id: string; sender_name: string;
      text: string; type: string; created_at: string;
    }>(db, `
      SELECT id, sender_id, sender_name, text, type, created_at
      FROM chat_messages WHERE chat_id = ?
      ORDER BY created_at ASC LIMIT 500
    `, [chatId]);

    return NextResponse.json(rows.map(r => ({
      id: String(r.id),
      senderId: r.sender_id,
      senderName: r.sender_name,
      text: r.text,
      type: r.type,
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

  // [FIX-NEW-07] agentId バリデーション
  if (!AGENT_ID_REGEX.test(agentId)) {
    return NextResponse.json({ error: "無効な agentId です" }, { status: 400 });
  }

  const chatId = `dm_admin_${agentId}`;

  const { text: rawText } = await req.json().catch(() => ({}));
  const text = sanitizeMultilineText(rawText);

  if (!text) return NextResponse.json({ error: "メッセージ本文は必須です" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "1000文字以内にしてください" }, { status: 400 });

  const db = getDb();
  try {
    const result = await execute(db, `
      INSERT INTO chat_messages (chat_id, sender_id, sender_name, text, type, created_at)
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
