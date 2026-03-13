import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/server-auth";

// [FIX #569] 本番環境ではdb-queryエンドポイントを完全に無効化
if (process.env.NODE_ENV === "production" && !process.env.ENABLE_DB_EDITOR) {
  // モジュールレベルでは実行できないため、各ハンドラで弾く
}

function isProductionLocked(): boolean {
  return process.env.NODE_ENV === "production" && !process.env.ENABLE_DB_EDITOR;
}

// 危険なDDL・インジェクション操作をブロック
const BLOCKED_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bATTACH\b/i,
  /\bDETACH\b/i,
  /\bPRAGMA\b/i,
  // [FIX-C14] UNION / INTERSECT / EXCEPT による情報漏洩クエリをブロック
  /\bUNION\b/i,
  /\bINTERSECT\b/i,
  /\bEXCEPT\b/i,
  // [FIX-C14] SQLite 拡張機能のロードをブロック
  /\bLOAD_EXTENSION\b/i,
  // [FIX-H10] 行コメントを確実に除去（/m フラグ付き全マッチ）
  /--[^\n]*/g,
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
  if (isProductionLocked()) {
    return NextResponse.json({ error: "本番環境ではこのエンドポイントは無効です" }, { status: 403 });
  }
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
      // [SECURITY FIX G-001] tableName はこの時点で:
      //   1. 正規表現 /^[a-zA-Z_][a-zA-Z0-9_]*$/ を通過済み
      //   2. sqlite_master のホワイトリストに存在することを確認済み
      // SQLite の PRAGMA はパラメータ化できないが、上記二重検証により安全。
      const safeTableName = tables.find((t) => t.name === tableName)!.name;
      const columns = await query<{ cid: number; name: string; type: string; notnull: number; dflt_value: string; pk: number }>(db,
        `PRAGMA table_info(${safeTableName})`
      );
      const rowCount = await query<{ count: number }>(db,
        `SELECT COUNT(*) AS count FROM ${safeTableName}`
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
  if (isProductionLocked()) {
    return NextResponse.json({ error: "本番環境ではこのエンドポイントは無効です" }, { status: 403 });
  }
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

    // [FIX-M05] クエリを専用の admin_query_logs に記録（ip_address カラムへの混入を廃止）
    execute(db, `
      CREATE TABLE IF NOT EXISTS admin_query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT NOT NULL,
        sql_preview TEXT NOT NULL,
        read_only INTEGER NOT NULL DEFAULT 1,
        rows_affected INTEGER NOT NULL DEFAULT 0,
        elapsed_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).catch(() => {});
    execute(db, `
      INSERT INTO admin_query_logs (admin_id, sql_preview, read_only, rows_affected, elapsed_ms, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [auth.user.userId, trimmed.slice(0, 500), readOnly ? 1 : 0, rowsAffected, elapsed]).catch(() => {});

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
    // [FIX-L05] DB エラーの詳細情報（テーブル名・SQL等）をレスポンスに含めない
    console.error("[db-query POST] SQL実行エラー:", err);
    const isDevMode = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      error: isDevMode && err instanceof Error ? err.message : "SQL実行エラーが発生しました",
      elapsed: Date.now() - startTime,
    }, { status: 400 });
  }
}
