import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import ToastContainer from "@/components/ui/ToastContainer";
import UserProvider from "@/components/layout/UserProvider";
import { getDb, query } from "@/lib/db";

// cache() ensures this function is only called once per request even if multiple
// Server Components import it
const getCurrentUser = cache(async function getCurrentUser(userId: string) {
  try {
    const db = getDb();
    const rows = await query<{
      agent_id: string; id: string; display_name: string;
      role: string; status: string; clearance_level: number;
      division_slug: string; division_name: string;
      anomaly_score: number; observer_load: number;
      login_count: number; consecutive_login_days: number;
      last_login_at: string; created_at: string; xp_total: number;
    }>(db, `
      SELECT u.id, u.username AS agent_id, u.display_name,
             u.role, u.status, u.clearance_level,
             u.anomaly_score, u.observer_load,
             u.login_count, u.consecutive_login_days, u.last_login_at, u.created_at,
             d.slug AS division_slug, d.name AS division_name,
             COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
               WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE u.id = ? AND u.deleted_at IS NULL
      LIMIT 1
    `, [userId]);
    if (!rows.length) return null;
    const u = rows[0];
    return {
      id: u.agent_id, agentId: u.agent_id,
      name: u.display_name || u.agent_id,
      role: u.role as "player" | "admin" | "super_admin",
      status: u.status as "active",
      level: u.clearance_level,
      xp: Number(u.xp_total || 0),
      division: u.division_slug || "",
      divisionName: u.division_name || "",
      anomalyScore: u.anomaly_score || 0,
      observerLoad: u.observer_load || 0,
      lastLogin: u.last_login_at,
      loginCount: u.login_count || 0,
      streak: u.consecutive_login_days || 0,
      createdAt: u.created_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
});

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) redirect("/login");

  const user = await getCurrentUser(userId);
  if (!user) redirect("/login");

  return (
    <UserProvider user={user}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main
          id="main-content"
          style={{
            flex: 1,
            marginLeft: "16rem",
            minHeight: "100vh",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </div>
      <ToastContainer />
    </UserProvider>
  );
}
