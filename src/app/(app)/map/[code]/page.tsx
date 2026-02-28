import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LockedContent from "@/components/ui/LockedContent";

// ── 市区町村マスター ─────────────────────────────────────────
const MUNICIPALITIES: {
  code: string; name: string; type: string;
  area: string; population: string; x: number; y: number;
}[] = [
  { code: "44201", name: "大分市",     type: "市", area: "502.39 km²", population: "約47万人", x: 382.6, y: 536.5 },
  { code: "44202", name: "別府市",     type: "市", area: "125.34 km²", population: "約11万人", x: 521.9, y: 386.2 },
  { code: "44203", name: "中津市",     type: "市", area: "491.53 km²", population: "約8.3万人", x: 711.9, y: 315.5 },
  { code: "44204", name: "日田市",     type: "市", area: "666.03 km²", population: "約6.3万人", x: 645.4, y: 143.5 },
  { code: "44205", name: "佐伯市",     type: "市", area: "903.13 km²", population: "約6.5万人", x: 173.9, y: 462.9 },
  { code: "44206", name: "臼杵市",     type: "市", area: "290.46 km²", population: "約3.7万人", x: 331.8, y: 478.2 },
  { code: "44207", name: "津久見市",   type: "市", area: "101.62 km²", population: "約1.6万人", x: 286.7, y: 514.5 },
  { code: "44208", name: "竹田市",     type: "市", area: "477.44 km²", population: "約2.1万人", x: 409.3, y: 236.3 },
  { code: "44209", name: "豊後高田市", type: "市", area: "206.34 km²", population: "約2.2万人", x: 684.1, y: 514.6 },
  { code: "44210", name: "杵築市",     type: "市", area: "280.12 km²", population: "約2.9万人", x: 575.2, y: 479.7 },
  { code: "44211", name: "宇佐市",     type: "市", area: "439.37 km²", population: "約5.3万人", x: 665.2, y: 396.1 },
  { code: "44212", name: "豊後大野市", type: "市", area: "603.34 km²", population: "約3.5万人", x: 349.6, y: 298.8 },
  { code: "44213", name: "由布市",     type: "市", area: "319.93 km²", population: "約3.3万人", x: 494.9, y: 325.6 },
  { code: "44214", name: "国東市",     type: "市", area: "318.83 km²", population: "約2.7万人", x: 621.4, y: 571.1 },
  { code: "44322", name: "姫島村",     type: "村", area: "6.96 km²",   population: "約1,700人", x: 696.7, y: 621.8 },
  { code: "44341", name: "日出町",     type: "町", area: "73.84 km²",  population: "約2.8万人", x: 538.5, y: 444.4 },
  { code: "44461", name: "九重町",     type: "町", area: "271.44 km²", population: "約8,400人", x: 546.1, y: 247.6 },
  { code: "44462", name: "玖珠町",     type: "町", area: "287.64 km²", population: "約1.4万人", x: 616.0, y: 255.3 },
];

// コード → ストロークカラー（マップのSEAカラーに合わせる）
const STROKE_COLORS: Record<string, string> = {
  "44201": "#00d4b4", "44202": "#00b8e0", "44203": "#00caa8",
  "44204": "#00c098", "44205": "#00bc90", "44206": "#00c8a0",
  "44207": "#00bc90", "44208": "#00c098", "44209": "#00c8b0",
  "44210": "#00c0a8", "44211": "#00c8a8", "44212": "#00c0a0",
  "44213": "#00ba98", "44214": "#00c2b0", "44322": "#00accc",
  "44341": "#00bc98", "44461": "#00be88", "44462": "#00bc90",
};

// インシデント名 → 市区町村コードの逆引きマップ
const INCIDENT_TO_CODE: Record<string, string> = {
  "大分港次元歪曲事案":   "44201",
  "別府湾不根侵入事案":   "44202",
  "由布岳時空歪曲":       "44213",
  "姫島沖境界ゲート":     "44322",
  "中津市内認識異常":     "44203",
  "佐伯湾残滓回収作業":   "44205",
  "日田市郊外漂流者発見": "44204",
  "豊後水道次元境界監視": "44207",
  "国東半島空間歪み":     "44214",
  "豊後高田海域不根商人": "44209",
};

async function loadMapData() {
  try {
    const { default: data } = await import("../../../../../public/data/map-incidents.json");
    return (data as { incidents: Incident[] }).incidents ?? [];
  } catch {
    return [];
  }
}

interface Incident {
  id: string; name: string;
  severity: "critical" | "warning" | "safe";
  location: string; status: string; entity: string; gsi: string;
  assignedDivision: string; description: string; timestamp: string;
  position: { x: number; y: number };
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> }
): Promise<Metadata> {
  const { code } = await params;
  const muni = MUNICIPALITIES.find(m => m.code === code);
  return { title: muni ? `${muni.name} — インシデントマップ` : "地域詳細" };
}

