import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { sanitizeDisplayText } from "@/lib/sanitize";

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

  // [FIX BUG#11] type・itemIdのバリデーション（パス注入防止）
  const ALLOWED_TYPES = ["missions", "entities", "modules", "locations", "personnel", "novel", "posts", "archives"];
  if (!type || !itemId || typeof type !== "string" || typeof itemId !== "string") {
    return NextResponse.json({ error: "typeとitemIdは必須です" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "無効なtypeです" }, { status: 400 });
  }
  if (!/^[\w-]+$/.test(itemId) || itemId.length > 100) {
    return NextResponse.json({ error: "無効なitemIdです" }, { status: 400 });
  }
  const pagePath = `${type}/${itemId}`;
  // [FIX-NEW-08] ブックマークのラベルをサニタイズ（XSS防止）
  const label = name ? sanitizeDisplayText(name).slice(0, 100) : null;
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
        [authUser.userId, pagePath, label]
      );
      return NextResponse.json({ bookmarked: true });
    }
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
