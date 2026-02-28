import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "インシデントマップ - 海蝕機関" };

async function loadMapData() {
  try {
    const db = getDb();
    const rows = await query<{ id: string; data: string }>(db,
      "SELECT id, data FROM map_incidents ORDER BY rowid ASC"
    ).catch(() => []);
    if (rows.length > 0) {
      const incidents = rows
        .map(r => { try { return JSON.parse(r.data) as Incident; } catch { return null; } })
        .filter(Boolean) as Incident[];
      return { incidents, statistics: calcStats(incidents) };
    }
  } catch { /* fall through */ }
  try {
    const { default: data } = await import("../../../../public/data/map-incidents.json");
    return data as { incidents: Incident[]; statistics: Statistics };
  } catch {
    return { incidents: [], statistics: { total: 0, critical: 0, warning: 0, safe: 0 } };
  }
}

function calcStats(incidents: Incident[]): Statistics {
  return {
    total:    incidents.length,
    critical: incidents.filter(i => i.severity === "critical").length,
    warning:  incidents.filter(i => i.severity === "warning").length,
    safe:     incidents.filter(i => i.severity === "safe").length,
  };
}

interface Incident {
  id: string; name: string; severity: "critical" | "warning" | "safe";
  position: { x: number; y: number };
  location: string; status: string; entity: string; gsi: string;
  assignedDivision: string; description: string; timestamp: string;
}
interface Statistics { total: number; critical: number; warning: number; safe: number; }

// municipalities-data.json centLon/centLat を
// 重心中心・km換算（1°lon≈92.8km, 1°lat≈111km at 33°N）・123°回転・SVG 860x620 PAD70 で投影
const MUNICIPALITIES: { code: string; name: string; x: number; y: number }[] = [
  { code: "44201", name: "大分市",     x: 385.7, y: 412.4 },
  { code: "44202", name: "別府市",     x: 509.5, y: 251.1 },
  { code: "44203", name: "中津市",     x: 490.0, y:  77.8 },
  { code: "44204", name: "日田市",     x: 772.5, y:  70.0 },
  { code: "44205", name: "佐伯市",     x: 619.3, y: 550.0 },
  { code: "44206", name: "臼杵市",     x: 499.2, y: 431.8 },
  { code: "44207", name: "津久見市",   x: 476.6, y: 479.8 },
  { code: "44208", name: "竹田市",     x: 790.0, y: 287.0 },
  { code: "44209", name: "豊後高田市", x: 228.2, y: 168.9 },
  { code: "44210", name: "杵築市",     x: 345.1, y: 242.0 },
  { code: "44211", name: "宇佐市",     x: 406.1, y: 142.5 },
  { code: "44212", name: "豊後大野市", x: 739.6, y: 355.4 },
  { code: "44213", name: "由布市",     x: 611.3, y: 251.1 },
  { code: "44214", name: "国東市",     x: 188.1, y: 237.7 },
  { code: "44322", name: "姫島村",     x:  70.0, y: 196.3 },
  { code: "44341", name: "日出町",     x: 417.6, y: 258.4 },
  { code: "44461", name: "九重町",     x: 688.6, y: 183.9 },
  { code: "44462", name: "玖珠町",     x: 634.3, y: 132.0 },
];

const EDGES: [string, string][] = [
  ["44201","44206"],["44201","44213"],["44201","44210"],["44201","44341"],["44201","44212"],
  ["44202","44210"],["44202","44213"],["44202","44341"],
  ["44203","44211"],["44203","44209"],["44203","44462"],
  ["44204","44208"],["44204","44461"],["44204","44462"],
  ["44205","44206"],["44205","44207"],["44205","44212"],
  ["44206","44207"],["44206","44212"],
  ["44207","44212"],
  ["44208","44212"],["44208","44461"],["44208","44213"],
  ["44209","44214"],["44209","44211"],["44209","44322"],
  ["44210","44341"],["44210","44214"],["44210","44211"],
  ["44211","44462"],["44211","44461"],
  ["44212","44461"],
  ["44213","44461"],["44213","44208"],
  ["44214","44341"],
  ["44461","44462"],
];

