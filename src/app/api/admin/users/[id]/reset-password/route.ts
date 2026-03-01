/**
 * POST /api/admin/users/[id]/reset-password
 * 管理者が任意ユーザーのパスワードを強制リセットする
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetNotification } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { newPassword } = await req.json().catch(() => ({}));

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
  }

  const db = getDb();
  try {
    // ユーザー情報を取得（メール送信のため）
    const user = await queryOne<{ username: string; email: string }>(
      db,
      `SELECT username, email FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const hash = await hashPassword(newPassword);
    await execute(db, `UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL`, [hash, id]);

    // メール通知（@kaishoku.local は仮アドレスなので送信しない）
    if (!user.email.endsWith("@kaishoku.local")) {
      await sendPasswordResetNotification(user.email, user.username, newPassword);
    }

    return NextResponse.json({ ok: true, message: "パスワードをリセットしました" });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
