/**
 * POST /api/auth/register
 * 新規登録 → 秘密の質問を保存 → 即時アクティベート（メール認証不要）
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { AGENT_ID_REGEX } from "@/lib/constants";
import { sanitizeDisplayText } from "@/lib/sanitize";
import { checkRegisterRateLimit, recordRegisterAttempt } from "@/lib/rate-limit";
import { signToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/server-auth";

/** 秘密の回答をハッシュ化（パスワードと同じbcryptを流用） */
async function hashSecretAnswer(answer: string): Promise<string> {
  return hashPassword(answer.trim().toLowerCase());
}

export async function POST(req: NextRequest) {
  const {
    agentId,
    name: rawName,
    password,
    division,
    secretQuestion,
    secretAnswer,
  } = await req.json().catch(() => ({}));

  const name = sanitizeDisplayText(rawName);

  if (!agentId || !name || !password || !division || !secretQuestion || !secretAnswer)
    return NextResponse.json({ error: "全フィールドは必須です" }, { status: 400 });
  if (!AGENT_ID_REGEX.test(agentId))
    return NextResponse.json({ error: "機関員IDの形式が正しくありません (K-XXX-XXX)" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "パスキーは最低8文字必要です" }, { status: 400 });
  // [FIX] パスワード上限チェック（bcrypt は72バイト以上を切り捨てるが、非常に長い入力はハッシュ化処理が重くなる）
  if (password.length > 256)
    return NextResponse.json({ error: "パスキーは256文字以内にしてください" }, { status: 400 });
  if (name.length > 50)
    return NextResponse.json({ error: "名前は50文字以内にしてください" }, { status: 400 });
  if (secretAnswer.trim().length < 1)
    return NextResponse.json({ error: "秘密の質問の回答を入力してください" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const rateLimitResult = await checkRegisterRateLimit(ip);
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
      await recordRegisterAttempt(ip, false);
      // [AC-010] エージェントIDの存在を具体的に開示しない（情報漏洩防止）
      return NextResponse.json({ error: "登録情報に問題があります。別の機関員IDをお試しください" }, { status: 409 });
    }

    const divRows = await query<{ id: string; name: string }>(db,
      `SELECT id, name FROM divisions WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [division]
    );
    // [FIX-L08] division が必須フィールドのため、存在しない場合は 400 を返す
    if (divRows.length === 0) {
      return NextResponse.json({ error: "指定された部署が存在しないか無効です" }, { status: 400 });
    }
    const divisionId = divRows[0].id;

    const passwordHash = await hashPassword(password);
    const secretAnswerHash = await hashSecretAnswer(secretAnswer);
    const newId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // emailカラムが存在する場合はダミー値を設定（NULL許容でない場合の互換）
    await execute(db, `
      INSERT INTO users (
        id, username, email, password_hash, display_name, role, status,
        clearance_level, division_id, email_verified,
        secret_question, secret_answer_hash, created_at
      )
      VALUES (?, ?, ?, ?, ?, 'player', 'active', 0, ?, 1, ?, ?, datetime('now'))
    `, [newId, agentId, `${agentId.toLowerCase()}@kaishoku.local`, passwordHash, name,
        divisionId, secretQuestion, secretAnswerHash]);

    await recordRegisterAttempt(ip, true);

    // 登録後そのままJWTを発行してダッシュボードへ
    const jwt = signToken({
      userId: newId,
      agentId,
      role: "player",
      level: 0,
    });

    // [FIX-REG-01] auth/login と同形式の user オブジェクトを返す。
    // LoginForm.tsx が setUser(data.user) を呼ぶため、user が含まれていないと
    // ダッシュボードで未認証扱いになりログインできない状態になる。
    const user = {
      id:           agentId,
      agentId,
      name,
      role:         "player" as const,
      status:       "active" as const,
      level:        0,
      xp:           0,
      division,
      divisionName: divRows[0].name ?? division,
      anomalyScore: 0,
      observerLoad: 0,
      lastLogin:    nowIso,
      loginCount:   1,
      streak:       0,
      createdAt:    nowIso,
    };

    const res = NextResponse.json({
      ok:   true,
      agentId,
      user,
    }, { status: 201 });
    setAuthCookie(res, jwt);
    return res;

  } catch (err) {
    console.error("[register] エラー:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE")) {
      await recordRegisterAttempt(ip, false);
      return NextResponse.json({ error: "登録情報に問題があります。別の機関員IDをお試しください" }, { status: 409 });
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
