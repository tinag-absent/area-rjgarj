/**
 * /api/admin/fire-event — 管理者によるイベント手動発火
 * POST: { userId, eventId, xp?, flag?, notification? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { calculateLevel } from "@/lib/constants";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";

// [FIX-C06] eventId の許可パターン（英数字・アンダースコア・ハイフン、最大128文字）
const EVENT_ID_PATTERN = /^[a-zA-Z0-9_\-]{1,128}$/;
// [FIX-C12] 管理者が一度に付与できる XP の上限
const MAX_ADMIN_XP_GRANT = 10000;
// フラグキーの許可パターン
const FLAG_KEY_PATTERN = /^[a-zA-Z0-9_\-]{1,100}$/;

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId, eventId, xp, flag, flagValue, notification } = await req.json().catch(() => ({}));
  if (!userId || !eventId) {
    return NextResponse.json({ error: "userId と eventId は必須です" }, { status: 400 });
  }

  // [FIX-C06] eventId のバリデーション
  if (typeof eventId !== "string" || !EVENT_ID_PATTERN.test(eventId)) {
    return NextResponse.json({ error: "eventId の形式が不正です" }, { status: 400 });
  }

  // [FIX-C06] flag キーのバリデーション
  if (flag && (typeof flag !== "string" || !FLAG_KEY_PATTERN.test(flag))) {
    return NextResponse.json({ error: "flag キーの形式が不正です" }, { status: 400 });
  }

  const db = getDb();
  try {
    // ユーザー確認
    const userRows = await query<{ id: string }>(db, `SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!userRows.length) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

    // フラグ付与
    if (flag) {
      const safeValue = typeof flagValue === "string" ? flagValue.slice(0, 256) : "true";
      await execute(db, `
        INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = excluded.flag_value
      `, [userId, flag, safeValue]);
    }

    // XP付与
    if (xp && Number(xp) > 0) {
      // [FIX-C12] XP 上限チェック
      const xpAmount = Math.min(Number(xp), MAX_ADMIN_XP_GRANT);
      if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
        return NextResponse.json({ error: "xp の値が不正です" }, { status: 400 });
      }
      // [BUG-15 FIX] アトミックなSQLで加算してLost Updateを防止
      await execute(db,
        `UPDATE users SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ?`,
        [xpAmount, userId]
      );
      // level再計算のため更新後の値を取得
      const xpRows = await query<{ xp_total: number }>(db,
        `SELECT COALESCE(xp_total, 0) AS xp_total FROM users WHERE id = ? LIMIT 1`, [userId]
      );
      const newXp = xpRows[0]?.xp_total ?? 0;
      const newLevel = calculateLevel(newXp);
      await execute(db, `UPDATE users SET clearance_level = ? WHERE id = ?`, [newLevel, userId]);
      // [BUG-05 FIX] xp_logs に記録して活動グラフ・XP履歴に反映
      await execute(db,
        `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at) VALUES (?, 'admin_grant', ?, datetime('now'))`,
        [userId, xpAmount]
      ).catch(() => {});
    }

    // 通知
    if (notification?.title) {
      // [FIX-C15] 通知内容をサニタイズ
      const safeTitle = sanitizeDisplayText(notification.title).slice(0, 200);
      const safeBody = sanitizeMultilineText(notification.body ?? "").slice(0, 2000);
      const safeType = ["info", "warning", "error", "success"].includes(notification.type)
        ? notification.type
        : "info";
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [userId, safeType, safeTitle, safeBody]);
    }

    // 発火記録
    await execute(db, `
      INSERT INTO fired_events (user_id, event_id, fired_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT DO NOTHING
    `, [userId, eventId]);

    return NextResponse.json({ message: `イベント「${eventId}」を発火しました` });
  } catch (err) {
    console.error("[fire-event]", err);
    return NextResponse.json({ error: "発火失敗" }, { status: 500 });
  }
}
