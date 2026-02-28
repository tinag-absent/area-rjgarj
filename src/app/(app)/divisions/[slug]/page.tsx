import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import fs from "fs";
import path from "path";

// ─── 静的メタデータ ───────────────────────────────────────────────────────────
const DIV_META: Record<string, {
  color: string; en: string; description: string; specializations: string[];
  motto: string; founded: string; clearanceRequired: number;
  operationalArea: string; commandChain: string;
}> = {
  convergence: {
    color: "#ef4444", en: "Convergence Division",
    description: "海蝕現象の前線に立つ部門。モジュールと呼ばれる収束装置を携行し、現場での即応処置を行う。実体との接触が最も多く、機関内でも最大の危険度を誇る。",
    specializations: ["次元収束", "実体無力化", "緊急対応"],
    motto: '"We Stand Where Reality Ends"',
    founded: "機関創設時（1991年）",
    clearanceRequired: 1,
    operationalArea: "大分県全域・九州北部",
    commandChain: "収束部門長 → 各班長（第1〜第4班）",
  },
  engineering: {
    color: "#f97316", en: "Engineering Division",
    description: "回収された海蝕実体や残滓を検証し、その特性をモジュールへ転用。部室・消耗品・小物類の製作も兼任する。全部門の装備を支える技術の要。",
    specializations: ["モジュール開発", "技術革新", "装備保守"],
    motto: '"Build the Tools That Save the World"',
    founded: "1994年（収束部門から独立）",
    clearanceRequired: 1,
    operationalArea: "機関本部研究施設・別府ラボ",
    commandChain: "工作部門長 → 研究班・製造班・保守班",
  },
  foreign: {
    color: "#a855f7", en: "Foreign Affairs Division",
    description: "行政・報道機関・階底次元住民との折衝やメディア操作を行う。スカウトや経理業務を担当することもある。表舞台の見えない守護者。",
    specializations: ["外交交渉", "情報工作", "記憶操作"],
    motto: '"The Truth You See Is Ours to Shape"',
    founded: "1997年",
    clearanceRequired: 1,
    operationalArea: "全国・海外拠点（東京・大阪・福岡）",
    commandChain: "外事部門長 → 国内班・対不根班・情報班",
  },
  port: {
    color: "#3b82f6", en: "Port Division",
    description: "境界の入り口となる土地や施設を24時間監視し、未認可の不根（ふね）や海蝕実体の侵入を阻止する。夜間・海上での活動が多い。",
    specializations: ["ゲート管理", "次元航行", "座標固定"],
    motto: '"Nothing Crosses Without Our Consent"',
    founded: "2001年",
    clearanceRequired: 1,
    operationalArea: "大分港・別府港・姫島周辺海域",
    commandChain: "港湾部門長 → 監視班・航行班",
  },
  support: {
    color: "#10b981", en: "Support Division",
    description: "現地オペレーションの調整やデータ解析、海蝕員の帰還後ケアを担当。状況に応じて現場への同行支援も実施する。全部門の生命線。",
    specializations: ["医療支援", "補給管理", "通信維持"],
    motto: '"Behind Every Mission, We Are There"',
    founded: "1991年（機関創設と同時）",
    clearanceRequired: 1,
    operationalArea: "後方支援・全作戦域",
    commandChain: "支援部門長 → 医療班・補給班・通信班",
  },
};

const DIV_NAME_TO_SLUG: Record<string, string> = {
  "収束部門": "convergence",
  "工作部門": "engineering",
  "外事部門": "foreign",
  "港湾部門": "port",
  "支援部門": "support",
};

