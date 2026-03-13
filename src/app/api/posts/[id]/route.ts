/**
 * DELETE /api/posts/[id]
 * 本人または管理者が投稿を論理削除する
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { id } = await params;
  const db = getDb();
  try {
    const rows = await query<{ user_id: string }>(db,
      `SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
    if (!rows.length) return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });

    // 本人か管理者のみ削除可
    const isOwner = rows[0].user_id === authUser.userId;
    const isAdmin = ["admin", "super_admin"].includes(authUser.role);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "この投稿を削除する権限がありません" }, { status: 403 });
    }

    await execute(db, `UPDATE posts SET deleted_at = datetime('now') WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
