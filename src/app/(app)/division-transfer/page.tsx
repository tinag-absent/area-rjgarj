"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { DIVISIONS } from "@/lib/constants";

interface Transfer {
  id: string; status: string; from_division_name: string;
  to_division_name: string; reason: string; created_at: string;
  reviewed_at?: string; reject_reason?: string;
}

const STATUS_META: Record<string, {label:string;color:string}> = {
  pending:  { label:"審査中",   color:"#f59e0b" },
  approved: { label:"承認済み", color:"#10b981" },
  rejected: { label:"却下",     color:"#ef4444" },
};

export default function DivisionTransferPage() {
  const { user } = useUserStore();
  const [toDivision, setToDivision] = useState("");
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState<{ok:boolean;text:string}|null>(null);
  const [history,    setHistory]    = useState<Transfer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"apply"|"history">("apply");

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/division-transfer");
      if (res.ok) setHistory(await res.json());
    } catch { /**/ } finally { setLoading(false); }
  }

  useEffect(() => { loadHistory(); }, []);

  async function handleSubmit() {
    if (!toDivision || submitting) return;
    setSubmitting(true); setMsg(null);
    try {
      const res = await fetch("/api/users/me/division-transfer/submit", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ toDivisionId: toDivision, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok:false, text: data.error ?? "エラーが発生しました" }); return; }
      setMsg({ ok:true, text:"申請を送信しました。管理者の審査をお待ちください。" });
      setToDivision(""); setReason("");
      await loadHistory();
      setTab("history");
    } catch { setMsg({ ok:false, text:"通信エラー" }); }
    finally { setSubmitting(false); }
  }

  const hasPending = history.some(h => h.status === "pending");
  const currentDivision = user?.division || "";

  return (
    <div className="animate-fadeIn" style={{ padding:"3rem 1.5rem", maxWidth:"760px", margin:"0 auto" }}>
      <div className="font-mono" style={{ fontSize:"0.7rem", color:"var(--primary)", letterSpacing:"0.15em", marginBottom:"0.5rem" }}>DIVISION TRANSFER SYSTEM</div>
      <h1 style={{ fontSize:"2rem", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:"white", marginBottom:"0.5rem" }}>部門移動申請</h1>
      <p className="font-mono" style={{ fontSize:"0.8rem", color:"var(--muted-foreground)", marginBottom:"2rem" }}>現在の所属: <span style={{color:"white"}}>{user?.divisionName || "未配属"}</span></p>

      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.5rem" }}>
        {(["apply","history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="font-mono"
            style={{ fontSize:"0.72rem", padding:"0.4rem 1rem",
              backgroundColor: tab===t ? "rgba(0,255,255,0.1)" : "transparent",
              border:`1px solid ${tab===t ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: tab===t ? "var(--primary)" : "rgba(255,255,255,0.5)", cursor:"pointer", transition:"all 0.2s" }}>
            {t === "apply" ? "▶ 申請する" : `📋 申請履歴 (${history.length})`}
          </button>
        ))}
      </div>

      {tab === "apply" && (
        <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {hasPending && (
            <div style={{ padding:"0.75rem 1rem", backgroundColor:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderLeft:"3px solid #f59e0b" }}>
              <span className="font-mono" style={{ fontSize:"0.72rem", color:"#f59e0b" }}>⚠ 審査中の申請があります。完了するまで新規申請はできません。</span>
            </div>
          )}
          <div>
            <div className="font-mono" style={{ fontSize:"0.65rem", color:"#7a8aa0", letterSpacing:"0.1em", marginBottom:"0.4rem" }}>移動先部門 *</div>
            <select value={toDivision} onChange={e => setToDivision(e.target.value)} disabled={hasPending}
              style={{ width:"100%", backgroundColor:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.12)", color:"white", padding:"0.6rem 0.875rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.8rem", outline:"none", cursor:"pointer" }}>
              <option value="">── 部門を選択 ──</option>
              {DIVISIONS.filter(d => d.slug !== currentDivision).map(d => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="font-mono" style={{ fontSize:"0.65rem", color:"#7a8aa0", letterSpacing:"0.1em", marginBottom:"0.4rem" }}>申請理由</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} disabled={hasPending}
              placeholder="移動を希望する理由を記載してください（任意）"
              style={{ width:"100%", boxSizing:"border-box", backgroundColor:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.12)", color:"white", padding:"0.6rem 0.875rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.78rem", outline:"none", resize:"vertical" }} />
          </div>
          {msg && <p style={{ fontSize:"0.75rem", color: msg.ok ? "#10b981" : "#ef4444", fontFamily:"monospace" }}>{msg.ok ? "✓" : "✗"} {msg.text}</p>}
          <button onClick={handleSubmit} disabled={!toDivision || submitting || hasPending}
            style={{ padding:"0.6rem 1.5rem", backgroundColor: toDivision && !hasPending ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.04)", border:`1px solid ${toDivision && !hasPending ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.1)"}`, color: toDivision && !hasPending ? "var(--primary)" : "#445060", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", cursor: toDivision && !hasPending ? "pointer" : "not-allowed", transition:"all 0.2s" }}>
            {submitting ? "送信中..." : "▶ 申請を送信"}
          </button>
        </div>
      )}

      {tab === "history" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          {loading ? (
            <div className="card" style={{ padding:"3rem", textAlign:"center" }}><span className="font-mono" style={{ color:"var(--muted-foreground)", fontSize:"0.8rem" }}>読み込み中...</span></div>
          ) : history.length === 0 ? (
            <div className="card" style={{ padding:"3rem", textAlign:"center" }}><span className="font-mono" style={{ color:"var(--muted-foreground)", fontSize:"0.8rem" }}>申請履歴はありません</span></div>
          ) : history.map(h => {
            const m = STATUS_META[h.status] ?? STATUS_META.pending;
            return (
              <div key={h.id} className="card" style={{ padding:"1.25rem", borderLeft:`3px solid ${m.color}60` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
                  <span className="font-mono" style={{ fontSize:"0.85rem", color:"white" }}>
                    {h.from_division_name || "未配属"} → {h.to_division_name}
                  </span>
                  <span className="font-mono" style={{ fontSize:"0.65rem", padding:"0.2rem 0.6rem", border:`1px solid ${m.color}50`, color:m.color }}>{m.label}</span>
                </div>
                {h.reason && <p style={{ fontSize:"0.78rem", color:"var(--muted-foreground)", marginBottom:"0.5rem" }}>{h.reason}</p>}
                {h.reject_reason && <p style={{ fontSize:"0.75rem", color:"#ef4444", fontFamily:"monospace" }}>却下理由: {h.reject_reason}</p>}
                <div className="font-mono" style={{ fontSize:"0.6rem", color:"#445060" }}>申請日: {new Date(h.created_at).toLocaleString("ja-JP")}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
