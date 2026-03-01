import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { calculateLevel, DAILY_LOGIN_REWARDS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();

  try {
    const rows = await query<{
      id: string; clearance_level: number; consecutive_login_days: number; last_daily_bonus_at: string;
    }>(db, `SELECT id, clearance_level, consecutive_login_days, last_daily_bonus_at FROM users WHERE id = ?`, [authUser.userId]);
    if (!rows.length) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const u = rows[0];

    const today = new Date().toISOString().slice(0, 10);
    const lastBonus = u.last_daily_bonus_at ? new Date(u.last_daily_bonus_at).toISOString().slice(0, 10) : null;

    if (lastBonus === today) {
      return NextResponse.json({ success: false, alreadyClaimed: true, streak: u.consecutive_login_days, message: "本日のログインボーナスは既に受け取り済みです" });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const newStreak = lastBonus === yesterdayStr ? (u.consecutive_login_days || 0) + 1 : 1;
    const streakDay = ((newStreak - 1) % 7) + 1;
    const reward = DAILY_LOGIN_REWARDS[streakDay] || 25;

    await execute(db, `
      INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, 'total_xp', ?)
      ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
    `, [authUser.userId, reward, reward]);

    await execute(db,
      `UPDATE users SET last_daily_bonus_at = datetime('now'), consecutive_login_days = ? WHERE id = ?`,
      [newStreak, authUser.userId]
    );

    const xpRow = await query<{ xp: number }>(db,
      `SELECT var_value AS xp FROM story_variables WHERE user_id = ? AND var_key = 'total_xp'`,
      [authUser.userId]
    );
    const totalXP = parseInt(String(xpRow[0]?.xp || 0));
    const newLevel = calculateLevel(totalXP);
    await execute(db,
      `UPDATE users SET clearance_level = ? WHERE id = ? AND clearance_level < ?`,
      [newLevel, authUser.userId, newLevel]
    );

    return NextResponse.json({
      success: true, reward, streak: newStreak,
      user: { xp: totalXP, level: newLevel },
      message: `デイリーログインボーナス: +${reward} XP`,
    });
  } catch (err) {
    console.error("[daily-login]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
