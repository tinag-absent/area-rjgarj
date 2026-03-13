import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, `CREATE TABLE IF NOT EXISTS npc_scripts (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    npc_key        TEXT NOT NULL,
    active         INTEGER NOT NULL DEFAULT 1,
    entry_step_id  TEXT NOT NULL DEFAULT '',
    steps_json     TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  try { await execute(db, `ALTER TABLE npc_scripts ADD COLUMN entry_step_id TEXT NOT NULL DEFAULT ''`); }
  catch { /* already exists */ }
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = getDb();
    await ensureTable(db);
    const rows = await query<{
      id: string; name: string; npc_key: string; active: number;
      entry_step_id: string; steps_json: string; created_at: string; updated_at: string;
    }>(db, "SELECT * FROM npc_scripts ORDER BY updated_at DESC");
    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, npc_key: r.npc_key, active: r.active === 1,
      entryStepId: r.entry_step_id || "",
      steps: JSON.parse(r.steps_json || "[]"),
      created_at: r.created_at, updated_at: r.updated_at,
    })));
  } catch (err) {
    console.error("[npc-script GET]", err);
    return NextResponse.json({ error: "読み込みに失敗" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    if (!body.id || !body.name || !body.npc_key)
      return NextResponse.json({ error: "必須フィールド不足" }, { status: 400 });

    // [FIX-NEW-02] npc_key はホワイトリスト検証
    const { NPCS } = await import("@/lib/npc-engine");
    if (!Object.keys(NPCS).includes(body.npc_key)) {
      return NextResponse.json({ error: "無効な npc_key です" }, { status: 400 });
    }
    // [FIX-NEW-02] steps_json のサイズ上限（200KB）
    const stepsJson = JSON.stringify(body.steps || []);
    if (stepsJson.length > 200_000) {
      return NextResponse.json({ error: "steps が大きすぎます（200KB以内）" }, { status: 400 });
    }
    // id と name の長さ制限
    if (typeof body.id !== "string" || body.id.length > 128 || !/^[\w\-]+$/.test(body.id)) {
      return NextResponse.json({ error: "id は128文字以内の英数字・ハイフン・アンダースコアにしてください" }, { status: 400 });
    }
    if (typeof body.name !== "string" || body.name.length > 200) {
      return NextResponse.json({ error: "name は200文字以内にしてください" }, { status: 400 });
    }

    const db = getDb();
    await ensureTable(db);
    await execute(db,
      `INSERT INTO npc_scripts (id, name, npc_key, active, entry_step_id, steps_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, npc_key=excluded.npc_key,
         active=excluded.active, entry_step_id=excluded.entry_step_id,
         steps_json=excluded.steps_json, updated_at=excluded.updated_at`,
      [body.id, body.name, body.npc_key, body.active ? 1 : 0,
       body.entryStepId || "", stepsJson]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[npc-script POST]", err);
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
    await execute(db, "DELETE FROM npc_scripts WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[npc-script DELETE]", err);
    return NextResponse.json({ error: "削除に失敗" }, { status: 500 });
  }
}
