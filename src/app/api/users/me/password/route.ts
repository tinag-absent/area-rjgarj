/**
 * PUT /api/users/me/password
 * 現在のパスワード + 秘密の質問回答を両方確認してからパスワード変更する。
 * 秘密の質問が未設定の場合は現在のパスワードのみで変更可能。
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, queryOne, execute } from "@/lib/db";
import { hashPassword, verifyPassword, getAuthUser, unauthorized } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  // [BUG-F FIX] requireAuth (JWT のみ) ではなく getAuthUser (DB 検索 + iat チェック) を使う。
  // password_changed_at による無効化トークンを確実に弾くために必要。
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();
  const userId = authUser.id;

  const { currentPassword, newPassword, secretAnswer } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "現在のパスワードと新しいパスワードは必須です" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
  }
  // [FIX] パスワード上限チェック（bcrypt DoS 防止）
  if (newPassword.length > 256 || (currentPassword && currentPassword.length > 256)) {
    return NextResponse.json({ error: "パスワードは256文字以内にしてください" }, { status: 400 });
  }

  try {
    const db = getDb();
    const user = await queryOne<{
      password_hash: string;
      secret_question: string | null;
      secret_answer_hash: string | null;
    }>(db,
      `SELECT password_hash, secret_question, secret_answer_hash
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // 現在のパスワード検証
    const validPw = await verifyPassword(currentPassword, user.password_hash);
    if (!validPw) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 403 });
    }

    // 秘密の質問が設定済みの場合は回答も必須
    if (user.secret_question && user.secret_answer_hash) {
      if (!secretAnswer || !secretAnswer.trim()) {
        return NextResponse.json({
          error: "秘密の質問の回答が必要です",
          requiresSecretAnswer: true,
          question: user.secret_question,
        }, { status: 400 });
      }
      const validAnswer = await verifyPassword(
        secretAnswer.trim().toLowerCase(),
        user.secret_answer_hash
      );
      if (!validAnswer) {
        return NextResponse.json({ error: "秘密の質問の回答が正しくありません" }, { status: 403 });
      }
    }

    const newHash = await hashPassword(newPassword);
    // [FIX-M15] password_changed_at を更新して古いセッションを無効化できるようにする
    await execute(db,
      `UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?`,
      [newHash, userId]
    );

    return NextResponse.json({ message: "パスワードを変更しました" });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
