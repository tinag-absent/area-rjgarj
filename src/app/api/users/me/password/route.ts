import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireAuth } from "@/lib/server-auth";

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "現在のパスワードと新しいパスワードは必須です" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await query<{ password_hash: string }>(db,
      `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, rows[0].password_hash);
    if (!valid) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 403 });
    }

    const newHash = await hashPassword(newPassword);
    await execute(db,
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [newHash, userId]
    );

    return NextResponse.json({ message: "パスワードを変更しました" });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
