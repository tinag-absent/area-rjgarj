"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";

interface Notification {
  id: number; type: string; title: string; body: string;
  is_read: number; created_at: string;
}

function NotifIcon({ type, color }: { type: string; color: string }) {
  const p = { width:16, height:16, fill:"none" as const, stroke:color, strokeWidth:"1.8" as const, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (type === "critical") return <svg {...p} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  if (type === "warning")  return <svg {...p} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>;
  if (type === "info")     return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  if (type === "login")    return <svg {...p} viewBox="0 0 24 24"><path d="M12 2L2 9l10 13L22 9z" /><line x1="2" y1="9" x2="22" y2="9" /></svg>;
  if (type === "levelup")  return <svg {...p} viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
  return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
}

const TYPE_META: Record<string, {color:string}> = {
  critical: { color:"#ef4444" },
  warning:  { color:"#f59e0b" },
  info:     { color:"#00d4ff" },
  login:    { color:"#10b981" },
  levelup:  { color:"#ffd740" },
};

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all"|"unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // [AA-005] raw fetch → apiFetch
      const res = await apiFetch("/api/users/me/notifications");
      if (res.ok) setNotifs(await res.json());
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try {
      // [AA-001/AA-005] apiFetch に統一
      await apiFetch("/api/users/me/notifications/read", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ all: true }) });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch { /**/ }
  }

  async function markRead(id: number) {
    try {
      await apiFetch("/api/users/me/notifications/read", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id }) });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch { /**/ }
  }

  const displayed = filter === "unread" ? notifs.filter(n => !n.is_read) : notifs;
  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="animate-fadeIn" style={{ padding:"3rem 1.5rem", maxWidth:"760px", margin:"0 auto" }}>
      <div className="font-mono" style={{ fontSize:"0.7rem", color:"var(--primary)", letterSpacing:"0.15em", marginBottom:"0.5rem" }}>NOTIFICATION CENTER</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"1.5rem" }}>
        <div>
          <h1 style={{ fontSize:"2rem", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:"white" }}>通知</h1>
          <span className="font-mono" style={{ fontSize:"0.75rem", color:"var(--muted-foreground)" }}>未読: {unreadCount}件</span>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="font-mono"
            style={{ fontSize:"0.68rem", padding:"0.35rem 0.875rem", backgroundColor:"transparent", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
            すべて既読にする
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem" }}>
        {(["all","unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="font-mono"
            style={{ fontSize:"0.7rem", padding:"0.35rem 0.875rem",
              backgroundColor: filter===f ? "rgba(0,255,255,0.1)" : "transparent",
              border:`1px solid ${filter===f ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: filter===f ? "var(--primary)" : "rgba(255,255,255,0.5)", cursor:"pointer" }}>
            {f === "all" ? `全て (${notifs.length})` : `未読 (${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding:"3rem", textAlign:"center" }}>
          <span className="font-mono" style={{ color:"var(--muted-foreground)", fontSize:"0.8rem" }}>読み込み中...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding:"3rem", textAlign:"center" }}>
          <span className="font-mono" style={{ color:"var(--muted-foreground)", fontSize:"0.8rem" }}>
            {filter === "unread" ? "未読の通知はありません" : "通知はありません"}
          </span>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {displayed.map(n => {
            const m = TYPE_META[n.type] ?? TYPE_META.info;
            return (
              <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                style={{ padding:"1rem 1.25rem", backgroundColor: n.is_read ? "rgba(255,255,255,0.02)" : "rgba(0,212,255,0.04)", border:`1px solid ${n.is_read ? "rgba(255,255,255,0.06)" : `${m.color}25`}`, borderLeft:`3px solid ${n.is_read ? "rgba(255,255,255,0.08)" : `${m.color}80`}`, cursor: n.is_read ? "default" : "pointer", transition:"all 0.2s", display:"flex", gap:"1rem", alignItems:"flex-start" }}>
                <span style={{ color:m.color, fontSize:"1rem", flexShrink:0, marginTop:"0.1rem" }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.25rem" }}>
                    <span className="font-mono" style={{ fontSize:"0.78rem", color: n.is_read ? "var(--foreground)" : "white", fontWeight: n.is_read ? 400 : 600 }}>{n.title}</span>
                    {!n.is_read && <span style={{ width:"6px", height:"6px", borderRadius:"50%", backgroundColor:m.color, flexShrink:0 }} />}
                  </div>
                  {n.body && <p style={{ fontSize:"0.78rem", color:"var(--muted-foreground)", margin:"0 0 0.4rem", lineHeight:1.6 }}>{n.body}</p>}
                  <span className="font-mono" style={{ fontSize:"0.6rem", color:"#445060" }}>{new Date(n.created_at).toLocaleString("ja-JP")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