const SEV_META = {
  critical: { label: "重大", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  warning:  { label: "警戒", color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  safe:     { label: "安全", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
} as const;

export default async function MunicipalityDetailPage(
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="地域詳細" />;

  const muni = MUNICIPALITIES.find(m => m.code === code);
  if (!muni) notFound();

  const allIncidents = await loadMapData();
  // この市区町村に関連するインシデントを抽出
  const localIncidents = allIncidents.filter(inc => INCIDENT_TO_CODE[inc.name] === code);

  const strokeColor = STROKE_COLORS[code] ?? "var(--primary)";

  // 隣接市区町村（簡易：同じリストから前後2件を表示）
  const idx      = MUNICIPALITIES.findIndex(m => m.code === code);
  const neighbors = [
    MUNICIPALITIES[idx - 1],
    MUNICIPALITIES[idx + 1],
  ].filter(Boolean);

  const criticalCount = localIncidents.filter(i => i.severity === "critical").length;
  const alertLevel =
    criticalCount > 0          ? "緊急対応"
    : localIncidents.length > 0 ? "監視中"
    : "平常";
  const alertColor =
    criticalCount > 0          ? "#ef4444"
    : localIncidents.length > 0 ? "#eab308"
    : "#10b981";

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "960px", margin: "0 auto" }}>

      {/* 戻るリンク */}
      <Link href="/map" style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        color: "rgba(255,255,255,0.35)", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
        marginBottom: "1.75rem", transition: "color 0.2s",
      }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        インシデントマップに戻る
      </Link>

      {/* ヘッダーカード */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem", borderColor: `${strokeColor}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="font-mono" style={{ fontSize: "0.68rem", color: strokeColor, letterSpacing: "0.12em", marginBottom: "0.35rem" }}>
              MUNICIPALITY // {code}
            </div>
            <h1 style={{
              fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, color: "white", margin: "0 0 0.25rem",
            }}>
              {muni.name}
            </h1>
            <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
              大分県 {muni.type}
            </div>
          </div>

          {/* アラートレベル */}
          <div style={{
            padding: "0.6rem 1rem",
            background: `${alertColor}10`,
            border: `1px solid ${alertColor}30`,
            borderLeft: `3px solid ${alertColor}`,
            textAlign: "right",
          }}>
            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>
              ALERT STATUS
            </div>
            <div className="font-mono" style={{ fontSize: "1rem", color: alertColor, fontWeight: 700 }}>
              {alertLevel}
            </div>
          </div>
        </div>

        {/* 基本情報グリッド */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem",
          marginTop: "1.25rem", padding: "0.875rem",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
        }}>
          {[
            ["行政区分", muni.type],
            ["面積",     muni.area],
            ["人口",     muni.population],
            ["インシデント数", `${localIncidents.length} 件`],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ fontSize: "0.82rem", color: "white", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* インシデント一覧 */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div className="font-mono" style={{ fontSize: "0.62rem", color: strokeColor, letterSpacing: "0.12em", marginBottom: "1rem" }}>
          ACTIVE INCIDENTS IN THIS AREA
        </div>

        {localIncidents.length === 0 ? (
          <div style={{
            padding: "2rem 0", textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
            color: "rgba(255,255,255,0.18)",
          }}>
            [この地域に記録されたインシデントはありません]
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {localIncidents.map(inc => {
              const sm = SEV_META[inc.severity] ?? SEV_META.safe;
              return (
                <div key={inc.id} style={{
                  padding: "1rem 1.25rem",
                  background: sm.bg,
                  border: `1px solid ${sm.border}`,
                  borderLeft: `3px solid ${sm.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{
                      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                      fontSize: "0.9rem", color: "white",
                    }}>
                      {inc.name}
                    </div>
                    <span className="font-mono" style={{
                      fontSize: "0.6rem", padding: "0.15rem 0.5rem",
                      background: `${sm.color}20`, color: sm.color,
                      flexShrink: 0, marginLeft: "0.75rem",
                    }}>
                      {sm.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                    {inc.description}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.4rem 1.5rem" }}>
                    {([
                      ["場所",   inc.location],
                      ["担当",   inc.assignedDivision],
                      ["状態",   inc.status],
                      ["GSI",    inc.gsi],
                      ["実体",   inc.entity],
                      ["記録",   inc.timestamp],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                        <span className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", minWidth: "2.5rem", flexShrink: 0 }}>{k}</span>
                        <span className="font-mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.75)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 周辺地域 */}
      {neighbors.length > 0 && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.12em", marginBottom: "0.875rem" }}>
            NEIGHBORING AREAS
          </div>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            {neighbors.map(n => {
              const nc = STROKE_COLORS[n.code] ?? "var(--primary)";
              return (
                <Link key={n.code} href={`/map/${n.code}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "0.5rem 1rem",
                    background: `${nc}08`,
                    border: `1px solid ${nc}25`,
                    transition: "background 0.15s, border-color 0.15s",
                    display: "flex", flexDirection: "column", gap: "0.15rem",
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = `${nc}18`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${nc}50`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = `${nc}08`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${nc}25`;
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: "0.58rem", color: nc }}>{n.code}</span>
                    <span style={{ fontSize: "0.82rem", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{n.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
