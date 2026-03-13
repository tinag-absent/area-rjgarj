import { getDb, query } from "@/lib/db";

type Post = { id: string; title: string; body: string; classification: string; created_at: string; author_name: string; };

const CLASS_META: Record<string, { color: string; label: string }> = {
  UNCLASSIFIED: { color: "#10b981", label: "一般" },
  CONFIDENTIAL: { color: "#f59e0b", label: "機密" },
  CRITICAL:     { color: "#ef4444", label: "緊急" },
};

export default async function AnnouncementsPage() {
  const db = getDb();
  let posts: Post[] = [];
  try {
    posts = await query<Post>(db, `
      SELECT p.id, p.title, p.body, p.classification, p.created_at, u.display_name AS author_name
      FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.is_lore = 1 AND p.status = 'published' AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT 30
    `, []);
  } catch { /* silent */ }

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>OFFICIAL ANNOUNCEMENTS</div>
        <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>機関公式お知らせ</h1>
        <p className="font-mono" style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>管理部から全機関員への公式通知</p>
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>現在お知らせはありません</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {posts.map(p => {
            const cls = CLASS_META[p.classification] ?? CLASS_META.UNCLASSIFIED;
            return (
              <div key={p.id} className="card" style={{ padding: "1.5rem", borderLeft: `3px solid ${cls.color}60` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{p.title}</h2>
                  <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.6rem", flexShrink: 0, marginLeft: "1rem", border: `1px solid ${cls.color}40`, color: cls.color, backgroundColor: `${cls.color}10` }}>{cls.label}</span>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: "1rem" }}>{p.body}</p>
                <div className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>
                  {p.author_name} — {new Date(p.created_at).toLocaleString("ja-JP")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
