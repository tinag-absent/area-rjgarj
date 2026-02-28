import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "実体カタログ - 海蝕機関" };

interface Entity {
  id: string; code: string; name: string; classification: string;
  description: string; threat: string; intelligence: string; origin: string;
  appearance: string; behavior: string; containment: string;
}
interface Mission { entity: string; }

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

const CLASS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  safe:       { label: "SAFE",       color: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.25)" },
  caution:    { label: "CAUTION",    color: "#eab308", bg: "rgba(234,179,8,0.06)",   border: "rgba(234,179,8,0.25)" },
  danger:     { label: "DANGER",     color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.25)" },
  classified: { label: "CLASSIFIED", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.25)" },
};

const THREAT_COLOR: Record<string, string> = {
  "極低": "#10b981", "低": "#84cc16", "中": "#eab308",
  "高": "#f97316", "極高": "#ef4444", "不明": "#6b7280", "なし": "#445060",
};

const INTEL_LABEL: Record<string, string> = {
  "低": "低知性", "中": "中知性", "高": "高知性", "不明": "不明", "なし": "なし",
};

export default async function EntitiesPage() {
  const h = await headers();
  const level = parseInt(h.get("x-user-level") ?? "0");
  if (level < 2) return <LockedContent requiredLevel={2} currentLevel={level} pageName="実体カタログ" />;

  const { entities } = loadJson<{ entities: Entity[] }>("entities-data.json");
  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");

  // 実体ごとの出現ミッション数
  const appearanceCount: Record<string, number> = {};
  for (const m of missions) {
    for (const e of entities) {
      if (m.entity.includes(e.code) || m.entity.includes(e.name)) {
        appearanceCount[e.id] = (appearanceCount[e.id] ?? 0) + 1;
      }
    }
  }

  // 分類別グループ
  const classGroups: Record<string, Entity[]> = {};
  for (const e of entities) {
    if (!classGroups[e.classification]) classGroups[e.classification] = [];
    classGroups[e.classification].push(e);
  }
  const classOrder = ["classified", "danger", "caution", "safe"];

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.18em", marginBottom: "0.4rem" }}>
          ENTITY CATALOG // LEVEL 2 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.25rem" }}>
          実体カタログ
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
          {entities.length} 件の海蝕実体が登録されています
        </p>
      </div>

      {/* 分類別サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {classOrder.map(cls => {
          const cm = CLASS_META[cls];
          const count = classGroups[cls]?.length ?? 0;
          return (
            <div key={cls} style={{
              padding: "1rem 1.25rem",
              backgroundColor: cm.bg,
              border: `1px solid ${cm.border}`,
              borderLeft: `3px solid ${cm.color}`,
            }}>
              <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: cm.color }}>{count}</div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: cm.color, letterSpacing: "0.1em", marginTop: "0.2rem" }}>{cm.label}</div>
            </div>
          );
        })}
      </div>

      {/* 分類別一覧 */}
      {classOrder.map(cls => {
        const group = classGroups[cls];
        if (!group || group.length === 0) return null;
        const cm = CLASS_META[cls];
        return (
          <div key={cls} style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div className="font-mono" style={{ fontSize: "0.7rem", color: cm.color, letterSpacing: "0.12em" }}>
                ▸ {cm.label} 分類 ({group.length})
              </div>
              <div style={{ flex: 1, height: "1px", backgroundColor: `${cm.color}20` }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.875rem" }}>
              {group.map(entity => {
                const tc = THREAT_COLOR[entity.threat] ?? "#6b7280";
                const appearances = appearanceCount[entity.id] ?? 0;
                return (
                  <Link key={entity.id} href={`/entities/${entity.id}`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{
                      borderColor: `${cm.color}20`,
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}>
                      <div style={{ padding: "1.25rem" }}>
                        {/* ヘッダー行 */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                          <div>
                            <span className="font-mono" style={{ fontSize: "0.7rem", color: cm.color }}>{entity.code}</span>
                            {appearances > 0 && (
                              <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>
                                出現 {appearances}件
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <span className="font-mono" style={{
                              fontSize: "0.58rem", padding: "0.1rem 0.4rem",
                              backgroundColor: `${tc}15`, color: tc,
                            }}>脅威:{entity.threat}</span>
                            <span className="font-mono" style={{
                              fontSize: "0.58rem", padding: "0.1rem 0.4rem",
                              backgroundColor: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)",
                            }}>{INTEL_LABEL[entity.intelligence] ?? entity.intelligence}</span>
                          </div>
                        </div>

                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1.1rem", color: "white", marginBottom: "0.4rem" }}>
                          {entity.name}
                        </div>

                        <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "0.75rem",
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                        }}>
                          {entity.description}
                        </div>

                        {/* 起源 */}
                        <div className="font-mono" style={{ fontSize: "0.62rem", color: `${cm.color}80` }}>
                          起源: {entity.origin}
                        </div>
                      </div>
                      {/* 下部ボーダー */}
                      <div style={{ height: "2px", backgroundColor: `${cm.color}15` }}>
                        <div style={{ height: "100%", width: appearances > 0 ? `${Math.min(appearances * 20, 100)}%` : "0%", backgroundColor: cm.color }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
