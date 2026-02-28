/**
 * /api/users/me/check-triggers
 * 
 * POST: ユーザーの現在の状態を評価し、発火すべきイベントを処理する
 * ダッシュボード初回ロード時に呼び出す
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { TRIGGERS, type TriggerUser } from "@/lib/event-triggers";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const db = getDb();
  try {
    // ユーザーの完全な状態を並列取得（XPも同時取得してラウンドトリップ削減）
    const [userRows, flagRows, eventRows, xpRow] = await Promise.all([
      query<{
        clearance_level: number; anomaly_score: number; observer_load: number;
        login_count: number; consecutive_login_days: number;
      }>(db, `
        SELECT clearance_level, anomaly_score, observer_load, login_count, consecutive_login_days
        FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1
      `, [authUser.userId]),
      query<{ flag_key: string; flag_value: string }>(db,
        `SELECT flag_key, flag_value FROM progress_flags WHERE user_id = ?`, [authUser.userId]
      ),
      query<{ event_id: string }>(db,
        `SELECT event_id FROM fired_events WHERE user_id = ?`, [authUser.userId]
      ),
      query<{ xp: number }>(db,
        `SELECT var_value AS xp FROM story_variables WHERE user_id = ? AND var_key = 'total_xp'`,
        [authUser.userId]
      ),
    ]);

    if (!userRows.length) return NextResponse.json({ fired: [] });

    const u = userRows[0];

    const flags: Record<string, unknown> = {};
    flagRows.forEach(f => { flags[f.flag_key] = f.flag_value; });
    const firedEvents = eventRows.map(e => e.event_id);

    const triggerUser: TriggerUser = {
      userId: authUser.userId,
      level: u.clearance_level,
      xp: parseInt(String(xpRow[0]?.xp || 0)),
      anomalyScore: u.anomaly_score || 0,
      observerLoad: u.observer_load || 0,
      loginCount: u.login_count || 0,
      streak: u.consecutive_login_days || 0,
      flags,
      firedEvents,
    };

    const fired: string[] = [];

    // 各トリガーを評価
    for (const trigger of TRIGGERS) {
      // すでに発火済みのイベントはスキップ
      if (firedEvents.includes(trigger.id)) continue;

      // 条件チェック
      if (!trigger.conditions(triggerUser)) continue;

      const { effects } = trigger;

      // フラグ保存
      if (effects.flag) {
        await execute(db, `
          INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = excluded.flag_value
        `, [authUser.userId, effects.flag, effects.flagValue ?? "true"]);
        // メモリ上のフラグも更新して次のトリガー評価に使う
        flags[effects.flag] = effects.flagValue ?? "true";
      }

      // XP付与
      if (effects.xp && effects.xp > 0) {
        await execute(db, `
          INSERT INTO story_variables (user_id, var_key, var_value)
          VALUES (?, 'total_xp', ?)
          ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
        `, [authUser.userId, effects.xp, effects.xp]);
      }

      // 通知
      if (effects.notification) {
        // 同一タイトルの通知が直近1日以内にあればスキップ
        const existing = await query<{ id: number }>(db, `
          SELECT id FROM notifications
          WHERE user_id = ? AND title = ? AND created_at > datetime('now', '-1 day')
          LIMIT 1
        `, [authUser.userId, effects.notification.title]);
        
        if (!existing.length) {
          await execute(db, `
            INSERT INTO notifications (user_id, type, title, body, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `, [authUser.userId, effects.notification.type, effects.notification.title, effects.notification.body]);
        }
      }

      // 発火済みとして記録
      await execute(db, `
        INSERT INTO fired_events (user_id, event_id, fired_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT DO NOTHING
      `, [authUser.userId, trigger.id]);

      fired.push(trigger.id);
    }

    return NextResponse.json({ fired, count: fired.length });
  } catch (err) {
    console.error("[check-triggers]", err);
    return NextResponse.json({ fired: [], error: "処理失敗" });
  }
}
