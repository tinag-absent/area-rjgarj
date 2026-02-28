/**
 * POST /api/auth/verify-email-code
 *
 * 送信した認証コードを照合し、正しければトークンを返す。
 *
 * Body:
 *   email   — メールアドレス
 *   code    — 6桁の認証コード
 *   purpose — "register" | "password-reset"
 *
 * Response:
 *   { ok: true, emailToken: string } — 照合成功（登録・申請時に提出）
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { createHash, randomUUID } from "crypto";

async function ensureEmailTokenTable(db: ReturnType<typeof getDb>) {
  await execute(db, `
    CREATE TABLE IF NOT EXISTS email_verified_tokens (
      token      TEXT    PRIMARY KEY,
      email      TEXT    NOT NULL,
      user_id    TEXT,
      purpose    TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await execute(db, `DELETE FROM email_verified_tokens WHERE expires_at < datetime('now', '-1 hour')`);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const body = await req.json().catch(() => ({}));
  const { email, code, purpose } = body as {
    email?: string;
    code?: string;
    purpose?: string;
  };

  if (!email || !code || !purpose) {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }

  // レート制限
  const rl = await checkLoginRateLimit(ip, email);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "試行回数が上限に達しました。しばらく待ってから再試行してください。" },
      { status: 429 }
    );
  }

  const db = getDb();

  const rows = await query<{
    id: string;
    code: string;
    user_id: string | null;
    expires_at: string;
    used: number;
  }>(db, `
    SELECT id, code, user_id, expires_at, used
    FROM email_verify_codes
    WHERE email = ? AND purpose = ? AND used = 0
    ORDER BY created_at DESC
    LIMIT 1
  `, [email.toLowerCase(), purpose]);

  const fail = async () => {
    await recordLoginAttempt(ip, email, false);
    return NextResponse.json(
      { error: "認証コードが正しくないか、有効期限が切れています。" },
      { status: 401 }
    );
  };

  if (!rows.length) return fail();
  const row = rows[0];

  if (row.used || new Date(row.expires_at) < new Date()) return fail();
  if (row.code !== String(code).trim()) return fail();

  // 使用済みにする
  await execute(db, `UPDATE email_verify_codes SET used = 1 WHERE id = ?`, [row.id]);

  // メール認証済みトークンを発行（登録・申請APIで提出）
  await ensureEmailTokenTable(db);

  const token = createHash("sha256")
    .update(`${email}-${purpose}-${Date.now()}-${randomUUID()}`)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30分

  await execute(db, `
    INSERT INTO email_verified_tokens (token, email, user_id, purpose, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [token, email.toLowerCase(), row.user_id, purpose, expiresAt]);

  await recordLoginAttempt(ip, email, true);

  return NextResponse.json({ ok: true, emailToken: token });
}
