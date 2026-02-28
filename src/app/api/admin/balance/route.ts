/**
 * /api/admin/balance — バランス設定の読み書き
 *
 * GET  → 現在の設定（balance_config テーブル or デフォルト値）を返す
 * POST → 設定を保存する（super_admin のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin, requireSuperAdmin } from "@/lib/server-auth";

// デフォルト設定（初回 or テーブル未存在時のフォールバック）
const DEFAULTS = {
  levelThresholds: { "0": 0, "1": 100, "2": 300, "3": 600, "4": 1200, "5": 2500 },
  xpRewards: {
    first_login: 50, profile_view: 10, chat_message: 5, division_view: 20,
    codex_view: 30, mission_complete: 100, daily_login: 25, location_view: 15,
    entity_view: 15, module_view: 15, search_use: 8, bookmark_add: 5,
  },
  dailyLoginRewards: { "1": 25, "2": 30, "3": 35, "4": 40, "5": 45, "6": 50, "7": 100 },
};

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS balance_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = getDb();
    await ensureTable(db);

    const rows = await query<{ key: string; value: string }>(
      db,
      "SELECT key, value FROM balance_config"
    );

    if (rows.length === 0) {
      return NextResponse.json(DEFAULTS);
    }

    const config: Record<string, unknown> = { ...DEFAULTS };
    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        // パース失敗時はデフォルトを維持
      }
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error("[balance GET]", err);
    return NextResponse.json(DEFAULTS);
  }
}

export async function POST(req: NextRequest) {
  // 書き込みは super_admin のみ
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { levelThresholds, xpRewards, dailyLoginRewards } = body;

    if (!levelThresholds || !xpRewards || !dailyLoginRewards) {
      return NextResponse.json({ error: "必要なフィールドがありません" }, { status: 400 });
    }

    const db = getDb();
    await ensureTable(db);

    const entries: [string, unknown][] = [
      ["levelThresholds", levelThresholds],
      ["xpRewards", xpRewards],
      ["dailyLoginRewards", dailyLoginRewards],
    ];

    for (const [key, value] of entries) {
      await execute(
        db,
        `INSERT INTO balance_config (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, JSON.stringify(value)]
      );
    }

    return NextResponse.json({ ok: true, message: "保存しました" });
  } catch (err) {
    console.error("[balance POST]", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
