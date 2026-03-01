import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { id: postId } = await params;
  const db = getDb();
  try {
    const existing = await query(db,
      `SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1`,
      [authUser.userId, postId]
    );
    if (existing.length > 0) {
      await execute(db, `DELETE FROM likes WHERE user_id = ? AND post_id = ?`, [authUser.userId, postId]);
      await execute(db, `UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?`, [postId]);
    } else {
      await execute(db, `INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [authUser.userId, postId]);
      await execute(db, `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`, [postId]);
    }
    const countRow = await query<{ like_count: number }>(db, `SELECT like_count FROM posts WHERE id = ?`, [postId]);
    return NextResponse.json({ liked: existing.length === 0, likeCount: countRow[0]?.like_count || 0 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
