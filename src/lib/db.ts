/**
 * src/lib/db.ts
 * @libsql/client (Turso) ベースの DB ラッパー。
 * Next.js の Server Component / API Route から利用する。
 */
import { createClient } from "@libsql/client";
import type { Client, InValue } from "@libsql/client";

// ── クライアント シングルトン ─────────────────────────────────────
let _db: Client | null = null;

export function getDb(): Client {
  if (_db) return _db;

  const g = globalThis as typeof globalThis & { __db?: Client };
  if (g.__db) { _db = g.__db; return _db; }

  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL が設定されていません。.env.local を確認してください。"
    );
  }

  const db = createClient({ url, authToken: token });
  _db = db;
  g.__db = db;
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
  fn: (tx: Client) => Promise<void>
): Promise<void> {
  const tx = await db.transaction("write");
  try {
    await fn(tx as unknown as Client);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
