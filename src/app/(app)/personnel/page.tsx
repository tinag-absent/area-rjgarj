import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

export const metadata: Metadata = { title: "人員ファイル - 海蝕機関" };

interface Personnel {
  id: string; name: string; division: string; rank: string; age: number;
  joinDate: string; specialization: string;
  psychEval?: { lastEval: string; status: string; notes: string };
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", file), "utf-8")) as T;
}

const PSYCH_STYLES: Record<string, { bg: string; color: string }> = {
  "良好":      { bg: "rgba(16,185,129,0.1)",  color: "#10b981" },
  "注意観察":  { bg: "rgba(234,179,8,0.1)",   color: "#eab308" },
  "要フォロー":{ bg: "rgba(249,115,22,0.1)",  color: "#f97316" },
  "緊急対応":  { bg: "rgba(239,68,68,0.1)",   color: "#ef4444" },
};

const DIV_COLORS: Record<string, string> = {
  "収束部門": "#ef4444", "工作部門": "#f97316", "外事部門": "#a855f7",
  "港湾部門": "#3b82f6", "支援部門": "#10b981", "外事部門": "#6b7280",
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

  const divisionMap = new Map<string, Personnel[]>();
  for (const p of personnel) {
    const base = p.division.split(" ")[0];
    if (!divisionMap.has(base)) divisionMap.set(base, []);
    divisionMap.get(base)!.push(p);
  }

  const psychCounts = {
    良好:      personnel.filter(p => p.psychEval?.status === "良好").length,
    注意観察:  personnel.filter(p => p.psychEval?.status === "注意観察").length,
    要フォロー:personnel.filter(p => p.psychEval?.status === "要フォロー").length,
    緊急対応:  personnel.filter(p => p.psychEval?.status === "緊急対応").length,
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
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

      {/* サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "総員数",    value: personnel.length,        color: "white" },
          { label: "部門数",    value: divisionMap.size,         color: "var(--primary)" },
          { label: "良好",      value: psychCounts.良好,         color: "#10b981" },
          { label: "注意観察",  value: psychCounts.注意観察,     color: "#eab308" },
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
          <div key={baseDiv} style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div className="font-mono" style={{ fontSize: "0.72rem", color: divColor, letterSpacing: "0.12em" }}>▸ {baseDiv}</div>
              <div style={{ flex: 1, height: "1px", backgroundColor: `${divColor}20` }} />
              <div className="font-mono" style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{members.length}名</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {members.map(person => {
                const dc = getDivColor(person.division);
                const ps = person.psychEval ? (PSYCH_STYLES[person.psychEval.status] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }) : null;

                return (
                  <Link key={person.id} href={`/personnel/${person.id}`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{ borderColor: `${dc}18`, cursor: "pointer", transition: "border-color 0.2s" }}>
                      <div style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        {/* 左: 名前・ID・部門 */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "1rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>
                              {person.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{person.rank}</span>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 700 }}>{person.id}</span>
                            <span className="font-mono" style={{ fontSize: "0.68rem", color: dc }}>{person.division}</span>
                          </div>
                        </div>
                        {/* 中: 専門 */}
                        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.1rem" }}>専門</div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>{person.specialization}</div>
                          </div>
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginBottom: "0.1rem" }}>在籍</div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                              {new Date().getFullYear() - new Date(person.joinDate).getFullYear()}年目
                            </div>
                          </div>
                        </div>
                        {/* 右: 心理評価 + 矢印 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {ps && person.psychEval && (
                            <span className="font-mono" style={{
                              fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                              backgroundColor: ps.bg, color: ps.color,
                            }}>
                              {person.psychEval.status}
                            </span>
                          )}
                          <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.2)" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
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
