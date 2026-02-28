import { headers } from "next/headers";
import { notFound } from "next/navigation";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import fs from "fs";
import path from "path";

interface Entity {
  id: string; code: string; name: string; classification: string;
  description: string; threat: string; intelligence: string;
  origin: string; appearance: string; behavior: string; containment: string;
}
interface Mission {
  id: string; title: string; status: string; priority: string;
  location: string; startDate: string; entity: string; gsi: number; assignedDivisions: string[];
}
interface Incident {
  id: string; name: string; severity: string; status: string;
  location: string; entity: string; gsi: number; desc: string; time: string; division: string;
}
interface Module {
  id: string; code: string; name: string; classification: string;
  description: string; range: string; duration: string; energy: string; developer: string; details: string;
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

const CLASS_META: Record<string, { label: string; color: string; bg: string }> = {
  safe:       { label: "SAFE",       color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  caution:    { label: "CAUTION",    color: "#eab308", bg: "rgba(234,179,8,0.08)" },
  danger:     { label: "DANGER",     color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  classified: { label: "CLASSIFIED", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
};

const THREAT_COLOR: Record<string, string> = {
  "極低": "#10b981", "低": "#84cc16", "中": "#eab308",
  "高": "#f97316", "極高": "#ef4444", "不明": "#6b7280", "なし": "#445060",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "完了", active: "進行中", pending: "待機中", planning: "計画中",
};
const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { entities } = loadJson<{ entities: Entity[] }>("entities-data.json");
  const entity = entities.find(e => e.id === id);
  return { title: entity ? `${entity.name} [${entity.code}] - 海蝕機関` : "実体詳細 - 海蝕機関" };
}

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const level = parseInt(h.get("x-user-level") ?? "0");
  if (level < 2) return <LockedContent requiredLevel={2} currentLevel={level} />;

  const { entities } = loadJson<{ entities: Entity[] }>("entities-data.json");
  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");
  const { incidents } = loadJson<{ incidents: Incident[] }>("area-incidents-data.json");
  const { modules } = loadJson<{ modules: Module[] }>("modules-data.json");

  const entity = entities.find(e => e.id === id);
  if (!entity) notFound();
  const ent = entity!;

  // 関連ミッション（ent.codeまたはnameを含むもの）
  const relatedMissions = missions.filter(m =>
    m.entity.includes(ent.code) || m.entity.includes(ent.name)
  );

  // 関連インシデント
  const relatedIncidents = incidents.filter(i =>
    i.entity.includes(ent.code) || i.entity.includes(ent.name)
  );

  // 有効なモジュール（containmentに言及されているコードから）
  const mentionedModuleCodes = (ent.containment ?? "").match(/M-\d+-[α-ωa-zA-Z]+/g) ?? [];
  const relatedModules = modules.filter(m => mentionedModuleCodes.some(c => m.code === c));

  const cm = CLASS_META[ent.classification] ?? CLASS_META.caution;
  const tc = THREAT_COLOR[ent.threat] ?? "#6b7280";

  // 出現頻度（ミッション数）
  const totalAppearances = relatedMissions.length + relatedIncidents.length;

  return (
    <div className="animate-fadeIn" style={{ padding: "2rem 1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <Link href="/entities" className="font-mono" style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", textDecoration: "none" }}>
          ← 実体カタログに戻る
        </Link>
      </div>

      {/* ヘッダー */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: cm.bg,
        border: `1px solid ${cm.color}25`,
        borderLeft: `4px solid ${cm.color}`,
        padding: "1.5rem 1.5rem 1.25rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, padding: "1rem", opacity: 0.05 }}>
          <div style={{ fontSize: "8rem", fontFamily: "monospace", color: cm.color, lineHeight: 1 }}>{ent.code}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div className="font-mono" style={{ fontSize: "0.7rem", color: cm.color, letterSpacing: "0.2em", marginBottom: "0.4rem" }}>
              {ent.code} // ENTITY PROFILE
            </div>
            <h1 style={{ fontSize: "2.5rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
              {ent.name}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.75, maxWidth: "600px" }}>
              {ent.description}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
            <span className="font-mono" style={{
              fontSize: "0.7rem", padding: "0.3rem 0.8rem",
              backgroundColor: cm.bg, border: `1px solid ${cm.color}50`, color: cm.color, fontWeight: 700,
            }}>{cm.label}</span>
            <span className="font-mono" style={{
              fontSize: "0.7rem", padding: "0.3rem 0.8rem",
              backgroundColor: `${tc}15`, border: `1px solid ${tc}40`, color: tc,
            }}>脅威: {ent.threat}</span>
            <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>
              出現記録: {totalAppearances}件
            </span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ2カラム */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* 外見 */}
          <div className="card" style={{ borderColor: `${cm.color}18` }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "0.8rem", color: cm.color }}>▸ 外見・形態</div>
            </div>
            <div className="card-content">
              <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.8 }}>{ent.appearance}</p>
            </div>
          </div>

