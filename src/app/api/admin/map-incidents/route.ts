/**
 * /api/admin/map-incidents — マップインシデントの読み書き
 *
 * GET  → 現在のインシデント一覧を返す（admin以上）
 * POST → インシデント全体を保存する（admin以上）
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { loadRules } from "@/lib/rule-engine";

interface LifecycleRule {
  id: string; name: string; conditionType: "age_days"|"gsi_threshold"|"severity";
  conditionValue: number; fromStatus: string; toStatus: string;
  newSeverity: string; notifyAdmin: boolean;
}

interface Incident {
  id: string; name: string; severity: string; status: string;
  gsi?: string; timestamp?: string;
  [key: string]: unknown;
}

const SEVERITY_ORDER: Record<string, number> = { low:1, medium:2, high:3, critical:4 };

async function applyLifecycleRules(incidents: Incident[]): Promise<{ incidents: Incident[]; changed: number }> {
  const rules = await loadRules<LifecycleRule>("incident_lifecycle");
  if (!rules.length) return { incidents, changed: 0 };
  const now = Date.now();
  let changed = 0;
  const updated = incidents.map(inc => {
    let patched = { ...inc };
    for (const rule of rules) {
      // fromStatus 条件（空=全て）
      if (rule.fromStatus && patched.status !== rule.fromStatus) continue;

      let triggered = false;
      if (rule.conditionType === "age_days" && patched.timestamp) {
        const ageDays = (now - new Date(patched.timestamp).getTime()) / 86_400_000;
        triggered = ageDays >= rule.conditionValue;
      } else if (rule.conditionType === "gsi_threshold" && patched.gsi) {
        triggered = Number(patched.gsi) >= rule.conditionValue;
      } else if (rule.conditionType === "severity") {
        triggered = (SEVERITY_ORDER[patched.severity] || 0) >= rule.conditionValue;
      }

      if (!triggered) continue;
      if (rule.toStatus && rule.fromStatus !== rule.toStatus) patched.status = rule.toStatus;
      if (rule.newSeverity) patched.severity = rule.newSeverity;
      changed++;
      break; // 1インシデントに1ルールのみ適用
    }
    return patched;
  });
  return { incidents: updated, changed };
}

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS map_incidents (
      id          TEXT PRIMARY KEY,
      data        TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = getDb();
    await ensureTable(db);

    const rows = await query<{ id: string; data: string }>(
      db,
      "SELECT id, data FROM map_incidents ORDER BY rowid ASC"
    );

    if (rows.length === 0) {
      // テーブルが空の場合は静的JSONにフォールバック
      return NextResponse.json({ incidents: [], source: "empty" });
    }

    const rawIncidents = rows.map((r) => {
      try {
        return JSON.parse(r.data);
      } catch {
        return null;
      }
    }).filter(Boolean) as Incident[];

    // ③ ライフサイクルルール自動評価
    const { incidents, changed } = await applyLifecycleRules(rawIncidents);
    
    // 変更があった場合は自動保存（N+1対策: トランザクション一括更新）
    if (changed > 0) {
      const changedIncidents = incidents.filter(inc => {
        const orig = rawIncidents.find(r => r.id === inc.id);
        return orig && (orig.status !== inc.status || orig.severity !== inc.severity);
      });
      if (changedIncidents.length > 0) {
        await transaction(db, async (tx) => {
          for (const inc of changedIncidents) {
            await tx.execute({
              sql: `INSERT INTO map_incidents (id, data, updated_at) VALUES (?,?,datetime('now'))
                    ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
              args: [inc.id, JSON.stringify(inc)],
            });
          }
        }).catch(() => {});
      }
    }

    return NextResponse.json({ incidents, lifecycleChanged: changed });
  } catch (err) {
    console.error("[map-incidents GET]", err);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { incidents } = body;

    if (!Array.isArray(incidents)) {
      return NextResponse.json({ error: "incidents 配列が必要です" }, { status: 400 });
    }

    // [AE-025] インシデント数の上限チェック（DB過負荷防止）
    const MAX_INCIDENTS = 500;
    if (incidents.length > MAX_INCIDENTS) {
      return NextResponse.json({ error: `インシデント数は${MAX_INCIDENTS}件以下にしてください` }, { status: 400 });
    }

    // id の存在チェック
    for (const inc of incidents) {
      if (!inc.id || typeof inc.id !== "string") {
        return NextResponse.json({ error: "各インシデントに id が必要です" }, { status: 400 });
      }
      // [FIX-NEW-12] id フォーマット検証（任意文字列の DB 投入を防止）
      if (!/^[\w\-]{1,128}$/.test(inc.id)) {
        return NextResponse.json({ error: `無効なインシデント id: ${inc.id}` }, { status: 400 });
      }
    }

    const db = getDb();
    await ensureTable(db);

    // トランザクション：全件削除して挿入（atomic）
    await transaction(db, async (tx) => {
      await tx.execute({ sql: "DELETE FROM map_incidents", args: [] });
      for (const inc of incidents) {
        await tx.execute({
          sql: `INSERT INTO map_incidents (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
          args: [inc.id, JSON.stringify(inc)],
        });
      }
    });

    return NextResponse.json({ ok: true, count: incidents.length, message: "保存しました" });
  } catch (err) {
    console.error("[map-incidents POST]", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
