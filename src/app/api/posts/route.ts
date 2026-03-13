import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { getJwtUser } from "@/lib/server-auth";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";
import { loadRules } from "@/lib/rule-engine";

interface AnomalyKeywordRule {
  id: string; triggerType: "keyword"; triggerValue: string; delta: number; maxPerDay: number;
}

async function applyBulletinAnomalyRules(db: ReturnType<typeof getDb>, userId: string, text: string) {
  try {
    const rules = await loadRules<AnomalyKeywordRule>("anomaly_rule");
    const keywordRules = rules.filter(r => r.triggerType === "keyword" && r.delta !== 0);
    if (!keywordRules.length) return;
    const lower = text.toLowerCase();
    // [BUG-17 FIX] maxPerDayチェック: 1日の上限回数を超えたルールはスキップ
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString().replace("T", " ").slice(0, 19);
    let totalDelta = 0;
    for (const rule of keywordRules) {
      const patterns = rule.triggerValue.split("|").map(k=>k.trim()).filter(Boolean);
      if (!patterns.some(p => lower.includes(p.toLowerCase()))) continue;
      if (rule.maxPerDay > 0) {
        const cnt = await import("@/lib/db").then(({ queryOne }) =>
          queryOne<{ cnt: number }>(db,
            `SELECT COUNT(*) AS cnt FROM xp_logs WHERE user_id=? AND activity=? AND created_at>?`,
            [userId, `anomaly_bulletin_${rule.id}`, oneDayAgo]
          )
        ).catch(() => null);
        if ((cnt?.cnt ?? 0) >= rule.maxPerDay) continue;
        // 記録用エントリ（XP 0）を残してカウント追跡
        await execute(db,
          `INSERT INTO xp_logs (user_id, activity, xp_gained, created_at) VALUES (?, ?, 0, datetime('now'))`,
          [userId, `anomaly_bulletin_${rule.id}`]
        ).catch(() => {});
      }
      totalDelta += rule.delta;
    }
    if (totalDelta === 0) return;
    await execute(db,
      `UPDATE users SET anomaly_score = MAX(0, MIN(100, anomaly_score + ?)) WHERE id=?`,
      [totalDelta, userId]
    ).catch(() => {});
  } catch { /* non-critical */ }
}

function formatPost(row: Record<string, unknown>) {
  let meta: Record<string, unknown> = {};
  try { meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown> || {}); } catch {}
  return {
    id: row.id, title: row.title, body: row.body, status: row.status,
    likeCount: row.like_count || 0, commentCount: row.comment_count || 0,
    viewCount: row.view_count || 0, classification: row.classification,
    requiredClearance: row.required_clearance || 0, isLore: !!row.is_lore,
    slug: row.slug, authorId: row.author_id, authorName: row.author_name,
    divisionSlug: row.division_slug, divisionName: row.division_name,
    createdAt: row.created_at, updatedAt: row.updated_at,
    timestamp: row.created_at, author: row.author_name, desc: row.body,
    severity: meta.severity || "safe", location: meta.location || "",
  };
}

export async function GET(req: NextRequest) {
  // [FIX-C11] 認証チェック：未認証ユーザーはアクセス不可
  const authUser = getJwtUser(req);
  if (!authUser) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // [BUG-11 FIX] limitに上限を設けてDoS防止（最大100件）
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30") || 30));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);
  const division = searchParams.get("division");
  const userClearance = authUser?.level || 0;
  const db = getDb();

  try {
    const baseSelect = `SELECT p.id, p.title, p.body, p.status, p.like_count, p.comment_count, p.view_count,
      p.classification, p.required_clearance, p.is_lore, p.slug, p.metadata, p.created_at, p.updated_at,
      u.username AS author_id, u.display_name AS author_name, d.slug AS division_slug, d.name AS division_name
      FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN divisions d ON d.id = p.division_id
      WHERE p.status = 'published' AND p.deleted_at IS NULL AND p.required_clearance <= ?`;

    const rows = await query<Record<string, unknown>>(db,
      division
        ? `${baseSelect} AND d.slug = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
        : `${baseSelect} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      division ? [userClearance, division, limit, offset] : [userClearance, limit, offset]
    );
    return NextResponse.json(rows.map(formatPost));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authUser = getJwtUser(req);
  if (!authUser) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  // [FIX BUG#10] JWTだけでなくDBの最新statusを確認してBANユーザーの投稿をブロック
  const db = getDb();
  const statusRow = await (async () => {
    try {
      const rows = await query<{ status: string }>(db,
        `SELECT status FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [authUser.userId]
      );
      return rows[0] ?? null;
    } catch { return null; }
  })();
  if (statusRow?.status === "banned" || statusRow?.status === "suspended") {
    return NextResponse.json({ error: "投稿権限がありません" }, { status: 403 });
  }
  // [F-010/AE-026] author フィールドはクライアントから受け取らない（なりすまし防止）
  const { title: rawTitle, body: rawBody, severity, location, entityDesc } = await req.json().catch(() => ({}));

  // XSSサニタイズ
  const title = sanitizeDisplayText(rawTitle);
  const body = sanitizeMultilineText(rawBody);
  const sanitizedLocation = sanitizeDisplayText(location);
  const sanitizedEntityDesc = sanitizeMultilineText(entityDesc);

  // [FIX-H06] title・body の長さ制限（DoS・DB肥大化防止）
  if (!body) return NextResponse.json({ error: "body は必須です" }, { status: 400 });
  if (title && title.length > 200) return NextResponse.json({ error: "title は200文字以内にしてください" }, { status: 400 });
  if (body.length > 10000) return NextResponse.json({ error: "body は10000文字以内にしてください" }, { status: 400 });

  try {
    const classMap: Record<string, string> = { critical: "CRITICAL", warning: "CONFIDENTIAL", safe: "UNCLASSIFIED" };
    const newId = crypto.randomUUID();
    // 投稿者名は認証済みユーザーの agentId を強制使用
    const metadata = JSON.stringify({ location: sanitizedLocation || null, entityDesc: sanitizedEntityDesc || null, authorName: authUser.agentId, severity: severity || "safe" });
    await execute(db, `
      INSERT INTO posts (id, user_id, title, body, status, classification, required_clearance, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'published', ?, 0, ?, datetime('now'), datetime('now'))
    `, [newId, authUser.userId, title || null, body, classMap[severity] || "UNCLASSIFIED", metadata]);

    // ⑤ 掲示板投稿にARGキーワード異常スコアルールを適用
    applyBulletinAnomalyRules(db, authUser.userId, [title||"", body||""].join(" ")).catch(() => {});

    return NextResponse.json(formatPost({
      id: newId, title, body, status: "published",
      classification: classMap[severity] || "UNCLASSIFIED",
      like_count: 0, comment_count: 0, created_at: new Date().toISOString(),
      author_id: authUser.agentId, author_name: authUser.agentId, metadata,
    }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
