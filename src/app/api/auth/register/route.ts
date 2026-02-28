import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { AGENT_ID_REGEX } from "@/lib/constants";
import { sanitizeDisplayText } from "@/lib/sanitize";

/** メール認証済みトークンを消費して email を返す */
async function consumeEmailToken(
  token: string,
  purpose: string
): Promise<string | null> {
  const db = getDb();
  // テーブルが存在しない場合は作成（マイグレーション未実行環境対応）
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
  const rows = await query<{
    email: string;
    expires_at: string;
    used: number;
  }>(db,
    `SELECT email, expires_at, used FROM email_verified_tokens
     WHERE token = ? AND purpose = ? LIMIT 1`,
    [token, purpose]
  );
  if (!rows.length) return null;
  const row = rows[0];
  if (row.used || new Date(row.expires_at) < new Date()) return null;
  await execute(db, `UPDATE email_verified_tokens SET used = 1 WHERE token = ?`, [token]);
  return row.email;
}

export async function POST(req: NextRequest) {
  const {
    agentId,
    name: rawName,
    password,
    division,
    emailToken,
  } = await req.json().catch(() => ({}));

  const name = sanitizeDisplayText(rawName);

  if (!agentId || !name || !password || !division) {
    return NextResponse.json({ error: "全フィールドは必須です" }, { status: 400 });
  }
  if (!AGENT_ID_REGEX.test(agentId)) {
    return NextResponse.json(
      { error: "機関員IDの形式が正しくありません (X-XXX-XXX)" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "パスキーは最低8文字必要です" }, { status: 400 });
  }
  if (name.length > 50) {
    return NextResponse.json({ error: "名前は50文字以内にしてください" }, { status: 400 });
  }

  // ── メール認証チェック ──────────────────────────────────
  if (!emailToken) {
    return NextResponse.json(
      { error: "メール認証が完了していません" },
      { status: 400 }
    );
  }

  const verifiedEmail = await consumeEmailToken(emailToken, "register");
  if (!verifiedEmail) {
    return NextResponse.json(
      { error: "メール認証トークンが無効または期限切れです。もう一度メール認証を行ってください。" },
      { status: 401 }
    );
  }
  // ──────────────────────────────────────────────────────

  try {
    const db = getDb();

    const exists = await query(db,
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (exists.length > 0) {
      return NextResponse.json(
        { error: "この機関員IDは既に使用されています" },
        { status: 409 }
      );
    }

    // メールアドレス重複チェック
    const emailExists = await query(db,
      `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [verifiedEmail]
    );
    if (emailExists.length > 0) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 409 }
      );
    }

    const divRows = await query<{ id: string }>(db,
      `SELECT id FROM divisions WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [division]
    );
    const divisionId = divRows.length > 0 ? divRows[0].id : null;

    const passwordHash = await hashPassword(password);
    const newId = crypto.randomUUID();

    await execute(db, `
      INSERT INTO users (id, username, email, password_hash, display_name, role, status,
                         clearance_level, division_id, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, 'player', 'active', 0, ?, 1, datetime('now'))
    `, [newId, agentId, verifiedEmail, passwordHash, name, divisionId]);

    return NextResponse.json({
      user: {
        id: agentId, _uuid: newId, name,
        role: "player", level: 0, xp: 0,
        division, registeredAt: new Date().toISOString(),
      }
    }, { status: 201 });
  } catch (err) {
    console.error("[register] エラー:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "この機関員IDは既に使用されています" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
