/**
 * src/app/api/users/me/xp/route.ts
 *
 * POST /api/users/me/xp — アクティビティに応じた XP をサーバー側で付与する。
 *
 * セキュリティ対応:
 * - [SECURITY FIX #8] XP 量は常にサーバー側の REWARDS テーブルから決定する。
 *   クライアントが「xp: 9999」のような値を送っても無視する。
 * - レート制限: 同一アクティビティは 1 時間あたり最大 N 回まで XP を付与する。
 * - レベルアップを検出してフロントに通知する。
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getDb, queryOne, execute } from "@/lib/db";
import { XP_REWARDS, XP_RATE_LIMITS, calculateLevel } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  let body: { activity?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  const activity = typeof body.activity === "string" ? body.activity : "";

  // [SECURITY FIX #8] XP 量はサーバー側のテーブルから取得（クライアント値を使わない）
  const xpReward = XP_REWARDS[activity];
  if (!xpReward || xpReward <= 0) {
    // 不明なアクティビティは XP 0 で正常レスポンス（エラーにしない）
    return Response.json({ xpGained: 0, leveledUp: false, newLevel: user.level, totalXp: user.xp });
  }

  const db = getDb();

  // ── レート制限チェック ────────────────────────────────────────
  const rateLimit = XP_RATE_LIMITS[activity] ?? 10;
  // [FIX] last_login と同じ "YYYY-MM-DD HH:MM:SS" UTC 形式で統一
  const oneHourAgo = new Date(Date.now() - 3_600_000)
    .toISOString().replace("T", " ").slice(0, 19);

  const recentCount = await queryOne<{ cnt: number }>(
    db,
    `SELECT COUNT(*) AS cnt FROM xp_logs
     WHERE user_id = ? AND activity = ? AND created_at > ?`,
    [user.id, activity, oneHourAgo]
  );

  if ((recentCount?.cnt ?? 0) >= rateLimit) {
    // レート制限超過: XP 0 で正常レスポンス（エラーにするとクライアント側に不審感を与えない）
    return Response.json({ xpGained: 0, leveledUp: false, newLevel: user.level, totalXp: user.xp });
  }

  // ── XP 付与 ──────────────────────────────────────────────────
  const newXp    = user.xp + xpReward;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > user.level;

  await execute(
    db,
    `UPDATE users SET xp = ?, level = ? WHERE id = ?`,
    [newXp, newLevel, user.id]
  );

  // XP ログ記録
  // [FIX] created_at を datetime('now') でなく JS 生成の nowSql に統一。
  // login/route.ts の xp_logs INSERT と形式を揃えてレート制限クエリの一貫性を保つ。
  const nowSql = new Date().toISOString().replace("T", " ").slice(0, 19);
  await execute(
    db,
    `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at)
     VALUES (?, ?, ?, ?)`,
    [user.id, activity, xpReward, nowSql]
  );

  // Level change is reflected in the next JWT token issued at login.

  return Response.json({
    xpGained:  xpReward,
    leveledUp,
    newLevel,
    totalXp:   newXp,
  });
}
