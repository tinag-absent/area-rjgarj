import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "人員ファイル - 海蝕機関" };

interface DiaryEntry { date: string; entry: string; }
interface PsychEval { lastEval: string; status: string; notes: string; }
interface Resume {
  education?: string[];
  experience?: string[];
  achievements?: string[];
  skills?: string[];
}
interface Personnel {
  id: string; name: string; division: string; rank: string; age: number;
  joinDate: string; specialization: string;
  resume?: Resume;
  diary?: DiaryEntry[];
  psychEval?: PsychEval;
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

const PSYCH_STYLES: Record<string, { bg: string; color: string }> = {
  "良好":     { bg: "rgba(16,185,129,0.1)",  color: "#10b981" },
  "注意観察": { bg: "rgba(234,179,8,0.1)",   color: "#eab308" },
  "要フォロー":{ bg: "rgba(249,115,22,0.1)", color: "#f97316" },
  "緊急対応": { bg: "rgba(239,68,68,0.1)",   color: "#ef4444" },
};

const DIV_COLORS: Record<string, string> = {
  "収束部門": "#ef4444", "工作部門": "#f97316", "外事部門": "#a855f7",
  "港湾部門": "#3b82f6", "支援部門": "#10b981", "外縁部門": "#6b7280",
};

function getDivColor(division: string): string {
  for (const [key, color] of Object.entries(DIV_COLORS)) {
    if (division.includes(key.replace("部門", ""))) return color;
  }
  return "var(--primary)";
}

export default async function PersonnelPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 5) return <LockedContent requiredLevel={5} currentLevel={lvl} pageName="人員ファイル" />;

  const { personnel } = loadJson<{ personnel: Personnel[] }>("personnel-data.json");

  // 部門でグループ化
  const divisionMap = new Map<string, Personnel[]>();
  for (const p of personnel) {
    const base = p.division.split(" ")[0];
    if (!divisionMap.has(base)) divisionMap.set(base, []);
    divisionMap.get(base)!.push(p);
  }

  const psychCounts = {
    良好:     personnel.filter(p => p.psychEval?.status === "良好").length,
    注意観察: personnel.filter(p => p.psychEval?.status === "注意観察").length,
    要フォロー:personnel.filter(p => p.psychEval?.status === "要フォロー").length,
    緊急対応: personnel.filter(p => p.psychEval?.status === "緊急対応").length,
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          PERSONNEL FILES // TOP SECRET // LEVEL 5 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
          人員ファイル
        </h1>
        <p className="font-mono" style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          {personnel.length} 名の機関員が登録されています
        </p>
      </div>

      {/* サマリーカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "総員数",   value: personnel.length,        color: "white" },
          { label: "部門数",   value: divisionMap.size,         color: "var(--primary)" },
          { label: "良好",     value: psychCounts.良好,         color: "#10b981" },
          { label: "注意観察", value: psychCounts.注意観察,     color: "#eab308" },
          { label: "要フォロー",value: psychCounts.要フォロー,  color: "#f97316" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 部門別人員一覧 */}
      {Array.from(divisionMap.entries()).map(([baseDiv, members]) => {
        const divColor = getDivColor(baseDiv);
        return (
          <div key={baseDiv} style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.72rem", color: divColor, letterSpacing: "0.12em" }}>▸ {baseDiv}</div>
              <div style={{ flex: 1, height: "1px", backgroundColor: `${divColor}20` }} />
              <div className="font-mono" style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{members.length}名</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {members.map(person => {
                const dc = getDivColor(person.division);
                const ps = person.psychEval ? (PSYCH_STYLES[person.psychEval.status] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }) : null;

                return (
                  <div key={person.id} className="card" style={{ borderColor: `${dc}20` }}>
                    <div style={{ padding: "1.5rem" }}>

                      {/* 上部ヘッダー行 */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.2rem" }}>
                            <h2 style={{ fontSize: "1.25rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
                              {person.name}
                            </h2>
                            <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{person.rank}</span>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <span className="font-mono" style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700 }}>{person.id}</span>
                            <span className="font-mono" style={{ fontSize: "0.7rem", color: dc }}>{person.division}</span>
                          </div>
                        </div>
                        {ps && person.psychEval && (
                          <div style={{ textAlign: "right" }}>
                            <div className="font-mono" style={{
                              fontSize: "0.65rem", padding: "0.25rem 0.6rem",
                              backgroundColor: ps.bg, color: ps.color, marginBottom: "0.25rem",
                            }}>{person.psychEval.status}</div>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)" }}>
                              評価日: {person.psychEval.lastEval}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 基本情報グリッド */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.25rem",
                        padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {[
                          ["年齢", `${person.age}歳`],
                          ["入局", `${new Date(person.joinDate).getFullYear()}年`],
                          ["在籍", `${new Date().getFullYear() - new Date(person.joinDate).getFullYear()}年目`],
                          ["専門", person.specialization],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>{label}</div>
                            <div style={{ fontSize: "0.78rem", color: "white", fontWeight: 600 }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* 詳細コンテンツ 3カラム */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>

                        {/* 学歴・職歴 */}
                        {person.resume?.education && (
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.5rem" }}>EDUCATION / EXPERIENCE</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              {[...(person.resume.education ?? []), ...(person.resume.experience ?? [])].map((item, i) => (
                                <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                                  <span style={{ color: dc, fontSize: "0.55rem", flexShrink: 0, marginTop: "0.2rem" }}>▸</span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* スキル・実績 */}
                        <div>
                          {person.resume?.skills && person.resume.skills.length > 0 && (
                            <div style={{ marginBottom: "0.75rem" }}>
                              <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.5rem" }}>SKILLS</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                {person.resume.skills.map((s, i) => (
                                  <span key={i} className="font-mono" style={{
                                    fontSize: "0.6rem", padding: "0.15rem 0.4rem",
                                    backgroundColor: `${dc}10`, border: `1px solid ${dc}25`, color: dc,
                                  }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {person.resume?.achievements && person.resume.achievements.length > 0 && (
                            <div>
                              <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.5rem" }}>ACHIEVEMENTS</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                {person.resume.achievements.map((a, i) => (
                                  <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                                    <span style={{ color: "#eab308", fontSize: "0.55rem", flexShrink: 0, marginTop: "0.2rem" }}>★</span>
                                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{a}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 心理評価 */}
                        {person.psychEval && (
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.6rem", color: ps?.color ?? "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                              PSYCH EVAL
                            </div>
                            <div style={{
                              padding: "0.6rem 0.75rem",
                              backgroundColor: `${ps?.color ?? "#fff"}08`,
                              border: `1px solid ${ps?.color ?? "#fff"}20`,
                              borderLeft: `2px solid ${ps?.color ?? "#fff"}`,
                            }}>
                              <div className="font-mono" style={{ fontSize: "0.65rem", color: ps?.color ?? "white", fontWeight: 700, marginBottom: "0.3rem" }}>
                                {person.psychEval.status}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                                {person.psychEval.notes}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 日記エントリ */}
                      {person.diary && person.diary.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.25rem" }}>
                          <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                            PERSONAL LOG // CONFIDENTIAL
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                            {person.diary.map((entry, i) => (
                              <div key={i} style={{
                                padding: "0.75rem",
                                backgroundColor: "rgba(255,255,255,0.015)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderLeft: `2px solid ${dc}40`,
                              }}>
                                <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, marginBottom: "0.35rem" }}>{entry.date}</div>
                                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.7,
                                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as const,
                                }}>{entry.entry}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {personnel.length === 0 && (
        <div className="font-mono" style={{ color: "var(--muted-foreground)", padding: "3rem", textAlign: "center" }}>[データなし]</div>
      )}
    </div>
  );
}
