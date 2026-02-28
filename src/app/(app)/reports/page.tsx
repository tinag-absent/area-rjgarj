"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserStore } from "@/store/userStore";
import { apiFetch } from "@/lib/fetch";

interface Report {
  id: string;
  title: string;
  body: string;
  author: string;
  authorId: string;
  severity: "critical" | "warning" | "safe";
  location?: string;
  entityDesc?: string;
  likeCount: number;
  createdAt: string;
}

const SEV_META = {
  critical: { label: "重大",  color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  warning:  { label: "警戒",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  safe:     { label: "観察",  color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ReportsPage() {
  const { user } = useUserStore();
  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [activeTab, setActiveTab]   = useState<"submit" | "list">("submit");
  const [likedIds, setLikedIds]     = useState<Set<string>>(new Set());
  const [severity,   setSeverity]   = useState<"critical" | "warning" | "safe">("warning");
  const [title,      setTitle]      = useState("");
  const [location,   setLocation]   = useState("");
  const [body,       setBody]       = useState("");
  const [entityDesc, setEntityDesc] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) setReports(prev => prev.filter(r => r.id !== id));
    } catch { /* 無視 */ }
  }

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?limit=50");
      const data = await res.json();
      const list: Report[] = (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
        id:         String(p.id),
        title:      String(p.title || "（無題）"),
        body:       String(p.body || ""),
        author:     String(p.authorName || p.author || "匿名機関員"),
        authorId:   String(p.authorId || ""),
        severity:   (["critical","warning","safe"].includes(String(p.severity)) ? p.severity : "safe") as "critical"|"warning"|"safe",
        location:   p.location ? String(p.location) : undefined,
        entityDesc: p.desc     ? String(p.desc)     : undefined,
        likeCount:  Number(p.likeCount || 0),
        createdAt:  String(p.createdAt || p.timestamp || ""),
      }));
      setReports(list);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  async function handleSubmit() {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), body: body.trim(), severity,
          location: location.trim() || null,
          entityDesc: entityDesc.trim() || null,
          author: user?.name || user?.id || "匿名機関員",
        }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setLocation(""); setBody(""); setEntityDesc(""); setSeverity("warning");
      setSubmitted(true);
      await loadReports();
      setTimeout(() => { setSubmitted(false); setActiveTab("list"); }, 1500);
    } catch { /* silent */ } finally { setSubmitting(false); }
  }

  async function handleLike(id: string) {
    if (likedIds.has(id)) return;
    try {
      await apiFetch(`/api/posts/${id}/like`, { method: "POST" });
      setLikedIds(prev => new Set([...prev, id]));
      setReports(prev => prev.map(r => r.id === id ? { ...r, likeCount: r.likeCount + 1 } : r));
    } catch { /* silent */ }
  }

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          INCIDENT REPORT SYSTEM // LEVEL 1 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          インシデントレポート
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          現場報告書の提出・全機関員共有
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["submit", "list"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="font-mono"
            style={{
              fontSize: "0.72rem", padding: "0.4rem 1rem",
              backgroundColor: activeTab === tab ? "rgba(0,255,255,0.1)" : "transparent",
              border: `1px solid ${activeTab === tab ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: activeTab === tab ? "var(--primary)" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 0.2s",
            }}>
            {tab === "submit" ? "▶ 報告書を提出" : `📋 全報告書 (${reports.length})`}
          </button>
        ))}
      </div>

      {activeTab === "submit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {submitted && (
            <div style={{ padding: "0.875rem 1.25rem", backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", borderLeft: "3px solid #10b981" }}>
              <span className="font-mono" style={{ fontSize: "0.75rem", color: "#10b981" }}>
                ✓ 報告書を提出しました。全機関員に共有されます。
              </span>
            </div>
          )}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>脅威レベル</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["safe", "warning", "critical"] as const).map(sev => {
                  const s = SEV_META[sev]; const active = severity === sev;
                  return (
                    <button key={sev} onClick={() => setSeverity(sev)} className="font-mono"
                      style={{ fontSize: "0.7rem", padding: "0.4rem 1rem", backgroundColor: active ? s.bg : "transparent", border: `1px solid ${active ? s.color : "rgba(255,255,255,0.12)"}`, color: active ? s.color : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s", fontWeight: active ? 700 : 400 }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {[
              { label: "報告タイトル *", value: title,      onChange: setTitle,      placeholder: "例：大分市内 空間異常発生" },
              { label: "発生場所",       value: location,   onChange: setLocation,   placeholder: "例：大分市中心部 ○○交差点付近" },
              { label: "関連実体・現象", value: entityDesc, onChange: setEntityDesc, placeholder: "例：E-003 (鏡面侵食体) の可能性" },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: "1rem" }}>
                <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>{field.label}</div>
                <input value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder}
                  style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.12)", color: "white", padding: "0.6rem 0.875rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>報告内容 *</div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="発生状況、実体の挙動、対応内容などを詳細に記載してください..."
                style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.12)", color: "white", padding: "0.6rem 0.875rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", outline: "none", resize: "vertical", lineHeight: 1.65 }} />
            </div>
            <button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || submitting}
              style={{ padding: "0.625rem 1.5rem", backgroundColor: "rgba(0,255,255,0.12)", border: "1px solid rgba(0,255,255,0.45)", color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s", fontWeight: 600, letterSpacing: "0.05em" }}>
              {submitting ? "送信中..." : "▶ 報告書を提出する"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <div>
          {loading ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>読み込み中...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>提出された報告書はありません</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {reports.map(r => {
                const s = SEV_META[r.severity] ?? SEV_META.safe;
                const isLiked = likedIds.has(r.id);
                return (
                  <div key={r.id} className="card" style={{ borderLeft: `3px solid ${s.color}60` }}>
                    <div style={{ padding: "1rem 1.125rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.95rem", color: "white", marginBottom: "0.2rem" }}>{r.title}</div>
                          <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)" }}>
                            {r.authorId} — {r.author} | {r.createdAt ? formatDate(r.createdAt) : "—"}
                          </div>
                        </div>
                        <span className="font-mono" style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", flexShrink: 0, backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}40` }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", lineHeight: 1.65, margin: "0 0 0.6rem", whiteSpace: "pre-wrap" }}>{r.body}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "1rem" }}>
                          {r.location   && <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>📍 {r.location}</span>}
                          {r.entityDesc && <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>⚠ {r.entityDesc}</span>}
                        </div>
                        {user && r.authorId === user.id && (
                          <button onClick={() => handleDelete(r.id)}
                            style={{ background:"transparent", border:"1px solid rgba(239,68,68,0.3)", color:"rgba(239,68,68,0.6)", fontSize:"0.7rem", padding:"0.2rem 0.5rem", cursor:"pointer", fontFamily:"monospace" }}>
                            ✕ 削除
                          </button>
                        )}
                        <button onClick={() => handleLike(r.id)}
                          style={{ background: "none", border: "none", cursor: isLiked ? "default" : "pointer", padding: "2px 6px", fontSize: "0.65rem", color: isLiked ? "#ef4444" : "rgba(255,255,255,0.35)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "4px" }}>
                          {isLiked ? "♥" : "♡"} {r.likeCount}
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
    </div>
  );
}
