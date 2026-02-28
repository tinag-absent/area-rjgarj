/**
 * /api/admin/novels — ノベル（記録文庫）の読み書き
 *
 * GET  → 全ノベル一覧を返す（admin以上）
 * POST → ノベル全体を保存する（admin以上）
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS novels_content (
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
      "SELECT id, data FROM novels_content ORDER BY rowid ASC"
    );

    if (rows.length === 0) {
      return NextResponse.json({ novels: [], source: "empty" });
    }

    const novels = rows.map((r) => {
      try {
        return JSON.parse(r.data);
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ novels });
  } catch (err) {
    console.error("[novels GET]", err);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { novels } = body;

    if (!Array.isArray(novels)) {
      return NextResponse.json({ error: "novels 配列が必要です" }, { status: 400 });
    }

    for (const novel of novels) {
      if (!novel.id || typeof novel.id !== "string") {
        return NextResponse.json({ error: "各ノベルに id が必要です" }, { status: 400 });
      }
    }

    const db = getDb();
    await ensureTable(db);

    await execute(db, "DELETE FROM novels_content");
    for (const novel of novels) {
      await execute(
        db,
        `INSERT INTO novels_content (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
        [novel.id, JSON.stringify(novel)]
      );
    }

    return NextResponse.json({ ok: true, count: novels.length, message: "保存しました" });
  } catch (err) {
    console.error("[novels POST]", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
