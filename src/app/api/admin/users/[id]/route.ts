import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

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
      }>(db, `
        SELECT u.id, u.username, u.display_name, u.role, u.status,
          u.clearance_level, u.anomaly_score, u.observer_load,
          d.slug AS division_slug, d.name AS division_name,
          COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
            WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total,
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
      createdAt: u.created_at, flags, variables,
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
  const { role, status, clearanceLevel, anomalyScore, displayName } = await req.json().catch(() => ({}));
  const db = getDb();
  try {
    await execute(db, `
      UPDATE users SET
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        clearance_level = COALESCE(?, clearance_level),
        anomaly_score = COALESCE(?, anomaly_score),
        display_name = COALESCE(?, display_name)
      WHERE id = ? AND deleted_at IS NULL
    `, [role || null, status || null, clearanceLevel ?? null, anomalyScore ?? null, displayName || null, id]);
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
    await execute(db, `UPDATE users SET deleted_at = datetime('now') WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
