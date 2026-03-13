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
    ).catch((err) => {
      console.error(`[rule-engine] DB クエリ失敗 type=${type}:`, err);
      return [] as { id: string; data_json: string }[];
    });
    const data = rows.reduce<T[]>((acc, r) => {
      try {
        acc.push({ id: r.id, ...JSON.parse(r.data_json || "{}") } as T);
      } catch {
        console.warn(`[rule-engine] data_json パース失敗 id=${r.id}`);
      }
      return acc;
    }, []);
    CACHE.set(type, { data, at: now });
    return data;
  } catch (err) {
    console.error(`[rule-engine] loadRules 失敗 type=${type}:`, err);
    // キャッシュが古くても存在すれば返す（可用性優先）
    const stale = CACHE.get(type);
    if (stale) return stale.data as T[];
    return [];
  }
}

export function invalidateCache(type?: string) {
  if (type) CACHE.delete(type);
  else CACHE.clear();
}
