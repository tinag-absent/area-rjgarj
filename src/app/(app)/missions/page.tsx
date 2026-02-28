import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import type { Metadata } from "next";
import MissionXpTrigger from "./MissionXpTrigger";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "収束案件 - 海蝕機関" };

interface Mission {
  id: string; title: string; status: string; priority: string;
  location: string; startDate: string; gsi: number;
  description: string; entity: string; assignedDivisions: string[];
  casualties?: number; securityLevel?: number;
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

const STATUS_LABELS: Record<string, string> = {
  active: "対応中", monitoring: "監視中", completed: "収束済み", failed: "失敗",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:     { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
  monitoring: { bg: "rgba(234,179,8,0.15)",   text: "#eab308" },
  completed:  { bg: "rgba(16,185,129,0.15)",  text: "#10b981" },
  failed:     { bg: "rgba(107,114,128,0.15)", text: "#6b7280" },
};
const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(239,68,68,0.12)",  text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  high:     { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.25)" },
  warning:  { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.25)" },
  medium:   { bg: "rgba(234,179,8,0.12)",  text: "#eab308", border: "rgba(234,179,8,0.2)" },
  safe:     { bg: "rgba(16,185,129,0.08)", text: "#10b981", border: "rgba(255,255,255,0.08)" },
  low:      { bg: "rgba(16,185,129,0.08)", text: "#10b981", border: "rgba(255,255,255,0.08)" },
};

export default async function MissionsPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 4) return <LockedContent requiredLevel={4} currentLevel={lvl} pageName="収束案件" />;

  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");
  const completedCount = missions.filter(m => m.status === "completed").length;

  const stats = {
    total:      missions.length,
    active:     missions.filter(m => m.status === "active").length,
    monitoring: missions.filter(m => m.status === "monitoring").length,
    completed:  completedCount,
    critical:   missions.filter(m => m.priority === "critical").length,
    casualties: missions.reduce((s, m) => s + (m.casualties ?? 0), 0),
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <MissionXpTrigger completedCount={completedCount} />

      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          CLASSIFIED // LEVEL 4 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
          収束案件
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          {missions.length} 件の案件が登録されています
        </p>
      </div>

      {/* 統計グリッド */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.65rem", marginBottom: "2rem" }}>
        {[
          { label: "総案件",     value: stats.total,                   color: "white" },
          { label: "対応中",     value: stats.active,                  color: "#ef4444" },
          { label: "監視中",     value: stats.monitoring,              color: "#eab308" },
          { label: "収束済み",   value: stats.completed,               color: "#10b981" },
          { label: "重大事案",   value: stats.critical,                color: "#ef4444" },
          { label: "機関員損失", value: `${stats.casualties}名`,       color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ミッション一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {missions.map(mission => {
          const pColor = PRIORITY_COLORS[mission.priority] ?? PRIORITY_COLORS.safe;
          const sColor = STATUS_COLORS[mission.status] ?? STATUS_COLORS.completed;

          return (
            <Link key={mission.id} href={`/missions/${mission.id}`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ borderColor: pColor.border, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      {/* バッジ行 */}
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.55rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, backgroundColor: sColor.bg, color: sColor.text }}>
                          {STATUS_LABELS[mission.status] ?? mission.status}
                        </span>
                        <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.55rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, backgroundColor: pColor.bg, color: pColor.text }}>
                          {mission.priority.toUpperCase()}
                        </span>
                        {(mission.securityLevel ?? 0) >= 3 && (
                          <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.55rem", fontFamily: "'JetBrains Mono', monospace", backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                            SEC.LV {mission.securityLevel}
                          </span>
                        )}
                      </div>
                      {/* タイトル */}
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "white", marginBottom: "0.2rem" }}>
                        {mission.title}
                      </div>
                      <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", marginBottom: "0.5rem" }}>{mission.id}</div>
                      {/* 概要 */}
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.65, margin: 0 }}>
                        {mission.description}
                      </p>
                      {/* メタ */}
                      <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                        {[
                          { label: "場所", value: mission.location },
                          { label: "GSI", value: mission.gsi.toString(), primary: true },
                          { label: "対象", value: mission.entity.split("（")[0] },
                        ].map(item => (
                          <div key={item.label} style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
                            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)" }}>{item.label}:</span>
                            <span className="font-mono" style={{ fontSize: "0.72rem", fontWeight: 600, color: item.primary ? "var(--primary)" : "white" }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.25)" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "0.35rem" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {missions.length === 0 && (
          <div className="font-mono" style={{ color: "var(--muted-foreground)", padding: "3rem", textAlign: "center" }}>[データなし]</div>
        )}
      </div>
    </div>
  );
}
