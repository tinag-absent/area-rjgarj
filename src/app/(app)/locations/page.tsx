import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "ロケーション - 海蝕機関" };

interface Location {
  id: string; name: string; type: string; coordinates: string;
  description: string; facilities: string[]; securityLevel: number;
  region: string; notes?: string;
}
interface Incident {
  id: string; name: string; severity: string; status: string;
  location: string; entity: string; gsi: number; desc: string; time: string;
}
interface Mission { location: string; title: string; id: string; status: string; }

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

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

export default async function LocationsPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="ロケーション" />;

  const { locations } = loadJson<{ locations: Location[] }>("locations-data.json");
  const { incidents } = loadJson<{ incidents: Incident[] }>("area-incidents-data.json");
  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");

  // 拠点ごとに関連インシデント・ミッションを紐付け（地名の部分マッチ）
  function getRelatedIncidents(loc: Location) {
    return incidents.filter(i =>
      i.location.includes(loc.name.slice(0, 3)) ||
      loc.name.includes(i.location.slice(0, 3))
    );
  }
  function getRelatedMissions(loc: Location) {
    return missions.filter(m =>
      m.location.includes(loc.name.slice(0, 3)) ||
      loc.name.includes(m.location.slice(0, 3))
    );
  }

  // 地域でグループ化
  const regionMap = new Map<string, Location[]>();
  for (const loc of locations) {
    const region = loc.region ?? "不明";
    if (!regionMap.has(region)) regionMap.set(region, []);
    regionMap.get(region)!.push(loc);
  }

  // タイプ別カウント
  const typeCounts: Record<string, number> = {};
  for (const loc of locations) {
    typeCounts[loc.type] = (typeCounts[loc.type] ?? 0) + 1;
  }

  // アクティブインシデント数
  const activeIncidentCount = incidents.filter(i => i.status === "対応中").length;

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          FACILITY REGISTRY // LEVEL 1 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
          ロケーション
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          {locations.length} 件の拠点 / インシデント対応中 {activeIncidentCount} 件
        </p>
      </div>

      {/* サマリー統計 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.65rem", marginBottom: "1.5rem" }}>
        {[
          { label: "総拠点数", value: locations.length, color: "white" },
          { label: "Sec.Lv 5", value: locations.filter(l => l.securityLevel === 5).length, color: "#ef4444" },
          { label: "Sec.Lv 4", value: locations.filter(l => l.securityLevel === 4).length, color: "#f97316" },
          { label: "次元ゲート", value: locations.filter(l => l.type.includes("gate")).length, color: "#a78bfa" },
          { label: "インシデント", value: activeIncidentCount, color: "#eab308" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "2rem" }}>
        {Object.entries(TYPE_STYLES).map(([type, s]) => (
          typeCounts[type] ? (
            <span key={type} className="font-mono" style={{
              fontSize: "0.65rem", padding: "0.2rem 0.55rem",
              backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}30`, color: s.color,
            }}>
              {s.icon} {s.label} ({typeCounts[type]})
            </span>
          ) : null
        ))}
      </div>

      {/* 地域別拠点リスト */}
      {Array.from(regionMap.entries()).map(([region, locs]) => (
        <div key={region} style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.12em" }}>
              ▸ {region}地区 ({locs.length}拠点)
            </div>
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
                    {/* ヘッダー行 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <span className="font-mono" style={{ fontSize: "0.7rem", color: ts.color }}>
                        {ts.icon} {ts.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {relInc.filter(i => i.status === "対応中").length > 0 && (
                          <span className="font-mono" style={{ fontSize: "0.58rem", color: "#ef4444", animation: "pulse 2s infinite" }}>● INCIDENT</span>
                        )}
                        <span className="font-mono" style={{ fontSize: "0.62rem", color: sc, fontWeight: 700 }}>
                          SEC.{loc.securityLevel}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "white", marginBottom: "0.25rem" }}>
                      {loc.name}
                    </div>

                    {loc.coordinates && (
                      <div className="font-mono" style={{ fontSize: "0.65rem", color: `${ts.color}80`, marginBottom: "0.6rem" }}>
                        {loc.coordinates}
                      </div>
                    )}

                    <p style={{
                      fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.65,
                      marginBottom: "0.75rem",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                    }}>{loc.description}</p>

                    {/* 設備タグ */}
                    {loc.facilities?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem" }}>
                        {loc.facilities.map(f => (
                          <span key={f} className="font-mono" style={{
                            fontSize: "0.6rem", padding: "0.12rem 0.4rem",
                            backgroundColor: `${ts.color}08`, border: `1px solid ${ts.color}20`, color: ts.color,
                          }}>{f}</span>
                        ))}
                      </div>
                    )}

                    {/* 備考 */}
                    {loc.notes && (
                      <div style={{
                        padding: "0.4rem 0.6rem", marginBottom: "0.75rem",
                        backgroundColor: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${ts.color}40`,
                      }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>{loc.notes}</p>
                      </div>
                    )}

                    {/* 関連インシデント・ミッション */}
                    {hasActivity && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.6rem" }}>
                        {relInc.length > 0 && (
                          <div style={{ marginBottom: "0.4rem" }}>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>関連インシデント</div>
                            {relInc.map(i => (
                              <div key={i.id} className="font-mono" style={{ fontSize: "0.65rem", color: i.status === "対応中" ? "#ef4444" : "var(--muted-foreground)", marginBottom: "0.15rem" }}>
                                {i.status === "対応中" ? "● " : "○ "}{i.name} (GSI {i.gsi})
                              </div>
                            ))}
                          </div>
                        )}
                        {relMis.length > 0 && (
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>関連作戦</div>
                            {relMis.slice(0, 2).map(m => (
                              <div key={m.id} className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.15rem" }}>
                                ▸ {m.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* セキュリティレベルインジケーター */}
                  <div style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <div style={{ height: "100%", width: `${(loc.securityLevel / 5) * 100}%`, backgroundColor: sc }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {locations.length === 0 && (
        <div className="font-mono" style={{ color: "var(--muted-foreground)", padding: "3rem", textAlign: "center" }}>[データなし]</div>
      )}
    </div>
  );
}
