import { NextRequest, NextResponse } from "next/server";
import { getDb, query, transaction } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { id: postId } = await params;
  const db = getDb();
  try {
    let liked = false;
    // [BUG-04 FIX] SELECTも含め全操作をtxで実行してトランザクション分離を保証
    await transaction(db, async (tx) => {
      const existing = await tx.execute({
        sql: `SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1`,
        args: [authUser.userId, postId],
      });
      if (existing.rows.length > 0) {
        await tx.execute({ sql: `DELETE FROM likes WHERE user_id = ? AND post_id = ?`, args: [authUser.userId, postId] });
        await tx.execute({ sql: `UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?`, args: [postId] });
        liked = false;
      } else {
        await tx.execute({ sql: `INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, args: [authUser.userId, postId] });
        await tx.execute({ sql: `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`, args: [postId] });
        liked = true;
      }
    });
    const countRow = await query<{ like_count: number }>(db, `SELECT like_count FROM posts WHERE id = ?`, [postId]);
    return NextResponse.json({ liked, likeCount: countRow[0]?.like_count || 0 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