const INCIDENT_COORDS: Record<string, { x: number; y: number }> = {
  "大分港次元歪曲事案":   { x: 385.7, y: 412.4 },
  "別府湾不根侵入事案":   { x: 509.5, y: 251.1 },
  "由布岳時空歪曲":       { x: 611.3, y: 251.1 },
  "姫島沖境界ゲート":     { x:  70.0, y: 196.3 },
  "中津市内認識異常":     { x: 490.0, y:  77.8 },
  "佐伯湾残滓回収作業":   { x: 619.3, y: 550.0 },
  "日田市郊外漂流者発見": { x: 772.5, y:  70.0 },
  "豊後水道次元境界監視": { x: 476.6, y: 479.8 },
  "国東半島空間歪み":     { x: 188.1, y: 237.7 },
  "豊後高田海域不根商人": { x: 228.2, y: 168.9 },
};

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "重大" },
  warning:  { color: "#eab308", bg: "rgba(234,179,8,0.15)",  label: "警戒" },
  safe:     { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "安全" },
} as const;

const W = 860, H = 620;

export default async function MapPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="インシデントマップ" />;

  const { incidents, statistics } = await loadMapData();

  const incWithPos = incidents.map(inc => ({
    ...inc,
    pos: INCIDENT_COORDS[inc.name] ?? {
      x: 70 + (inc.position.x / 100) * (W - 140),
      y: 70 + (inc.position.y / 100) * (H - 140),
    },
  }));

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "1.5rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          INCIDENT MAP // REAL-TIME MONITORING
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
          インシデントマップ
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          大分県・周辺海域 — リアルタイム監視 // 投影: centLon/centLat → km換算 → 123°回転
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {([
          { label: "総インシデント", value: statistics.total,    color: "var(--primary)" },
          { label: "重大",           value: statistics.critical, color: "#ef4444" },
          { label: "警戒",           value: statistics.warning,  color: "#eab308" },
          { label: "安全",           value: statistics.safe,     color: "#10b981" },
        ] as { label: string; value: number; color: string }[]).map(s => (
          <div key={s.label} className="card" style={{ padding: "0.875rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "0.65rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em" }}>▸ OITA PREF. MAP</span>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {(["critical","warning","safe"] as const).map(k => (
                  <span key={k} className="font-mono" style={{ fontSize: "0.6rem", color: SEV[k].color, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ display:"inline-block", width:"7px", height:"7px", borderRadius:"50%", backgroundColor: SEV[k].color }} />
                    {SEV[k].label}
                  </span>
                ))}
              </div>
            </div>
            <span className="font-mono" style={{ fontSize: "0.58rem", color: "rgba(0,255,255,0.3)" }}>ROT 123° · KM PROJ</span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} width="100%"
            style={{ display: "block", backgroundColor: "rgba(0,5,15,1)" }}
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="f-red">
                <feGaussianBlur stdDeviation="4" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="f-yel">
                <feGaussianBlur stdDeviation="3" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="f-cyn">
                <feGaussianBlur stdDeviation="1.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <style>{`
                .ping-r { animation: pingR 2s cubic-bezier(0,0,0.2,1) infinite; }
                @keyframes pingR { 0%{r:11;opacity:.65} 100%{r:30;opacity:0} }
              `}</style>
            </defs>

            <rect width={W} height={H} fill="#00050f" />

            {Array.from({length:18},(_,i)=>i*50+30).map(gx =>
              Array.from({length:13},(_,j)=>j*50+20).map(gy =>
                <circle key={`g${gx}-${gy}`} cx={gx} cy={gy} r="0.8" fill="rgba(0,255,255,0.05)" />
              )
            )}

            {[
              { x: 100, y: 380, t: "周 防 灘" },
              { x: 220, y: 500, t: "別 府 湾" },
              { x: 480, y: 590, t: "豊 後 水 道" },
            ].map(({ x, y, t }) => (
              <text key={t} x={x} y={y} fontFamily="'JetBrains Mono',monospace"
                fontSize="9" fill="rgba(20,100,200,0.18)" letterSpacing="4">{t}</text>
            ))}

            {EDGES.map(([a, b]) => {
              const ma = MUNICIPALITIES.find(m => m.code === a);
              const mb = MUNICIPALITIES.find(m => m.code === b);
              if (!ma || !mb) return null;
              return <line key={`e${a}${b}`}
                x1={ma.x} y1={ma.y} x2={mb.x} y2={mb.y}
                stroke="rgba(0,255,255,0.08)" strokeWidth="0.9" />;
            })}

            {MUNICIPALITIES.map(m => (
              <g key={m.code} filter="url(#f-cyn)">
                <circle cx={m.x} cy={m.y} r={5.5}
                  fill="rgba(0,255,255,0.12)" stroke="rgba(0,255,255,0.45)" strokeWidth="0.9" />
                <text x={m.x} y={m.y-10} textAnchor="middle"
                  fontFamily="'JetBrains Mono',monospace"
                  fontSize={m.name.length > 4 ? "7" : "8"}
                  fill="rgba(0,220,220,0.65)">{m.name}</text>
              </g>
            ))}

            {incWithPos.map(inc => {
              const s = SEV[inc.severity] ?? SEV.safe;
              const r = inc.severity === "critical" ? 9 : inc.severity === "warning" ? 7 : 5;
              const filt = inc.severity === "critical" ? "url(#f-red)" : "url(#f-yel)";
              return (
                <g key={inc.id} filter={filt}>
                  {inc.severity === "critical" && (
                    <circle className="ping-r" cx={inc.pos.x} cy={inc.pos.y}
                      r={r+2} fill="none" stroke={s.color} strokeWidth="1.5" />
                  )}
                  <circle cx={inc.pos.x} cy={inc.pos.y}
                    r={r+6} fill="none" stroke={s.color} strokeWidth="0.6" opacity="0.2" />
                  <circle cx={inc.pos.x} cy={inc.pos.y} r={r} fill={s.color} opacity="0.9" />
                  <line x1={inc.pos.x-r} y1={inc.pos.y} x2={inc.pos.x+r} y2={inc.pos.y}
                    stroke="rgba(0,0,0,0.55)" strokeWidth="1.3" />
                  <line x1={inc.pos.x} y1={inc.pos.y-r} x2={inc.pos.x} y2={inc.pos.y+r}
                    stroke="rgba(0,0,0,0.55)" strokeWidth="1.3" />
                </g>
              );
            })}

            <rect x={W-148} y={H-76} width={138} height={66}
              fill="rgba(0,5,15,0.9)" stroke="rgba(0,255,255,0.12)" strokeWidth="0.6" />
            <text x={W-79} y={H-61} textAnchor="middle"
              fontFamily="'JetBrains Mono',monospace" fontSize="7"
              fill="rgba(0,255,255,0.35)" letterSpacing="1">OITA PREFECTURE</text>
            {[
              { c: "#ef4444", l: "重大インシデント", dy: 0 },
              { c: "#eab308", l: "警戒インシデント", dy: 14 },
              { c: "#10b981", l: "安全区域",         dy: 28 },
            ].map(item => (
              <g key={item.l}>
                <circle cx={W-136} cy={H-48+item.dy} r={4.5} fill={item.c} opacity="0.9" />
                <text x={W-128} y={H-44+item.dy}
                  fontFamily="'JetBrains Mono',monospace" fontSize="7.5"
                  fill="rgba(255,255,255,0.45)">{item.l}</text>
              </g>
            ))}

            <text x={8} y={H-6} fontFamily="'JetBrains Mono',monospace"
              fontSize="7" fill="rgba(0,255,255,0.2)">
              N33° E131° · ROT:123° · municipalities-data.json
            </text>
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", overflowY: "auto", maxHeight: "680px" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
            ACTIVE INCIDENTS ({incidents.length})
          </div>
          {incidents.map(inc => {
            const s = SEV[inc.severity] ?? SEV.safe;
            return (
              <div key={inc.id} className="card" style={{ borderColor: `${s.color}30`, padding: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "white", lineHeight: 1.3 }}>
                    {inc.name}
                  </div>
                  <span style={{
                    fontSize: "0.6rem", padding: "0.15rem 0.45rem",
                    fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                    flexShrink: 0, marginLeft: "0.5rem",
                    backgroundColor: s.bg, color: s.color,
                  }}>{s.label}</span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                  {inc.description}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {([
                    { k: "場所", v: inc.location },
                    { k: "状態", v: inc.status,          hl: true },
                    { k: "GSI",  v: inc.gsi,              ac: "var(--primary)" },
                    { k: "担当", v: inc.assignedDivision },
                  ] as { k: string; v: string; hl?: boolean; ac?: string }[]).map(item => (
                    <div key={item.k} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                      <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", minWidth: "2.5rem" }}>{item.k}</span>
                      <span className="font-mono" style={{ fontSize: "0.68rem", color: item.ac ?? (item.hl ? s.color : "rgba(255,255,255,0.7)") }}>
                        {item.v}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="font-mono" style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", marginTop: "0.5rem", textAlign: "right" }}>
                  {inc.timestamp}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
