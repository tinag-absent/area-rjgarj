import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "記録文庫 - 海蝕機関" };

async function loadNovelsData(userLevel: number, userFlags: string[]) {
  const now = new Date().toISOString();
  
  try {
    // DBから取得
    const db = getDb();
    const rows = await query<{ id: string; data: string }>(db,
      "SELECT id, data FROM novels_content ORDER BY rowid ASC"
    ).catch(() => []);
    
    if (rows.length > 0) {
      const novels = rows.map(r => {
        try { return JSON.parse(r.data) as Novel & { publishAt?: string; requiredFlag?: string; requiredLevel?: number }; }
        catch { return null; }
      }).filter(Boolean) as (Novel & { publishAt?: string; requiredFlag?: string; requiredLevel?: number })[];
      
      // フィルタリング: publishAt・requiredFlag・requiredLevel
      return novels.filter(n => {
        if (n.requiredLevel && userLevel < n.requiredLevel) return false;
        if (n.publishAt && n.publishAt > now) return false;
        if (n.requiredFlag && !userFlags.includes(n.requiredFlag)) return false;
        return true;
      });
    }
  } catch { /* fall through */ }
  
  // フォールバック: 静的JSON
  try {
    const { default: data } = await import("../../../../public/data/novels-data.json");
    return (data as { novels?: Novel[] }).novels ?? [];
  } catch {
    return [];
  }
}

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

export default async function NovelPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  const userId = h.get("x-user-id") ?? "";
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="記録文庫" />;

  // ユーザーフラグを取得してフィルタリングに使う
  let userFlags: string[] = [];
  try {
    const db = getDb();
    const flagRows = await query<{ flag_key: string }>(db,
      `SELECT flag_key FROM progress_flags WHERE user_id = (SELECT id FROM users WHERE username = ? LIMIT 1)`,
      [userId]
    ).catch(() => []);
    userFlags = flagRows.map(f => f.flag_key);
  } catch { /* silent */ }

  const novels = await loadNovelsData(lvl, userFlags);

  // Group by category
  const categories = Array.from(new Set(novels.map(n => n.category)));
  const catCounts = Object.fromEntries(categories.map(c => [c, novels.filter(n => n.category === c).length]));

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          ARCHIVE // LEVEL 1 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          記録文庫
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          {novels.length} 件の記録が保管されています
        </p>
      </div>

      {/* Category filter display */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
        <span className="font-mono" style={{
          fontSize: "0.7rem", padding: "0.25rem 0.75rem",
          backgroundColor: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.4)",
          color: "var(--primary)",
        }}>
          ALL ({novels.length})
        </span>
        {categories.map(cat => {
          const s = CAT_STYLES[cat] ?? CAT_STYLES["内部記録"];
          return (
            <span key={cat} className="font-mono" style={{
              fontSize: "0.7rem", padding: "0.25rem 0.75rem",
              backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text,
            }}>
              {cat} ({catCounts[cat]})
            </span>
          );
        })}
      </div>

      {/* Novels grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
        {novels.map((novel) => {
          const cat = CAT_STYLES[novel.category] ?? CAT_STYLES["内部記録"];
          const secColor = SEC_COLORS[novel.securityLevel] ?? "var(--muted-foreground)";
          const secLabel = SEC_LABELS[novel.securityLevel] ?? "公開";
          const isLocked = novel.securityLevel > 1 && lvl < novel.securityLevel + 1;

          return (
            <div
              key={novel.id}
              className="card"
              style={{
                position: "relative", overflow: "hidden",
                opacity: isLocked ? 0.5 : 1,
                cursor: isLocked ? "not-allowed" : "default",
              }}
            >
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Category + security */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                {/* Title + subtitle */}
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "white", margin: "0 0 0.25rem" }}>
                    {novel.title}
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>
                    {novel.subtitle}
                  </p>
                </div>

                {/* Summary */}
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0, flex: 1 }}>
                  {isLocked ? "[クリアランス不足 — このファイルは機密指定されています]" : novel.summary}
                </p>

                {/* Footer: tags + chapter count + author */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {novel.tags.slice(0, 3).map(tag => (
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
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>
                      {novel.chapters.length} ch.
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
                      著: {novel.author}
                    </span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
                      {novel.date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div style={{ height: "2px", background: `linear-gradient(90deg, ${cat.border}, transparent)` }} />
            </div>
          );
        })}
        {novels.length === 0 && (
          <div className="font-mono" style={{ color: "var(--muted-foreground)", padding: "3rem", textAlign: "center", gridColumn: "1/-1" }}>
            [データなし]
          </div>
        )}
      </div>
    </div>
  );
}
