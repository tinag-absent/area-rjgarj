/**
 * GET /api/auth/verify-email?token=xxx
 * メール認証トークンを検証してアカウントをアクティベート
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 32) {
    return redirectError("無効なトークンです");
  }

  const db = getDb();

  try {
    // トークン検索
    const row = await queryOne<{
      id: string; user_id: string; expires_at: string; used_at: string | null;
    }>(db,
      `SELECT id, user_id, expires_at, used_at
       FROM email_verification_tokens WHERE token = ? LIMIT 1`,
      [token]
    );

    if (!row) return redirectError("このリンクは無効です");
    if (row.used_at) return redirectError("このリンクは既に使用済みです");
    if (new Date(row.expires_at) < new Date()) return redirectError("このリンクの有効期限が切れています");

    // ユーザーをアクティベート
    await execute(db,
      `UPDATE users SET status = 'active', email_verified = 1 WHERE id = ? AND status = 'pending'`,
      [row.user_id]
    );
    await execute(db,
      `UPDATE email_verification_tokens SET used_at = datetime('now') WHERE id = ?`,
      [row.id]
    );

    // ユーザー情報を取得してJWT発行 → そのままダッシュボードへ
    const user = await queryOne<{
      id: string; username: string; role: string; clearance_level: number;
    }>(db,
      `SELECT id, username, role, clearance_level FROM users WHERE id = ? LIMIT 1`,
      [row.user_id]
    );

    if (!user) return redirectError("ユーザー情報の取得に失敗しました");

    const jwt = signToken({
      userId: user.id,
      agentId: user.username,
      role: user.role as "player" | "admin" | "super_admin",
      level: user.clearance_level,
    });

    const res = NextResponse.redirect(new URL("/dashboard?welcome=1", req.url));
    setAuthCookie(res, jwt);
    return res;

  } catch (err) {
    console.error("[verify-email] エラー:", err);
    return redirectError("サーバーエラーが発生しました");
  }
}

function redirectError(msg: string): NextResponse {
  const url = `/login?verify_error=${encodeURIComponent(msg)}`;
  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
