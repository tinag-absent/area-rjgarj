import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import fs from "fs";
import path from "path";

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
  "良好":      { bg: "rgba(16,185,129,0.1)",  color: "#10b981" },
  "注意観察":  { bg: "rgba(234,179,8,0.1)",   color: "#eab308" },
  "要フォロー":{ bg: "rgba(249,115,22,0.1)",  color: "#f97316" },
  "緊急対応":  { bg: "rgba(239,68,68,0.1)",   color: "#ef4444" },
};

const DIV_COLORS: Record<string, string> = {
  "収束部門": "#ef4444", "工作部門": "#f97316", "外事部門": "#a855f7",
  "港湾部門": "#3b82f6", "支援部門": "#10b981",
};

function getDivColor(division: string): string {
  for (const [key, color] of Object.entries(DIV_COLORS)) {
    if (division.includes(key.replace("部門", ""))) return color;
  }
  return "var(--primary)";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { personnel } = loadJson<{ personnel: Personnel[] }>("personnel-data.json");
  const person = personnel.find(p => p.id === id);
  return { title: person ? `${person.name} - 人員ファイル` : "人員ファイル" };
}

export default async function PersonnelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 5) return <LockedContent requiredLevel={5} currentLevel={lvl} pageName="人員ファイル" />;

  const { personnel } = loadJson<{ personnel: Personnel[] }>("personnel-data.json");
  const person = personnel.find(p => p.id === id);
  if (!person) notFound();

  const dc = getDivColor(person.division);
  const ps = person.psychEval ? (PSYCH_STYLES[person.psychEval.status] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }) : null;

  return (
    <div className="animate-fadeIn" style={{ padding: "2.5rem 1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* 戻るリンク */}
      <Link href="/personnel" style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        color: "rgba(255,255,255,0.4)", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
        marginBottom: "2rem", transition: "color 0.2s",
      }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        人員ファイル一覧に戻る
      </Link>

      {/* ヘッダー */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem", borderColor: `${dc}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.3rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", margin: 0 }}>
                {person.name}
              </h1>
              <span style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>{person.rank}</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>{person.id}</span>
              <span className="font-mono" style={{ fontSize: "0.75rem", color: dc }}>{person.division}</span>
            </div>
          </div>
          {ps && person.psychEval && (
            <div style={{ textAlign: "right" }}>
              <div className="font-mono" style={{ fontSize: "0.68rem", padding: "0.3rem 0.7rem", backgroundColor: ps.bg, color: ps.color, marginBottom: "0.25rem" }}>
                {person.psychEval.status}
              </div>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)" }}>
                評価日: {person.psychEval.lastEval}
              </div>
            </div>
          )}
        </div>

        {/* 基本情報 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginTop: "1.25rem",
          padding: "0.875rem", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            ["年齢", `${person.age}歳`],
            ["入局", `${new Date(person.joinDate).getFullYear()}年`],
            ["在籍", `${new Date().getFullYear() - new Date(person.joinDate).getFullYear()}年目`],
            ["専門", person.specialization],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ fontSize: "0.82rem", color: "white", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細 3カラム */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {/* 学歴・職歴 */}
        {person.resume?.education && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              EDUCATION / EXPERIENCE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {[...(person.resume.education ?? []), ...(person.resume.experience ?? [])].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                  <span style={{ color: dc, fontSize: "0.6rem", flexShrink: 0, marginTop: "0.2rem" }}>▸</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* スキル・実績 */}
        <div className="card" style={{ padding: "1.25rem" }}>
          {person.resume?.skills && person.resume.skills.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.6rem" }}>SKILLS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {person.resume.skills.map((s, i) => (
                  <span key={i} className="font-mono" style={{
                    fontSize: "0.62rem", padding: "0.15rem 0.4rem",
                    backgroundColor: `${dc}10`, border: `1px solid ${dc}25`, color: dc,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {person.resume?.achievements && person.resume.achievements.length > 0 && (
            <div>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: dc, letterSpacing: "0.1em", marginBottom: "0.6rem" }}>ACHIEVEMENTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {person.resume.achievements.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                    <span style={{ color: "#eab308", fontSize: "0.6rem", flexShrink: 0, marginTop: "0.2rem" }}>★</span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 心理評価 */}
        {person.psychEval && ps && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-mono" style={{ fontSize: "0.6rem", color: ps.color, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              PSYCH EVAL
            </div>
            <div style={{
              padding: "0.75rem",
              backgroundColor: `${ps.color}08`,
              border: `1px solid ${ps.color}20`,
              borderLeft: `2px solid ${ps.color}`,
            }}>
              <div className="font-mono" style={{ fontSize: "0.7rem", color: ps.color, fontWeight: 700, marginBottom: "0.4rem" }}>
                {person.psychEval.status}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.65 }}>
                {person.psychEval.notes}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 日記 */}
      {person.diary && person.diary.length > 0 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "1rem" }}>
            PERSONAL LOG // CONFIDENTIAL
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.875rem" }}>
            {person.diary.map((entry, i) => (
              <div key={i} style={{
                padding: "0.875rem",
                backgroundColor: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `2px solid ${dc}40`,
              }}>
                <div className="font-mono" style={{ fontSize: "0.62rem", color: dc, marginBottom: "0.4rem" }}>{entry.date}</div>
                <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", lineHeight: 1.75 }}>{entry.entry}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
