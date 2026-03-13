import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { TRIGGER_RULES, IDLE_POOL, NPC_REACTIONS } from "@/lib/npc-engine";

const randId = (prefix: string) => prefix + randomBytes(4).toString("hex");

// [AE-009/AD-002] schedule/broadcast/condition を追加
const TYPES = ["trigger", "idle", "reaction", "schedule", "broadcast", "condition"] as const;
type RuleType = typeof TYPES[number];

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, `CREATE TABLE IF NOT EXISTS npc_engine_rules (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    npc_key    TEXT NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    priority   INTEGER NOT NULL DEFAULT 0,
    data_json  TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

/** 初回のみハードコード値をDBにシード */
async function seedIfEmpty(db: ReturnType<typeof getDb>, type: RuleType) {
  const existing = await query<{ cnt: number }>(
    db, "SELECT COUNT(*) as cnt FROM npc_engine_rules WHERE type = ?", [type]
  );
  if (Number(existing[0]?.cnt) > 0) return;

  if (type === "trigger") {
    for (const r of TRIGGER_RULES) {
      const id = randId("tr_");
      await execute(db,
        `INSERT INTO npc_engine_rules (id, type, npc_key, active, priority, data_json)
         VALUES (?, 'trigger', ?, 1, 0, ?)`,
        [id, r.npcKey, JSON.stringify({ keywords: r.keywords, responses: r.responses })]
      );
    }
  } else if (type === "idle") {
    for (const r of IDLE_POOL) {
      const id = randId("id_");
      await execute(db,
        `INSERT INTO npc_engine_rules (id, type, npc_key, active, priority, data_json)
         VALUES (?, 'idle', ?, 1, 0, ?)`,
        [id, r.npcKey, JSON.stringify({ text: r.text, weight: 1 })]
      );
    }
  } else if (type === "reaction") {
    for (const r of NPC_REACTIONS) {
      const id = randId("rc_");
      await execute(db,
        `INSERT INTO npc_engine_rules (id, type, npc_key, active, priority, data_json)
         VALUES (?, 'reaction', ?, 1, 0, ?)`,
        [id, r.reactingNpcKey, JSON.stringify({
          sourceNpcKey: r.sourceNpcKey,
          reactingNpcKey: r.reactingNpcKey,
          probability: r.probability,
          reactions: r.reactions,
        })]
      );
    }
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const type = new URL(req.url).searchParams.get("type") as RuleType | null;
  if (!type || !TYPES.includes(type)) return NextResponse.json({ error: "type が必要" }, { status: 400 });
  try {
    const db = getDb();
    await ensureTable(db);
    await seedIfEmpty(db, type);
    const rows = await query<{
      id: string; type: string; npc_key: string; active: number;
      priority: number; data_json: string; created_at: string; updated_at: string;
    }>(db, "SELECT * FROM npc_engine_rules WHERE type = ? ORDER BY priority ASC, created_at ASC", [type]);
    return NextResponse.json(rows.map(r => ({
      id: r.id, type: r.type, npcKey: r.npc_key, active: r.active === 1,
      priority: r.priority, ...JSON.parse(r.data_json || "{}"),
      created_at: r.created_at, updated_at: r.updated_at,
    })));
  } catch (err) {
    console.error("[npc-engine-rules GET]", err);
    return NextResponse.json({ error: "読み込みに失敗" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    if (!body.id || !body.type) return NextResponse.json({ error: "id/type が必要" }, { status: 400 });
    // [AE-030] POST でも type のホワイトリスト検証を行う
    if (!TYPES.includes(body.type as RuleType)) {
      return NextResponse.json({ error: `type は ${TYPES.join(" / ")} のいずれかです` }, { status: 400 });
    }
    const { id, type, npcKey, active, priority, ...rest } = body;
    // [FIX-NEW-16] data_json のサイズ上限（50KB）
    const dataJson = JSON.stringify(rest);
    if (dataJson.length > 50_000) {
      return NextResponse.json({ error: "ルールデータが大きすぎます（50KB以内）" }, { status: 400 });
    }
    // id のフォーマット検証
    if (typeof id !== "string" || id.length > 128 || !/^[\w\-]+$/.test(id)) {
      return NextResponse.json({ error: "id は128文字以内の英数字・ハイフン・アンダースコアにしてください" }, { status: 400 });
    }
    const db = getDb();
    await ensureTable(db);
    await execute(db,
      `INSERT INTO npc_engine_rules (id, type, npc_key, active, priority, data_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         type=excluded.type, npc_key=excluded.npc_key, active=excluded.active,
         priority=excluded.priority, data_json=excluded.data_json,
         updated_at=excluded.updated_at`,
      [id, type, npcKey || "", active ? 1 : 0, priority || 0, dataJson]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[npc-engine-rules POST]", err);
    return NextResponse.json({ error: "保存に失敗" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id が必要" }, { status: 400 });
    // [FIX] id フォーマット検証
    if (!/^[\w\-]{1,128}$/.test(id)) {
      return NextResponse.json({ error: "無効な id です" }, { status: 400 });
    }
    const db = getDb();
    await execute(db, "DELETE FROM npc_engine_rules WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "削除に失敗" }, { status: 500 });
  }
}
