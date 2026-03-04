/**
 * /api/auth/secret-question
 *
 * GET  ?agentId=K-XXX-XXX
 *   → 秘密の質問テキストを返す（回答ハッシュは返さない）
 *
 * POST { agentId, answer, newPassword }
 *   → 回答を検証し、正しければパスワードをリセットして JWT を発行
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, queryOne, execute } from "@/lib/db";
import { verifyPassword, hashPassword, signToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/server-auth";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";

// ── GET ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId は必須です" }, { status: 400 });
  }

  const db = getDb();
  const user = await queryOne<{ secret_question: string | null }>(
    db,
    `SELECT secret_question FROM users
     WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
    [agentId]
  );

  // ユーザーが存在しない場合も同じレスポンスを返す（列挙防止）
  if (!user || !user.secret_question) {
    return NextResponse.json(
      { error: "このIDの秘密の質問が設定されていません。管理者に連絡してください。" },
      { status: 404 }
    );
  }

  return NextResponse.json({ question: user.secret_question });
}

// ── POST ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { agentId, answer, newPassword } = await req.json().catch(() => ({}));

  if (!agentId || !answer || !newPassword) {
    return NextResponse.json(
      { error: "agentId・回答・新しいパスキーはすべて必須です" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "パスキーは最低8文字必要です" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const rateLimitResult = await checkLoginRateLimit(ip, agentId);
  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.retryAfterSeconds ?? 900;
    return NextResponse.json(
      { error: `試行回数が上限に達しました。${Math.ceil(retryAfter / 60)}分後に再試行してください。` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const db = getDb();

  const user = await queryOne<{
    id: string;
    username: string;
    role: string;
    clearance_level: number;
    status: string;
    secret_answer_hash: string | null;
  }>(db,
    `SELECT id, username, role, clearance_level, status, secret_answer_hash
     FROM users
     WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
    [agentId]
  );

  if (!user || !user.secret_answer_hash) {
    await recordLoginAttempt(ip, agentId, false);
    return NextResponse.json(
      { error: "IDまたは回答が正しくありません。" },
      { status: 401 }
    );
  }

  if (user.status === "banned") {
    return NextResponse.json({ error: "このアカウントはアクセス禁止です。" }, { status: 403 });
  }

  // 回答を正規化してハッシュ検証（小文字 + trim）
  const normalizedAnswer = answer.trim().toLowerCase();
  const valid = await verifyPassword(normalizedAnswer, user.secret_answer_hash);

  if (!valid) {
    await recordLoginAttempt(ip, agentId, false);
    return NextResponse.json({ error: "IDまたは回答が正しくありません。" }, { status: 401 });
  }

  // パスワードリセット
  const newHash = await hashPassword(newPassword);
  await execute(db,
    `UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?`,
    [newHash, user.id]
  );

  await recordLoginAttempt(ip, agentId, true);

  // JWT 発行してそのままログイン状態にする
  const jwt = signToken({
    userId: user.id,
    agentId: user.username,
    role: user.role as "player" | "admin" | "super_admin",
    level: user.clearance_level,
  });

  const res = NextResponse.json({ ok: true, agentId: user.username });
  setAuthCookie(res, jwt);
  return res;
}

// ── PATCH（ログイン済みユーザーが自分の秘密の質問を変更）─────────────────

export async function PATCH(req: NextRequest) {
  // セッション確認
  const { getSessionFromCookie } = await import("@/lib/session");
  const token = req.cookies.get("kai_token")?.value;
  const session = token ? await getSessionFromCookie(token) : null;
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // CSRF対策
  if (req.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  }

  const { currentPassword, newQuestion, newAnswer } = await req.json().catch(() => ({}));

  if (!currentPassword || !newQuestion || !newAnswer) {
    return NextResponse.json(
      { error: "現在のパスワード・新しい質問・新しい回答はすべて必須です" },
      { status: 400 }
    );
  }
  if (newAnswer.trim().length < 1) {
    return NextResponse.json({ error: "回答を入力してください" }, { status: 400 });
  }

  const db = getDb();
  const { verifyPassword, hashPassword } = await import("@/lib/auth");

  const user = await queryOne<{ password_hash: string }>(
    db,
    `SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [session.userId]
  );

  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  // 現在のパスワードで本人確認
  const pwValid = await verifyPassword(currentPassword, user.password_hash);
  if (!pwValid) {
    return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 403 });
  }

  const newAnswerHash = await hashPassword(newAnswer.trim().toLowerCase());
  await execute(db,
    `UPDATE users SET secret_question = ?, secret_answer_hash = ? WHERE id = ?`,
    [newQuestion, newAnswerHash, session.userId]
  );

  return NextResponse.json({ ok: true, message: "秘密の質問を更新しました" });
}

// ── PATCH ─────────────────────────────────────────────────────────────────
// ログイン済みユーザーが自分の秘密の質問・回答を変更する

export async function PATCH(req: NextRequest) {
  // セッション確認
  const token = req.cookies.get("kai_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { verifyToken } = await import("@/lib/auth");
  const session = verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: "セッションが無効です" }, { status: 401 });
  }

  const { currentPassword, newQuestion, newAnswer } = await req.json().catch(() => ({}));

  if (!currentPassword || !newQuestion || !newAnswer) {
    return NextResponse.json(
      { error: "現在のパスキー・新しい質問・回答はすべて必須です" },
      { status: 400 }
    );
  }
  if (newAnswer.trim().length < 1) {
    return NextResponse.json({ error: "回答を入力してください" }, { status: 400 });
  }

  const db = getDb();

  const user = await queryOne<{ id: string; password_hash: string }>(
    db,
    `SELECT id, password_hash FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [session.userId]
  );

  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const { verifyPassword, hashPassword } = await import("@/lib/auth");
  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "現在のパスキーが正しくありません" }, { status: 401 });
  }

  const newAnswerHash = await hashPassword(newAnswer.trim().toLowerCase());

  await execute(db,
    `UPDATE users SET secret_question = ?, secret_answer_hash = ? WHERE id = ?`,
    [newQuestion, newAnswerHash, user.id]
  );

  return NextResponse.json({ ok: true });
}
