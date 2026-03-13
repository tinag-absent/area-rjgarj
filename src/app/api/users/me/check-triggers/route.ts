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
import { calculateLevel } from "@/lib/constants";

// [FIX-C05] サーバーレス環境では globalThis の Map はインスタンスをまたいで共有されない。
// DB の rate_limit_attempts テーブルを用いたレート制限に置き換える。
const TRIGGER_RATE_LIMIT_SECONDS = 60;

async function checkTriggerRateLimit(userId: string, db: ReturnType<typeof getDb>): Promise<boolean> {
  try {
    const since = new Date(Date.now() - TRIGGER_RATE_LIMIT_SECONDS * 1000)
      .toISOString().replace("T", " ").slice(0, 19);
    const rows = await query<{ cnt: number }>(db, `
      SELECT COUNT(*) AS cnt FROM rate_limit_attempts
      WHERE key_type = 'trigger' AND key_value = ? AND attempted_at >= ?
    `, [userId, since]).catch(() => [] as { cnt: number }[]);
    return (rows[0]?.cnt ?? 0) === 0;
  } catch {
    return true; // DB エラー時は通過させる（フェイルオープン）
  }
}

async function recordTriggerAttempt(userId: string, db: ReturnType<typeof getDb>): Promise<void> {
  try {
    await execute(db, `
      INSERT INTO rate_limit_attempts (key_type, key_value, success)
      VALUES ('trigger', ?, 1)
    `, [userId]).catch(() => {});
    // [FIX-M14] 古いトリガーレコードを定期削除
    execute(db, `
      DELETE FROM rate_limit_attempts
      WHERE key_type = 'trigger' AND attempted_at < datetime('now', '-1 day')
    `).catch(() => {});
  } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const db = getDb();

  // [FIX-C05] DB ベースのレート制限チェック（サーバーレス環境でも確実に動作）
  const allowed = await checkTriggerRateLimit(authUser.userId, db);
  if (!allowed) {
    return NextResponse.json({ fired: [], rateLimited: true });
  }
  await recordTriggerAttempt(authUser.userId, db);
  try {
    // ユーザーの完全な状態を並列取得（XPも同時取得してラウンドトリップ削減）
    const [userRows, flagRows, eventRows] = await Promise.all([
      query<{
        clearance_level: number; anomaly_score: number; observer_load: number;
        login_count: number; consecutive_login_days: number; xp_total: number;
      }>(db, `
        SELECT clearance_level, anomaly_score, observer_load, login_count, consecutive_login_days,
               COALESCE(xp_total, 0) AS xp_total
        FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1
      `, [authUser.userId]),
      query<{ flag_key: string; flag_value: string }>(db,
        `SELECT flag_key, flag_value FROM progress_flags WHERE user_id = ?`, [authUser.userId]
      ),
      query<{ event_id: string }>(db,
        `SELECT event_id FROM fired_events WHERE user_id = ?`, [authUser.userId]
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
      xp: u.xp_total,
      anomalyScore: u.anomaly_score || 0,
      observerLoad: u.observer_load || 0,
      loginCount: u.login_count || 0,
      streak: u.consecutive_login_days || 0,
      flags,
      firedEvents,
    };

    const fired: string[] = [];
    // 並列リクエスト時のレース条件対策：発火済みイベントをメモリ上でも追跡
    const firedSet = new Set(firedEvents);

    // 各トリガーを評価
    for (const trigger of TRIGGERS) {
      // すでに発火済みのイベントはスキップ（メモリのSetで二重発火防止）
      if (firedSet.has(trigger.id)) continue;

      // 条件チェック
      if (!trigger.conditions(triggerUser)) continue;

      const effects = trigger.getEffects ? trigger.getEffects(triggerUser) : trigger.effects;

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
        // [FIX-H05] SELECT+UPDATE の非アトミック操作を排除。
        // SQL の単一アトミック UPDATE でレース条件を解消する。
        const MAX_TRIGGER_XP = 5000; // トリガー1回あたりの XP 上限
        const xpAmount = Math.min(effects.xp, MAX_TRIGGER_XP);
        await execute(db,
          `UPDATE users SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ?`,
          [xpAmount, authUser.userId]
        );
        // レベル再計算のため更新後の xp_total を取得
        const xpRows = await query<{ xp_total: number }>(db,
          `SELECT xp_total FROM users WHERE id = ? LIMIT 1`, [authUser.userId]
        );
        const newXp = xpRows[0]?.xp_total ?? 0;
        const newLevel = calculateLevel(newXp);
        await execute(db,
          `UPDATE users SET clearance_level = ? WHERE id = ?`,
          [newLevel, authUser.userId]
        );
        // [H-003] xp_logs に記録（活動グラフに反映するため）
        await execute(db,
          `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at) VALUES (?, 'trigger', ?, datetime('now'))`,
          [authUser.userId, xpAmount]
        ).catch(() => {});
        // triggerUser の xp/level を次のトリガー評価に反映
        triggerUser.xp = newXp;
        triggerUser.level = newLevel;
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

      // 発火済みとして記録（ON CONFLICT DO NOTHING で並列重複挿入を安全に無視）
      await execute(db, `
        INSERT INTO fired_events (user_id, event_id, fired_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT DO NOTHING
      `, [authUser.userId, trigger.id]);

      // メモリ上のSetを更新して後続の同一ループで二重発火しない
      firedSet.add(trigger.id);
      fired.push(trigger.id);
    }

    return NextResponse.json({ fired, count: fired.length });
  } catch (err) {
    console.error("[check-triggers]", err);
    return NextResponse.json({ fired: [], error: "処理失敗" });
  }
}
