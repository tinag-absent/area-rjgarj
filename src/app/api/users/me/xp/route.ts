/**
 * /api/users/me/xp — アクティビティに応じた XP をサーバー側で付与する
 * ルールエンジン統合: rule_engine_entries(type=xp_rule) からXP量・上限・条件を取得
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, signToken } from "@/lib/auth";
import { getDb, queryOne, query, execute } from "@/lib/db";
import { XP_REWARDS, XP_RATE_LIMITS, calculateLevel } from "@/lib/constants";
import { loadRules } from "@/lib/rule-engine";
import { setAuthCookie } from "@/lib/server-auth";

interface XpRule {
  id: string; event: string; baseXp: number; onlyFirst: boolean;
  maxPerDay: number; multiplier: number;
  conditions: { type: string; key?: string; value?: string; minLevel?: number; division?: string }[];
}

async function resolveXp(
  activity: string, userId: string, userLevel: number,
  db: ReturnType<typeof getDb>
): Promise<{ xp: number; rateLimit: number }> {
  // DBルールを優先、なければ定数にフォールバック
  const rules = await loadRules<XpRule>("xp_rule");
  const rule = rules.find(r => r.event === activity);

  if (rule) {
    // 条件チェック
    if (rule.conditions?.length > 0) {
      const flagRows = await query<{ flag_key: string; flag_value: string }>(
        db, "SELECT flag_key, flag_value FROM progress_flags WHERE user_id=?", [userId]
      ).catch(() => [] as { flag_key: string; flag_value: string }[]);
      const flags: Record<string, string> = {};
      flagRows.forEach(f => { flags[f.flag_key] = f.flag_value; });

      for (const cond of rule.conditions) {
        if (cond.type === "level" && userLevel < (cond.minLevel || 0)) return { xp: 0, rateLimit: 0 };
        if (cond.type === "flag" && flags[cond.key || ""] !== (cond.value || "true")) return { xp: 0, rateLimit: 0 };
      }
    }
    // onlyFirst チェック
    if (rule.onlyFirst) {
      const cnt = await queryOne<{ cnt: number }>(
        db, "SELECT COUNT(*) as cnt FROM xp_logs WHERE user_id=? AND activity=?", [userId, activity]
      );
      if ((cnt?.cnt || 0) > 0) return { xp: 0, rateLimit: 1 };
    }
    const xp = Math.floor(rule.baseXp * (rule.multiplier || 1));
    return { xp, rateLimit: rule.maxPerDay || 10 };
  }

  // フォールバック: 定数
  return {
    xp: XP_REWARDS[activity] || 0,
    rateLimit: XP_RATE_LIMITS[activity] ?? 10,
  };
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  let body: { activity?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 }); }

  const activity = typeof body.activity === "string" ? body.activity : "";
  // [BUG-13 FIX] activity 文字列の長さを制限してxp_logs汚染を防止
  if (!activity || activity.length > 64) {
    return Response.json({ xpGained: 0, leveledUp: false, newLevel: user.clearance_level, totalXp: user.xp_total });
  }
  const db = getDb();

  const { xp: xpReward, rateLimit } = await resolveXp(activity, user.id, user.clearance_level, db);

  if (!xpReward || xpReward <= 0) {
    return Response.json({ xpGained: 0, leveledUp: false, newLevel: user.clearance_level, totalXp: user.xp_total });
  }

  // レート制限（1日上限に変更: xp_rule.maxPerDay は1日基準）
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString().replace("T", " ").slice(0, 19);
  const recentCount = await queryOne<{ cnt: number }>(
    db,
    "SELECT COUNT(*) AS cnt FROM xp_logs WHERE user_id=? AND activity=? AND created_at>?",
    [user.id, activity, oneDayAgo]
  );
  if ((recentCount?.cnt ?? 0) >= rateLimit) {
    return Response.json({ xpGained: 0, leveledUp: false, newLevel: user.clearance_level, totalXp: user.xp_total });
  }

  const newXp = user.xp_total + xpReward;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > user.clearance_level;

  // [FIX NEW-001] XP の source of truth を users.xp_total に統一。
  // story_variables(total_xp) への二重書き込みを廃止し、
  // 競合時の不整合を防ぐ。
  await execute(db, "UPDATE users SET xp_total=?, clearance_level=? WHERE id=?", [newXp, newLevel, user.id]);

  const nowSql = new Date().toISOString().replace("T", " ").slice(0, 19);
  await execute(db,
    "INSERT INTO xp_logs (user_id, activity, xp_gained, created_at) VALUES (?,?,?,?)",
    [user.id, activity, xpReward, nowSql]
  );

  const responseBody = { xpGained: xpReward, leveledUp, newLevel, totalXp: newXp };

  // [FIX-M01/M02] レベルアップ時は JWT を再発行して Cookie の level を最新化する
  if (leveledUp) {
    const newToken = signToken({
      userId:  user.id,
      agentId: user.agent_id,
      role:    user.role,
      level:   newLevel,
    });
    // [BUG-A FIX] new Response には .cookies が存在しないため NextResponse を使う
    const res = NextResponse.json(responseBody);
    setAuthCookie(res, newToken);
    return res;
  }

  return NextResponse.json(responseBody);
}
