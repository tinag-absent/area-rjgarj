import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

interface NovelData {
  id: string; category?: string; requiredLevel?: number;
  publishAt?: string; requiredFlag?: string;
  [key: string]: unknown;
}

interface NovelRuleCond { type:string; key?:string; value?:string; minLevel?:number; minDate?:string; }
interface NovelRule { id:string; applyTo:string; applyValue:string; operator:string; conditions:NovelRuleCond[]; }

async function checkNovelAccess(
  novel: NovelData, userLevel: number, userFlags: string[], now: string
): Promise<boolean> {
  // 基本フィールドチェック
  if (novel.requiredLevel && userLevel < novel.requiredLevel) return false;
  if (novel.publishAt && novel.publishAt > now) return false;
  if (novel.requiredFlag && !userFlags.includes(novel.requiredFlag)) return false;

  // ルールエンジンチェック
  try {
    const db = getDb();
    const rows = await query<{ id:string; data_json:string }>(db,
      "SELECT id, data_json FROM rule_engine_entries WHERE type='novel_rule' AND active=1 ORDER BY priority ASC"
    ).catch(() => [] as { id:string; data_json:string }[]);
    const rules = rows.map(r => ({ id:r.id, ...JSON.parse(r.data_json||"{}") })) as NovelRule[];

    const applicable = rules.filter(rule => {
      if (rule.applyTo === "all") return true;
      if (rule.applyTo === "category") return novel.category === rule.applyValue;
      if (rule.applyTo === "novel_id") return novel.id === rule.applyValue;
      return false;
    });

    for (const rule of applicable) {
      const results = (rule.conditions||[]).map((c:NovelRuleCond) => {
        if (c.type === "level") return userLevel >= (c.minLevel||0);
        if (c.type === "flag") return userFlags.includes(c.key||"");
        if (c.type === "date") return !c.minDate || now >= c.minDate;
        return true;
      });
      const pass = rule.operator === "OR" ? results.some(Boolean) : results.every(Boolean);
      if (!pass) return false;
    }
  } catch { /* non-critical, allow access on error */ }

  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const { id } = await params;
  const db = getDb();
  const now = new Date().toISOString();

  try {
    // DB から取得を試みる
    const rows = await query<{ id: string; data: string }>(db,
      "SELECT id, data FROM novels_content WHERE id=? LIMIT 1", [id]
    ).catch(() => [] as { id:string; data:string }[]);

    let novel: NovelData | null = null;
    if (rows.length > 0) {
      try { novel = JSON.parse(rows[0].data); } catch {}
    }

    // DB に無ければ静的 JSON から取得
    if (!novel) {
      const allRows = await query<{ id: string; data: string }>(db,
        "SELECT id, data FROM novels_content ORDER BY rowid ASC"
      ).catch(() => [] as { id:string; data:string }[]);
      if (allRows.length === 0) {
        return NextResponse.json({ error: "RECORD_NOT_FOUND" }, { status: 404 });
      }
      const found = allRows.map(r => { try { return JSON.parse(r.data) as NovelData; } catch { return null; } })
        .find(n => n?.id === id);
      novel = found ?? null;
    }

    if (!novel) return NextResponse.json({ error: "RECORD_NOT_FOUND" }, { status: 404 });

    // アクセス権チェック
    const flagRows = await query<{ flag_key: string }>(db,
      "SELECT flag_key FROM progress_flags WHERE user_id=?", [authUser.userId]
    ).catch(() => [] as { flag_key:string }[]);
    const userFlags = flagRows.map(f => f.flag_key);

    const allowed = await checkNovelAccess(novel, authUser.level, userFlags, now);
    if (!allowed) {
      return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
    }

    return NextResponse.json(novel);
  } catch (err) {
    console.error("[novels/[id] GET]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
