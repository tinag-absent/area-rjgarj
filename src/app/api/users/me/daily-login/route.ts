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
      id: string; clearance_level: number; consecutive_login_days: number;
      last_daily_bonus_at: string; last_login_at: string;
    }>(db, `SELECT id, clearance_level, consecutive_login_days, last_daily_bonus_at, last_login_at FROM users WHERE id = ?`, [authUser.userId]);
    if (!rows.length) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const u = rows[0];

    // [FIX BUG#23] タイムゾーン問題対策: 全日付計算をUTCで統一
    const nowUtc = new Date();
    const today = nowUtc.toISOString().slice(0, 10); // UTC日付
    const lastBonus = u.last_daily_bonus_at
      ? new Date(u.last_daily_bonus_at.includes("T") ? u.last_daily_bonus_at : u.last_daily_bonus_at + "Z").toISOString().slice(0, 10)
      : null;

    if (lastBonus === today) {
      return NextResponse.json({ success: false, alreadyClaimed: true, streak: u.consecutive_login_days, message: "本日のログインボーナスは既に受け取り済みです" });
    }

    // [BUG-I FIX] me/login が本日すでに DAILY_LOGIN_REWARDS を付与済みか確認する。
    // me/login は last_login_at を当日に更新しつつ DAILY_LOGIN_REWARDS を加算する。
    // daily-login が last_daily_bonus_at を別カラムで管理していたため、
    // 両方のエンドポイントを呼ぶと同日に二重でログインXPが付与されるバグを修正。
    // last_login_at が本日であれば me/login 側で XP 付与済みとみなし XP は付与しない。
    const lastLogin = u.last_login_at
      ? new Date(u.last_login_at.includes("T") ? u.last_login_at : u.last_login_at + "Z").toISOString().slice(0, 10)
      : null;
    const alreadyGrantedByMeLogin = lastLogin === today;

    // [BUG-14 FIX] consecutive_login_days はme/loginで一元管理するため、
    // daily-login では streak を更新せず、現在値をそのままXP計算に使う。
    const currentStreak = u.consecutive_login_days || 1;
    const streakDay = ((currentStreak - 1) % 7) + 1;
    // [BUG-I FIX] me/login 側で付与済みの場合は reward = 0 にして二重付与を防ぐ
    const reward = alreadyGrantedByMeLogin ? 0 : (DAILY_LOGIN_REWARDS[streakDay] || 25);

    if (reward > 0) {
      await execute(db,
        `UPDATE users SET last_daily_bonus_at = datetime('now'), xp_total = xp_total + ? WHERE id = ?`,
        [reward, authUser.userId]
      );
    } else {
      // me/login で XP 付与済み — last_daily_bonus_at のみ更新して二重付与マーカーをセット
      await execute(db,
        `UPDATE users SET last_daily_bonus_at = datetime('now') WHERE id = ?`,
        [authUser.userId]
      );
    }

    // レベル計算のため更新後のxp_totalを取得
    const xpRow = await query<{ xp_total: number }>(db,
      `SELECT xp_total FROM users WHERE id = ?`,
      [authUser.userId]
    );
    const totalXP = xpRow[0]?.xp_total ?? 0;
    const newLevel = calculateLevel(totalXP);
    await execute(db,
      `UPDATE users SET clearance_level = ? WHERE id = ? AND clearance_level < ?`,
      [newLevel, authUser.userId, newLevel]
    );

    // [FIX BUG#6] xp_logs に記録して活動カレンダーに反映（reward > 0 の場合のみ）
    if (reward > 0) {
      await execute(db,
        `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at) VALUES (?, 'daily_login', ?, datetime('now'))`,
        [authUser.userId, reward]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true, reward, streak: currentStreak,
      user: { xp: totalXP, level: newLevel },
      message: reward > 0 ? `デイリーログインボーナス: +${reward} XP` : "本日のログインボーナスは既にログイン時に付与されています",
    });
  } catch (err) {
    console.error("[daily-login]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
