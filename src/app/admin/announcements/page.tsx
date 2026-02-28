"use client";

import { useState, useEffect } from "react";

type Post = { id: string; title: string; body: string; classification: string; created_at: string; author_name: string; };

const S = {
  bg: "#07090f", panel: "#0c1018", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", text: "#cdd6e8", text2: "#7a8aa0",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

export default function AnnouncementsAdminPage() {
  const [posts, setPosts]         = useState<Post[]>([]);
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [classification, setCls]  = useState("UNCLASSIFIED");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]             = useState("");
  const [msgType, setMsgType]     = useState<"ok"|"err">("ok");

  async function load() {
    const r = await fetch("/api/announcements");
    if (r.ok) setPosts(await r.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true); setMsg("");
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, classification }),
      });
      const data = await res.json();
      if (!res.ok) { setMsgType("err"); setMsg(data.error ?? "エラー"); }
      else { setMsgType("ok"); setMsg("投稿しました"); setTitle(""); setBody(""); await load(); }
    } catch { setMsgType("err"); setMsg("通信エラー"); }
    finally { setSubmitting(false); }
  }

  const inputStyle = { background: S.panel, border: `1px solid ${S.border2}`, color: S.text, padding: "8px 12px", fontFamily: S.mono, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" as const };
  const labelStyle = { fontFamily: S.mono, fontSize: 10, color: S.text2, textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 4, display: "block" };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "2rem 1.5rem", fontFamily: S.mono }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: S.cyan, fontSize: 18, fontWeight: 700, marginBottom: "1.5rem", letterSpacing: ".1em" }}>ANNOUNCEMENTS EDITOR</h1>

        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div><label style={labelStyle}>タイトル</label><input value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>分類</label>
              <select value={classification} onChange={e => setCls(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="UNCLASSIFIED">UNCLASSIFIED — 一般</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL — 機密</option>
                <option value="CRITICAL">CRITICAL — 緊急</option>
              </select>
            </div>
            <div><label style={labelStyle}>本文</label><textarea value={body} onChange={e => setBody(e.target.value)} required rows={6} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} /></div>
            {msg && <div style={{ fontSize: 11, color: msgType === "ok" ? "#00e676" : "#ff5252" }}>{msgType === "ok" ? "✓" : "✗"} {msg}</div>}
            <button type="submit" disabled={submitting} style={{ alignSelf: "flex-start", padding: "8px 20px", background: "rgba(0,212,255,0.12)", border: `1px solid ${S.cyan}60`, color: S.cyan, fontFamily: S.mono, fontSize: 12, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
              {submitting ? "投稿中..." : "▶ 投稿する"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {posts.map(p => (
            <div key={p.id} style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span style={{ color: S.text, fontWeight: 600 }}>{p.title}</span>
                <span style={{ fontSize: 10, color: S.text2 }}>{p.classification}</span>
              </div>
              <p style={{ fontSize: 11, color: S.text2, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "0 0 0.4rem" }}>{p.body.slice(0, 120)}{p.body.length > 120 ? "..." : ""}</p>
              <div style={{ fontSize: 10, color: S.text2 }}>{p.author_name} — {new Date(p.created_at).toLocaleString("ja-JP")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
