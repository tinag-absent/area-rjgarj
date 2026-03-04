"use client";

import { useState } from "react";
import Link from "next/link";

// ── 型定義 ────────────────────────────────────────────────────────
interface Entity {
  id: string; code: string; name: string; classification: string;
  description: string; threat: string; intelligence: string; origin: string;
  appearance: string; behavior: string; containment: string;
}
interface ModuleData {
  id: string; code: string; name: string; classification: string;
  description: string; range: string; duration: string; energy: string;
  developer: string; details?: string; warning?: string;
}
interface Location {
  id: string; name: string; type: string; coordinates: string;
  description: string; facilities: string[]; securityLevel: number;
  region: string; notes?: string;
}
interface Personnel {
  id: string; name: string; division: string; rank: string; age: number;
  joinDate: string; specialization: string;
  psychEval?: { lastEval: string; status: string; notes: string };
}
interface CodexEntry {
  id: string; title: string; icon: string; level: number; accent: string; summary: string; content: string;
}
interface Protocol {
  id: string; name: string; type: string; threat: string; dept: string; lv: number; desc: string;
  steps: string[];
}
interface StatsData {
  missions: { id: string; status: string; priority: string; gsi: number; location: string; entity: string; startDate: string; casualties?: number; civilianEvacuation?: number; assignedDivisions?: string[] }[];
  entities: { id: string; code: string; name: string; classification: string; threat?: string }[];
  personnel: { id: string; name: string; division: string; status?: string; psychEval?: { status: string } }[];
  incidents: { severity: string; status: string; gsi: number; division: string }[];
}
interface Incident {
  id: string; name: string; severity: string; status: string;
  location: string; entity: string; gsi: number; desc: string; time: string;
}
interface Mission { entity: string; location: string; title: string; id: string; status: string; }

// ── スタイル定数 ──────────────────────────────────────────────────
const CLASS_META: Record<string, { label: string; color: string; text: string; bg: string; border: string }> = {
  safe:       { label: "SAFE",       color: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.25)" },
  caution:    { label: "CAUTION",    color: "#eab308", text: "#eab308", bg: "rgba(234,179,8,0.06)",   border: "rgba(234,179,8,0.25)" },
  danger:     { label: "DANGER",     color: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.25)" },
  classified: { label: "CLASSIFIED", color: "#8b5cf6", text: "#8b5cf6", bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.25)" },
};
const THREAT_COLOR: Record<string, string> = {
  "極低": "#10b981", "低": "#84cc16", "中": "#eab308",
  "高": "#f97316", "極高": "#ef4444", "不明": "#6b7280", "なし": "#445060",
};
const TYPE_STYLES: Record<string, { label: string; color: string; icon: string }> = {
  "headquarters":          { label: "総本部",         color: "#00ffff", icon: "⬡" },
  "dimensional-gate":      { label: "次元ゲート",     color: "#a78bfa", icon: "⊗" },
  "monitoring-station":    { label: "監視拠点",       color: "#10b981", icon: "◈" },
  "research-facility":     { label: "研究施設",       color: "#eab308", icon: "⬢" },
  "branch-office":         { label: "支局",           color: "#60a5fa", icon: "▦" },
  "field-base":            { label: "現場拠点",       color: "#f97316", icon: "△" },
  "containment":           { label: "封鎖区域",       color: "#ef4444", icon: "⊘" },
  "containment-facility":  { label: "収容施設",       color: "#ef4444", icon: "⊘" },
  "residue-site":          { label: "残滓採集地",     color: "#c084fc", icon: "◎" },
  "hazard-zone":           { label: "危険地帯",       color: "#ef4444", icon: "⚠" },
  "medical-facility":      { label: "医療施設",       color: "#10b981", icon: "✚" },
  "historical-site":       { label: "歴史的遺跡",     color: "#d97706", icon: "◆" },
};
const SECURITY_COLORS: Record<number, string> = {
  1: "#10b981", 2: "#84cc16", 3: "#eab308", 4: "#f97316", 5: "#ef4444",
};
const DIV_COLORS: Record<string, string> = {
  "収束部門": "#ef4444", "工作部門": "#f97316", "外事部門": "#a855f7",
  "港湾部門": "#3b82f6", "支援部門": "#10b981",
};
const PSYCH_STYLES: Record<string, { bg: string; color: string }> = {
  "良好":      { bg: "rgba(16,185,129,0.1)",  color: "#10b981" },
  "注意観察":  { bg: "rgba(234,179,8,0.1)",   color: "#eab308" },
  "要フォロー":{ bg: "rgba(249,115,22,0.1)",  color: "#f97316" },
  "緊急対応":  { bg: "rgba(239,68,68,0.1)",   color: "#ef4444" },
};
const TYPE_META: Record<string, { label: string; color: string }> = {
  convergence: { label: "収束作戦プロトコル", color: "#10b981" },
  containment:  { label: "実体収容プロトコル", color: "#ef4444" },
  evacuation:   { label: "区域避難プロトコル", color: "#3b82f6" },
  maintenance:  { label: "DEAN保守プロトコル", color: "#8b5cf6" },
  emergency:    { label: "緊急対応プロトコル", color: "#f59e0b" },
};
const THREAT_META: Record<string, { label: string; color: string }> = {
  safe:     { label: "SAFE",     color: "#10b981" },
  caution:  { label: "CAUTION",  color: "#f59e0b" },
  danger:   { label: "DANGER",   color: "#ef4444" },
  critical: { label: "CRITICAL", color: "#ef4444" },
};
const ACCENT_SOLID: Record<string, string> = { "var(--primary)": "#00ffff" };
function toSolid(accent: string) { return ACCENT_SOLID[accent] ?? accent; }
function getDivColor(division: string): string {
  for (const [key, color] of Object.entries(DIV_COLORS)) {
    if (division.includes(key.replace("部門", ""))) return color;
  }
  return "var(--primary)";
}

