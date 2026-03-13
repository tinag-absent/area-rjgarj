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

  // [FIX] id を UUID 形式で検証
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "無効なユーザー ID です" }, { status: 400 });
  }

  const { newPassword } = await req.json().catch(() => ({}));

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
  }
  // [FIX] パスワード上限チェック（bcrypt DoS 防止）
  if (newPassword.length > 256) {
    return NextResponse.json({ error: "パスワードは256文字以内にしてください" }, { status: 400 });
  }

  const db = getDb();
  try {
    // ユーザー情報を取得（メール送信のため）
    const user = await queryOne<{ username: string; email: string; status: string }>(
      db,
      `SELECT username, email, status FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // [FIX BUG#9] 一般adminがsuper_adminのパスワードをリセットできないよう制限
    if ((auth as { user: { role: string } }).user.role !== "super_admin") {
      const targetRoleRow = await queryOne<{ role: string }>(
        db, `SELECT role FROM users WHERE id = ? AND deleted_at IS NULL`, [id]
      );
      if (targetRoleRow?.role === "super_admin") {
        return NextResponse.json(
          { error: "super_adminのパスワードはsuper_adminのみリセットできます" },
          { status: 403 }
        );
      }
    }

    // [G-005] inactive / suspended / banned ユーザーへのリセットメール送信を拒否
    if (!["active", "pending_verification"].includes(user.status)) {
      return NextResponse.json(
        { error: "アクティブでないユーザーのパスワードはリセットできません" },
        { status: 403 }
      );
    }

    const hash = await hashPassword(newPassword);
    // [FIX-M15] password_changed_at を更新して古いセッションを無効化できるようにする
    await execute(db, `UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`, [hash, id]);

    // [G-003] 平文パスワードをメールで送信しない
    if (!user.email.endsWith("@kaishoku.local")) {
      await sendPasswordResetNotification(user.email, user.username);
    }

    return NextResponse.json({ ok: true, message: "パスワードをリセットしました" });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
