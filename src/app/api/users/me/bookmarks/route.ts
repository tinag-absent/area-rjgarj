import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  try {
    const rows = await query(db,
      `SELECT id, page_path, label, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`,
      [authUser.userId]
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { type, itemId, name } = await req.json().catch(() => ({}));
  const pagePath = `${type}/${itemId}`;
  const db = getDb();
  try {
    const existing = await query(db,
      `SELECT id FROM bookmarks WHERE user_id = ? AND page_path = ? LIMIT 1`,
      [authUser.userId, pagePath]
    );
    if (existing.length > 0) {
      await execute(db, `DELETE FROM bookmarks WHERE user_id = ? AND page_path = ?`, [authUser.userId, pagePath]);
      return NextResponse.json({ bookmarked: false });
    } else {
      await execute(db,
        `INSERT INTO bookmarks (user_id, page_path, label, created_at) VALUES (?, ?, ?, datetime('now'))`,
        [authUser.userId, pagePath, name || null]
      );
      return NextResponse.json({ bookmarked: true });
    }
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
