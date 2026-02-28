import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import DashboardClient from "./DashboardClient";

async function getDashboardData(userId: string) {
  const db = getDb();
  const [userRows, notifRows] = await Promise.all([
    query<{
      agent_id: string; id: string; display_name: string;
      role: string; status: string; clearance_level: number;
      division_id: string; division_slug: string; division_name: string;
      anomaly_score: number; observer_load: number;
      login_count: number; consecutive_login_days: number;
      last_login_at: string; last_daily_bonus_at: string; xp_total: number;
    }>(db, `
      SELECT u.id, u.username AS agent_id, u.display_name, u.role, u.status,
             u.clearance_level, u.anomaly_score, u.observer_load,
             u.login_count, u.consecutive_login_days,
             u.last_login_at, u.last_daily_bonus_at,
             u.division_id,
             d.slug AS division_slug, d.name AS division_name,
             COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
               WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1
    `, [userId]),
    query<{ id: number; type: string; title: string; body: string; is_read: number; created_at: string }>(
      db,
      `SELECT id, type, title, body, is_read, created_at FROM notifications
       WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    ),
  ]);

  const user = userRows[0] || null;
  
  // 同部門メンバー取得
  let divisionMembers: { agentId: string; name: string; level: number }[] = [];
  if (user?.division_id) {
    const memberRows = await query<{ agent_id: string; display_name: string; clearance_level: number }>(db, `
      SELECT u.username AS agent_id, u.display_name, u.clearance_level
      FROM users u
      WHERE u.division_id = ? AND u.deleted_at IS NULL AND u.status = 'active'
      ORDER BY u.clearance_level DESC, u.username ASC
      LIMIT 20
    `, [user.division_id]).catch(() => []);
    divisionMembers = memberRows.map(m => ({
      agentId: m.agent_id,
      name: m.display_name || m.agent_id,
      level: m.clearance_level,
    }));
  }

  return { user, notifications: notifRows, divisionMembers };
}

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id")!;
  const { user, notifications, divisionMembers } = await getDashboardData(userId);

  if (!user) return <div>ユーザーデータの読み込みに失敗しました</div>;

  const formattedUser = {
    id: user.agent_id,
    _uuid: user.id,
    name: user.display_name || user.agent_id,
    role: user.role,
    status: user.status,
    level: user.clearance_level,
    xp: Number(user.xp_total || 0),
    division: user.division_slug || "",
    divisionName: user.division_name || "",
    anomalyScore: user.anomaly_score || 0,
    observerLoad: user.observer_load || 0,
    lastLogin: user.last_login_at,
    lastDailyBonus: user.last_daily_bonus_at,
    loginCount: user.login_count || 0,
    streak: user.consecutive_login_days || 0,
  };

  return <DashboardClient user={formattedUser} notifications={notifications} divisionMembers={divisionMembers} />;
}
