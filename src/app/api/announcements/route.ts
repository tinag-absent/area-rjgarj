import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const db = getDb();
  try {
    const rows = await query<Record<string, unknown>>(db, `
      SELECT p.id, p.title, p.body, p.classification, p.created_at, p.updated_at,
             u.username AS author_id, u.display_name AS author_name
      FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.is_lore = 1 AND p.status = 'published' AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT ?
    `, [limit]);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const { title: rawTitle, body: rawBody, classification } = await req.json().catch(() => ({}));
  const title = sanitizeDisplayText(rawTitle);
  const body = sanitizeMultilineText(rawBody);
  if (!title || !body) return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });

  const db = getDb();
  try {
    const id = crypto.randomUUID();
    await execute(db, `
      INSERT INTO posts (id, user_id, title, body, status, classification, required_clearance, is_lore, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'published', ?, 0, 1, datetime('now'), datetime('now'))
    `, [id, userId, title, body, classification || "UNCLASSIFIED"]);
    return NextResponse.json({ id, message: "お知らせを投稿しました" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
