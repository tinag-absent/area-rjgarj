import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  try {
    const [
      userStats, levelDist, topXP, recentEvents, flagStats, chatStats, observerLoadDist
    ] = await Promise.all([
      query<{ total: number; active_today: number; avg_level: number; avg_anomaly: number }>(db, `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN last_login_at > datetime('now', '-1 day') THEN 1 ELSE 0 END) AS active_today,
          AVG(clearance_level) AS avg_level,
          AVG(anomaly_score) AS avg_anomaly
        FROM users WHERE deleted_at IS NULL
      `),
      query<{ level: number; count: number }>(db, `
        SELECT clearance_level AS level, COUNT(*) AS count
        FROM users WHERE deleted_at IS NULL
        GROUP BY clearance_level ORDER BY level ASC
      `),
      query<{ username: string; xp: number; level: number }>(db, `
        SELECT u.username, CAST(sv.var_value AS INTEGER) AS xp, u.clearance_level AS level
        FROM story_variables sv
        JOIN users u ON u.id = sv.user_id
        WHERE sv.var_key = 'total_xp' AND u.deleted_at IS NULL
        ORDER BY xp DESC LIMIT 10
      `),
      query<{ event_id: string; count: number }>(db, `
        SELECT event_id, COUNT(*) AS count
        FROM fired_events
        GROUP BY event_id ORDER BY count DESC LIMIT 15
      `),
      query<{ flag_key: string; count: number }>(db, `
        SELECT flag_key, COUNT(*) AS count
        FROM progress_flags
        GROUP BY flag_key ORDER BY count DESC LIMIT 15
      `),
      query<{ chat_id: string; msg_count: number }>(db, `
        SELECT chat_id, COUNT(*) AS msg_count
        FROM chat_logs GROUP BY chat_id ORDER BY msg_count DESC LIMIT 10
      `),
      query<{ range: string; count: number }>(db, `
        SELECT
          CASE
            WHEN observer_load < 20 THEN '0-19'
            WHEN observer_load < 40 THEN '20-39'
            WHEN observer_load < 60 THEN '40-59'
            WHEN observer_load < 80 THEN '60-79'
            ELSE '80+'
          END AS range,
          COUNT(*) AS count
        FROM users WHERE deleted_at IS NULL
        GROUP BY range ORDER BY range ASC
      `),
    ]);

    return NextResponse.json({
      userStats: userStats[0],
      levelDist,
      topXP,
      recentEvents,
      flagStats,
      chatStats,
      observerLoadDist,
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
