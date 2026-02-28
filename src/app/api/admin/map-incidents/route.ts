/**
 * /api/admin/map-incidents — マップインシデントの読み書き
 *
 * GET  → 現在のインシデント一覧を返す（admin以上）
 * POST → インシデント全体を保存する（admin以上）
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

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

    const incidents = rows.map((r) => {
      try {
        return JSON.parse(r.data);
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ incidents });
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

    // id の存在チェック
    for (const inc of incidents) {
      if (!inc.id || typeof inc.id !== "string") {
        return NextResponse.json({ error: "各インシデントに id が必要です" }, { status: 400 });
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
