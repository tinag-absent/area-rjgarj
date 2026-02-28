"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserStore } from "@/store/userStore";
import { apiFetch } from "@/lib/fetch";

interface Post {
  id: string; title: string; body: string;
  authorName: string; authorId: string;
  severity: string; location?: string; likeCount: number;
  createdAt: string; isLore?: boolean;
}

const SEV_META = {
  critical: { label: "重大", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  warning:  { label: "警戒", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  safe:     { label: "通常", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function BulletinPage() {
  const { user } = useUserStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterSev, setFilterSev] = useState<string>("all");

  // form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("safe");
  const [location, setLocation] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?limit=100");
      const data = await res.json();
      const list: Post[] = (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
        id: String(p.id),
        title: String(p.title || "（無題）"),
        body: String(p.body || ""),
        authorName: String(p.authorName || p.author || "匿名機関員"),
        authorId: String(p.authorId || ""),
        severity: ["critical","warning","safe"].includes(String(p.severity)) ? String(p.severity) : "safe",
        location: p.location ? String(p.location) : undefined,
        likeCount: Number(p.likeCount || 0),
        createdAt: String(p.createdAt || ""),
        isLore: Boolean(p.isLore),
      }));
      setPosts(list);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = filterSev === "all" ? posts : posts.filter(p => p.severity === filterSev);

  async function handleSubmit() {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), severity, location: location.trim() || null, author: user?.name || user?.id || "匿名機関員" }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setBody(""); setSeverity("safe"); setLocation("");
      setSubmitted(true);
      await loadPosts();
      setTimeout(() => { setSubmitted(false); setActiveTab("list"); }, 1500);
    } catch { /* silent */ } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== id));
    } catch { /* 無視 */ }
  }

  async function handleLike(id: string) {
    if (likedIds.has(id)) return;
    try {
      await apiFetch(`/api/posts/${id}/like`, { method: "POST" });
      setLikedIds(prev => new Set([...prev, id]));
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likeCount: p.likeCount + 1 } : p));
    } catch { /* silent */ }
  }

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          BULLETIN BOARD // KAISHOKU AGENCY
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          掲示板
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          機関員による情報共有・連絡掲示板
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["list", "create"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="font-mono"
            style={{ fontSize: "0.72rem", padding: "0.4rem 1rem", backgroundColor: activeTab === tab ? "rgba(0,255,255,0.1)" : "transparent", border: `1px solid ${activeTab === tab ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}`, color: activeTab === tab ? "var(--primary)" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }}>
            {tab === "list" ? `📋 投稿一覧 (${posts.length})` : "▶ 新規投稿"}
          </button>
        ))}
      </div>

      {/* List tab */}
      {activeTab === "list" && (
        <div>
          {/* Severity filter */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
            <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>フィルター:</span>
            {(["all", "critical", "warning", "safe"] as const).map(s => (
              <button key={s} onClick={() => setFilterSev(s)} className="font-mono"
                style={{
                  fontSize: "0.65rem", padding: "0.2rem 0.7rem",
                  backgroundColor: filterSev === s ? (s === "all" ? "rgba(255,255,255,0.1)" : SEV_META[s]?.bg ?? "rgba(255,255,255,0.1)") : "transparent",
                  border: `1px solid ${filterSev === s ? (s === "all" ? "rgba(255,255,255,0.4)" : SEV_META[s]?.color ?? "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.12)"}`,
                  color: filterSev === s ? (s === "all" ? "white" : SEV_META[s]?.color ?? "white") : "rgba(255,255,255,0.4)",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                {s === "all" ? "全件" : SEV_META[s].label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>読み込み中...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>投稿がありません</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {filtered.map(p => {
                const s = SEV_META[p.severity as keyof typeof SEV_META] ?? SEV_META.safe;
                const isLiked = likedIds.has(p.id);
                return (
                  <div key={p.id} className="card" style={{ borderLeft: `3px solid ${s.color}60` }}>
                    <div style={{ padding: "1rem 1.25rem" }}>
                      {p.isLore && (
                        <div className="font-mono" style={{ fontSize: "0.6rem", color: "#8b5cf6", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>◈ LORE DOCUMENT</div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.95rem", color: "white", marginBottom: "0.2rem" }}>{p.title}</div>
                          <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)" }}>
                            {p.authorId} — {p.authorName} | {p.createdAt ? fmtDate(p.createdAt) : "—"}
                          </div>
                        </div>
                        <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", flexShrink: 0, backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}40` }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", lineHeight: 1.65, margin: "0 0 0.6rem", whiteSpace: "pre-wrap" }}>{p.body}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          {p.location && <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>📍 {p.location}</span>}
                        </div>
                        {user && p.authorId === user.id && (
                          <button onClick={() => handleDelete(p.id)}
                            style={{ background:"transparent", border:"1px solid rgba(239,68,68,0.3)", color:"rgba(239,68,68,0.6)", fontSize:"0.7rem", padding:"0.2rem 0.5rem", cursor:"pointer", fontFamily:"monospace" }}>
                            ✕ 削除
                          </button>
                        )}
                        <button onClick={() => handleLike(p.id)}
                          style={{ background: "none", border: "none", cursor: isLiked ? "default" : "pointer", padding: "2px 6px", fontSize: "0.65rem", color: isLiked ? "#ef4444" : "rgba(255,255,255,0.35)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "4px" }}>
                          {isLiked ? "♥" : "♡"} {p.likeCount}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create tab */}
      {activeTab === "create" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {submitted && (
            <div style={{ padding: "0.875rem 1.25rem", backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", borderLeft: "3px solid #10b981" }}>
              <span className="font-mono" style={{ fontSize: "0.75rem", color: "#10b981" }}>✓ 投稿しました。</span>
            </div>
          )}
          <div className="card" style={{ padding: "1.5rem" }}>
            {/* Severity */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>カテゴリー</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["safe", "warning", "critical"] as const).map(sev => {
                  const sm = SEV_META[sev]; const active = severity === sev;
                  return (
                    <button key={sev} onClick={() => setSeverity(sev)} className="font-mono"
                      style={{ fontSize: "0.7rem", padding: "0.4rem 1rem", backgroundColor: active ? sm.bg : "transparent", border: `1px solid ${active ? sm.color : "rgba(255,255,255,0.12)"}`, color: active ? sm.color : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s", fontWeight: active ? 700 : 400 }}>
                      {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {[
              { label: "タイトル *", value: title, onChange: setTitle, placeholder: "投稿タイトル" },
              { label: "場所（任意）", value: location, onChange: setLocation, placeholder: "関連する場所" },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: "1rem" }}>
                <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>{field.label}</div>
                <input value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder}
                  style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.12)", color: "white", padding: "0.6rem 0.875rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>本文 *</div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="内容を入力してください..."
                style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.12)", color: "white", padding: "0.6rem 0.875rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", outline: "none", resize: "vertical", lineHeight: 1.65 }} />
            </div>
            <button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || submitting}
              style={{ padding: "0.625rem 1.5rem", backgroundColor: "rgba(0,255,255,0.12)", border: "1px solid rgba(0,255,255,0.45)", color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s", fontWeight: 600, letterSpacing: "0.05em", opacity: (!title.trim() || !body.trim() || submitting) ? 0.5 : 1 }}>
              {submitting ? "送信中..." : "▶ 投稿する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
