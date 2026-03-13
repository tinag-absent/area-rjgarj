/**
 * GET /api/users/me/secret-question
 * ログイン済みユーザー自身の秘密の質問テキストを返す（回答ハッシュは返さない）
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const db = getDb();
  const user = await queryOne<{ secret_question: string | null }>(
    db,
    `SELECT secret_question FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [authUser.userId]
  );

  return NextResponse.json({ question: user?.secret_question ?? null });
}
