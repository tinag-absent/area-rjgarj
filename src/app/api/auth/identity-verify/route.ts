/**
 * POST /api/auth/identity-verify
 *
 * step: "lookup"  — IDが存在するか確認
 * step: "verify"  — 表示名 + メール + 部門 の3点照合。一致すれば登録メールに認証コードを送信
 * step: "email"   — メール認証コードを照合。正しければ申請トークンを発行
 * step: "request" — トークンを使ってパスワード変更申請を登録
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { sendEmailVerificationCode } from "@/lib/email";
import { randomUUID, createHash, randomInt } from "crypto";

// ── テーブル初期化 ────────────────────────────────────────────────

async function ensureTables() {
  const db = getDb();
  await execute(db, `
    CREATE TABLE IF NOT EXISTS identity_verify_tokens (
      token      TEXT    PRIMARY KEY,
      user_id    TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await execute(db, `
    CREATE TABLE IF NOT EXISTS identity_email_codes (
      id         TEXT    PRIMARY KEY,
      user_id    TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      code       TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // 古いレコードを削除
  await execute(db, `DELETE FROM identity_verify_tokens WHERE expires_at < datetime('now', '-1 hour')`);
  await execute(db, `DELETE FROM identity_email_codes WHERE expires_at < datetime('now', '-1 hour')`);
}

// ── ヘルパー ────────────────────────────────────────────────────

async function issueVerifyToken(userId: string): Promise<string> {
  const db = getDb();
  const token = createHash("sha256")
    .update(`${userId}-${Date.now()}-${randomUUID()}`)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await execute(db, `
    INSERT OR REPLACE INTO identity_verify_tokens (token, user_id, expires_at, used)
    VALUES (?, ?, ?, 0)
  `, [token, userId, expiresAt]);

  return token;
}

async function consumeVerifyToken(token: string): Promise<string | null> {
  const db = getDb();
  const rows = await query<{ user_id: string; expires_at: string; used: number }>(db,
    `SELECT user_id, expires_at, used FROM identity_verify_tokens WHERE token = ? LIMIT 1`,
    [token]
  );
  if (!rows.length || rows[0].used || new Date(rows[0].expires_at) < new Date()) return null;
  await execute(db, `UPDATE identity_verify_tokens SET used = 1 WHERE token = ?`, [token]);
  return rows[0].user_id;
}

async function issueEmailCode(userId: string, email: string): Promise<string> {
  const db = getDb();
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const id = randomUUID();

  await execute(db, `
    INSERT INTO identity_email_codes (id, user_id, email, code, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, userId, email.toLowerCase(), code, expiresAt]);

  return code;
}

async function consumeEmailCode(
  userId: string,
  code: string
): Promise<boolean> {
  const db = getDb();
  const rows = await query<{ id: string; code: string; expires_at: string; used: number }>(db,
    `SELECT id, code, expires_at, used FROM identity_email_codes
     WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows.length) return false;
  const row = rows[0];
  if (row.used || new Date(row.expires_at) < new Date() || row.code !== String(code).trim()) {
    return false;
  }
  await execute(db, `UPDATE identity_email_codes SET used = 1 WHERE id = ?`, [row.id]);
  return true;
}

// ── メインハンドラー ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  await ensureTables();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const body = await req.json().catch(() => ({}));
  const { step } = body;

  // ── STEP 1: IDルックアップ ─────────────────────────────────
  if (step === "lookup") {
    const { agentId } = body;
    if (!agentId) {
      return NextResponse.json({ error: "機関員IDを入力してください" }, { status: 400 });
    }

    const rl = await checkLoginRateLimit(ip, agentId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "試行回数が上限に達しました。しばらく待ってから再試行してください。" },
        { status: 429 }
      );
    }

    const db = getDb();
    const rows = await query<{ id: string; status: string }>(db, `
      SELECT u.id, u.status
      FROM users u
      WHERE LOWER(u.username) = LOWER(?) AND u.deleted_at IS NULL
      LIMIT 1
    `, [agentId]);

    if (!rows.length) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ found: true }); // ユーザー列挙防止
    }

    if (rows[0].status === "banned") {
      return NextResponse.json({ error: "このアカウントはアクセス禁止です" }, { status: 403 });
    }

    return NextResponse.json({ found: true });
  }

  // ── STEP 2: 本人確認（3点照合）→ メールコードを送信 ──────
  if (step === "verify") {
    const { agentId, displayName, email, divisionSlug } = body;
    if (!agentId || !displayName || !email || !divisionSlug) {
      return NextResponse.json({ error: "全項目を入力してください" }, { status: 400 });
    }

    const rl = await checkLoginRateLimit(ip, agentId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "試行回数が上限に達しました。しばらく待ってから再試行してください。" },
        { status: 429 }
      );
    }

    const db = getDb();
    const rows = await query<{
      id: string;
      display_name: string;
      email: string;
      division_slug: string;
      status: string;
    }>(db, `
      SELECT u.id,
        LOWER(COALESCE(u.display_name, u.username)) AS display_name,
        LOWER(u.email) AS email,
        d.slug AS division_slug,
        u.status
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE LOWER(u.username) = LOWER(?) AND u.deleted_at IS NULL
      LIMIT 1
    `, [agentId]);

    const fail = async () => {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json(
        { error: "入力情報が一致しません。登録時の情報を確認してください。" },
        { status: 401 }
      );
    };

    if (!rows.length) return fail();
    const user = rows[0];
    if (user.status === "banned") {
      return NextResponse.json({ error: "このアカウントはアクセス禁止です" }, { status: 403 });
    }

    // 3点照合（大文字小文字無視）
    const nameMatch  = user.display_name === displayName.trim().toLowerCase();
    const emailMatch = user.email         === email.trim().toLowerCase();
    const divMatch   = user.division_slug === divisionSlug;

    if (!nameMatch || !emailMatch || !divMatch) return fail();

    // 照合成功 → メールに認証コードを送信
    await recordLoginAttempt(ip, agentId, true);

    try {
      const code = await issueEmailCode(user.id, user.email);
      await sendEmailVerificationCode(user.email, code, "password-reset");
    } catch (err) {
      console.error("[identity-verify] メール送信エラー:", err);
      return NextResponse.json(
        { error: "メールの送信に失敗しました。しばらくしてから再試行してください。" },
        { status: 500 }
      );
    }

    // マスクしたメールアドレスを返す（UIで案内に使用）
    const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, "*");

    return NextResponse.json({ verified: true, maskedEmail });
  }

  // ── STEP 2.5: メール認証コード照合 → 申請トークン発行 ────
  if (step === "email") {
    const { agentId, emailCode } = body;
    if (!agentId || !emailCode) {
      return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
    }

    const rl = await checkLoginRateLimit(ip, agentId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "試行回数が上限に達しました。しばらく待ってから再試行してください。" },
        { status: 429 }
      );
    }

    const db = getDb();
    const userRows = await query<{ id: string }>(db,
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (!userRows.length) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }
    const userId = userRows[0].id;

    const ok = await consumeEmailCode(userId, emailCode);
    if (!ok) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json(
        { error: "認証コードが正しくないか、有効期限が切れています。" },
        { status: 401 }
      );
    }

    await recordLoginAttempt(ip, agentId, true);
    const verifyToken = await issueVerifyToken(userId);

    return NextResponse.json({ emailVerified: true, verifyToken });
  }

  // ── STEP 3: 申請送信 ──────────────────────────────────────
  if (step === "request") {
    const { verifyToken, reason } = body;
    if (!verifyToken || !reason || String(reason).trim().length < 5) {
      return NextResponse.json(
        { error: "申請理由を5文字以上で入力してください" },
        { status: 400 }
      );
    }

    const userId = await consumeVerifyToken(verifyToken);
    if (!userId) {
      return NextResponse.json(
        { error: "本人確認トークンが無効または期限切れです。最初からやり直してください。" },
        { status: 401 }
      );
    }

    const db = getDb();

    const existing = await query<{ id: string }>(db,
      `SELECT id FROM password_change_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "既に審査中の申請があります。結果をお待ちください。" },
        { status: 409 }
      );
    }

    const id = randomUUID();
    await execute(db,
      `INSERT INTO password_change_requests (id, user_id, reason) VALUES (?, ?, ?)`,
      [id, userId, String(reason).trim()]
    );

    return NextResponse.json({
      ok: true,
      message: "申請を送信しました。管理者の承認後、通知でお知らせします。",
    });
  }

  return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
}
