import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/server-auth";

// 危険なDDL操作をブロック
const BLOCKED_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bATTACH\b/i,
  /\bDETACH\b/i,
  /\bPRAGMA\b/i,
  /--.*?$/m,        // SQLインジェクション（コメント）
  /\/\*[\s\S]*?\*\//,
];

function isSafeQuery(sql: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sql)) {
      return { safe: false, reason: `禁止されている操作が含まれています: ${pattern.source}` };
    }
  }
  return { safe: true };
}

function isReadOnly(sql: string): boolean {
  return /^\s*SELECT\b/i.test(sql.trim());
}

// GET /api/admin/db-query — テーブル一覧とスキーマ取得
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  try {
    const tables = await query<{ name: string; type: string }>(db,
      `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name`
    );

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get("table");
    if (tableName) {
      // [SECURITY FIX V-06] 正規表現バリデーションに加え、
      // 実際に存在するテーブル名のホワイトリストと照合する（二重防御）。
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        return NextResponse.json({ error: "無効なテーブル名です" }, { status: 400 });
      }
      const tableExists = tables.some((t) => t.name === tableName);
      if (!tableExists) {
        return NextResponse.json({ error: "テーブルが存在しません" }, { status: 404 });
      }
      const columns = await query<{ cid: number; name: string; type: string; notnull: number; dflt_value: string; pk: number }>(db,
        `PRAGMA table_info(${tableName})`
      );
      const rowCount = await query<{ count: number }>(db,
        `SELECT COUNT(*) AS count FROM ${tableName}`
      );
      return NextResponse.json({ tables, columns, rowCount: rowCount[0]?.count ?? 0 });
    }

    return NextResponse.json({ tables });
  } catch (err) {
    console.error("[db-query GET]", err);
    return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
  }
}

// POST /api/admin/db-query — SQL実行
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { sql, confirmed } = await req.json().catch(() => ({}));
  if (!sql || typeof sql !== "string") {
    return NextResponse.json({ error: "SQL は必須です" }, { status: 400 });
  }

  const trimmed = sql.trim();
  if (trimmed.length > 4000) {
    return NextResponse.json({ error: "SQLは4000文字以内にしてください" }, { status: 400 });
  }

  // 危険操作チェック
  const safety = isSafeQuery(trimmed);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 400 });
  }

  // 書き込み操作は confirmed フラグが必要
  const readOnly = isReadOnly(trimmed);
  if (!readOnly && !confirmed) {
    return NextResponse.json({
      requiresConfirmation: true,
      message: "書き込み操作です。本当に実行しますか？この操作は取り消せません。",
    }, { status: 200 });
  }

  const db = getDb();
  const startTime = Date.now();

  try {
    let result;
    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];
    let rowsAffected = 0;

    if (readOnly) {
      rows = await query<Record<string, unknown>>(db, trimmed);
      columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      rowsAffected = rows.length;
    } else {
      const res = await execute(db, trimmed);
      rowsAffected = Number(res.rowsAffected ?? 0);
      result = { lastInsertRowid: String(res.lastInsertRowid ?? "") };
    }

    const elapsed = Date.now() - startTime;

    // クエリをアクセスログに記録
    execute(db, `
      INSERT INTO access_logs (user_id, method, path, status_code, ip_address, created_at)
      VALUES (?, 'POST', '/api/admin/db-query', 200, ?, datetime('now'))
    `, [auth.user.userId, `DB_QUERY:${trimmed.slice(0, 200)}`]).catch(() => {});

    return NextResponse.json({
      ok: true,
      readOnly,
      rows: rows.slice(0, 500), // 最大500行
      columns,
      rowsAffected,
      truncated: rows.length > 500,
      elapsed,
      ...(result ?? {}),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      elapsed: Date.now() - startTime,
    }, { status: 400 });
  }
}
