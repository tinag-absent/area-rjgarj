import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

async function getAdminData(userId: string) {
  const db = getDb();
  const userRows = await query<{
    id: string; username: string; display_name: string; role: string;
    status: string; clearance_level: number; anomaly_score: number;
    observer_load: number; division_slug: string; division_name: string;
    xp_total: number; login_count: number; consecutive_login_days: number;
    last_login_at: string; created_at: string;
  }>(db, `
    SELECT u.id, u.username, u.display_name, u.role, u.status,
           u.clearance_level, u.anomaly_score, u.observer_load,
           d.slug AS division_slug, d.name AS division_name,
           COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
             WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total,
           u.login_count, u.consecutive_login_days, u.last_login_at, u.created_at
    FROM users u
    LEFT JOIN divisions d ON d.id = u.division_id
    WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1
  `, [userId]);

  if (!userRows[0]) return null;
  const me = userRows[0];
  // Must be admin or super_admin
  if (!["admin", "super_admin"].includes(me.role)) return null;

  return {
    uuid: me.id,
    agentId: me.username,
    name: me.display_name || me.username,
    role: me.role as "admin" | "super_admin",
  };
}

export default async function AdminPage() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) redirect("/login");

  const me = await getAdminData(userId);
  if (!me) redirect("/dashboard");

  return <AdminClient me={me} />;
}
