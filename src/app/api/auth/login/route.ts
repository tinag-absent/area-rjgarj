import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { agentId, password } = await req.json().catch(() => ({}));
  if (!agentId || !password) {
    return NextResponse.json({ error: "agentId と password は必須です" }, { status: 400 });
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
      role: string; status: string; clearance_level: number; division_slug: string;
      division_name: string; anomaly_score: number; observer_load: number;
      xp_total: number; last_login_at: string; login_count: number;
    }>(db, `
      SELECT u.id, u.username AS agent_id, u.display_name, u.password_hash,
             u.role, u.status, u.clearance_level, u.anomaly_score, u.observer_load,
             u.last_login_at, u.login_count,
             d.slug AS division_slug, d.name AS division_name,
             COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
               WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total
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

    const valid = await verifyPassword(password, dbUser.password_hash);
    if (!valid) {
      await recordLoginAttempt(ip, agentId, false);
      return NextResponse.json({ error: "IDまたはパスキーが正しくありません。" }, { status: 401 });
    }

    // Update last login
    const newStatus = dbUser.status === "pending_verification" ? "active" : dbUser.status;
    await execute(db,
      `UPDATE users SET last_login_at = datetime('now'), login_count = login_count + 1, status = ? WHERE id = ?`,
      [newStatus, dbUser.id]
    );

    // ログイン成功：レート制限カウンターをリセット
    await recordLoginAttempt(ip, agentId, true);

    // 初回ログインXP付与
    const isFirstLogin = dbUser.login_count === 0;
    if (isFirstLogin) {
      await execute(db, `
        INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, 'total_xp', 50)
        ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + 50
      `, [dbUser.id]);
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
      level: dbUser.clearance_level,
    });

    const user = {
      id: dbUser.agent_id,
      _uuid: dbUser.id,
      name: dbUser.display_name || dbUser.agent_id,
      role: dbUser.role,
      status: newStatus,
      level: dbUser.clearance_level,
      xp: Number(dbUser.xp_total || 0),
      division: dbUser.division_slug || "",
      divisionName: dbUser.division_name || "",
      anomalyScore: dbUser.anomaly_score || 0,
      observerLoad: dbUser.observer_load || 0,
      lastLogin: new Date().toISOString(),
      loginCount: (dbUser.login_count || 0) + 1,
      streak: 0,
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
