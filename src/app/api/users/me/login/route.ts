/**
 * src/app/api/users/me/login/route.ts
 *
 * POST /api/users/me/login — ログイン記録・streak・デイリーXP付与をサーバー側で更新する。
 *
 * [BUG-01/02 FIX] auth/login は last_login_at を更新しなくなった。
 * このエンドポイントが last_login_at・streak・XP 付与をすべて担当する。
 * 初回ログイン(login_count===1)の firstLoginBonus もここで一本化。
 *
 * [FIX NEW-001] XP は users.xp_total に統一。story_variables への書き込みは廃止。
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, formatUserResponse, signToken } from "@/lib/auth";
import { getDb, execute } from "@/lib/db";
import { DAILY_LOGIN_REWARDS, XP_REWARDS, calculateLevel } from "@/lib/constants";
import { setAuthCookie } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const nowUtc = new Date();
  const nowSql = nowUtc.toISOString().replace("T", " ").slice(0, 19);

  // [BUG-01 FIX] auth/login が last_login_at を更新しなくなったため、
  // ここで読む user.last_login_at はログイン前の「前回ログイン日時」が正しく入っている。
  const lastLoginRaw  = user.last_login_at;
  const lastLoginDate = lastLoginRaw
    ? new Date(lastLoginRaw.includes("T") ? lastLoginRaw : lastLoginRaw.replace(" ", "T") + "Z")
    : null;
  // [BUG-B FIX] millisecond 除算 (Math.floor / 86400000) では、23:55→00:05 のような
  // 深夜をまたぐ短時間ログインを「同日」と誤判定する。
  // UTC カレンダー日付文字列 (YYYY-MM-DD) を比較することで正確に判定する。
  const lastLoginUtcDate  = lastLoginDate ? lastLoginDate.toISOString().slice(0, 10) : null;
  const nowUtcDate        = nowUtc.toISOString().slice(0, 10);

  // 日付差（0=同日, 1=翌日, 2+=複数日空き）を計算
  const daysDiff = lastLoginDate
    ? Math.floor((Date.UTC(
        Number(nowUtcDate.slice(0, 4)),
        Number(nowUtcDate.slice(5, 7)) - 1,
        Number(nowUtcDate.slice(8, 10))
      ) - Date.UTC(
        Number(lastLoginUtcDate!.slice(0, 4)),
        Number(lastLoginUtcDate!.slice(5, 7)) - 1,
        Number(lastLoginUtcDate!.slice(8, 10))
      )) / 86_400_000)
    : null;

  let newStreak: number;
  let isNewDay: boolean;

  if (daysDiff === null) {
    // 初回ログイン（last_login_at が未設定）
    newStreak = 1;
    isNewDay  = true;
  } else if (daysDiff === 0) {
    // 同日の2回目以降ログイン
    newStreak = user.consecutive_login_days;
    isNewDay  = false;
  } else if (daysDiff === 1) {
    // 翌日ログイン → streak継続
    newStreak = user.consecutive_login_days + 1;
    isNewDay  = true;
  } else {
    // 2日以上空いた → streak リセット
    newStreak = 1;
    isNewDay  = true;
  }

  const cappedStreak = newStreak;

  let xpBonus = 0;
  if (isNewDay) {
    // [BUG-02 FIX] 初回ログインボーナスはここで一本化（auth/loginでの付与を廃止したため）
    const isFirstLogin = daysDiff === null;
    const firstLoginBonus = isFirstLogin ? (XP_REWARDS["first_login"] ?? 50) : 0;
    const streakIndex = ((cappedStreak - 1) % 7) + 1;
    const dailyBonus  = DAILY_LOGIN_REWARDS[streakIndex] ?? DAILY_LOGIN_REWARDS[1];
    xpBonus = firstLoginBonus + dailyBonus;
  }

  const newXp    = user.xp_total + xpBonus;
  const newLevel = calculateLevel(newXp);
  // auth/login で login_count+1 済みのため、isNewDay に関わらず現在値を維持
  const newLoginCount = user.login_count;

  const db = getDb();

  await execute(
    db,
    `UPDATE users
     SET login_count            = ?,
         last_login_at          = ?,
         consecutive_login_days = ?,
         clearance_level        = ?,
         xp_total               = ?
     WHERE id = ?`,
    [newLoginCount, nowSql, cappedStreak, newLevel, newXp, user.id]
  );

  if (xpBonus > 0) {
    await execute(
      db,
      `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at)
       VALUES (?, 'daily_login', ?, ?)`,
      [user.id, xpBonus, nowSql]
    );
  }

  const updatedUser = {
    ...user,
    login_count:            newLoginCount,
    last_login_at:          nowSql,
    consecutive_login_days: cappedStreak,
    xp_total:               newXp,
    clearance_level:        newLevel,
  };

  const responseBody = {
    ...formatUserResponse(updatedUser),
    loginBonus: {
      xpGained:  xpBonus,
      streak:    cappedStreak,
      leveledUp: newLevel > user.clearance_level,
      newLevel,
    },
  };

  // [J-003] レベルが変化した場合はJWTを再発行してCookieの level を最新化する
  if (newLevel !== user.clearance_level) {
    const newToken = signToken({
      userId:  user.id,
      agentId: user.agent_id,
      role:    user.role,
      level:   newLevel,
    });
    // [BUG-02 FIX] new Response には .cookies が存在しないため NextResponse を使う
    const res = NextResponse.json(responseBody);
    setAuthCookie(res, newToken);
    return res;
  }

  return NextResponse.json(responseBody);
}