// ── タブ定義 ──────────────────────────────────────────────────────
const TABS = [
  { id: "entities",   label: "実体カタログ",   icon: "◉", clearance: "LV2", color: "#8b5cf6" },
  { id: "modules",    label: "モジュール",     icon: "⬡", clearance: "LV2", color: "#3b82f6" },
  { id: "locations",  label: "ロケーション",   icon: "◎", clearance: "LV1", color: "#10b981" },
  { id: "codex",      label: "コーデックス",   icon: "◈", clearance: "LV1", color: "#00ffff" },
  { id: "protocols",  label: "プロトコル",     icon: "▸", clearance: "公開", color: "#f59e0b" },
  { id: "personnel",  label: "人員ファイル",   icon: "◈", clearance: "LV5", color: "#f97316" },
  { id: "statistics", label: "統計",           icon: "▦", clearance: "LV2", color: "#a855f7" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── BarChart コンポーネント ───────────────────────────────────────
function BarChart({ items, max }: { items: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {items.map(item => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "6rem 1fr 3rem", gap: "0.5rem", alignItems: "center" }}>
          <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", textAlign: "right", paddingRight: "0.25rem" }}>
            {item.label}
          </div>
          <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: max > 0 ? `${(item.value / max) * 100}%` : "0%", backgroundColor: item.color, transition: "width 0.7s" }} />
          </div>
          <div className="font-mono" style={{ fontSize: "0.7rem", color: item.color, fontWeight: 600 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function DatabaseClient({
  userLevel,
  entities,
  modules,
  locations,
  codexEntries,
  protocols,
  personnel,
  stats,
  incidents,
  missions,
}: {
  userLevel: number;
  entities: Entity[];
  modules: ModuleData[];
  locations: Location[];
  codexEntries: CodexEntry[];
  protocols: Protocol[];
  personnel: Personnel[];
  stats: StatsData;
  incidents: Incident[];
  missions: Mission[];
}) {
  const initialTab: TabId = userLevel >= 2 ? "entities" : userLevel >= 1 ? "codex" : "protocols";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // ── 実体カタログ ─────────────────────────────────────────────
  function EntitiesTab() {
    const classGroups: Record<string, Entity[]> = {};
    for (const e of entities) {
      if (!classGroups[e.classification]) classGroups[e.classification] = [];
      classGroups[e.classification].push(e);
    }
    const classOrder = ["classified", "danger", "caution", "safe"];
    const appearanceCount: Record<string, number> = {};
    for (const m of missions) {
      for (const e of entities) {
        if (m.entity.includes(e.code) || m.entity.includes(e.name)) {
          appearanceCount[e.id] = (appearanceCount[e.id] ?? 0) + 1;
        }
      }
    }

    if (userLevel < 2) return <LockedMsg level={2} current={userLevel} name="実体カタログ" />;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {classOrder.map(cls => {
            const cm = CLASS_META[cls];
            const count = classGroups[cls]?.length ?? 0;
            return (
              <div key={cls} style={{ padding: "1rem 1.25rem", backgroundColor: cm.bg, border: `1px solid ${cm.border}`, borderLeft: `3px solid ${cm.color}` }}>
                <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: cm.color }}>{count}</div>
                <div className="font-mono" style={{ fontSize: "0.65rem", color: cm.color, letterSpacing: "0.1em", marginTop: "0.2rem" }}>{cm.label}</div>
              </div>
            );
          })}
        </div>
        {classOrder.map(cls => {
          const group = classGroups[cls];
          if (!group || group.length === 0) return null;
          const cm = CLASS_META[cls];
          return (
            <div key={cls} style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div className="font-mono" style={{ fontSize: "0.7rem", color: cm.color, letterSpacing: "0.12em" }}>▸ {cm.label} 分類 ({group.length})</div>
                <div style={{ flex: 1, height: "1px", backgroundColor: `${cm.color}20` }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.875rem" }}>
                {group.map(entity => {
                  const tc = THREAT_COLOR[entity.threat] ?? "#6b7280";
                  const appearances = appearanceCount[entity.id] ?? 0;
                  return (
                    <Link key={entity.id} href={`/entities/${entity.id}`} style={{ textDecoration: "none" }}>
                      <div className="card" style={{ borderColor: `${cm.color}20`, cursor: "pointer" }}>
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                            <div>
                              <span className="font-mono" style={{ fontSize: "0.7rem", color: cm.color }}>{entity.code}</span>
                              {appearances > 0 && <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>出現 {appearances}件</span>}
                            </div>
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              <span className="font-mono" style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem", backgroundColor: `${tc}15`, color: tc }}>脅威:{entity.threat}</span>
                            </div>
                          </div>
                          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "1.1rem", color: "white", marginBottom: "0.4rem" }}>{entity.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "0.75rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{entity.description}</div>
                          <div className="font-mono" style={{ fontSize: "0.62rem", color: `${cm.color}80` }}>起源: {entity.origin}</div>
                        </div>
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

  // ── モジュール ────────────────────────────────────────────────
  function ModulesTab() {
    const ENERGY_COLORS: Record<string, string> = { "低": "#10b981", "中": "#eab308", "高": "#f97316", "超高": "#ef4444", "極高": "#dc2626" };
    const CS = CLASS_META;
    if (userLevel < 2) return <LockedMsg level={2} current={userLevel} name="モジュール" />;
    const classStats = {
      safe: modules.filter(m => m.classification === "safe").length,
      caution: modules.filter(m => m.classification === "caution").length,
      danger: modules.filter(m => m.classification === "danger").length,
      classified: modules.filter(m => m.classification === "classified").length,
    };
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {(["safe", "caution", "danger", "classified"] as const).map(cls => {
            const s = CS[cls];
            return (
              <div key={cls} className="card" style={{ padding: "1rem", textAlign: "center", borderColor: s.border }}>
                <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: s.color }}>{classStats[cls]}</div>
                <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>{s.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
          {modules.map(mod => {
            const style = CS[mod.classification] ?? CS.safe;
            return (
              <div key={mod.id} className="card" style={{ borderColor: style.border }}>
                <div style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>{mod.code}</span>
                    <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "2px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, backgroundColor: style.bg, color: style.text }}>{style.label}</span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "white", marginBottom: "0.5rem" }}>{mod.name}</div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1rem" }}>{mod.description}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: mod.warning ? "0.75rem" : 0 }}>
                    {[{ label: "有効範囲", value: mod.range }, { label: "持続時間", value: mod.duration }, { label: "エネルギー消費", value: mod.energy, energyColor: ENERGY_COLORS[mod.energy] }, { label: "開発部門", value: mod.developer }].map(spec => (
                      <div key={spec.label}>
                        <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>{spec.label}</div>
                        <div className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: spec.energyColor ?? "white" }}>{spec.value}</div>
                      </div>
                    ))}
                  </div>
                  {mod.warning && (
                    <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.875rem", backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "4px" }}>
                      <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>⚠ WARNING</div>
                      <div className="font-mono" style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.8)", lineHeight: 1.5 }}>{mod.warning}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ロケーション ──────────────────────────────────────────────
  function LocationsTab() {
    if (userLevel < 1) return <LockedMsg level={1} current={userLevel} name="ロケーション" />;
    const regionMap = new Map<string, Location[]>();
    for (const loc of locations) {
      const region = loc.region ?? "不明";
      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)!.push(loc);
    }
    const typeCounts: Record<string, number> = {};
    for (const loc of locations) { typeCounts[loc.type] = (typeCounts[loc.type] ?? 0) + 1; }
    const activeIncidentCount = incidents.filter(i => i.status === "対応中").length;

    function getRelatedIncidents(loc: Location) {
      return incidents.filter(i => i.location.includes(loc.name.slice(0, 3)) || loc.name.includes(i.location.slice(0, 3)));
    }
    function getRelatedMissions(loc: Location) {
      return missions.filter(m => m.location.includes(loc.name.slice(0, 3)) || loc.name.includes(m.location.slice(0, 3)));
    }

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.65rem", marginBottom: "1.5rem" }}>
          {[
            { label: "総拠点数", value: locations.length, color: "white" },
            { label: "Sec.Lv 5", value: locations.filter(l => l.securityLevel === 5).length, color: "#ef4444" },
            { label: "Sec.Lv 4", value: locations.filter(l => l.securityLevel === 4).length, color: "#f97316" },
            { label: "次元ゲート", value: locations.filter(l => l.type.includes("gate")).length, color: "#a78bfa" },
            { label: "インシデント", value: activeIncidentCount, color: "#eab308" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "2rem" }}>
          {Object.entries(TYPE_STYLES).map(([type, s]) => typeCounts[type] ? (
            <span key={type} className="font-mono" style={{ fontSize: "0.65rem", padding: "0.2rem 0.55rem", backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}30`, color: s.color }}>{s.icon} {s.label} ({typeCounts[type]})</span>
          ) : null)}
        </div>
        {Array.from(regionMap.entries()).map(([region, locs]) => (
          <div key={region} style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.12em" }}>▸ {region}地区 ({locs.length}拠点)</div>
              <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
              {locs.map(loc => {
                const ts = TYPE_STYLES[loc.type] ?? { label: loc.type, color: "var(--muted-foreground)", icon: "○" };
                const sc = SECURITY_COLORS[loc.securityLevel] ?? "var(--muted-foreground)";
                const relInc = getRelatedIncidents(loc);
                const relMis = getRelatedMissions(loc);
                const hasActivity = relInc.length > 0 || relMis.length > 0;
                return (
                  <div key={loc.id} className="card" style={{ borderColor: `${ts.color}20` }}>
                    <div style={{ padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <span className="font-mono" style={{ fontSize: "0.7rem", color: ts.color }}>{ts.icon} {ts.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {relInc.filter(i => i.status === "対応中").length > 0 && <span className="font-mono" style={{ fontSize: "0.58rem", color: "#ef4444" }}>● INCIDENT</span>}
                          <span className="font-mono" style={{ fontSize: "0.62rem", color: sc, fontWeight: 700 }}>SEC.{loc.securityLevel}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", color: "white", marginBottom: "0.25rem" }}>{loc.name}</div>
                      {loc.coordinates && <div className="font-mono" style={{ fontSize: "0.65rem", color: `${ts.color}80`, marginBottom: "0.6rem" }}>{loc.coordinates}</div>}
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: "0.75rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>{loc.description}</p>
                      {loc.facilities?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem" }}>
                          {loc.facilities.map(f => <span key={f} className="font-mono" style={{ fontSize: "0.6rem", padding: "0.12rem 0.4rem", backgroundColor: `${ts.color}08`, border: `1px solid ${ts.color}20`, color: ts.color }}>{f}</span>)}
                        </div>
                      )}
                      {loc.notes && (
                        <div style={{ padding: "0.4rem 0.6rem", marginBottom: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${ts.color}40` }}>
                          <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>{loc.notes}</p>
                        </div>
                      )}
                      {hasActivity && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.6rem" }}>
                          {relInc.length > 0 && (
                            <div style={{ marginBottom: "0.4rem" }}>
                              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>関連インシデント</div>
                              {relInc.map(i => <div key={i.id} className="font-mono" style={{ fontSize: "0.65rem", color: i.status === "対応中" ? "#ef4444" : "var(--muted-foreground)", marginBottom: "0.15rem" }}>{i.status === "対応中" ? "● " : "○ "}{i.name} (GSI {i.gsi})</div>)}
                            </div>
                          )}
                          {relMis.length > 0 && (
                            <div>
                              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>関連作戦</div>
                              {relMis.slice(0, 2).map(m => <div key={m.id} className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.15rem" }}>▸ {m.title}</div>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.04)" }}>
                      <div style={{ height: "100%", width: `${(loc.securityLevel / 5) * 100}%`, backgroundColor: sc }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── コーデックス ──────────────────────────────────────────────
  function CodexTab() {
    if (userLevel < 1) return <LockedMsg level={1} current={userLevel} name="コーデックス" />;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
        {codexEntries.map(entry => {
          const locked = entry.level > userLevel;
          const accent = toSolid(entry.accent);
          return (
            <div key={entry.id} className="card" style={{ borderColor: locked ? "rgba(255,255,255,0.05)" : `${accent}30`, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "default", position: "relative", overflow: "hidden" }}>
              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{entry.icon}</span>
                  <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem", backgroundColor: locked ? "rgba(255,255,255,0.05)" : `${accent}18`, border: `1px solid ${locked ? "rgba(255,255,255,0.1)" : `${accent}40`}`, color: locked ? "rgba(255,255,255,0.3)" : accent }}>
                    {locked ? `🔒 LV${entry.level}` : `LV${entry.level}`}
                  </span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: locked ? "rgba(255,255,255,0.3)" : "white", marginBottom: "0.4rem" }}>{entry.title}</div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: locked ? "rgba(255,255,255,0.2)" : "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "1rem" }}>
                  {locked ? "[アクセス拒否 — レベルアップで解放されます]" : entry.summary}
                </div>
                {!locked && (
                  <div style={{ borderTop: `1px solid ${accent}22`, paddingTop: "0.875rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {entry.content.split("\n\n").map((para, i) => (
                      <p key={i} style={{ margin: "0 0 0.75rem", color: para.startsWith("【") ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.65)" }}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
              {!locked && <div style={{ height: "2px", background: `linear-gradient(90deg, ${accent}60, transparent)` }} />}
            </div>
          );
        })}
      </div>
    );
  }

  // ── プロトコル ────────────────────────────────────────────────
  function ProtocolsTab() {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "2rem" }}>
          {Object.entries(TYPE_META).map(([key, tm]) => (
            <div key={key} className="card" style={{ padding: "0.75rem", borderColor: `${tm.color}22` }}>
              <div className="font-mono" style={{ fontSize: "0.62rem", color: tm.color, marginBottom: "0.25rem" }}>{key.toUpperCase()}</div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{tm.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {protocols.map(proto => {
            const tm = TYPE_META[proto.type];
            const th = THREAT_META[proto.threat];
            const locked = proto.lv > userLevel;
            return (
              <div key={proto.id} className="card" style={{ borderColor: locked ? "rgba(255,255,255,0.05)" : `${tm?.color ?? "var(--primary)"}25`, opacity: locked ? 0.55 : 1 }}>
                <div style={{ padding: "0.875rem 1.125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{proto.id}</span>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: locked ? "rgba(255,255,255,0.4)" : "white" }}>{proto.name}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 0.5rem" }}>{proto.desc}</p>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>担当: {proto.dept}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexShrink: 0, alignItems: "flex-end" }}>
                      <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", backgroundColor: `${th?.color ?? "#6b7280"}15`, border: `1px solid ${th?.color ?? "#6b7280"}40`, color: th?.color ?? "#6b7280" }}>{th?.label}</span>
                      <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", backgroundColor: `${tm?.color ?? "var(--primary)"}12`, border: `1px solid ${tm?.color ?? "var(--primary)"}35`, color: tm?.color ?? "var(--primary)" }}>{tm?.label}</span>
                      {locked && <span className="font-mono" style={{ fontSize: "0.58rem", color: "rgba(239,68,68,0.6)" }}>🔒 LV{proto.lv}必要</span>}
                    </div>
                  </div>
                  {!locked && proto.steps.length > 0 && (
                    <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                      <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>手順書</div>
                      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {proto.steps.map((step, i) => (
                          <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}>
                            <span className="font-mono" style={{ fontSize: "0.6rem", color: tm?.color ?? "var(--primary)", minWidth: "1.25rem", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div style={{ height: "2px", background: locked ? "transparent" : `linear-gradient(90deg, ${tm?.color ?? "var(--primary)"}60, transparent)` }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 人員ファイル ──────────────────────────────────────────────
  function PersonnelTab() {
    if (userLevel < 5) return <LockedMsg level={5} current={userLevel} name="人員ファイル" />;
    const divisionMap = new Map<string, Personnel[]>();
    for (const p of personnel) {
      const base = p.division.split(" ")[0];
      if (!divisionMap.has(base)) divisionMap.set(base, []);
      divisionMap.get(base)!.push(p);
    }
    const psychCounts = {
      良好:      personnel.filter(p => p.psychEval?.status === "良好").length,
      注意観察:  personnel.filter(p => p.psychEval?.status === "注意観察").length,
      要フォロー:personnel.filter(p => p.psychEval?.status === "要フォロー").length,
      緊急対応:  personnel.filter(p => p.psychEval?.status === "緊急対応").length,
    };
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { label: "総員数", value: personnel.length, color: "white" },
            { label: "部門数", value: divisionMap.size, color: "var(--primary)" },
            { label: "良好", value: psychCounts.良好, color: "#10b981" },
            { label: "注意観察", value: psychCounts.注意観察, color: "#eab308" },
            { label: "要フォロー", value: psychCounts.要フォロー, color: "#f97316" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
        {Array.from(divisionMap.entries()).map(([baseDiv, members]) => {
          const divColor = getDivColor(baseDiv);
          return (
            <div key={baseDiv} style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div className="font-mono" style={{ fontSize: "0.72rem", color: divColor, letterSpacing: "0.12em" }}>▸ {baseDiv}</div>
                <div style={{ flex: 1, height: "1px", backgroundColor: `${divColor}20` }} />
                <div className="font-mono" style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{members.length}名</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {members.map(person => {
                  const dc = getDivColor(person.division);
                  const ps = person.psychEval ? (PSYCH_STYLES[person.psychEval.status] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }) : null;
                  return (
                    <Link key={person.id} href={`/personnel/${person.id}`} style={{ textDecoration: "none" }}>
                      <div className="card" style={{ borderColor: `${dc}18`, cursor: "pointer" }}>
                        <div style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.2rem" }}>
                              <span style={{ fontSize: "1rem", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "white" }}>{person.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{person.rank}</span>
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 700 }}>{person.id}</span>
                              <span className="font-mono" style={{ fontSize: "0.68rem", color: dc }}>{person.division}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                            <div>
                              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.1rem" }}>専門</div>
                              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>{person.specialization}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {ps && person.psychEval && (
                              <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", backgroundColor: ps.bg, color: ps.color }}>{person.psychEval.status}</span>
                            )}
                            <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.2)" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
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

  // ── 統計 ──────────────────────────────────────────────────────
  function StatisticsTab() {
    if (userLevel < 2) return <LockedMsg level={2} current={userLevel} name="統計" />;
    const { missions: m, entities: e, personnel: p, incidents: inc } = stats;
    const active = m.filter(x => x.status === "active").length;
    const completed = m.filter(x => x.status === "completed").length;
    const critical = m.filter(x => x.priority === "critical").length;
    const totalEvac = m.reduce((s, x) => s + (x.civilianEvacuation ?? 0), 0);
    const avgGSI = m.length > 0 ? (m.reduce((s, x) => s + (x.gsi ?? 0), 0) / m.length) : 0;
    const maxGSI = m.length > 0 ? Math.max(...m.map(x => x.gsi ?? 0)) : 0;
    const classifiedEntities = e.filter(x => x.classification === "classified").length;
    const statusCount: Record<string, number> = {};
    m.forEach(x => { statusCount[x.status] = (statusCount[x.status] ?? 0) + 1; });
    const classCount: Record<string, number> = {};
    e.forEach(x => { classCount[x.classification] = (classCount[x.classification] ?? 0) + 1; });
    const divCount: Record<string, number> = {};
    p.forEach(x => { const div = x.division?.split(" ")[0] ?? "不明"; divCount[div] = (divCount[div] ?? 0) + 1; });
    const locCount: Record<string, number> = {};
    m.forEach(x => { const loc = x.location ? x.location.split(" ")[0].replace(/[区市町村]/, "") : "不明"; locCount[loc] = (locCount[loc] ?? 0) + 1; });
    const topLocs = Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const STATUS_COLORS: Record<string, string> = { active: "#ef4444", completed: "#10b981", monitoring: "#eab308", failed: "#6b7280" };
    const STATUS_LABELS: Record<string, string> = { active: "対応中", completed: "収束済み", monitoring: "監視中", failed: "失敗" };
    const CLASS_COLORS_STAT: Record<string, string> = { safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6" };
    const CLASS_LABELS_STAT: Record<string, string> = { safe: "SAFE", caution: "CAUTION", danger: "DANGER", classified: "CLASSIFIED" };
    const DIV_COLORS_STAT: Record<string, string> = { "収束部門": "#ef4444", "支援部門": "#10b981", "工作部門": "#3b82f6", "外事部門": "#a855f7", "港湾部門": "#60a5fa" };
    const psychDist: Record<string, number> = {};
    p.forEach(x => { const s = x.psychEval?.status ?? "不明"; psychDist[s] = (psychDist[s] ?? 0) + 1; });
    const activeIncidents = inc.filter(x => x.status === "対応中");
    const avgLiveGsi = activeIncidents.length > 0 ? (activeIncidents.reduce((s, x) => s + x.gsi, 0) / activeIncidents.length).toFixed(1) : "0.0";
    const monthlyCount: Record<string, number> = {};
    m.forEach(x => { const ym = x.startDate?.slice(0, 7); if (ym) monthlyCount[ym] = (monthlyCount[ym] ?? 0) + 1; });
    const monthlySorted = Object.entries(monthlyCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { label: "総案件数", value: m.length, sub: `完了: ${completed}`, color: "var(--primary)" },
            { label: "対応中", value: active, sub: `重大: ${critical}`, color: "#ef4444" },
            { label: "避難民総数", value: totalEvac.toLocaleString(), sub: "名", color: "#f59e0b" },
            { label: "平均GSI", value: `${avgGSI.toFixed(1)}%`, sub: `最高: ${maxGSI.toFixed(1)}%`, color: "#8b5cf6" },
            { label: "登録実体数", value: e.length, sub: `機密: ${classifiedEntities}`, color: "#ef4444" },
            { label: "在籍機関員", value: p.length, sub: `部門数: ${Object.keys(divCount).length}`, color: "#10b981" },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: k.color, marginBottom: "0.25rem" }}>{k.value}</div>
              <div className="font-mono" style={{ fontSize: "0.72rem", color: "white", marginBottom: "0.2rem" }}>{k.label}</div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 案件ステータス分布</div>
            <BarChart max={Math.max(...Object.values(statusCount), 1)} items={Object.entries(statusCount).map(([k, v]) => ({ label: STATUS_LABELS[k] ?? k, value: v, color: STATUS_COLORS[k] ?? "var(--muted-foreground)" }))} />
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 実体分類分布</div>
            <BarChart max={Math.max(...Object.values(classCount), 1)} items={Object.entries(classCount).map(([k, v]) => ({ label: CLASS_LABELS_STAT[k] ?? k, value: v, color: CLASS_COLORS_STAT[k] ?? "var(--muted-foreground)" }))} />
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 部門別人員数</div>
            <BarChart max={Math.max(...Object.values(divCount), 1)} items={Object.entries(divCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: DIV_COLORS_STAT[k] ?? "var(--primary)" }))} />
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 発生地域ヒートマップ</div>
            <BarChart max={Math.max(...topLocs.map(([, v]) => v), 1)} items={topLocs.map(([k, v]) => ({ label: k, value: v, color: "var(--primary)" }))} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 人員メンタルヘルス状況</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {Object.entries(psychDist).map(([status, cnt]) => {
                const PSYCH_COLORS: Record<string, string> = { "良好": "#10b981", "注意観察": "#eab308", "要フォロー": "#f97316", "緊急対応": "#ef4444", "不明": "#6b7280" };
                const pc = PSYCH_COLORS[status] ?? "#6b7280";
                return (
                  <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", backgroundColor: `${pc}08`, border: `1px solid ${pc}20` }}>
                    <span className="font-mono" style={{ fontSize: "0.7rem", color: pc }}>{status}</span>
                    <span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: pc }}>{cnt}名</span>
                  </div>
                );
              })}
            </div>
          </div>
          {monthlySorted.length > 1 && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>▸ 月別案件発生件数</div>
              <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-end", height: "80px" }}>
                {monthlySorted.map(([ym, cnt]) => {
                  const maxVal = Math.max(...monthlySorted.map(([, v]) => v), 1);
                  return (
                    <div key={ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                      <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--primary)" }}>{cnt}</div>
                      <div style={{ width: "100%", height: `${(cnt / maxVal) * 100}%`, backgroundColor: "var(--primary)", opacity: 0.7, minHeight: "4px" }} />
                      <div className="font-mono" style={{ fontSize: "0.5rem", color: "var(--muted-foreground)", transform: "rotate(-45deg)", transformOrigin: "center", marginTop: "0.25rem" }}>{ym.slice(5)}月</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {activeIncidents.length > 0 && (
          <div className="card" style={{ padding: "1.25rem", marginTop: "1rem", borderColor: "rgba(239,68,68,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", letterSpacing: "0.1em" }}>▸ ライブインシデント ({activeIncidents.length}件対応中)</div>
              <span className="font-mono" style={{ fontSize: "0.6rem", color: "#ef4444" }}>● 平均GSI {avgLiveGsi}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
              {activeIncidents.map((inc, i) => (
                <div key={i} style={{ padding: "0.5rem 0.6rem", backgroundColor: inc.severity === "critical" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.06)", border: `1px solid ${inc.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.15)"}` }}>
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: inc.severity === "critical" ? "#ef4444" : "#eab308", fontWeight: 700 }}>GSI {inc.gsi}</div>
                  <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.1rem" }}>{inc.division?.split(" ")[0] ?? "不明"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  // タブ別説明文
  const TAB_DESCRIPTIONS: Record<TabId, string> = {
    entities: `${entities.length}件の海蝕実体が登録されています`,
    modules: `${modules.length}件のモジュールが登録されています`,
    locations: `${locations.length}件の拠点 / インシデント対応中 ${incidents.filter(i => i.status === "対応中").length}件`,
    codex: "海蝕機関の世界設定・用語辞典",
    protocols: "CONVERGENCE PROTOCOLS — 標準作戦手順書",
    personnel: `${personnel.length}名の機関員が登録されています`,
    statistics: "機関活動の統計データ",
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.18em", marginBottom: "0.4rem" }}>
          DATABASE // {activeTabMeta.clearance} CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.25rem" }}>
          データベース
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
          {TAB_DESCRIPTIONS[activeTab]}
        </p>
      </div>

      {/* タブバー */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "2rem", overflowX: "auto" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0,
                padding: "0.7rem 1rem",
                background: "none", border: "none",
                borderBottom: `2px solid ${isActive ? tab.color : "transparent"}`,
                marginBottom: "-1px",
                color: isActive ? tab.color : "rgba(255,255,255,0.45)",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                display: "flex", alignItems: "center", gap: "0.4rem",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="font-mono" style={{ fontSize: "0.55rem", padding: "0.05rem 0.3rem", borderRadius: "2px", backgroundColor: isActive ? `${tab.color}22` : "rgba(255,255,255,0.06)", color: isActive ? tab.color : "rgba(255,255,255,0.25)" }}>
                {tab.clearance}
              </span>
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === "entities"   && <EntitiesTab />}
        {activeTab === "modules"    && <ModulesTab />}
        {activeTab === "locations"  && <LocationsTab />}
        {activeTab === "codex"      && <CodexTab />}
        {activeTab === "protocols"  && <ProtocolsTab />}
        {activeTab === "personnel"  && <PersonnelTab />}
        {activeTab === "statistics" && <StatisticsTab />}
      </div>
    </div>
  );
}

// ── ロック表示 ────────────────────────────────────────────────────
function LockedMsg({ level, current, name }: { level: number; current: number; name: string }) {
  return (
    <div style={{ textAlign: "center", padding: "5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
      <div className="font-mono" style={{ fontSize: "3rem", color: "rgba(255,255,255,0.05)" }}>🔒</div>
      <div>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>ACCESS DENIED</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>{name}</div>
        <div className="font-mono" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", marginTop: "0.5rem" }}>LEVEL {level} CLEARANCE REQUIRED — CURRENT: {current}</div>
      </div>
    </div>
  );
}
