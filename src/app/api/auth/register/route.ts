/**
 * POST /api/auth/register
 * 新規登録 → メール認証トークン発行 → 仮登録状態で保存
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { AGENT_ID_REGEX } from "@/lib/constants";
import { sanitizeDisplayText } from "@/lib/sanitize";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { agentId, name: rawName, password, division, email } = await req.json().catch(() => ({}));
  const name = sanitizeDisplayText(rawName);

  if (!agentId || !name || !password || !division || !email)
    return NextResponse.json({ error: "全フィールドは必須です" }, { status: 400 });
  if (!AGENT_ID_REGEX.test(agentId))
    return NextResponse.json({ error: "機関員IDの形式が正しくありません (K-XXX-XXX)" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "パスキーは最低8文字必要です" }, { status: 400 });
  if (name.length > 50)
    return NextResponse.json({ error: "名前は50文字以内にしてください" }, { status: 400 });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(email))
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const rateLimitResult = await checkLoginRateLimit(ip, agentId);
  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.retryAfterSeconds ?? 900;
    return NextResponse.json(
      { error: `登録試行回数が上限に達しました。${Math.ceil(retryAfter / 60)}分後に再試行してください。` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const db = getDb();

    const existsById = await query(db,
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (existsById.length > 0) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ error: "この機関員IDは既に使用されています" }, { status: 409 });
    }

    const existsByEmail = await query(db,
      `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [email]
    );
    if (existsByEmail.length > 0) {
      return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
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
      VALUES (?, ?, ?, ?, ?, 'player', 'pending', 0, ?, 0, datetime('now'))
    `, [newId, agentId, email, passwordHash, name, divisionId]);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tokenId = crypto.randomUUID();

    await execute(db,
      `INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [tokenId, newId, token, expiresAt]
    );

    const forwardedHost = req.headers.get("x-forwarded-host");
    const origin = forwardedHost
      ? `https://${forwardedHost}`
      : req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;

    await sendVerificationEmail(email, agentId, verifyUrl);
    await recordLoginAttempt(ip, agentId, true);

    return NextResponse.json({
      ok: true,
      message: "認証メールを送信しました。メールボックスをご確認ください。",
      agentId,
    }, { status: 201 });

  } catch (err) {
    console.error("[register] エラー:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE")) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ error: "この機関員IDまたはメールアドレスは既に使用されています" }, { status: 409 });
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
