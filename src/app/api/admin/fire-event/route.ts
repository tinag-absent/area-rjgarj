/**
 * /api/admin/fire-event — 管理者によるイベント手動発火
 * POST: { userId, eventId, xp?, flag?, notification? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId, eventId, xp, flag, flagValue, notification } = await req.json().catch(() => ({}));
  if (!userId || !eventId) {
    return NextResponse.json({ error: "userId と eventId は必須です" }, { status: 400 });
  }

  const db = getDb();
  try {
    // ユーザー確認
    const userRows = await query<{ id: string }>(db, `SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!userRows.length) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

    // フラグ付与
    if (flag) {
      await execute(db, `
        INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = excluded.flag_value
      `, [userId, flag, flagValue ?? "true"]);
    }

    // XP付与
    if (xp && Number(xp) > 0) {
      await execute(db, `
        INSERT INTO story_variables (user_id, var_key, var_value)
        VALUES (?, 'total_xp', ?)
        ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
      `, [userId, Number(xp), Number(xp)]);
    }

    // 通知
    if (notification?.title) {
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [userId, notification.type ?? "info", notification.title, notification.body ?? ""]);
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
