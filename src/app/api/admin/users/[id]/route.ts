import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { calculateLevel } from "@/lib/constants";
import { sanitizeDisplayText } from "@/lib/sanitize";

// [FIX #600] 管理操作の audit log ヘルパー
async function auditLog(
  db: ReturnType<typeof getDb>,
  adminId: string,
  action: string,
  targetId: string,
  detail: string
) {
  execute(db,
    `INSERT INTO access_logs (user_id, method, path, status_code, ip_address, created_at)
     VALUES (?, 'ADMIN', ?, 200, ?, datetime('now'))`,
    [adminId, `/admin/users/${targetId}:${action}`, detail.slice(0, 500)]
  ).catch(() => {});
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const db = getDb();
  try {
    const [userRows, flagRows, varRows, eventRows] = await Promise.all([
      query<{
        id: string; username: string; display_name: string; role: string; status: string;
        clearance_level: number; anomaly_score: number; observer_load: number;
        division_slug: string; division_name: string; xp_total: number;
        login_count: number; consecutive_login_days: number;
        last_login_at: string; created_at: string;
        secret_question: string | null;
      }>(db, `
        SELECT u.id, u.username, u.display_name, u.role, u.status,
          u.clearance_level, u.anomaly_score, u.observer_load,
          u.secret_question,
          d.slug AS division_slug, d.name AS division_name,
          COALESCE(u.xp_total, 0) AS xp_total,
          u.login_count, u.consecutive_login_days, u.last_login_at, u.created_at
        FROM users u LEFT JOIN divisions d ON d.id = u.division_id
        WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1
      `, [id]),
      query<{ flag_key: string; flag_value: string }>(db,
        `SELECT flag_key, flag_value FROM progress_flags WHERE user_id = ? ORDER BY flag_key`, [id]),
      query<{ var_key: string; var_value: number }>(db,
        `SELECT var_key, var_value FROM story_variables WHERE user_id = ? ORDER BY var_key`, [id]),
      query<{ event_id: string; fired_at: string }>(db,
        `SELECT event_id, fired_at FROM fired_events WHERE user_id = ? ORDER BY fired_at DESC LIMIT 50`, [id]),
    ]);
    if (!userRows[0]) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const u = userRows[0];
    const flags: Record<string, unknown> = {};
    flagRows.forEach(r => { try { flags[r.flag_key] = JSON.parse(r.flag_value); } catch { flags[r.flag_key] = r.flag_value; } });
    const variables: Record<string, number> = {};
    varRows.forEach(r => { variables[r.var_key] = parseFloat(String(r.var_value)); });
    return NextResponse.json({
      id: u.id, agentId: u.username, name: u.display_name || u.username,
      role: u.role, status: u.status, level: u.clearance_level,
      xp: Number(u.xp_total || 0), anomalyScore: u.anomaly_score || 0,
      observerLoad: u.observer_load || 0, division: u.division_slug || "",
      divisionName: u.division_name || "", loginCount: u.login_count || 0,
      streak: u.consecutive_login_days || 0, lastLogin: u.last_login_at,
      createdAt: u.created_at, secretQuestion: u.secret_question ?? null, flags, variables,
      events: eventRows.map(e => ({ id: e.event_id, firedAt: e.fired_at })),
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  // [FIX] id を UUID 形式で検証
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "無効なユーザー ID です" }, { status: 400 });
  }

  const { role, status, clearanceLevel, anomalyScore, displayName: rawDisplayName, clearSecretQuestion, xpTotal } =
    await req.json().catch(() => ({}));

  // [FIX-C13] displayName をサニタイズ
  const displayName = rawDisplayName !== undefined ? sanitizeDisplayText(rawDisplayName) : undefined;

  // [AB-006/Z-009] ロールのホワイトリスト — admin は super_admin に昇格させられない
  const ALLOWED_ROLES = ["player", "admin", "observer"];
  if (role && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "無効なロールです" }, { status: 400 });
  }
  // [FIX] status のホワイトリスト検証
  const ALLOWED_STATUSES = ["active", "inactive", "suspended", "banned"];
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
  }
  // [Z-009] clearanceLevel / anomalyScore の範囲バリデーション
  if (clearanceLevel !== undefined && clearanceLevel !== null) {
    if (!Number.isInteger(clearanceLevel) || clearanceLevel < 0 || clearanceLevel > 5) {
      return NextResponse.json({ error: "clearanceLevelは0〜5の整数で指定してください" }, { status: 400 });
    }
  }
  if (anomalyScore !== undefined && anomalyScore !== null) {
    if (typeof anomalyScore !== "number" || anomalyScore < 0 || anomalyScore > 100) {
      return NextResponse.json({ error: "anomalyScoreは0〜100の数値で指定してください" }, { status: 400 });
    }
  }

  const db = getDb();
  try {
    // [P-003] xpTotal が指定された場合は xp_total と clearance_level を更新（XP基準で計算）
    if (typeof xpTotal === "number" && xpTotal >= 0) {
      // [FIX] XP 上限チェック（天文学的な値でのDB汚染防止）
      const MAX_XP = 1_000_000;
      if (!Number.isFinite(xpTotal) || xpTotal > MAX_XP) {
        return NextResponse.json({ error: `xpTotal は ${MAX_XP} 以下にしてください` }, { status: 400 });
      }
      const newLevel = calculateLevel(xpTotal);
      await execute(db, `
        UPDATE users SET xp_total = ?, clearance_level = ? WHERE id = ? AND deleted_at IS NULL
      `, [xpTotal, newLevel, id]);
      await auditLog(db, auth.user.userId, "SET_XP", id, JSON.stringify({ xpTotal, newLevel }));
    }

    // [FIX BUG#24] xpTotalとclearanceLevelを同時送信した場合の競合を解消。
    // xpTotalが指定されている場合はclearanceLevelを第2UPDATEに渡さない（上のUPDATEで確定済み）。
    // clearanceLevelのみ指定した場合も、DB上のxp_totalとの整合性チェックを行う。
    let resolvedClearanceLevel: number | null = null;
    if (typeof xpTotal !== "number") {
      if (clearanceLevel !== undefined && clearanceLevel !== null) {
        // DBの現在xp_totalと照合して、XPが足りないレベルへの強制変更を警告
        const currentRow = await query<{ xp_total: number }>(db,
          `SELECT xp_total FROM users WHERE id = ? LIMIT 1`, [id]
        );
        const currentXp = currentRow[0]?.xp_total ?? 0;
        const xpBasedLevel = calculateLevel(currentXp);
        // XPで計算されるレベルと乖離が2以上ある場合は拒否（不正な手動上書き防止）
        if (Math.abs(clearanceLevel - xpBasedLevel) > 2) {
          return NextResponse.json(
            { error: `XP(${currentXp})と整合しないclearanceLevelです（XP基準レベル: ${xpBasedLevel}）` },
            { status: 400 }
          );
        }
        resolvedClearanceLevel = clearanceLevel;
      }
    }

    await execute(db, `
      UPDATE users SET
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        clearance_level = COALESCE(?, clearance_level),
        anomaly_score = COALESCE(?, anomaly_score),
        display_name = COALESCE(?, display_name),
        secret_question = CASE WHEN ? THEN NULL ELSE secret_question END,
        secret_answer_hash = CASE WHEN ? THEN NULL ELSE secret_answer_hash END
      WHERE id = ? AND deleted_at IS NULL
    `, [
      role || null, status || null, resolvedClearanceLevel,
      anomalyScore ?? null, displayName || null,
      clearSecretQuestion ? 1 : 0, clearSecretQuestion ? 1 : 0,
      id,
    ]);
    // [FIX #600] 管理者によるユーザー編集を audit log に記録
    await auditLog(db, auth.user.userId, "UPDATE", id,
      JSON.stringify({ role, status, clearanceLevel, anomalyScore, displayName, clearSecretQuestion }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const db = getDb();
  try {
    // [AB-007] admin/super_admin ユーザーは削除不可（自分自身の削除も防止）
    if (id === auth.user.userId) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 403 });
    }
    const targetRows = await query<{ role: string }>(db,
      `SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]
    );
    const targetRole = targetRows[0]?.role;
    if (targetRole === "admin" || targetRole === "super_admin") {
      return NextResponse.json({ error: "管理者ユーザーは削除できません" }, { status: 403 });
    }
    await execute(db, `UPDATE users SET deleted_at = datetime('now') WHERE id = ?`, [id]);
    // [FIX #600] 管理者によるユーザー削除（論理削除）を audit log に記録
    await auditLog(db, auth.user.userId, "DELETE", id, `soft-delete user ${id}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
