import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "統計 - 海蝕機関" };

import fs from "fs";
import path from "path";
function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

async function loadAllData() {
  const [missionsRaw, entitiesRaw, personnelRaw] = await Promise.all([
    import("../../../../public/data/mission-data.json").then(m => m.default).catch(() => ({ missions: [] })),
    import("../../../../public/data/entities-data.json").then(m => m.default).catch(() => ({ entities: [] })),
    import("../../../../public/data/personnel-data.json").then(m => m.default).catch(() => ({ personnel: [] })),
  ]);
  return {
    missions:  (missionsRaw  as { missions?:  Mission[]  }).missions  ?? [],
    entities:  (entitiesRaw  as { entities?:  Entity[]   }).entities  ?? [],
    personnel: (personnelRaw as { personnel?: Personnel[] }).personnel ?? [],
  };
}

interface Mission  { id: string; status: string; priority: string; gsi: number; location: string; entity: string; startDate: string; casualties?: number; civilianEvacuation?: number; assignedDivisions?: string[]; }
interface Entity   { id: string; code: string; name: string; classification: string; threat?: string; }
interface Personnel { id: string; name: string; division: string; status?: string; psychEval?: { status: string; notes?: string }; }

function BarChart({ items, max }: { items: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {items.map(item => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "6rem 1fr 3rem", gap: "0.5rem", alignItems: "center" }}>
          <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", textAlign: "right", paddingRight: "0.25rem" }}>
            {item.label}
          </div>
          <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: max > 0 ? `${(item.value / max) * 100}%` : "0%",
              backgroundColor: item.color,
              transition: "width 0.7s",
            }} />
          </div>
          <div className="font-mono" style={{ fontSize: "0.7rem", color: item.color, fontWeight: 600 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function StatisticsPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 2) return <LockedContent requiredLevel={2} currentLevel={lvl} pageName="統計" />;

  const { missions, entities, personnel } = await loadAllData();

  // KPI計算
  const active     = missions.filter(m => m.status === "active").length;
  const completed  = missions.filter(m => m.status === "completed").length;
  const critical   = missions.filter(m => m.priority === "critical").length;
  const totalEvac  = missions.reduce((s, m) => s + (m.civilianEvacuation ?? 0), 0);
  const avgGSI     = missions.length > 0 ? (missions.reduce((s, m) => s + (m.gsi ?? 0), 0) / missions.length) : 0;
  const maxGSI     = missions.length > 0 ? Math.max(...missions.map(m => m.gsi ?? 0)) : 0;
  const classifiedEntities = entities.filter(e => e.classification === "classified").length;

  // Mission status chart
  const statusCount: Record<string, number> = {};
  missions.forEach(m => { statusCount[m.status] = (statusCount[m.status] ?? 0) + 1; });
  const STATUS_COLORS: Record<string, string> = { active: "#ef4444", completed: "#10b981", monitoring: "#eab308", failed: "#6b7280" };
  const STATUS_LABELS: Record<string, string> = { active: "対応中", completed: "収束済み", monitoring: "監視中", failed: "失敗" };

  // Entity classification chart
  const classCount: Record<string, number> = {};
  entities.forEach(e => { classCount[e.classification] = (classCount[e.classification] ?? 0) + 1; });
  const CLASS_COLORS: Record<string, string> = { safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6" };
  const CLASS_LABELS: Record<string, string> = { safe: "SAFE", caution: "CAUTION", danger: "DANGER", classified: "CLASSIFIED" };

  // Division personnel chart
  const divCount: Record<string, number> = {};
  personnel.forEach(p => {
    const div = p.division?.split(" ")[0] ?? "不明";
    divCount[div] = (divCount[div] ?? 0) + 1;
  });
  const DIV_COLORS: Record<string, string> = {
    "収束部門": "#ef4444", "支援部門": "#10b981", "工作部門": "#3b82f6",
    "外事部門": "#a855f7", "港湾部門": "#60a5fa",
  };

  // Location heatmap
  const locCount: Record<string, number> = {};
  missions.forEach(m => {
    const loc = m.location ? m.location.split(" ")[0].replace(/[区市町村]/, "") : "不明";
    locCount[loc] = (locCount[loc] ?? 0) + 1;
  });
  const topLocs = Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // GSI timeline
  const gsiSorted = [...missions]
    .filter(m => m.gsi && m.startDate)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Top entities in missions
  const entityCount: Record<string, number> = {};
  missions.forEach(m => {
    const match = m.entity?.match(/E-\\d+/);
    if (match) entityCount[match[0]] = (entityCount[match[0]] ?? 0) + 1;
  });
  const topEntities = Object.entries(entityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── 追加: 部門別活動ヒートマップ ──
  const DIV_COLORS_MAP: Record<string, string> = {
    "収束部門": "#ef4444", "工作部門": "#f97316", "外事部門": "#a855f7",
    "港湾部門": "#3b82f6", "支援部門": "#10b981",
  };
  const divMissionCount: Record<string, number> = {};
  missions.forEach(m => {
    (m.assignedDivisions ?? []).forEach(div => {
      const base = Object.keys(DIV_COLORS_MAP).find(k => div.includes(k.replace("部門", "")));
      if (base) divMissionCount[base] = (divMissionCount[base] ?? 0) + 1;
    });
  });

  // ── 追加: 心理評価分布 ──
  const psychDist: Record<string, number> = {};
  personnel.forEach(p => {
    const s = p.psychEval?.status ?? "不明";
    psychDist[s] = (psychDist[s] ?? 0) + 1;
  });

  // ── 追加: 月別インシデント件数（startDateから）──
  const monthlyCount: Record<string, number> = {};
  missions.forEach(m => {
    const ym = m.startDate?.slice(0, 7);
    if (ym) monthlyCount[ym] = (monthlyCount[ym] ?? 0) + 1;
  });
  const monthlySorted = Object.entries(monthlyCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);

  // ── 追加: インシデントデータ読み込み ──
  const { incidents } = loadJson<{ incidents: { severity: string; status: string; gsi: number; division: string }[] }>("area-incidents-data.json");
  const activeIncidents = incidents.filter(i => i.status === "対応中");
  const avgLiveGsi = activeIncidents.length > 0
    ? (activeIncidents.reduce((s, i) => s + i.gsi, 0) / activeIncidents.length).toFixed(1)
    : "0.0";

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          ANALYTICS // LEVEL 2 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          統計
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          機関活動の統計データ
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "総案件数",    value: missions.length,              sub: `完了: ${completed}`,                  color: "var(--primary)" },
          { label: "対応中",      value: active,                       sub: `重大: ${critical}`,                    color: "#ef4444" },
          { label: "避難民総数",  value: totalEvac.toLocaleString(),   sub: "名",                                   color: "#f59e0b" },
          { label: "平均GSI",     value: `${avgGSI.toFixed(1)}%`,      sub: `最高: ${maxGSI.toFixed(1)}%`,          color: "#8b5cf6" },
          { label: "登録実体数",  value: entities.length,              sub: `機密: ${classifiedEntities}`,          color: "#ef4444" },
          { label: "在籍機関員",  value: personnel.length,             sub: `部門数: ${Object.keys(divCount).length}`, color: "#10b981" },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: k.color, marginBottom: "0.25rem" }}>
              {k.value}
            </div>
            <div className="font-mono" style={{ fontSize: "0.72rem", color: "white", marginBottom: "0.2rem" }}>{k.label}</div>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Mission status */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 案件ステータス分布
          </div>
          <BarChart
            max={Math.max(...Object.values(statusCount), 1)}
            items={Object.entries(statusCount).map(([k, v]) => ({
              label: STATUS_LABELS[k] ?? k, value: v, color: STATUS_COLORS[k] ?? "var(--muted-foreground)",
            }))}
          />
        </div>

        {/* Entity classification */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 実体分類分布
          </div>
          <BarChart
            max={Math.max(...Object.values(classCount), 1)}
            items={Object.entries(classCount).map(([k, v]) => ({
              label: CLASS_LABELS[k] ?? k, value: v, color: CLASS_COLORS[k] ?? "var(--muted-foreground)",
            }))}
          />
        </div>

        {/* Division personnel */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 部門別人員数
          </div>
          <BarChart
            max={Math.max(...Object.values(divCount), 1)}
            items={Object.entries(divCount).sort((a,b) => b[1]-a[1]).map(([k, v]) => ({
              label: k, value: v, color: DIV_COLORS[k] ?? "var(--primary)",
            }))}
          />
        </div>

        {/* Location heatmap */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 発生地域ヒートマップ
          </div>
          <BarChart
            max={Math.max(...topLocs.map(([,v]) => v), 1)}
            items={topLocs.map(([k, v]) => ({ label: k, value: v, color: "var(--primary)" }))}
          />
        </div>
      </div>

      {/* GSI Timeline */}
      {gsiSorted.length > 1 && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ GSI 時系列推移
          </div>
          <div style={{ position: "relative", height: "120px" }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              <defs>
                <linearGradient id="gsiGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const gsiMax = Math.max(...gsiSorted.map(m => m.gsi ?? 0));
                const pts = gsiSorted.map((m, i) => {
                  const x = (i / (gsiSorted.length - 1)) * 100;
                  const y = 100 - ((m.gsi ?? 0) / gsiMax) * 100;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(" ");
                return (
                  <>
                    <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    <polygon points={`0,100 ${pts} 100,100`} fill="url(#gsiGrad)" />
                    {gsiSorted.map((m, i) => {
                      const x = (i / (gsiSorted.length - 1)) * 100;
                      const y = 100 - ((m.gsi ?? 0) / gsiMax) * 100;
                      const color = (m.gsi ?? 0) > 15 ? "#ef4444" : (m.gsi ?? 0) > 7 ? "#eab308" : "#10b981";
                      return <circle key={m.id} cx={`${x.toFixed(1)}%`} cy={`${y.toFixed(1)}%`} r="2" fill={color} />;
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)" }}>
              {new Date(gsiSorted[0].startDate).toLocaleDateString("ja-JP")}
            </span>
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)" }}>
              GSI推移
            </span>
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)" }}>
              {new Date(gsiSorted[gsiSorted.length - 1].startDate).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>
      )}

      {/* Top entities table */}
      {topEntities.length > 0 && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 出現頻度の高い実体 TOP{topEntities.length}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["実体コード", "実体名", "案件数", "分類"].map(h => (
                  <th key={h} className="font-mono" style={{
                    fontSize: "0.62rem", color: "var(--muted-foreground)", padding: "0.4rem 0.75rem",
                    textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)", letterSpacing: "0.08em",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topEntities.map(([code, cnt]) => {
                const entity = entities.find(e => e.code === code);
                return (
                  <tr key={code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", padding: "0.5rem 0.75rem" }}>{code}</td>
                    <td className="font-mono" style={{ fontSize: "0.72rem", color: "white", padding: "0.5rem 0.75rem" }}>{entity?.name ?? "不明"}</td>
                    <td className="font-mono" style={{ fontSize: "0.72rem", color: "white", padding: "0.5rem 0.75rem", textAlign: "center" }}>{cnt}</td>
                    <td className="font-mono" style={{
                      fontSize: "0.65rem", padding: "0.5rem 0.75rem", textAlign: "center",
                      color: CLASS_COLORS[entity?.classification ?? ""] ?? "var(--muted-foreground)",
                    }}>
                      {CLASS_LABELS[entity?.classification ?? ""] ?? "不明"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 追加セクション ── */}

      {/* 部門別活動量 + 心理評価 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 部門別作戦参加回数
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {Object.entries(divMissionCount).sort((a, b) => b[1] - a[1]).map(([div, cnt]) => {
              const dc = DIV_COLORS_MAP[div] ?? "var(--primary)";
              const maxVal = Math.max(...Object.values(divMissionCount), 1);
              return (
                <div key={div} style={{ display: "grid", gridTemplateColumns: "5rem 1fr 2rem", gap: "0.5rem", alignItems: "center" }}>
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", textAlign: "right", paddingRight: "0.25rem" }}>
                    {div.replace("部門", "")}
                  </div>
                  <div style={{ height: "8px", backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <div style={{ height: "100%", width: `${(cnt / maxVal) * 100}%`, backgroundColor: dc }} />
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.7rem", color: dc, fontWeight: 700 }}>{cnt}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 人員メンタルヘルス状況
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {Object.entries(psychDist).map(([status, cnt]) => {
              const PSYCH_COLORS: Record<string, string> = {
                "良好": "#10b981", "注意観察": "#eab308", "要フォロー": "#f97316",
                "緊急対応": "#ef4444", "不明": "#6b7280",
              };
              const pc = PSYCH_COLORS[status] ?? "#6b7280";
              return (
                <div key={status} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  backgroundColor: `${pc}08`, border: `1px solid ${pc}20`,
                }}>
                  <span className="font-mono" style={{ fontSize: "0.7rem", color: pc }}>{status}</span>
                  <span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: pc }}>{cnt}名</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 月別インシデント推移 */}
      {monthlySorted.length > 1 && (
        <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            ▸ 月別案件発生件数
          </div>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-end", height: "80px" }}>
            {monthlySorted.map(([ym, cnt]) => {
              const maxVal = Math.max(...monthlySorted.map(([, v]) => v), 1);
              const heightPct = (cnt / maxVal) * 100;
              return (
                <div key={ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--primary)" }}>{cnt}</div>
                  <div style={{
                    width: "100%", height: `${heightPct}%`,
                    backgroundColor: "var(--primary)", opacity: 0.7, minHeight: "4px",
                  }} />
                  <div className="font-mono" style={{ fontSize: "0.5rem", color: "var(--muted-foreground)", transform: "rotate(-45deg)", transformOrigin: "center", marginTop: "0.25rem" }}>
                    {ym.slice(5)}月
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ライブインシデントサマリー */}
      {activeIncidents.length > 0 && (
        <div className="card" style={{ padding: "1.25rem", marginTop: "1rem", borderColor: "rgba(239,68,68,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", letterSpacing: "0.1em" }}>
              ▸ ライブインシデント ({activeIncidents.length}件対応中)
            </div>
            <span className="font-mono" style={{ fontSize: "0.6rem", color: "#ef4444" }}>● 平均GSI {avgLiveGsi}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
            {activeIncidents.map((inc, i) => (
              <div key={i} style={{
                padding: "0.5rem 0.6rem",
                backgroundColor: inc.severity === "critical" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.06)",
                border: `1px solid ${inc.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.15)"}`,
              }}>
                <div className="font-mono" style={{ fontSize: "0.65rem", color: inc.severity === "critical" ? "#ef4444" : "#eab308", fontWeight: 700 }}>
                  GSI {inc.gsi}
                </div>
                <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.1rem" }}>
                  {inc.division?.split(" ")[0] ?? "不明"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

const CLASS_COLORS: Record<string, string> = { safe: "#10b981", caution: "#eab308", danger: "#ef4444", classified: "#8b5cf6" };
const CLASS_LABELS: Record<string, string> = { safe: "SAFE", caution: "CAUTION", danger: "DANGER", classified: "CLASSIFIED" };
