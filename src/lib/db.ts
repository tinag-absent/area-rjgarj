/**
 * lib/db.ts — Turso (libSQL) シングルトンクライアント
 *
 * 環境変数:
 *   TURSO_DATABASE_URL  — Turso DB URL (libsql://xxx.turso.io)
 *   TURSO_AUTH_TOKEN    — Turso 認証トークン
 */

import { createClient, type Client, type InValue } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

export function getDb(): Client {
  if (!global.__tursoClient) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL が設定されていません");

    global.__tursoClient = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return global.__tursoClient;
}

export async function query<T = Record<string, unknown>>(
  client: Client,
  sql: string,
  args: InValue[] = []
): Promise<T[]> {
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function execute(
  client: Client,
  sql: string,
  args: InValue[] = []
) {
  return client.execute({ sql, args });
}

export async function transaction<T>(
  client: Client,
  fn: (tx: Awaited<ReturnType<Client["transaction"]>>) => Promise<T>
): Promise<T> {
  const tx = await client.transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
