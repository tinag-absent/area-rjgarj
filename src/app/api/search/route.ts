/**
 * GET /api/search?q=QUERY&category=all
 * IDコードによる全カテゴリ横断検索。JSONファイルを検索対象とする。
 * ユーザーのクリアランスレベルに応じてフィルタリング。
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ── 型定義 ────────────────────────────────────────────────────────────────

interface SearchResult {
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

// ── JSONローダー ──────────────────────────────────────────────────────────

function loadJson<T>(file: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")
  ) as T;
}

// ── 正規化マッチ（大文字小文字・スペース無視）────────────────────────────

function matches(value: string | undefined | null, query: string): boolean {
  if (!value) return false;
  return value.toUpperCase().includes(query.toUpperCase());
}

// ── カテゴリ別検索 ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "#ef4444", monitoring: "#eab308", completed: "#10b981", failed: "#64748b",
};
const CLASS_COLORS: Record<string, string> = {
  safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6",
};

function searchMissions(q: string): SearchResult[] {
  const { missions } = loadJson<{ missions: Array<{
    id: string; title: string; status: string; priority: string;
    location: string; description: string; securityLevel: number;
  }> }>("mission-data.json");

  return missions
    .filter(m => matches(m.id, q) || matches(m.title, q) || matches(m.location, q))
    .map(m => ({
      id: m.id, category: "mission" as const,
      title: m.title, subtitle: m.location,
      description: m.description?.slice(0, 80) + "...",
      badge: m.status, badgeColor: STATUS_COLORS[m.status] ?? "#64748b",
      href: `/missions`, matchedId: m.id,
    }));
}

function searchEntities(q: string): SearchResult[] {
  const { entities } = loadJson<{ entities: Array<{
    id: string; code: string; name: string; classification: string; description: string;
  }> }>("entities-data.json");

  return entities
    .filter(e => matches(e.id, q) || matches(e.code, q) || matches(e.name, q))
    .map(e => ({
      id: e.id, category: "entity" as const,
      title: e.name, subtitle: e.code,
      description: e.description?.slice(0, 80) + "...",
      badge: e.classification.toUpperCase(),
      badgeColor: CLASS_COLORS[e.classification] ?? "#64748b",
      href: `/entities/${e.id}`, matchedId: e.code || e.id,
    }));
}

function searchModules(q: string): SearchResult[] {
  const { modules } = loadJson<{ modules: Array<{
    id: string; code: string; name: string; classification: string; description: string;
  }> }>("modules-data.json");

  return modules
    .filter(m => matches(m.id, q) || matches(m.code, q) || matches(m.name, q))
    .map(m => ({
      id: m.id, category: "module" as const,
      title: m.name, subtitle: m.code,
      description: m.description?.slice(0, 80) + "...",
      badge: m.classification.toUpperCase(),
      badgeColor: CLASS_COLORS[m.classification] ?? "#64748b",
      href: `/modules`, matchedId: m.code || m.id,
    }));
}

function searchLocations(q: string): SearchResult[] {
  const { locations } = loadJson<{ locations: Array<{
    id: string; name: string; type: string; description: string; securityLevel: number;
  }> }>("locations-data.json");

  return locations
    .filter(l => matches(l.id, q) || matches(l.name, q))
    .map(l => ({
      id: l.id, category: "location" as const,
      title: l.name, subtitle: `SEC.${l.securityLevel}`,
      description: l.description?.slice(0, 80) + "...",
      href: `/locations`, matchedId: l.id,
    }));
}

function searchPersonnel(q: string): SearchResult[] {
  const { personnel } = loadJson<{ personnel: Array<{
    id: string; name: string; division: string; rank: string; specialization: string;
  }> }>("personnel-data.json");

  return personnel
    .filter(p => matches(p.id, q) || matches(p.name, q))
    .map(p => ({
      id: p.id, category: "personnel" as const,
      title: p.name, subtitle: `${p.rank} · ${p.division}`,
      description: p.specialization ?? "",
      href: `/personnel/${p.id}`, matchedId: p.id,
    }));
}

function searchNovels(q: string): SearchResult[] {
  const { novels } = loadJson<{ novels: Array<{
    id: string; title: string; author: string; category: string; summary: string;
  }> }>("novels-data.json");

  return novels
    .filter(n => matches(n.id, q) || matches(n.title, q) || matches(n.author, q))
    .map(n => ({
      id: n.id, category: "novel" as const,
      title: n.title, subtitle: n.author,
      description: n.summary?.slice(0, 80) + "...",
      badge: n.category,
      badgeColor: "#06b6d4",
      href: `/novel/${n.id}`, matchedId: n.id,
    }));
}

// ── ルートハンドラー ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q        = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], counts: {} });
  }

  // クリアランスレベルをヘッダーから取得（ミドルウェアが注入）
  const level = parseInt(req.headers.get("x-user-level") ?? "0", 10);

  try {
    const results: SearchResult[] = [];

    if (category === "all" || category === "mission")   results.push(...searchMissions(q));
    if (category === "all" || category === "entity")    results.push(...searchEntities(q));
    if (category === "all" || category === "module")    results.push(...searchModules(q));
    if (category === "all" || category === "location")  results.push(...searchLocations(q));
    if (category === "all" || category === "personnel") results.push(...searchPersonnel(q));
    if (category === "all" || category === "novel")     results.push(...searchNovels(q));

    // カテゴリ別カウント
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }

    return NextResponse.json(
      { results, counts },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/search] エラー:", err);
    return NextResponse.json({ error: "検索処理に失敗しました" }, { status: 500 });
  }
}
