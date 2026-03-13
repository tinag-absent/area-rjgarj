/**
 * src/lib/db.ts
 * @libsql/client (Turso) ベースの DB ラッパー。
 * Next.js の Server Component / API Route から利用する。
 */
import { createClient } from "@libsql/client";
import type { Client, InValue, Transaction } from "@libsql/client";

// ── クライアント シングルトン ─────────────────────────────────────
// [FIX-L07] モジュールレベルの _db と globalThis.__db の二重管理を廃止。
// Next.js の Hot Reload でモジュールが再初期化されても globalThis.__db は
// 保持されるため、単一の globalThis ベース管理に統一する。
declare global {
  // eslint-disable-next-line no-var
  var __db: Client | undefined;
}

export function getDb(): Client {
  if (globalThis.__db) return globalThis.__db;

  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL が設定されていません。.env.local を確認してください。"
    );
  }

  const db = createClient({ url, authToken: token });

  // [AE-014] SQLite の外部キー制約を有効化（デフォルトでは無効）
  // ON DELETE CASCADE 等が機能するために必要
  db.execute({ sql: "PRAGMA foreign_keys = ON", args: [] }).catch((e) => {
    console.warn("[db] PRAGMA foreign_keys=ON failed:", e);
  });

  globalThis.__db = db;
  return db;
}

// ── Promise ラッパー（既存コードとの互換性） ─────────────────────

/** 複数行を返すクエリ */
export async function query<T>(
  db: Client,
  sql: string,
  params: InValue[] = []
): Promise<T[]> {
  const result = await db.execute({ sql, args: params });
  return result.rows as unknown as T[];
}

/** 1行を返すクエリ */
export async function queryOne<T>(
  db: Client,
  sql: string,
  params: InValue[] = []
): Promise<T | null> {
  const result = await db.execute({ sql, args: params });
  if (!result.rows.length) return null;
  return result.rows[0] as unknown as T;
}

/** INSERT / UPDATE / DELETE */
export async function execute(
  db: Client,
  sql: string,
  params: InValue[] = []
): Promise<{ rowsAffected: number; lastInsertRowid: bigint | undefined }> {
  const result = await db.execute({ sql, args: params });
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  };
}

/** トランザクション */
export async function transaction(
  db: Client,
  fn: (tx: Transaction) => Promise<void>
): Promise<void> {
  const tx = await db.transaction("write");
  try {
    await fn(tx);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
