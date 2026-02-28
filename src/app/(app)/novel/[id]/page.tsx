import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Chapter {
  title: string;
  content: string;
}

interface Novel {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  relatedPersonnel?: string[];
  relatedEntities?: string[];
  relatedMissions?: string[];
  securityLevel: number;
  chapters: Chapter[];
}

const CAT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  "作戦記録":     { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "rgb(239,68,68)" },
  "実体接触記録": { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  text: "rgb(16,185,129)" },
  "内部記録":     { bg: "rgba(0,255,255,0.10)",   border: "rgba(0,255,255,0.35)",  text: "var(--primary)" },
  "人物記録":     { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.4)",  text: "rgb(168,85,247)" },
  "個人記録":     { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  text: "rgb(245,158,11)" },
};

const SEC_COLORS: Record<number, string> = { 1: "rgb(16,185,129)", 2: "rgb(245,158,11)", 3: "rgb(239,68,68)" };
const SEC_LABELS: Record<number, string> = { 1: "公開", 2: "機密", 3: "極秘" };

async function loadNovel(id: string): Promise<Novel | null> {
  try {
    const db = getDb();
    const rows = await query<{ data: string }>(db,
      "SELECT data FROM novels_content WHERE id = ? LIMIT 1",
      [id]
    ).catch(() => []);
    if (rows.length > 0) {
      return JSON.parse(rows[0].data) as Novel;
    }
  } catch { /* fall through */ }

  // フォールバック: 静的JSON
  try {
    const { default: data } = await import("../../../../../public/data/novels-data.json");
    const novels = (data as { novels?: Novel[] }).novels ?? [];
    return novels.find(n => n.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const novel = await loadNovel(id);
  return { title: novel ? `${novel.title} - 記録文庫` : "記録文庫" };
}

export default async function NovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="記録文庫" />;

  const novel = await loadNovel(id);
  if (!novel) notFound();

  const isLocked = novel.securityLevel > 1 && lvl < novel.securityLevel + 1;
  const cat = CAT_STYLES[novel.category] ?? CAT_STYLES["内部記録"];
  const secColor = SEC_COLORS[novel.securityLevel] ?? "var(--muted-foreground)";
  const secLabel = SEC_LABELS[novel.securityLevel] ?? "公開";

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "860px", margin: "0 auto" }}>
      {/* 戻るリンク */}
      <Link href="/novel" style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        color: "rgba(255,255,255,0.4)", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
        marginBottom: "2rem", transition: "color 0.2s",
      }}
        className="hover-primary"
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        記録文庫に戻る
      </Link>

      {/* ヘッダーカード */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.5rem", borderColor: cat.border + "40" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <span className="font-mono" style={{
            fontSize: "0.65rem", padding: "0.2rem 0.55rem",
            backgroundColor: cat.bg, border: `1px solid ${cat.border}`, color: cat.text,
          }}>
            {novel.category}
          </span>
          <span className="font-mono" style={{ fontSize: "0.62rem", color: secColor }}>
            ▮ {secLabel}
          </span>
        </div>

        <h1 style={{
          fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700, color: "white", margin: "0 0 0.4rem",
        }}>
          {novel.title}
        </h1>
        {novel.subtitle && (
          <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: "0 0 1rem" }}>
            {novel.subtitle}
          </p>
        )}

        {/* メタ情報 */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
          <span className="font-mono" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
            著: <span style={{ color: "rgba(255,255,255,0.7)" }}>{novel.author}</span>
          </span>
          <span className="font-mono" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
            {novel.date}
          </span>
          <span className="font-mono" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
            {novel.chapters.length} chapters
          </span>
        </div>

        {/* タグ */}
        {novel.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            {novel.tags.map(tag => (
              <span key={tag} className="font-mono" style={{
                fontSize: "0.58rem", padding: "0.1rem 0.4rem",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.4)",
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* サマリー */}
        {!isLocked && (
          <p style={{
            marginTop: "1rem", padding: "0.875rem 1rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "0.25rem",
            fontSize: "0.83rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.7,
          }}>
            {novel.summary}
          </p>
        )}
      </div>

      {/* ロック状態 */}
      {isLocked ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", borderColor: "rgba(239,68,68,0.2)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔒</div>
          <div className="font-mono" style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
            クリアランス不足
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontFamily: "monospace" }}>
            このファイルは機密指定されています
          </div>
        </div>
      ) : (
        /* 章一覧 */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {novel.chapters.map((chapter, idx) => (
            <div key={idx} className="card" style={{ padding: "1.5rem", borderColor: cat.border + "20" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                marginBottom: "1.25rem", paddingBottom: "0.875rem",
                borderBottom: `1px solid ${cat.border}20`,
              }}>
                <span className="font-mono" style={{
                  fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                  backgroundColor: cat.bg, border: `1px solid ${cat.border}`,
                  color: cat.text, flexShrink: 0,
                }}>
                  CH.{String(idx + 1).padStart(2, "0")}
                </span>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "1rem", fontWeight: 700, color: "white", margin: 0,
                }}>
                  {chapter.title}
                </h2>
              </div>

              <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", lineHeight: 2 }}>
                {chapter.content.split("\n").map((line, lineIdx) => (
                  line.trim() === "" ? (
                    <br key={lineIdx} />
                  ) : (
                    <p key={lineIdx} style={{ margin: "0 0 0.5rem" }}>{line}</p>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 関連情報 */}
      {!isLocked && (novel.relatedPersonnel?.length || novel.relatedEntities?.length || novel.relatedMissions?.length) ? (
        <div className="card" style={{ padding: "1.25rem", marginTop: "1.5rem", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "0.875rem" }}>
            RELATED RECORDS
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {novel.relatedPersonnel?.length ? (
              <div>
                <div className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.35rem" }}>人員</div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {novel.relatedPersonnel.map(p => (
                    <span key={p} className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "0.15rem 0.4rem" }}>{p}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {novel.relatedEntities?.length ? (
              <div>
                <div className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.35rem" }}>実体</div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {novel.relatedEntities.map(e => (
                    <span key={e} className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "0.15rem 0.4rem" }}>{e}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