          {/* 行動パターン */}
          <div className="card" style={{ borderColor: `${cm.color}18` }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "0.8rem", color: cm.color }}>▸ 行動パターン</div>
            </div>
            <div className="card-content">
              <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.8 }}>{ent.behavior}</p>
            </div>
          </div>

          {/* 封じ込め手順 */}
          <div className="card" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "0.8rem", color: "#ef4444" }}>▸ 封じ込め・対処手順</div>
            </div>
            <div className="card-content">
              <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.8 }}>{ent.containment}</p>
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ borderColor: `${cm.color}18` }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "0.8rem", color: cm.color }}>▸ データシート</div>
            </div>
            <div className="card-content">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {([
                    ["コード", ent.code],
                    ["分類", cm.label],
                    ["脅威レベル", ent.threat],
                    ["知性レベル", ent.intelligence],
                    ["起源", ent.origin],
                    ["記録事案数", `${totalAppearances}件`],
                  ] as [string, string][]).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", padding: "0.45rem 0", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
                        {label}
                      </td>
                      <td className="font-mono" style={{ fontSize: "0.75rem", color: "white", padding: "0.45rem 0", fontWeight: 600 }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 対処モジュール */}
          {relatedModules.length > 0 && (
            <div className="card" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: "0.8rem", color: "#ef4444" }}>▸ 有効モジュール</div>
              </div>
              <div className="card-content">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {relatedModules.map(mod => (
                    <div key={mod.id} style={{ padding: "0.5rem 0.6rem", backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", marginBottom: "0.15rem" }}>{mod.code}</div>
                      <div style={{ fontSize: "0.75rem", color: "white" }}>{mod.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 関連インシデント */}
      {relatedIncidents.length > 0 && (
        <div className="card" style={{ borderColor: "rgba(239,68,68,0.2)", marginBottom: "1.25rem" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="card-title" style={{ fontSize: "0.8rem", color: "#ef4444" }}>▸ 現在のインシデント</div>
            <span className="font-mono" style={{ fontSize: "0.6rem", color: "#ef4444" }}>● LIVE</span>
          </div>
          <div className="card-content">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {relatedIncidents.map(inc => (
                <div key={inc.id} style={{
                  padding: "0.6rem 0.85rem",
                  borderLeft: `3px solid ${inc.severity === "critical" ? "#ef4444" : "#eab308"}`,
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "white", fontWeight: 600 }}>{inc.name}</span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: inc.severity === "critical" ? "#ef4444" : "#eab308" }}>
                      GSI {inc.gsi} / {inc.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{inc.desc}</div>
                  <div className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginTop: "0.2rem" }}>
                    📍 {inc.location} · 担当: {inc.division}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 関連ミッション履歴 */}
      <div className="card" style={{ borderColor: `${cm.color}18`, marginBottom: "1.25rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="card-title" style={{ fontSize: "0.8rem", color: cm.color }}>▸ 関連作戦履歴</div>
          <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>{relatedMissions.length} 件</span>
        </div>
        <div className="card-content">
          {relatedMissions.length === 0 ? (
            <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>記録なし</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {relatedMissions.map(m => {
                const pc = PRIORITY_COLOR[m.priority] ?? "#6b7280";
                return (
                  <div key={m.id} style={{
                    display: "grid", gridTemplateColumns: "3px 1fr auto",
                    gap: "0.75rem", padding: "0.65rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "start",
                  }}>
                    <div style={{ backgroundColor: pc, borderRadius: "2px", minHeight: "28px" }} />
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "white", fontWeight: 600, marginBottom: "0.1rem" }}>{m.title}</div>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>
                        {m.id} · {m.location} · {m.startDate.slice(0, 10)}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                      <span className="font-mono" style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem", backgroundColor: `${pc}15`, color: pc }}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                      <span className="font-mono" style={{ fontSize: "0.6rem", color: m.gsi >= 15 ? "#ef4444" : "var(--muted-foreground)" }}>
                        GSI {m.gsi}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 同分類の実体 */}
      <div className="card" style={{ borderColor: `${cm.color}18` }}>
        <div className="card-header">
          <div className="card-title" style={{ fontSize: "0.8rem", color: cm.color }}>▸ 同分類の実体</div>
        </div>
        <div className="card-content">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {entities.filter(e => e.classification === ent.classification && e.id !== ent.id).map(e => (
              <Link key={e.id} href={`/entities/${e.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "0.35rem 0.75rem",
                  backgroundColor: cm.bg,
                  border: `1px solid ${cm.color}25`,
                  transition: "all 0.15s",
                }}>
                  <span className="font-mono" style={{ fontSize: "0.65rem", color: cm.color, marginRight: "0.4rem" }}>{e.code}</span>
                  <span style={{ fontSize: "0.75rem", color: "white" }}>{e.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
