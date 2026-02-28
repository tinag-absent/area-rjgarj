import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MissionApplyButton from "../MissionApplyButton";
import fs from "fs";
import path from "path";

interface TimelineEntry { time: string; event: string; type: string; }
interface ReportEntry { time: string; author: string; content: string; }
interface Mission {
  id: string; title: string; status: string; priority: string;
  location: string; startDate: string; endDate?: string; gsi: number;
  description: string; entity: string; assignedDivisions: string[];
  casualties?: number; civilianEvacuation?: number; result?: string;
  securityLevel?: number; timeline?: TimelineEntry[]; modules?: string[];
  reports?: ReportEntry[]; relatedPersonnel?: string[];
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
const TIMELINE_STYLES: Record<string, { color: string; icon: string }> = {
  alert:      { color: "#ef4444", icon: "⚠" },
  deployment: { color: "#3b82f6", icon: "→" },
  discovery:  { color: "#a855f7", icon: "◎" },
  action:     { color: "#eab308", icon: "▶" },
  critical:   { color: "#ef4444", icon: "!" },
  result:     { color: "#10b981", icon: "✓" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");
  const mission = missions.find(m => m.id === id);
  return { title: mission ? `${mission.title} - 収束案件` : "収束案件" };
}

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 4) return <LockedContent requiredLevel={4} currentLevel={lvl} pageName="収束案件" />;

  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");
  const mission = missions.find(m => m.id === id);
  if (!mission) notFound();

  const pColor = PRIORITY_COLORS[mission.priority] ?? PRIORITY_COLORS.safe;
  const sColor = STATUS_COLORS[mission.status] ?? STATUS_COLORS.completed;
  const canApply = mission.status === "active" || mission.status === "monitoring";

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* 戻るリンク */}
      <Link href="/missions" style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        color: "rgba(255,255,255,0.4)", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
        marginBottom: "2rem", transition: "color 0.2s",
      }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        収束案件一覧に戻る
      </Link>

      {/* ヘッダーカード */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem", borderColor: pColor.border }}>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.6rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, backgroundColor: sColor.bg, color: sColor.text }}>
            {STATUS_LABELS[mission.status] ?? mission.status}
          </span>
          <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.6rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, backgroundColor: pColor.bg, color: pColor.text }}>
            {mission.priority.toUpperCase()}
          </span>
          {(mission.securityLevel ?? 0) >= 3 && (
            <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.6rem", fontFamily: "'JetBrains Mono', monospace", backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
              SEC.LV {mission.securityLevel}
            </span>
          )}
        </div>

        <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.25rem" }}>
          {mission.title}
        </h1>
        <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--primary)", marginBottom: "1rem" }}>{mission.id}</div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
          {mission.description}
        </p>

        {/* 基本データグリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem",
          padding: "0.875rem", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { label: "発生場所", value: mission.location },
            { label: "開始日時", value: mission.startDate.slice(0, 10) },
            { label: "GSI値",    value: mission.gsi.toString(), highlight: true },
            { label: "対象実体", value: mission.entity.split("（")[0] },
            ...(mission.casualties != null ? [{ label: "殉職者", value: `${mission.casualties}名`, danger: mission.casualties > 0 }] : []),
            ...(mission.civilianEvacuation != null ? [{ label: "避難誘導", value: `${mission.civilianEvacuation.toLocaleString()}名` }] : []),
          ].map(item => (
            <div key={item.label}>
              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>{item.label}</div>
              <div className="font-mono" style={{
                fontSize: "0.82rem", fontWeight: 600,
                color: "danger" in item && item.danger ? "#ef4444" : "highlight" in item && item.highlight ? "var(--primary)" : "white",
              }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* 担当部門 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "1rem" }}>
          {mission.assignedDivisions.map(div => (
            <span key={div} className="font-mono" style={{
              fontSize: "0.62rem", padding: "0.15rem 0.5rem",
              backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--muted-foreground)",
            }}>{div}</span>
          ))}
        </div>
      </div>

      {/* 使用モジュール */}
      {mission.modules && mission.modules.length > 0 && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>
            使用モジュール
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {mission.modules.map(mod => (
              <span key={mod} className="font-mono" style={{
                fontSize: "0.7rem", padding: "0.2rem 0.6rem",
                backgroundColor: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.15)",
                color: "var(--primary)",
              }}>{mod}</span>
            ))}
          </div>
        </div>
      )}

      {/* タイムライン */}
      {mission.timeline && mission.timeline.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "1rem" }}>
            作戦タイムライン
          </div>
          <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
            <div style={{ position: "absolute", left: "0.45rem", top: 0, bottom: 0, width: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
            {mission.timeline.map((entry, i) => {
              const ts = TIMELINE_STYLES[entry.type] ?? { color: "var(--muted-foreground)", icon: "·" };
              return (
                <div key={i} style={{ position: "relative", marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div style={{
                    position: "absolute", left: "-1.3rem", top: "0.15rem",
                    width: "16px", height: "16px", borderRadius: "50%",
                    backgroundColor: `${ts.color}20`, border: `1px solid ${ts.color}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.45rem", color: ts.color, flexShrink: 0,
                  }}>{ts.icon}</div>
                  <div>
                    <span className="font-mono" style={{ fontSize: "0.62rem", color: ts.color, marginRight: "0.5rem" }}>{entry.time}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{entry.event}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 現場レポート */}
      {mission.reports && mission.reports.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "1rem" }}>
            現場レポート
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {mission.reports.map((report, i) => (
              <div key={i} style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--primary)", marginBottom: "0.3rem" }}>
                  [{report.time}] {report.author}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.7 }}>{report.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 結果 */}
      {mission.result && (
        <div style={{
          padding: "1rem 1.25rem", marginBottom: "1.25rem",
          backgroundColor: "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.15)",
          borderLeft: "3px solid #10b981",
        }}>
          <div className="font-mono" style={{ fontSize: "0.6rem", color: "#10b981", marginBottom: "0.3rem" }}>作戦結果</div>
          <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>{mission.result}</p>
        </div>
      )}

      {/* 参加申請 */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {canApply ? (
          <MissionApplyButton missionId={mission.id} missionTitle={mission.title} />
        ) : (
          <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>
            {mission.status === "completed" ? "収束済み — 参加不可" : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
