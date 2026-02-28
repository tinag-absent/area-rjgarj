"use client";

import { useState, useEffect, useCallback } from "react";

interface Notification {
  id: number; type: string; title: string; body: string;
  is_read: number; created_at: string;
}

const TYPE_META: Record<string, {icon:string;color:string}> = {
  critical: { icon:"⚠", color:"#ef4444" },
  warning:  { icon:"▸", color:"#f59e0b" },
  info:     { icon:"●", color:"#00d4ff" },
  login:    { icon:"◈", color:"#10b981" },
  levelup:  { icon:"★", color:"#ffd740" },
};

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all"|"unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/notifications");
      if (res.ok) setNotifs(await res.json());
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try {
      await fetch("/api/users/me/notifications/read", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ all: true }) });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch { /**/ }
  }

  async function markRead(id: number) {
    try {
      await fetch("/api/users/me/notifications/read", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id }) });
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
