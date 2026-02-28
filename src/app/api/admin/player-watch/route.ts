import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  try {
    if (userId) {
      // 特定ユーザーの詳細データ（チャット含む）
      const [userRows, flagRows, varRows, eventRows, chatRows, historyRows] = await Promise.all([
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
        `, [userId]),

        query<{ flag_key: string; flag_value: string; set_at: string }>(db,
          `SELECT flag_key, flag_value, set_at FROM progress_flags WHERE user_id = ? ORDER BY set_at DESC`, [userId]),

        query<{ var_key: string; var_value: number }>(db,
          `SELECT var_key, var_value FROM story_variables WHERE user_id = ? ORDER BY var_key`, [userId]),

        query<{ event_id: string; fired_at: string }>(db,
          `SELECT event_id, fired_at FROM fired_events WHERE user_id = ? ORDER BY fired_at DESC LIMIT 100`, [userId]),

        // このユーザーが参加した全会話のメッセージ
        query<{
          chat_id: string; message: string; sender_name: string;
          is_own: number; created_at: string;
        }>(db, `
          SELECT
            cl.chat_id,
            cl.message,
            COALESCE(u2.display_name, u2.username, 'unknown') AS sender_name,
            CASE WHEN cl.user_id = ? THEN 1 ELSE 0 END AS is_own,
            cl.created_at
          FROM chat_logs cl
          LEFT JOIN users u2 ON u2.id = cl.user_id
          WHERE cl.chat_id IN (
            SELECT DISTINCT chat_id FROM chat_logs WHERE user_id = ?
          )
          ORDER BY cl.created_at DESC
          LIMIT 200
        `, [userId, userId]),

        // アクセスログ
        query<{ method: string; path: string; status_code: number; created_at: string }>(db,
          `SELECT method, path, status_code, created_at FROM access_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [userId]),
      ]);

      if (!userRows[0]) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

      const u = userRows[0];
      const flags: Record<string, { value: unknown; setAt: string }> = {};
      flagRows.forEach(r => {
        try { flags[r.flag_key] = { value: JSON.parse(r.flag_value), setAt: r.set_at }; }
        catch { flags[r.flag_key] = { value: r.flag_value, setAt: r.set_at }; }
      });
      const variables: Record<string, number> = {};
      varRows.forEach(r => { variables[r.var_key] = parseFloat(String(r.var_value)); });

      // チャットをchat_id別にグループ化
      const chatMap: Record<string, { message: string; senderName: string; isOwn: boolean; createdAt: string }[]> = {};
      chatRows.forEach(r => {
        if (!chatMap[r.chat_id]) chatMap[r.chat_id] = [];
        chatMap[r.chat_id].push({
          message: r.message, senderName: r.sender_name,
          isOwn: r.is_own === 1, createdAt: r.created_at,
        });
      });

      return NextResponse.json({
        user: {
          id: u.id, agentId: u.username,
          name: u.display_name || u.username,
          role: u.role, status: u.status,
          level: u.clearance_level, xp: Number(u.xp_total || 0),
          anomalyScore: u.anomaly_score || 0,
          observerLoad: u.observer_load || 0,
          division: u.division_slug || "", divisionName: u.division_name || "",
          loginCount: u.login_count || 0,
          streak: u.consecutive_login_days || 0,
          lastLogin: u.last_login_at, createdAt: u.created_at,
        },
        flags, variables,
        events: eventRows.map(e => ({ id: e.event_id, firedAt: e.fired_at })),
        chats: chatMap,
        accessLogs: historyRows,
      });
    }

    // ユーザー一覧
    const users = await query<{
      id: string; username: string; display_name: string; role: string;
      status: string; clearance_level: number; anomaly_score: number;
      observer_load: number; division_name: string; xp_total: number;
      login_count: number; last_login_at: string; created_at: string;
      msg_count: number; event_count: number; flag_count: number;
    }>(db, `
      SELECT
        u.id, u.username, u.display_name, u.role, u.status,
        u.clearance_level, u.anomaly_score, u.observer_load,
        d.name AS division_name,
        COALESCE((SELECT CAST(sv.var_value AS INTEGER) FROM story_variables sv
          WHERE sv.user_id = u.id AND sv.var_key = 'total_xp'), 0) AS xp_total,
        u.login_count, u.last_login_at, u.created_at,
        (SELECT COUNT(*) FROM chat_logs cl WHERE cl.user_id = u.id) AS msg_count,
        (SELECT COUNT(*) FROM fired_events fe WHERE fe.user_id = u.id) AS event_count,
        (SELECT COUNT(*) FROM progress_flags pf WHERE pf.user_id = u.id) AS flag_count
      FROM users u
      LEFT JOIN divisions d ON d.id = u.division_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.last_login_at DESC
    `);

    return NextResponse.json(users.map(u => ({
      id: u.id, agentId: u.username,
      name: u.display_name || u.username,
      role: u.role, status: u.status,
      level: u.clearance_level,
      xp: Number(u.xp_total || 0),
      anomalyScore: u.anomaly_score || 0,
      observerLoad: u.observer_load || 0,
      divisionName: u.division_name || "",
      loginCount: u.login_count || 0,
      lastLogin: u.last_login_at, createdAt: u.created_at,
      msgCount: Number(u.msg_count || 0),
      eventCount: Number(u.event_count || 0),
      flagCount: Number(u.flag_count || 0),
    })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
