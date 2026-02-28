import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "全文検索 - 海蝕機関" };

async function loadAllData() {
  const [missions, entities, modules, locations, personnel] = await Promise.all([
    import("../../../../public/data/mission-data.json").then(m => (m.default as any).missions ?? []).catch(() => []),
    import("../../../../public/data/entities-data.json").then(m => (m.default as any).entities ?? []).catch(() => []),
    import("../../../../public/data/modules-data.json").then(m => (m.default as any).modules ?? []).catch(() => []),
    import("../../../../public/data/locations-data.json").then(m => (m.default as any).locations ?? []).catch(() => []),
    import("../../../../public/data/personnel-data.json").then(m => (m.default as any).personnel ?? []).catch(() => []),
  ]);
  return { missions, entities, modules, locations, personnel };
}

const STATUS_LABELS: Record<string, string> = { active: "対応中", monitoring: "監視中", completed: "収束済み", failed: "失敗" };
const PRIORITY_LABELS: Record<string, string> = { critical: "重大", warning: "警戒", safe: "観察" };
const CLASS_LABELS: Record<string, string> = { safe: "SAFE", caution: "CAUTION", danger: "DANGER", classified: "CLASSIFIED" };
const CLASS_COLORS: Record<string, string> = { safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6" };
const LOC_TYPE_LABELS: Record<string, string> = {
  headquarters: "本部", "dimensional-gate": "次元ゲート",
  "monitoring-station": "監視拠点", "research-facility": "研究施設",
  "branch-office": "支局", "field-base": "現場拠点",
};

const TAB_META = [
  { id: "mission",   label: "収束案件", color: "#ef4444" },
  { id: "entity",    label: "海蝕実体", color: "#a855f7" },
  { id: "module",    label: "モジュール", color: "#eab308" },
  { id: "location",  label: "ロケーション", color: "#10b981" },
  { id: "personnel", label: "人員",    color: "#f97316" },
];

export default async function SearchPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 4) return <LockedContent requiredLevel={4} currentLevel={lvl} pageName="全文検索" />;

  const { missions, entities, modules, locations, personnel } = await loadAllData();

  const counts = {
    mission:   missions.length,
    entity:    entities.length,
    module:    modules.length,
    location:  locations.length,
    personnel: personnel.length,
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          DATABASE // LEVEL 4 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          全文検索
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          収束案件データベース — 全カテゴリ横断検索
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {TAB_META.map(tab => (
          <div key={tab.id} className="card" style={{ padding: "0.75rem", textAlign: "center", borderColor: `${tab.color}22` }}>
            <div style={{ fontSize: "1.25rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: tab.color }}>
              {counts[tab.id as keyof typeof counts]}
            </div>
            <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
              {tab.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tab sections */}
      {TAB_META.map(tab => (
        <div key={tab.id} style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div className="font-mono" style={{ fontSize: "0.75rem", color: tab.color, letterSpacing: "0.12em" }}>
              ▸ {tab.label}
            </div>
            <div style={{ flex: 1, height: "1px", backgroundColor: `${tab.color}22` }} />
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>
              {counts[tab.id as keyof typeof counts]}件
            </div>
          </div>

          {/* Missions */}
          {tab.id === "mission" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {(missions as any[]).map((m: any) => (
                <div key={m.id} className="card" style={{ padding: "0.875rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "white" }}>{m.title}</span>
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{m.id}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>{m.description}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexShrink: 0 }}>
                      <span className="font-mono" style={{
                        fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                        backgroundColor: m.status === "active" ? "rgba(239,68,68,0.15)" : m.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(234,179,8,0.15)",
                        color: m.status === "active" ? "#ef4444" : m.status === "completed" ? "#10b981" : "#eab308",
                      }}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                      <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", textAlign: "right" }}>{m.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Entities */}
          {tab.id === "entity" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.625rem" }}>
              {(entities as any[]).map((e: any) => (
                <div key={e.id} className="card" style={{ padding: "0.875rem", borderColor: `${CLASS_COLORS[e.classification] ?? "var(--muted-foreground)"}30` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{e.code}</span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: CLASS_COLORS[e.classification] ?? "var(--muted-foreground)" }}>
                      {CLASS_LABELS[e.classification] ?? e.classification}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "white", marginBottom: "0.35rem", fontFamily: "'Space Grotesk', sans-serif" }}>{e.name}</div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>{e.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Modules */}
          {tab.id === "module" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.625rem" }}>
              {(modules as any[]).map((m: any) => (
                <div key={m.id} className="card" style={{ padding: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{m.code}</span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: CLASS_COLORS[m.classification] ?? "var(--muted-foreground)" }}>
                      {CLASS_LABELS[m.classification] ?? m.classification}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "white", marginBottom: "0.35rem", fontFamily: "'Space Grotesk', sans-serif" }}>{m.name}</div>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.35rem" }}>
                    {m.range && <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>射程: {m.range}</span>}
                    {m.energy && <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>EN: {m.energy}</span>}
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>{m.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Locations */}
          {tab.id === "location" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.625rem" }}>
              {(locations as any[]).map((l: any) => (
                <div key={l.id} className="card" style={{ padding: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.65rem", color: tab.color }}>
                      {LOC_TYPE_LABELS[l.type] ?? l.type}
                    </span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>SEC.{l.securityLevel}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "white", marginBottom: "0.35rem", fontFamily: "'Space Grotesk', sans-serif" }}>{l.name}</div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                    {l.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Personnel */}
          {tab.id === "personnel" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.625rem" }}>
              {(personnel as any[]).map((p: any) => (
                <div key={p.id} className="card" style={{ padding: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.65rem", color: tab.color }}>{p.id}</span>
                    {p.psychEval && (
                      <span className="font-mono" style={{
                        fontSize: "0.58rem", padding: "0.1rem 0.35rem",
                        backgroundColor: p.psychEval.status === "良好" ? "rgba(16,185,129,0.12)" : "rgba(234,179,8,0.12)",
                        color: p.psychEval.status === "良好" ? "#10b981" : "#eab308",
                      }}>
                        {p.psychEval.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</div>
                  <div className="font-mono" style={{ fontSize: "0.68rem", color: tab.color, marginBottom: "0.25rem", opacity: 0.85 }}>{p.division}</div>
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>
                    {p.rank} · {p.specialization}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
