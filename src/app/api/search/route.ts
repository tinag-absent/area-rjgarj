/**
 * GET /api/search?q=ID&category=all
 *
 * ID完全一致検索API（大文字小文字無視）。
 * id / code フィールドに対して完全一致で検索する。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { getDb, query } from "@/lib/db";
import path from "path";
import fs from "fs";

export interface SearchResult {
  id: string;
  category: "mission" | "entity" | "module" | "location" | "personnel" | "novel" | "post";
  title: string;
  subtitle?: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  matchedId: string;
}

function loadJson<T>(filename: string): T {
  const filepath = path.join(process.cwd(), "public", "data", filename);
  return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
}

function eq(value: string | undefined | null, q: string): boolean {
  return !!value && value.toLowerCase() === q;
}

const CLASS_COLORS: Record<string, string> = {
  safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6",
};
const CLASS_LABELS: Record<string, string> = {
  safe: "SAFE", caution: "CAUTION", danger: "DANGER", classified: "CLASSIFIED",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#ef4444", monitoring: "#eab308", completed: "#10b981", failed: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  active: "対応中", monitoring: "監視中", completed: "収束済み", failed: "失敗",
};

function searchMissions(q: string, userLevel: number): SearchResult[] {
  const { missions } = loadJson<{ missions: any[] }>("mission-data.json");
  return missions
    .filter(m => (m.securityLevel ?? 0) <= userLevel && eq(m.id, q))
    .map(m => ({
      id: m.id, category: "mission" as const,
      title: m.title, subtitle: m.location,
      description: m.description ?? "",
      badge: STATUS_LABELS[m.status] ?? m.status,
      badgeColor: STATUS_COLORS[m.status] ?? "#6b7280",
      href: `/missions/${m.id}`, matchedId: m.id,
    }));
}

function searchEntities(q: string, userLevel: number): SearchResult[] {
  const { entities } = loadJson<{ entities: any[] }>("entities-data.json");
  return entities
    .filter(e => eq(e.id, q) || eq(e.code, q))
    .map(e => ({
      id: e.id, category: "entity" as const,
      title: e.name, subtitle: e.code,
      description: e.description ?? "",
      badge: CLASS_LABELS[e.classification] ?? e.classification,
      badgeColor: CLASS_COLORS[e.classification] ?? "#6b7280",
      href: `/entities/${e.id}`, matchedId: eq(e.id, q) ? e.id : e.code,
    }));
}

function searchModules(q: string, userLevel: number): SearchResult[] {
  const { modules } = loadJson<{ modules: any[] }>("modules-data.json");
  return modules
    .filter(m => eq(m.id, q) || eq(m.code, q))
    .map(m => ({
      id: m.id, category: "module" as const,
      title: m.name, subtitle: m.code,
      description: m.description ?? "",
      badge: CLASS_LABELS[m.classification] ?? m.classification,
      badgeColor: CLASS_COLORS[m.classification] ?? "#6b7280",
      href: `/modules/${m.id}`, matchedId: eq(m.id, q) ? m.id : m.code,
    }));
}

function searchLocations(q: string, userLevel: number): SearchResult[] {
  const { locations } = loadJson<{ locations: any[] }>("locations-data.json");
  const LOC_TYPE_LABELS: Record<string, string> = {
    headquarters: "本部", "dimensional-gate": "次元ゲート",
    "monitoring-station": "監視拠点", "research-facility": "研究施設",
    "branch-office": "支局", "field-base": "現場拠点",
  };
  return locations
    .filter(l => eq(l.id, q))
    .map(l => ({
      id: l.id, category: "location" as const,
      title: l.name, subtitle: LOC_TYPE_LABELS[l.type] ?? l.type,
      description: l.description ?? "",
      badge: `SEC.${l.securityLevel}`, badgeColor: "#10b981",
      href: `/locations/${l.id}`, matchedId: l.id,
    }));
}

function searchPersonnel(q: string, userLevel: number): SearchResult[] {
  const { personnel } = loadJson<{ personnel: any[] }>("personnel-data.json");
  return personnel
    .filter(p => eq(p.id, q))
    .map(p => ({
      id: p.id, category: "personnel" as const,
      title: p.name, subtitle: `${p.division} · ${p.rank}`,
      description: p.specialization ?? "",
      badge: p.division, badgeColor: "#f97316",
      href: `/personnel/${p.id}`, matchedId: p.id,
    }));
}

function searchNovels(q: string, userLevel: number): SearchResult[] {
  const { novels } = loadJson<{ novels: any[] }>("novels-data.json");
  return novels
    .filter(n => (n.securityLevel ?? 0) <= userLevel && eq(n.id, q))
    .map(n => ({
      id: n.id, category: "novel" as const,
      title: n.title, subtitle: n.subtitle,
      description: n.summary ?? "",
      badge: n.category, badgeColor: "#06b6d4",
      href: `/novel/${n.id}`, matchedId: n.id,
    }));
}

async function searchPosts(q: string, userLevel: number): Promise<SearchResult[]> {
  try {
    const db = getDb();
    const rows = await query<{
      id: string; title: string | null; body: string; classification: string;
    }>(db, `
      SELECT id, title, body, classification
      FROM posts
      WHERE status = 'published' AND deleted_at IS NULL
        AND required_clearance <= ?
        AND LOWER(id) = ?
      LIMIT 10
    `, [userLevel, q]);
    return rows.map(p => ({
      id: p.id, category: "post" as const,
      title: p.title ?? "（無題）",
      description: p.body.slice(0, 120),
      badge: p.classification, badgeColor: "#64748b",
      href: `/bulletin`, matchedId: p.id,
    }));
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "all";

  if (!q) return NextResponse.json({ results: [], counts: {} });
  if (q.length > 100) return NextResponse.json({ error: "IDが長すぎます" }, { status: 400 });

  const lvl = user.level ?? 0;

  const [missions, entities, modules, locations, personnel, novels, posts] = await Promise.all([
    category === "all" || category === "mission"   ? Promise.resolve(searchMissions(q, lvl))  : Promise.resolve([]),
    category === "all" || category === "entity"    ? Promise.resolve(searchEntities(q, lvl))  : Promise.resolve([]),
    category === "all" || category === "module"    ? Promise.resolve(searchModules(q, lvl))   : Promise.resolve([]),
    category === "all" || category === "location"  ? Promise.resolve(searchLocations(q, lvl)) : Promise.resolve([]),
    category === "all" || category === "personnel" ? Promise.resolve(searchPersonnel(q, lvl)) : Promise.resolve([]),
    category === "all" || category === "novel"     ? Promise.resolve(searchNovels(q, lvl))    : Promise.resolve([]),
    category === "all" || category === "post"      ? searchPosts(q, lvl)                       : Promise.resolve([]),
  ]);

  const results = [...missions, ...entities, ...modules, ...locations, ...personnel, ...novels, ...posts];
  const counts = {
    mission: missions.length, entity: entities.length, module: modules.length,
    location: locations.length, personnel: personnel.length, novel: novels.length, post: posts.length,
  };

  return NextResponse.json({ results, counts });
}
