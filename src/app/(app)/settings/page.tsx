"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { apiFetch } from "@/lib/fetch";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const S = {
  bg: "rgba(0,0,0,0.4)", border: "rgba(255,255,255,0.12)",
  label: { fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:"#7a8aa0", letterSpacing:"0.1em", marginBottom:"0.4rem" } as React.CSSProperties,
  input: { width:"100%", boxSizing:"border-box" as const, backgroundColor:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.12)", color:"white", padding:"0.6rem 0.875rem", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.8rem", outline:"none" } as React.CSSProperties,
  btn: (active=true): React.CSSProperties => ({ padding:"0.6rem 1.5rem", backgroundColor: active ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.04)", border:`1px solid ${active ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.1)"}`, color: active ? "var(--primary)" : "#445060", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", cursor: active ? "pointer" : "not-allowed", transition:"all 0.2s", letterSpacing:"0.05em" }),
};

function Section({ title }: { title: string }) {
  return <div className="font-mono" style={{ fontSize:"0.65rem", color:"#445060", letterSpacing:"0.2em", margin:"2rem 0 1rem", borderBottom:"1px solid rgba(255,255,255,0.06)", paddingBottom:"0.5rem" }}>{title}</div>;
}

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return <p style={{ fontSize:"0.75rem", color: ok ? "#10b981" : "#ef4444", fontFamily:"monospace" }}>{ok ? "✓" : "✗"} {text}</p>;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div style={S.label}>{label}</div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...S.input, paddingRight: "2.5rem" }}
          placeholder="••••••••"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          style={{ position:"absolute", right:"0.75rem", top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", padding:0, display:"flex", alignItems:"center" }}
          tabIndex={-1}>
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

function InstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installMsg, setInstallMsg] = useState<{ok:boolean;text:string}|null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallMsg({ ok:true, text:"インストールが完了しました" });
    } else {
      setInstallMsg({ ok:false, text:"インストールがキャンセルされました" });
    }
    setDeferredPrompt(null);
  }

  return (
    <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
        <div>
          <div style={{ color:"white", fontFamily:"'Space Grotesk',sans-serif", fontSize:"0.95rem", fontWeight:600, marginBottom:"0.3rem" }}>
            アプリをインストール
          </div>
          <div style={{ color:"#7a8aa0", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", lineHeight:1.6 }}>
            ホーム画面に追加してオフラインでも使用できます
          </div>
        </div>
      </div>

      {isInstalled ? (
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", color:"#10b981", fontFamily:"monospace", fontSize:"0.75rem" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          インストール済み
        </div>
      ) : deferredPrompt ? (
        <>
          <button onClick={handleInstall} style={{
            ...S.btn(true),
            display:"flex", alignItems:"center", gap:"0.6rem", width:"fit-content"
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            INSTALL APP
          </button>
          {installMsg && <Msg ok={installMsg.ok} text={installMsg.text} />}
        </>
      ) : (
        <div style={{ color:"#445060", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", lineHeight:1.6 }}>
          このブラウザではインストールプロンプトが未対応、またはすでにインストール済みです。<br />
          ブラウザのメニューから「ホーム画面に追加」を選択してください。
        </div>
      )}
    </div>
  );
}

/* ── パスワード変更申請セクション ── */
type PwRequest = {
  id: string; reason: string; status: string;
  reviewed_by_name: string | null; reviewed_at: string | null;
  reject_reason: string | null; created_at: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: "審査中",   color: "#f59e0b" },
  approved: { label: "承認済み", color: "#10b981" },
  rejected: { label: "却下",     color: "#ef4444" },
};

function PwRequestSection() {
  const [pwTab, setPwTab] = useState<"direct" | "request">("direct");

  // 直接変更
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwMsg,  setPwMsg]  = useState<{ok:boolean;text:string}|null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // 申請
  const [reason,     setReason]     = useState("");
  const [requests,   setRequests]   = useState<PwRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqMsg,     setReqMsg]     = useState<{ok:boolean;text:string}|null>(null);
  const [histLoading, setHistLoading] = useState(true);

  const hasPending = requests.some(r => r.status === "pending");

  async function loadHistory() {
    setHistLoading(true);
    try {
      const res = await fetch("/api/users/me/password-request");
      if (res.ok) setRequests(await res.json());
    } catch { /* noop */ } finally { setHistLoading(false); }
  }

  useEffect(() => { loadHistory(); }, []);

  async function savePassword() {
    setPwMsg(null);
    if (newPw !== confPw)   { setPwMsg({ ok:false, text:"新しいパスワードが一致しません" }); return; }
    if (newPw.length < 8)   { setPwMsg({ ok:false, text:"8文字以上にしてください" }); return; }
    setPwLoading(true);
    try {
      const res = await apiFetch("/api/users/me/password", {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ currentPassword:curPw, newPassword:newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwMsg({ ok:false, text: data.error ?? "エラー" }); return; }
      setPwMsg({ ok:true, text:"パスワードを変更しました" });
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch { setPwMsg({ ok:false, text:"通信エラー" }); }
    finally { setPwLoading(false); }
  }

  async function submitRequest() {
    if (!reason.trim() || reqLoading) return;
    setReqLoading(true); setReqMsg(null);
    try {
      const res = await fetch("/api/users/me/password-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setReqMsg({ ok:false, text: data.error ?? "エラーが発生しました" }); return; }
      setReqMsg({ ok:true, text: data.message });
      setReason("");
      await loadHistory();
    } catch { setReqMsg({ ok:false, text:"通信エラー" }); }
    finally { setReqLoading(false); }
  }

  return (
    <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
      {/* タブ切替 */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:"0.5rem" }}>
        {([["direct", "直接変更"], ["request", "管理者に申請"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setPwTab(id)} style={{
            padding:"0.5rem 1.2rem", background:"none",
            border:"none", borderBottom:`2px solid ${pwTab === id ? "var(--primary)" : "transparent"}`,
            color: pwTab === id ? "var(--primary)" : "#445060",
            fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem",
            cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {/* 直接変更 */}
      {pwTab === "direct" && (
        <>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.68rem", color:"#445060", lineHeight:1.6 }}>
            現在のパスワードを入力して変更できます。パスワードを忘れた場合は「管理者に申請」をご利用ください。
          </div>
          <PwField label="現在のパスワード" value={curPw} onChange={setCurPw} />
          <PwField label="新しいパスワード（8文字以上）" value={newPw} onChange={setNewPw} />
          <PwField label="新しいパスワード（確認）" value={confPw} onChange={setConfPw} />
          {pwMsg && <Msg ok={pwMsg.ok} text={pwMsg.text} />}
          <button onClick={savePassword} disabled={pwLoading || !curPw || !newPw || !confPw} style={S.btn(!pwLoading && !!(curPw && newPw && confPw))}>
            {pwLoading ? "処理中..." : "CHANGE PASSWORD"}
          </button>
        </>
      )}

      {/* 管理者申請 */}
      {pwTab === "request" && (
        <>
          {hasPending ? (
            <div style={{ padding:"0.875rem 1rem", backgroundColor:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", color:"#f59e0b", lineHeight:1.6 }}>
              ⚠ 現在、審査中の申請があります。結果をお待ちください。
            </div>
          ) : (
            <>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.68rem", color:"#445060", lineHeight:1.7 }}>
                パスワードを忘れた場合やリセットが必要な場合は、管理者に申請できます。<br />
                承認されると管理者が設定した新しいパスワードで通知が届きます。
              </div>
              <div>
                <div style={S.label}>申請理由（5文字以上）</div>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                  placeholder="例：パスワードを忘れてしまいました。ログインできない状態です。"
                  style={{ ...S.input, resize:"vertical", lineHeight:1.6 }}
                />
              </div>
              {reqMsg && <Msg ok={reqMsg.ok} text={reqMsg.text} />}
              <button
                onClick={submitRequest}
                disabled={reqLoading || reason.trim().length < 5}
                style={S.btn(!reqLoading && reason.trim().length >= 5)}
              >
                {reqLoading ? "送信中..." : "SUBMIT REQUEST"}
              </button>
            </>
          )}

          {/* 申請履歴 */}
          {requests.length > 0 && (
            <div style={{ marginTop:"0.5rem" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.62rem", color:"#445060", letterSpacing:"0.15em", marginBottom:"0.75rem", paddingTop:"0.75rem", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                申請履歴
              </div>
              {histLoading ? (
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.72rem", color:"#445060" }}>読み込み中...</div>
              ) : requests.map(r => {
                const meta = STATUS_META[r.status] || { label: r.status, color: "#7a8aa0" };
                return (
                  <div key={r.id} style={{ padding:"0.75rem 1rem", backgroundColor:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.07)", marginBottom:"0.5rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color: meta.color, padding:"1px 7px", border:`1px solid ${meta.color}40` }}>
                        {meta.label}
                      </span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.6rem", color:"#445060" }}>
                        {new Date(r.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.7rem", color:"#7a8aa0", marginBottom:"0.25rem" }}>
                      {r.reason}
                    </div>
                    {r.status === "approved" && (
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:"#10b981" }}>
                        ✓ {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("ja-JP") : ""} 承認済み
                      </div>
                    )}
                    {r.status === "rejected" && r.reject_reason && (
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:"#ef4444" }}>
                        ✗ 却下理由: {r.reject_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── メインページ ── */
export default function SettingsPage() {
  const { user, setUser } = useUserStore();

  const [displayName, setDisplayName] = useState("");
  const [profileMsg, setProfileMsg]   = useState<{ok:boolean;text:string}|null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => { if (user) setDisplayName(user.name || ""); }, [user]);

  async function saveProfile() {
    if (!displayName.trim()) return;
    setProfileLoading(true); setProfileMsg(null);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileMsg({ ok:false, text: data.error ?? "エラーが発生しました" }); return; }
      setUser({ ...user!, name: data.name });
      setProfileMsg({ ok:true, text:"プロフィールを更新しました" });
    } catch { setProfileMsg({ ok:false, text:"通信エラーが発生しました" }); }
    finally { setProfileLoading(false); }
  }

  return (
    <div className="animate-fadeIn" style={{ padding:"3rem 1.5rem", maxWidth:"640px", margin:"0 auto" }}>
      <div className="font-mono" style={{ fontSize:"0.7rem", color:"var(--primary)", letterSpacing:"0.15em", marginBottom:"0.5rem" }}>ACCOUNT SETTINGS</div>
      <h1 style={{ fontSize:"2rem", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:"white", marginBottom:"0.5rem" }}>設定</h1>

      {user && (
        <div className="card" style={{ padding:"0.875rem 1.25rem", marginBottom:"0.5rem", display:"flex", gap:"2rem", flexWrap:"wrap" }}>
          <span className="font-mono" style={{ fontSize:"0.72rem", color:"#7a8aa0" }}>AGENT: <span style={{color:"white"}}>{user.id}</span></span>
          <span className="font-mono" style={{ fontSize:"0.72rem", color:"#7a8aa0" }}>ROLE: <span style={{color:"var(--primary)"}}>{user.role.toUpperCase()}</span></span>
          <span className="font-mono" style={{ fontSize:"0.72rem", color:"#7a8aa0" }}>LV: <span style={{color:"white"}}>{user.level}</span></span>
        </div>
      )}

      <Section title="── APP ──────────────────────────" />
      <InstallSection />

      <Section title="── PROFILE ──────────────────────" />
      <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
        <div>
          <div style={S.label}>表示名（Display Name）</div>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={S.input} placeholder="表示名を入力" maxLength={30} />
        </div>
        {profileMsg && <Msg ok={profileMsg.ok} text={profileMsg.text} />}
        <button onClick={saveProfile} disabled={profileLoading || !displayName.trim()} style={S.btn(!profileLoading && !!displayName.trim())}>
          {profileLoading ? "更新中..." : "SAVE PROFILE"}
        </button>
      </div>

      <Section title="── PASSWORD ─────────────────────" />
      <PwRequestSection />
    </div>
  );
}