// ─── ユーティリティ ──────────────────────────────────────────────────────────
function loadJson<T>(file: string): T {
  const p = path.join(process.cwd(), "public", "data", file);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────
interface Mission {
  id: string; title: string; status: string; priority: string;
  location: string; startDate: string; endDate?: string;
  assignedDivisions: string[]; entity: string; gsi: number;
  description: string; casualties?: number; civilianEvacuation?: number;
  result?: string; securityLevel?: number;
}
interface Personnel {
  id: string; name: string; division: string; rank: string; age: number;
  specialization: string;
  resume?: { skills?: string[]; achievements?: string[] };
  psychEval?: { status: string; notes: string };
}
interface Incident {
  id: string; name: string; severity: string; status: string;
  location: string; entity: string; gsi: number; division: string;
  desc: string; time: string;
}
interface DivisionData {
  id: string; name: string; description: string; personnel: number;
  specializations: string[]; equipment: string[];
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308",
  low: "#22c55e", normal: "#6b7280",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "完了", active: "進行中", pending: "待機中",
  planning: "計画中", cancelled: "中止",
};
const PSYCH_COLOR: Record<string, string> = {
  "良好": "#10b981", "注意観察": "#eab308", "要フォロー": "#f97316",
  "緊急対応": "#ef4444",
};
const CLEARANCE_COLORS = ["#445060", "#4fc3f7", "#00e676", "#ffd740", "#ff9800", "#ff5252"];

// ─── ページ ───────────────────────────────────────────────────────────────────
export default async function DivisionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");

  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="部門詳細" />;

  const meta = DIV_META[slug];
  if (!meta) return <div style={{ padding: "3rem", color: "white" }}>部門が見つかりません</div>;

  const db = getDb();
  const [divRow, dbMembers, recentPosts] = await Promise.all([
    query<{ id: string; name: string; slug: string }>(db,
      `SELECT id, name, slug FROM divisions WHERE slug = ? LIMIT 1`, [slug]
    ),
    query<{ username: string; display_name: string; clearance_level: number }>(db,
      `SELECT u.username, u.display_name, u.clearance_level
       FROM users u JOIN divisions d ON d.id = u.division_id
       WHERE d.slug = ? AND u.status = 'active' AND u.deleted_at IS NULL
       ORDER BY u.clearance_level DESC, u.username ASC LIMIT 30`, [slug]
    ),
    query<{ id: string; title: string; body: string; created_at: string; author_name: string }>(db,
      `SELECT p.id, p.title, p.body, p.created_at, u.display_name AS author_name
       FROM posts p JOIN users u ON u.id = p.user_id
       JOIN divisions d ON d.id = p.division_id
       WHERE d.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC LIMIT 5`, [slug]
    ),
  ]);

  const divName = divRow[0]?.name
    ?? Object.entries(DIV_NAME_TO_SLUG).find(([, s]) => s === slug)?.[0]
    ?? slug;

  const { missions } = loadJson<{ missions: Mission[] }>("mission-data.json");
  const { personnel } = loadJson<{ personnel: Personnel[] }>("personnel-data.json");
  const { incidents } = loadJson<{ incidents: Incident[] }>("area-incidents-data.json");
  const { divisions: divData } = loadJson<{ divisions: DivisionData[] }>("divisions-data.json");

  const divJaName = Object.entries(DIV_NAME_TO_SLUG).find(([, s]) => s === slug)?.[0] ?? divName;
  const divKeyword = divJaName.replace("部門", "");

  const relatedMissions = missions.filter(m =>
    m.assignedDivisions.some(d => d.includes(divKeyword))
  ).slice(0, 6);

  const relatedPersonnel = personnel.filter(p => p.division.includes(divKeyword));
  const relatedIncidents = incidents.filter(i => i.division.includes(divKeyword));
  const divStaticData = divData.find(d => d.name === divJaName);

  const completedMissions = relatedMissions.filter(m => m.status === "completed").length;
  const activeMissions = relatedMissions.filter(m => m.status === "active").length;
  const avgGsi = relatedMissions.length > 0
    ? (relatedMissions.reduce((s, m) => s + m.gsi, 0) / relatedMissions.length).toFixed(1)
    : "0.0";
  const totalCasualties = relatedMissions.reduce((s, m) => s + (m.casualties ?? 0), 0);
  const totalEvacuations = relatedMissions.reduce((s, m) => s + (m.civilianEvacuation ?? 0), 0);

  const c = meta.color;

  return (
    <div className="animate-fadeIn" style={{ padding: "2rem 1.5rem", maxWidth: "1100px", margin: "0 auto" }}>

      {/* 戻るリンク */}
      <div style={{ marginBottom: "0.75rem" }}>
        <Link href="/divisions" className="font-mono" style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", textDecoration: "none" }}>
          ← 組織図に戻る
        </Link>
      </div>

      {/* ══ ヘッダー ══ */}
      <div style={{
        position: "relative", overflow: "hidden",
        borderLeft: `4px solid ${c}`, paddingLeft: "1.25rem",
        marginBottom: "2rem", paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "300px", height: "300px",
          background: `radial-gradient(circle, ${c}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div className="font-mono" style={{ fontSize: "0.7rem", color: c, letterSpacing: "0.2em", marginBottom: "0.4rem" }}>
          {meta.en.toUpperCase()} // DIVISION PROFILE
        </div>
        <h1 style={{ fontSize: "2.25rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          {divName}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.8, maxWidth: "680px", marginBottom: "1rem" }}>
          {meta.description}
        </p>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: `${c}aa`, fontStyle: "italic", marginBottom: "1rem" }}>
          {meta.motto}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {meta.specializations.map(s => (
            <span key={s} className="font-mono" style={{
              fontSize: "0.65rem", padding: "0.2rem 0.6rem",
              backgroundColor: `${c}12`, border: `1px solid ${c}35`, color: c,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* ══ 部門情報 + 統計 ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>

        <div className="card" style={{ borderColor: `${c}18` }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 部門情報</div>
          </div>
          <div className="card-content">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {([
                  ["設立", meta.founded],
                  ["活動域", meta.operationalArea],
                  ["指揮系統", meta.commandChain],
                  ["在籍人数", `${divStaticData?.personnel ?? "---"} 名`],
                  ["必要クリアランス", `Lv.${meta.clearanceRequired}+`],
                ] as [string, string][]).map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", padding: "0.45rem 0", paddingRight: "1rem", whiteSpace: "nowrap" }}>
                      {label}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "white", padding: "0.45rem 0" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ borderColor: `${c}18` }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 活動統計</div>
          </div>
          <div className="card-content">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {([
                ["関連作戦", relatedMissions.length, "件"],
                ["完了作戦", completedMissions, "件"],
                ["進行中", activeMissions + relatedIncidents.filter(i => i.status === "対応中").length, "件"],
                ["平均GSI", avgGsi, ""],
                ["避難誘導", totalEvacuations.toLocaleString(), "名"],
                ["機関員損失", totalCasualties, "名"],
              ] as [string, string | number, string][]).map(([label, value, unit]) => (
                <div key={label} style={{
                  padding: "0.6rem 0.75rem",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginBottom: "0.2rem" }}>{label}</div>
                  <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: c }}>
                    {value}<span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginLeft: "0.2rem" }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 主要装備モジュール ══ */}
      {divStaticData?.equipment && divStaticData.equipment.length > 0 && (
        <div className="card" style={{ borderColor: `${c}18`, marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 標準装備モジュール</div>
          </div>
          <div className="card-content">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              {divStaticData.equipment.map(eq => (
                <div key={eq} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.4rem 0.85rem",
                  backgroundColor: `${c}08`,
                  border: `1px solid ${c}25`,
                }}>
                  <div style={{ width: "5px", height: "5px", backgroundColor: c, borderRadius: "1px", flexShrink: 0 }} />
                  <span className="font-mono" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.85)" }}>{eq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ 現在のインシデント ══ */}
      {relatedIncidents.length > 0 && (
        <div className="card" style={{ borderColor: "#ef444420", marginBottom: "1.5rem" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title" style={{ fontSize: "0.8rem", color: "#ef4444" }}>
              ▸ 現在のインシデント対応状況
            </div>
            <div className="font-mono" style={{ fontSize: "0.6rem", color: "#ef4444" }}>● LIVE</div>
          </div>
          <div className="card-content">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {relatedIncidents.map(inc => (
                <div key={inc.id} style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: inc.severity === "critical" ? "rgba(239,68,68,0.05)" : "rgba(234,179,8,0.04)",
                  border: `1px solid ${inc.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.15)"}`,
                  borderLeft: `3px solid ${inc.severity === "critical" ? "#ef4444" : "#eab308"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                    <div style={{ fontSize: "0.825rem", color: "white", fontWeight: 600 }}>{inc.name}</div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, marginLeft: "0.5rem" }}>
                      <span className="font-mono" style={{
                        fontSize: "0.6rem", padding: "0.1rem 0.4rem",
                        backgroundColor: inc.severity === "critical" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.1)",
                        color: inc.severity === "critical" ? "#ef4444" : "#eab308",
                      }}>{inc.severity.toUpperCase()}</span>
                      <span className="font-mono" style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>{inc.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>{inc.desc}</div>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <span className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>📍 {inc.location}</span>
                    <span className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>実体: {inc.entity}</span>
                    <span className="font-mono" style={{ fontSize: "0.62rem", color: inc.gsi >= 10 ? "#ef4444" : "#eab308" }}>GSI {inc.gsi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ 関連作戦履歴 ══ */}
      <div className="card" style={{ borderColor: `${c}18`, marginBottom: "1.5rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 関連作戦履歴</div>
          <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>{relatedMissions.length} 件</span>
        </div>
        <div className="card-content">
          {relatedMissions.length === 0 ? (
            <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>関連作戦なし</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {relatedMissions.map(m => {
                const pc = PRIORITY_COLOR[m.priority] ?? "#6b7280";
                return (
                  <div key={m.id} style={{
                    display: "grid", gridTemplateColumns: "3px 1fr auto",
                    gap: "0.75rem", alignItems: "start",
                    padding: "0.65rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ width: "3px", backgroundColor: pc, borderRadius: "2px", minHeight: "32px" }} />
                    <div>
                      <div style={{ fontSize: "0.825rem", color: "white", fontWeight: 600, marginBottom: "0.15rem" }}>{m.title}</div>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>
                        {m.id} · {m.location} · {m.startDate.slice(0, 10)}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
                      <span className="font-mono" style={{
                        fontSize: "0.58rem", padding: "0.1rem 0.45rem",
                        backgroundColor: `${pc}15`, color: pc, border: `1px solid ${pc}30`,
                      }}>{STATUS_LABEL[m.status] ?? m.status}</span>
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

      {/* ══ メンバー + レポート ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ borderColor: `${c}18` }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 在籍メンバー ({dbMembers.length})</div>
          </div>
          <div className="card-content">
            {dbMembers.length === 0 ? (
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>在籍メンバーなし</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {dbMembers.map(m => (
                  <div key={m.username} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.35rem 0.5rem", backgroundColor: "rgba(255,255,255,0.02)",
                  }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                      backgroundColor: CLEARANCE_COLORS[m.clearance_level] ?? "#445060",
                    }} />
                    <span className="font-mono" style={{ fontSize: "0.72rem", color: "white", flex: 1 }}>{m.username}</span>
                    {m.display_name && <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>{m.display_name}</span>}
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)" }}>LV{m.clearance_level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ borderColor: `${c}18` }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 最近のレポート</div>
          </div>
          <div className="card-content">
            {recentPosts.length === 0 ? (
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>レポートなし</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentPosts.map(p => (
                  <div key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.825rem", color: "white", fontWeight: 600, marginBottom: "0.2rem" }}>{p.title || "（無題）"}</div>
                    <div style={{
                      fontSize: "0.72rem", color: "var(--muted-foreground)",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                    }}>{p.body}</div>
                    <div className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginTop: "0.25rem" }}>
                      {p.author_name} — {new Date(p.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ 主要パーソネル（静的データ） ══ */}
      {relatedPersonnel.length > 0 && (
        <div className="card" style={{ borderColor: `${c}18`, marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.8rem", color: c }}>▸ 主要パーソネル <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>[機密扱い]</span></div>
          </div>
          <div className="card-content">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.75rem" }}>
              {relatedPersonnel.map(p => (
                <div key={p.id} style={{
                  padding: "0.85rem 1rem",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: `2px solid ${c}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{p.name}</div>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>{p.id} / {p.rank}</div>
                    </div>
                    {p.psychEval && (
                      <span className="font-mono" style={{
                        fontSize: "0.58rem", padding: "0.1rem 0.4rem",
                        backgroundColor: `${PSYCH_COLOR[p.psychEval.status] ?? "#6b7280"}15`,
                        color: PSYCH_COLOR[p.psychEval.status] ?? "#6b7280",
                        border: `1px solid ${PSYCH_COLOR[p.psychEval.status] ?? "#6b7280"}30`,
                        flexShrink: 0,
                      }}>{p.psychEval.status}</span>
                    )}
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.68rem", color: `${c}aa`, marginBottom: "0.35rem" }}>
                    {p.specialization}
                  </div>
                  {p.resume?.achievements && p.resume.achievements.length > 0 && (
                    <div style={{ marginTop: "0.4rem" }}>
                      {p.resume.achievements.slice(0, 2).map((ach, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.15rem" }}>
                          <span style={{ color: c, fontSize: "0.6rem", flexShrink: 0 }}>▸</span>
                          <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{ach}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ フッター ══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>
          CLASSIFICATION: RESTRICTED // {meta.en.toUpperCase()}
        </div>
        <Link href="/division-transfer"
          style={{
            display: "inline-block", padding: "0.5rem 1.25rem",
            border: `1px solid ${c}60`, color: c, textDecoration: "none",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
            transition: "all 0.2s",
          }}>
          この部門への移動申請 →
        </Link>
      </div>
    </div>
  );
}
