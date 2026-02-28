import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  try {
    const rows = await query<{
      id: string; username: string; display_name: string; role: string;
      status: string; clearance_level: number; anomaly_score: number;
      division_name: string; division_slug: string;
      xp_total: number; login_count: number; last_login_at: string; created_at: string;
    }>(db, `
      SELECT
        u.id, u.username, u.display_name, u.role, u.status,
        u.clearance_level, u.anomaly_score,
        d.name AS division_name, d.slug AS division_slug,
        COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
          WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total,
        u.login_count, u.last_login_at, u.created_at
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `);
    return NextResponse.json(rows.map(u => ({
      id: u.id,
      agentId: u.username,
      name: u.display_name || u.username,
      role: u.role,
      status: u.status,
      level: u.clearance_level,
      xp: Number(u.xp_total || 0),
      anomalyScore: u.anomaly_score || 0,
      division: u.division_slug || "",
      divisionName: u.division_name || "",
      loginCount: u.login_count || 0,
      lastLogin: u.last_login_at,
      createdAt: u.created_at,
    })));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
