/**
 * POST /api/auth/send-email-code
 *
 * メールアドレスに認証コードを送信する。
 *
 * Body:
 *   email    — 送信先メールアドレス
 *   purpose  — "register" | "password-reset"
 *   agentId  — (password-resetのみ) 申請者のID
 *
 * Rate limit: IPベース（identity-verifyと同じ）
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { sendEmailVerificationCode } from "@/lib/email";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { randomInt } from "crypto";

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, `
    CREATE TABLE IF NOT EXISTS email_verify_codes (
      id         TEXT    PRIMARY KEY,
      email      TEXT    NOT NULL,
      code       TEXT    NOT NULL,
      purpose    TEXT    NOT NULL,
      user_id    TEXT,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // 古いコードを削除
  await execute(db, `DELETE FROM email_verify_codes WHERE expires_at < datetime('now', '-1 hour')`);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const body = await req.json().catch(() => ({}));
  const { email, purpose, agentId, userId } = body as {
    email?: string;
    purpose?: string;
    agentId?: string;
    userId?: string;
  };

  if (!email || !purpose || !["register", "password-reset"].includes(purpose)) {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }

  // レート制限
  const rl = await checkLoginRateLimit(ip, email);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "送信回数の上限に達しました。しばらく待ってから再試行してください。" },
      { status: 429 }
    );
  }

  const db = getDb();
  await ensureTable(db);

  // password-resetの場合、メールがDBのユーザーのものと一致するか確認
  let resolvedUserId: string | null = userId ?? null;
  if (purpose === "password-reset" && agentId) {
    const rows = await query<{ id: string; email: string }>(db,
      `SELECT id, email FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (!rows.length || rows[0].email.toLowerCase() !== email.toLowerCase()) {
      // セキュリティのため成功として返す（メールアドレス列挙を防ぐ）
      return NextResponse.json({ ok: true });
    }
    resolvedUserId = rows[0].id;
  }

  // 6桁のランダムコードを生成
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分
  const id = crypto.randomUUID();

  await execute(db, `
    INSERT INTO email_verify_codes (id, email, code, purpose, user_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, email.toLowerCase(), code, purpose, resolvedUserId, expiresAt]);

  try {
    await sendEmailVerificationCode(email, code, purpose as "register" | "password-reset");
  } catch (err) {
    console.error("[send-email-code] メール送信エラー:", err);
    return NextResponse.json(
      { error: "メールの送信に失敗しました。メールアドレスを確認してください。" },
      { status: 500 }
    );
  }

  await recordLoginAttempt(ip, email, true);

  return NextResponse.json({ ok: true });
}
