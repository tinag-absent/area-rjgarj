/**
 * src/app/api/users/me/login/route.ts
 *
 * POST /api/users/me/login — ログイン記録をサーバー側で更新する。
 *
 * セキュリティ対応:
 * - [SECURITY FIX #5] streak / loginCount / lastLogin の計算をサーバー側で行う。
 *   クライアントは計算に関与せず、結果を受け取るだけ。
 * - 日次ログインボーナス XP も同時に付与する。
 * - 同一セッション内の重複呼び出しはべき等（何度呼んでも結果が変わらない）。
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized, formatUserResponse } from "@/lib/auth";
import { getDb, execute } from "@/lib/db";
import { DAILY_LOGIN_REWARDS, XP_REWARDS, calculateLevel } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  // [FIX] SQLite の datetime('now') と同じ UTC 形式で統一する。
  // JavaScript の toISOString() は UTC を返すので replace("T"," ") で形式を揃える。
  const nowUtc = new Date();
  // SQLite の datetime('now') と同形式（UTC）: "YYYY-MM-DD HH:MM:SS"
  const nowSql = nowUtc.toISOString().replace("T", " ").slice(0, 19);

  // ── 前回ログインとの日数差を計算 ─────────────────────────────
  // [FIX] last_login は "YYYY-MM-DD HH:MM:SS" 形式（UTC）。
  // new Date() で正しくパースするため末尾に 'Z' を付与する。
  const lastLoginRaw  = user.last_login;
  const lastLoginDate = lastLoginRaw
    ? new Date(lastLoginRaw.includes("T") ? lastLoginRaw : lastLoginRaw.replace(" ", "T") + "Z")
    : null;
  const daysDiff = lastLoginDate
    ? Math.floor((nowUtc.getTime() - lastLoginDate.getTime()) / 86_400_000)
    : null;

  // [SECURITY FIX #5] streak 計算はサーバー側のみで行う
  let newStreak: number;
  let isNewDay: boolean;

  if (daysDiff === null) {
    newStreak = 1;
    isNewDay  = true;
  } else if (daysDiff === 0) {
    newStreak = user.streak;
    isNewDay  = false;
  } else if (daysDiff === 1) {
    newStreak = user.streak + 1;
    isNewDay  = true;
  } else {
    newStreak = 1;
    isNewDay  = true;
  }

  const cappedStreak = newStreak > 7 ? 1 : newStreak;

  // ── 日次ログインボーナス XP を計算 ───────────────────────────
  let xpBonus = 0;
  if (isNewDay) {
    // [FIX] 初回ログイン（daysDiff === null）のみ first_login ボーナスを付与
    const firstLoginBonus = daysDiff === null ? (XP_REWARDS["first_login"] ?? 50) : 0;
    const dailyBonus      = DAILY_LOGIN_REWARDS[cappedStreak] ?? DAILY_LOGIN_REWARDS[1];
    xpBonus = firstLoginBonus + dailyBonus;
  }

  const newXp         = user.xp + xpBonus;
  const newLevel      = calculateLevel(newXp);
  const newLoginCount = user.login_count + (isNewDay ? 1 : 0);

  const db = getDb();

  await execute(
    db,
    `UPDATE users
     SET login_count = ?,
         last_login  = ?,
         streak      = ?,
         xp          = ?,
         level       = ?
     WHERE id = ?`,
    [newLoginCount, nowSql, cappedStreak, newXp, newLevel, user.id]
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
    login_count: newLoginCount,
    last_login:  nowSql,
    streak:      cappedStreak,
    xp:          newXp,
    level:       newLevel,
  };

  // Level change is reflected in the next JWT token issued at login.

  return Response.json({
    ...formatUserResponse(updatedUser),
    loginBonus: {
      xpGained:  xpBonus,
      streak:    cappedStreak,
      leveledUp: newLevel > user.level,
      newLevel,
    },
  });
}
