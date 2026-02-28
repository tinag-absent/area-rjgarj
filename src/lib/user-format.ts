/**
 * lib/user-format.ts — ユーザーレコードのフォーマット共通ユーティリティ
 * /api/users/me と /api/auth/login の両方で同一ロジックが使われていた
 */
import type { Client } from "@libsql/client";
import { query } from "./db";

export interface FormattedUser {
  id: string;
  _uuid: string;
  name: string;
  role: string;
  status: string;
  level: number;
  xp: number;
  division: string;
  divisionName: string;
  anomalyScore: number;
  observerLoad: number;
  lastLogin: string | null;
  loginCount: number;
  streak: number;
}

export async function fetchAndFormatUser(
  db: Client,
  userId: string
): Promise<FormattedUser | null> {
  const rows = await query<{
    id: string; agent_id: string; display_name: string; avatar_url: string;
    role: string; status: string; clearance_level: number; anomaly_score: number;
    observer_load: number; login_count: number; consecutive_login_days: number;
    last_daily_bonus_at: string; last_login_at: string; created_at: string;
    division_slug: string; division_name: string; xp_total: number;
  }>(db, `
    SELECT u.id, u.username AS agent_id, u.display_name, u.avatar_url,
           u.role, u.status, u.clearance_level, u.anomaly_score, u.observer_load,
           u.login_count, u.consecutive_login_days, u.last_daily_bonus_at,
           u.last_login_at, u.created_at,
           d.slug AS division_slug, d.name AS division_name,
           COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
             WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total
    FROM users u
    LEFT JOIN divisions d ON d.id = u.division_id
    WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1
  `, [userId]);

  const u = rows[0];
  if (!u) return null;

  return {
    id: u.agent_id,
    _uuid: u.id,
    name: u.display_name || u.agent_id,
    role: u.role,
    status: u.status,
    level: u.clearance_level,
    xp: parseInt(String(u.xp_total || 0)),
    division: u.division_slug || "",
    divisionName: u.division_name || "",
    anomalyScore: u.anomaly_score || 0,
    observerLoad: u.observer_load || 0,
    lastLogin: u.last_login_at,
    loginCount: u.login_count || 0,
    streak: u.consecutive_login_days || 0,
  };
}
