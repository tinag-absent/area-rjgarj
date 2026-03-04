/**
 * lib/rule-engine.ts
 * サーバーサイド共通: rule_engine_entries テーブルからルールを読み込むキャッシュ付きローダー
 */
import { getDb, query } from "@/lib/db";

interface CacheEntry { data: unknown[]; at: number; }
const CACHE = new Map<string, CacheEntry>();
const TTL = 60_000; // 60秒

export async function loadRules<T = Record<string, unknown>>(type: string): Promise<T[]> {
  const now = Date.now();
  const cached = CACHE.get(type);
  if (cached && now - cached.at < TTL) return cached.data as T[];
  try {
    const db = getDb();
    const rows = await query<{ id: string; data_json: string }>(
      db,
      "SELECT id, data_json FROM rule_engine_entries WHERE type=? AND active=1 ORDER BY priority ASC, created_at ASC",
      [type]
    ).catch(() => [] as { id: string; data_json: string }[]);
    const data = rows.map(r => ({ id: r.id, ...JSON.parse(r.data_json || "{}") })) as T[];
    CACHE.set(type, { data, at: now });
    return data;
  } catch {
    return [];
  }
}

export function invalidateCache(type?: string) {
  if (type) CACHE.delete(type);
  else CACHE.clear();
}
