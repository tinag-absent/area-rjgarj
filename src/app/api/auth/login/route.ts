import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { calculateLevel } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { agentId, password } = await req.json().catch(() => ({}));
  if (!agentId || !password) {
    return NextResponse.json({ error: "agentId と password は必須です" }, { status: 400 });
  }

  // [FIX-SCAN-02] 入力長さ制限を追加（bcrypt DoS 防止: 非常に長いパスワードはハッシュ化に時間がかかる）
  if (typeof agentId !== "string" || agentId.length > 32) {
    return NextResponse.json({ error: "IDまたはパスキーが正しくありません。" }, { status: 401 });
  }
  if (typeof password !== "string" || password.length > 256) {
    return NextResponse.json({ error: "IDまたはパスキーが正しくありません。" }, { status: 401 });
  }

  // レート制限チェック
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const rateLimitResult = await checkLoginRateLimit(ip, agentId);
  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.retryAfterSeconds ?? 900;
    return NextResponse.json(
      { error: `ログイン試行回数が上限に達しました。${Math.ceil(retryAfter / 60)}分後に再試行してください。` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + retryAfter),
        },
      }
    );
  }

  try {
    const db = getDb();
    const rows = await query<{
      id: string; agent_id: string; display_name: string; password_hash: string;
      role: string; status: "active" | "inactive" | "suspended" | "banned" | "pending" | "pending_verification"; clearance_level: number; division_slug: string;
      division_name: string; anomaly_score: number; observer_load: number;
      xp_total: number; last_login_at: string | null; login_count: number; consecutive_login_days: number;
      created_at: string;
    }>(db, `
      SELECT u.id, u.username AS agent_id, u.display_name, u.password_hash,
             u.role, u.status, u.clearance_level, u.anomaly_score, u.observer_load,
             u.last_login_at, u.login_count, u.consecutive_login_days, u.created_at,
             d.slug AS division_slug, d.name AS division_name,
             COALESCE(u.xp_total, 0) AS xp_total
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE LOWER(u.username) = LOWER(?) AND u.deleted_at IS NULL
      LIMIT 1
    `, [agentId]);

    if (!rows.length) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ error: "IDまたはパスキーが正しくありません。" }, { status: 401 });
    }

    const dbUser = rows[0];
    if (dbUser.status === "banned")
      return NextResponse.json({ error: "このアカウントはアクセス禁止です。" }, { status: 403 });
    if (dbUser.status === "suspended")
      return NextResponse.json({ error: "このアカウントは一時停止中です。" }, { status: 403 });
    if (dbUser.status === "pending")
      return NextResponse.json({ error: "このアカウントは審査中です。管理者にお問い合わせください。" }, { status: 403 });
    // [FIX #152] inactive ユーザーもログインをブロックする
    if (dbUser.status === "inactive")
      return NextResponse.json({ error: "このアカウントは無効化されています。管理者にお問い合わせください。" }, { status: 403 });
    // [FIX-H11] pending_verification はパスワード検証後にのみ active に昇格させる
    // ここでは早期リターンせず、下のパスワード検証ステップで処理する

    const valid = await verifyPassword(password, dbUser.password_hash);
    if (!valid) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ error: "IDまたはパスキーが正しくありません。" }, { status: 401 });
    }

    // [BUG-01/03 FIX] last_login_at の更新は me/login に一本化するため、ここでは
    // status と login_count のみ更新する。last_login_at を更新しないことで
    // me/login が「前回ログイン日時」を正しく読める。
    const newStatus = dbUser.status === "pending_verification" ? "active" : dbUser.status;
    await execute(db,
      `UPDATE users SET status = ?, login_count = login_count + 1 WHERE id = ?`,
      [newStatus, dbUser.id]
    );

    // ログイン成功：レート制限カウンターをリセット
    await recordLoginAttempt(ip, agentId, true);

    // [BUG-02 FIX] 初回ログインXP付与は me/login の firstLoginBonus に一本化。
    // ここで付与すると me/login との二重付与が発生するため削除。

    // [BUG-03 FIX] JWTのlevelはDB上の最新 clearance_level を使う。
    // xp_total は me/login で加算されるが、ログイン直後時点では現在値で発行し、
    // me/login 呼び出し後にレベルアップがあれば me/login 側で再発行する。
    const currentLevel = calculateLevel(dbUser.xp_total);
    if (currentLevel !== dbUser.clearance_level) {
      // XPと乖離していた場合に修正
      await execute(db,
        `UPDATE users SET clearance_level = ? WHERE id = ?`,
        [currentLevel, dbUser.id]
      );
    }

    // Log access
    execute(db,
      `INSERT INTO access_logs (user_id, method, path, status_code) VALUES (?, 'POST', '/api/auth/login', 200)`,
      [dbUser.id]
    ).catch(() => {});

    const token = signToken({
      userId: dbUser.id,
      agentId: dbUser.agent_id,
      role: dbUser.role,
      level: currentLevel,
    });

    const user = {
      id: dbUser.agent_id,
      agentId: dbUser.agent_id,
      name: dbUser.display_name || dbUser.agent_id,
      role: dbUser.role,
      status: newStatus,
      level: currentLevel,
      xp: Number(dbUser.xp_total || 0),
      division: dbUser.division_slug || "",
      divisionName: dbUser.division_name || "",
      anomalyScore: dbUser.anomaly_score || 0,
      observerLoad: dbUser.observer_load || 0,
      // [BUG-01 FIX] last_login_at はまだ更新されていない（me/loginで更新する）
      // ここではDB上の「前回ログイン時刻」をそのまま返す
      lastLogin: dbUser.last_login_at || new Date().toISOString(),
      loginCount: (dbUser.login_count || 0) + 1,
      streak: dbUser.consecutive_login_days || 0,
      createdAt: dbUser.created_at || new Date().toISOString(),
    };

    const res = NextResponse.json({ success: true, user });
    res.cookies.set("kai_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[login] エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
