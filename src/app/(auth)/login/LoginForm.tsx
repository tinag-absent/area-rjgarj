"use client";

// ============================================================
// LoginForm.tsx — 海蝕機関 Agent Authentication Terminal
// ============================================================
// v9: メール認証廃止 → 秘密の質問によるアカウント保護に移行
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import type { User } from "@/types/user";

type Tab = "login" | "register" | "recover";
type IdStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const DIVISIONS = [
  { slug: "convergence", name: "収束部門" },
  { slug: "engineering", name: "エンジニアリング部門" },
  { slug: "foreign",     name: "対外部門" },
  { slug: "port",        name: "港湾部門" },
  { slug: "support",     name: "サポート部門" },
] as const;

const SECRET_QUESTIONS = [
  "幼少期に住んでいた街は？",
  "初めて飼ったペットの名前は？",
  "最初に通った学校の名前は？",
  "子供の頃の夢は？",
  "好きな食べ物は？",
  "母親の旧姓は？",
  "入局前の職業は？",
  "思い出の場所は？",
] as const;

const STORAGE_KEY = "kai_saved_agent_id";

// ── Pure helpers ──────────────────────────────────────────────────────────

function formatAgentId(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "K" || upper === "K-") return "K-";
  if (raw === "") return "";
  const body = upper.replace(/^K-?/, "").replace(/[^0-9A-Z]/g, "");
  if (!body) return "K-";
  if (body.length <= 3) return `K-${body}`;
  return `K-${body.slice(0, 3)}-${body.slice(3)}`;
}

function passwordStrength(pw: string): 1 | 2 | 3 | 4 {
  if (pw.length < 8) return 1;
  if (pw.length < 12) return 2;
  if (/[A-Z]/.test(pw) && /[0-9!@#$%^&*]/.test(pw)) return 4;
  return 3;
}

const STR_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"] as const;
const STR_LABEL = [
  "", "8文字以上が必要です", "もう少し長くすると安全です",
  "英大文字・数字を混ぜるとより安全です", "非常に強固なパスキーです",
] as const;

// ── Design tokens ─────────────────────────────────────────────────────────

const T = {
  bg: "#02060d", bg1: "#060d18", bg2: "#091524",
  panel: "rgba(6,13,24,0.95)",
  border: "rgba(0,229,255,0.1)", borderHi: "rgba(0,229,255,0.32)",
  teal: "#00e5ff", tealDim: "rgba(0,229,255,0.65)", tealGlow: "rgba(0,229,255,0.1)",
  amber: "#ff8c00", red: "#ff4444", green: "#00e676",
  muted: "rgba(180,210,230,0.45)", text: "#d0e8f0",
  mono: "'Share Tech Mono','Fira Code',monospace",
  display: "'Oxanium','Share Tech Mono',monospace",
} as const;

// ── Sub-components ────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  ) : (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
  );
}

function CornerBrackets({ color = T.teal, size = 14 }: { color?: string; size?: number }) {
  const w1 = { position:"absolute" as const, background: color, height: 1, width: size };
  const h1 = { position:"absolute" as const, background: color, width: 1, height: size };
  return (
    <>
      <span style={{ position:"absolute", top:0, left:0 }}>
        <span style={{ ...w1, top:0, left:0 }}/><span style={{ ...h1, top:0, left:0 }}/>
      </span>
      <span style={{ position:"absolute", top:0, right:0 }}>
        <span style={{ ...w1, top:0, right:0 }}/><span style={{ ...h1, top:0, right:0 }}/>
      </span>
      <span style={{ position:"absolute", bottom:0, left:0 }}>
        <span style={{ ...w1, bottom:0, left:0 }}/><span style={{ ...h1, bottom:0, left:0 }}/>
      </span>
      <span style={{ position:"absolute", bottom:0, right:0 }}>
        <span style={{ ...w1, bottom:0, right:0 }}/><span style={{ ...h1, bottom:0, right:0 }}/>
      </span>
    </>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"0.38rem" }}>
      <span style={{ fontFamily:T.mono, fontSize:"0.57rem", color:T.tealDim, letterSpacing:"0.18em", textTransform:"uppercase" as const }}>
        {children}
      </span>
      {hint && <span style={{ fontFamily:T.mono, fontSize:"0.52rem", color:T.muted }}>{hint}</span>}
    </div>
  );
}

function TInput({
  value, onChange, placeholder, type="text", maxLength, autoComplete,
  required, suffix, statusColor,
}: {
  value:string; onChange:(v:string)=>void; placeholder?:string; type?:string;
  maxLength?:number; autoComplete?:string; required?:boolean;
  suffix?:React.ReactNode; statusColor?:string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        autoComplete={autoComplete} required={required}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{
          width:"100%",
          background: focused ? "rgba(0,229,255,0.04)" : "rgba(0,10,20,0.55)",
          border:`1px solid ${statusColor ?? (focused ? T.borderHi : T.border)}`,
          borderRadius:"3px", color:T.text,
          fontFamily:T.mono, fontSize:"0.85rem",
          padding: suffix ? "0.55rem 2.5rem 0.55rem 0.75rem" : "0.55rem 0.75rem",
          outline:"none", letterSpacing:"0.04em",
          transition:"border-color 0.15s, background 0.15s",
          boxShadow: focused ? `0 0 0 3px rgba(0,229,255,0.08)` : "none",
        }}
      />
      {suffix && (
        <div style={{ position:"absolute", right:"0.65rem", top:"50%", transform:"translateY(-50%)", color:T.muted, display:"flex", alignItems:"center" }}>
          {suffix}
        </div>
      )}
    </div>
  );
}

function TSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position:"relative" }}>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%",background:"rgba(0,10,20,0.55)",border:`1px solid ${T.border}`,
          color:T.text,fontFamily:T.mono,fontSize:"0.82rem",
          padding:"0.55rem 2.2rem 0.55rem 0.75rem",borderRadius:"3px",
          outline:"none",cursor:"pointer",appearance:"none" as const }}
        onFocus={e=>{e.target.style.borderColor=T.borderHi}}
        onBlur={e=>{e.target.style.borderColor=T.border}}>
        {children}
      </select>
      <span style={{ position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",
        color:T.muted,fontFamily:T.mono,fontSize:"0.58rem",pointerEvents:"none" }}>▾</span>
    </div>
  );
}

function AlertBox({ children, variant="error" }: { children:React.ReactNode; variant?:"error"|"warning"|"info" }) {
  const c = {
    error:   { bg:"rgba(255,68,68,0.07)",  border:"rgba(255,68,68,0.28)",  text:"#ff7070", icon:"▲" },
    warning: { bg:"rgba(255,140,0,0.07)",  border:"rgba(255,140,0,0.28)",  text:T.amber,   icon:"⚠" },
    info:    { bg:"rgba(0,229,255,0.05)",  border:"rgba(0,229,255,0.22)",  text:T.teal,    icon:"◈" },
  }[variant];
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:"3px", padding:"0.65rem 0.875rem", display:"flex", gap:"0.55rem", alignItems:"flex-start", animation:"alertIn 0.18s ease-out" }}>
      <span style={{ fontFamily:T.mono, fontSize:"0.68rem", color:c.text, flexShrink:0 }}>{c.icon}</span>
      <span style={{ fontFamily:T.mono, fontSize:"0.73rem", color:c.text, lineHeight:1.5 }}>{children}</span>
    </div>
  );
}

function SubmitBtn({ children, disabled, loading }: { children:React.ReactNode; disabled?:boolean; loading?:boolean }) {
  const off = disabled || loading;
  return (
    <button type="submit" disabled={!!off}
      style={{
        width:"100%",
        background: off ? "rgba(0,229,255,0.04)" : T.tealGlow,
        border:`1px solid ${off ? "rgba(0,229,255,0.12)" : T.borderHi}`,
        color: off ? T.muted : T.teal,
        fontFamily:T.mono, fontSize:"0.77rem", fontWeight:700,
        letterSpacing:"0.18em", textTransform:"uppercase" as const,
        padding:"0.75rem", borderRadius:"3px",
        cursor: off ? "not-allowed" : "pointer",
        transition:"all 0.15s",
      }}
      onMouseEnter={e=>{ if(!off){ e.currentTarget.style.background="rgba(0,229,255,0.13)"; e.currentTarget.style.boxShadow=`0 0 18px rgba(0,229,255,0.1)`; } }}
      onMouseLeave={e=>{ e.currentTarget.style.background=T.tealGlow; e.currentTarget.style.boxShadow="none"; }}
    >
      {loading ? (
        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
          <span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:T.teal, animation:"blink 0.75s ease-in-out infinite" }}/>
          処理中...
        </span>
      ) : children}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function LoginForm() {
  const router     = useRouter();
  const setUser    = useUserStore(s => s.setUser);
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";

  const [tab, setTab]     = useState<Tab>(searchParams.get("tab") === "register" ? "register" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);

  // Login state
  const [loginId, setLoginId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
  });
  const [loginPw, setLoginPw]         = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe]   = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });

  // Register state
  const [regId, setRegId]         = useState("");
  const [regName, setRegName]     = useState("");
  const [regPw, setRegPw]         = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regDiv, setRegDiv]       = useState("convergence");
  const [regQuestion, setRegQuestion] = useState(SECRET_QUESTIONS[0]);
  const [regAnswer, setRegAnswer]     = useState("");

  const [idStatus, setIdStatus]   = useState<IdStatus>("idle");

  // Recover state
  const [recId, setRecId]               = useState("");
  const [recQuestion, setRecQuestion]   = useState("");
  const [recAnswer, setRecAnswer]       = useState("");
  const [recNewPw, setRecNewPw]         = useState("");
  const [showRecPw, setShowRecPw]       = useState(false);
  const [recStep, setRecStep]           = useState<"id" | "answer">("id");
  const [recDone, setRecDone]           = useState(false);

  // Countdown for rate-limit
  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  // Debounced ID check
  useEffect(() => {
    if (!/^K-\d{3}-\d{3}$/.test(regId)) {
      setIdStatus(regId.length > 3 ? "invalid" : "idle");
      return;
    }
    setIdStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-id?agentId=${encodeURIComponent(regId)}`);
        const data = await res.json();
        setIdStatus(data.available === true ? "available" : "taken");
      } catch { setIdStatus("idle"); }
    }, 480);
    return () => clearTimeout(timer);
  }, [regId]);

  const handleIdInput = useCallback((raw: string, setter: (v: string) => void) => {
    setter(formatAgentId(raw));
  }, []);

  function switchTab(t: Tab) { setTab(t); setError(""); setRecStep("id"); setRecDone(false); }

  // ── Login ─────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (retryAfter > 0) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ agentId: loginId.trim().toUpperCase(), password: loginPw }),
      });
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("Retry-After") ?? "900", 10);
        setRetryAfter(ra);
        setError(`ログイン試行上限。${Math.ceil(ra / 60)}分後に再試行してください。`);
        return;
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "認証に失敗しました。"); return; }
      try {
        if (rememberMe) localStorage.setItem(STORAGE_KEY, loginId.trim().toUpperCase());
        else localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      setUser(data.user as User);
      router.replace("/dashboard");
    } catch { setError("接続エラーが発生しました。"); }
    finally { setLoading(false); }
  }

  // ── Register ──────────────────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (idStatus === "taken" || idStatus === "checking") return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          agentId: regId.trim().toUpperCase(), name: regName.trim(),
          password: regPw, division: regDiv,
          secretQuestion: regQuestion, secretAnswer: regAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました。"); return; }
      // 登録成功 → そのままダッシュボードへ（メール認証不要）
      router.replace("/dashboard?welcome=1");
    } catch { setError("接続エラーが発生しました。"); }
    finally { setLoading(false); }
  }

  // ── Password Recovery ──────────────────────────────────────────────────

  async function handleRecoverStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/auth/secret-question?agentId=${encodeURIComponent(recId.trim().toUpperCase())}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "IDが見つかりません。"); return; }
      setRecQuestion(data.question);
      setRecStep("answer");
    } catch { setError("接続エラーが発生しました。"); }
    finally { setLoading(false); }
  }

  async function handleRecoverStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/secret-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          agentId: recId.trim().toUpperCase(),
          answer: recAnswer.trim(),
          newPassword: recNewPw,
        }),
      });
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("Retry-After") ?? "900", 10);
        setRetryAfter(ra);
        setError(`試行上限。${Math.ceil(ra / 60)}分後に再試行してください。`);
        return;
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "認証に失敗しました。"); return; }
      setRecDone(true);
      // 少し待ってからダッシュボードへ
      setTimeout(() => router.replace("/dashboard"), 1800);
    } catch { setError("接続エラーが発生しました。"); }
    finally { setLoading(false); }
  }

  const strength = passwordStrength(regPw);
  const idStatusColor =
    idStatus === "available" ? "rgba(0,230,118,0.45)" :
    idStatus === "taken"     ? "rgba(255,68,68,0.45)" : undefined;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;600;700;800&family=Share+Tech+Mono&display=swap');
        @keyframes termBoot { 0%{opacity:0;clip-path:inset(50% 0 50% 0)} 65%{opacity:1;clip-path:inset(0% 0 0% 0)} 100%{opacity:1} }
        @keyframes alertIn  { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes scanH    { 0%{transform:translateY(-120%)} 100%{transform:translateY(120vh)} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeSlide{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .kai-wrap { animation: termBoot 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        input::placeholder { color: rgba(180,210,230,0.22) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow:0 0 0 1000px #02060d inset !important;
          -webkit-text-fill-color:#d0e8f0 !important; caret-color:#00e5ff;
        }
        select option { background:#060d18; color:#d0e8f0; }
      `}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        background:`radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,40,70,0.5) 0%, transparent 70%), #02060d` }}>
        <div style={{ position:"absolute", inset:0, opacity:0.055,
          backgroundImage:`linear-gradient(rgba(0,229,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.7) 1px,transparent 1px)`,
          backgroundSize:"48px 48px" }}/>
        <div style={{ position:"absolute", left:0, right:0, height:"1px",
          background:"linear-gradient(90deg,transparent,rgba(0,229,255,0.14),transparent)",
          animation:"scanH 10s linear infinite" }}/>
      </div>

      {/* Top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:10,
        borderBottom:`1px solid rgba(0,229,255,0.08)`,
        background:"rgba(2,6,13,0.85)", backdropFilter:"blur(10px)",
        padding:"0.5rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:T.display, fontSize:"0.68rem", color:T.teal, letterSpacing:"0.28em", fontWeight:700 }}>海蝕機関</span>
        <div style={{ display:"flex", alignItems:"center", gap:"0.45rem" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:T.green, animation:"blink 2.4s ease-in-out infinite" }}/>
          <span style={{ fontFamily:T.mono, fontSize:"0.56rem", color:T.green, letterSpacing:"0.1em" }}>SECURE CONNECTION</span>
        </div>
        <span style={{ fontFamily:T.mono, fontSize:"0.56rem", color:T.muted, letterSpacing:"0.08em" }}>
          {new Date().toLocaleDateString("ja-JP")}
        </span>
      </div>

      {/* Card */}
      <div className="kai-wrap" style={{
        width:"100%", maxWidth:"25.5rem",
        background:T.panel, border:`1px solid ${T.border}`, borderRadius:"4px",
        backdropFilter:"blur(18px)",
        boxShadow:`0 0 0 1px rgba(0,229,255,0.05), 0 32px 64px rgba(0,0,0,0.72), 0 0 60px rgba(0,229,255,0.03)`,
        position:"relative", marginTop:"2.5rem",
      }}>
        <CornerBrackets color={T.teal} size={14}/>

        {/* Header */}
        <div style={{ padding:"1.5rem 1.75rem 1.2rem",
          borderBottom:`1px solid ${T.border}`,
          background:`linear-gradient(135deg, rgba(0,229,255,0.03) 0%, transparent 55%)` }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"0.45rem",
            border:`1px solid rgba(255,140,0,0.35)`, borderRadius:"2px",
            padding:"0.16rem 0.5rem", marginBottom:"1rem" }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:T.amber, display:"inline-block" }}/>
            <span style={{ fontFamily:T.mono, fontSize:"0.48rem", color:T.amber, letterSpacing:"0.2em" }}>CLASSIFIED — INTERNAL USE ONLY</span>
          </div>
          <h1 style={{
            fontFamily:T.display, fontSize:"1.42rem", fontWeight:800,
            letterSpacing:"0.05em", marginBottom:"0.2rem",
            background:`linear-gradient(90deg, #d0e8f0, #00e5ff 55%, #80f0ff)`,
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"shimmer 4s linear infinite",
          }}>機関員認証</h1>
          <p style={{ fontFamily:T.mono, fontSize:"0.6rem", color:T.muted, letterSpacing:"0.13em" }}>
            SEA EROSION AGENCY — AGENT TERMINAL
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
          {([
            { id:"login",    label:"ログイン" },
            { id:"register", label:"新規登録" },
            { id:"recover",  label:"パスキー回復" },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={()=>switchTab(t.id)}
              style={{
                flex:1, padding:"0.72rem 0.3rem", background:"transparent", border:"none",
                borderBottom:`2px solid ${tab===t.id ? T.teal : "transparent"}`,
                color: tab===t.id ? T.teal : T.muted,
                fontFamily:T.mono, fontSize:"0.6rem", letterSpacing:"0.1em",
                textTransform:"uppercase" as const, cursor:"pointer", transition:"all 0.16s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding:"1.4rem 1.75rem" }}>

          {sessionExpired && <div style={{ marginBottom:"1rem" }}><AlertBox variant="warning">セッションの有効期限が切れました。再度ログインしてください。</AlertBox></div>}
          {error && <div style={{ marginBottom:"1rem" }}><AlertBox variant="error">{error}</AlertBox></div>}

          {/* ── Login ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"1rem", animation:"fadeSlide 0.2s ease-out" }}>
              <div>
                <FieldLabel>機関員ID</FieldLabel>
                <TInput value={loginId} onChange={v=>handleIdInput(v,setLoginId)} placeholder="K-XXX-XXX" autoComplete="username" maxLength={9} required/>
                <div style={{ fontFamily:T.mono, fontSize:"0.54rem", color:T.muted, marginTop:"0.28rem" }}>数字を入力すると K-XXX-XXX 形式に自動変換されます</div>
              </div>
              <div>
                <FieldLabel>パスキー</FieldLabel>
                <TInput value={loginPw} onChange={setLoginPw} type={showLoginPw?"text":"password"}
                  placeholder="••••••••" autoComplete="current-password" required
                  suffix={
                    <button type="button" onClick={()=>setShowLoginPw(v=>!v)}
                      style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",padding:0,display:"flex" }}
                      aria-label={showLoginPw?"パスキーを隠す":"パスキーを表示"}>
                      <EyeIcon open={showLoginPw}/>
                    </button>
                  }/>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <input type="checkbox" id="rememberMe" checked={rememberMe}
                  onChange={e=>{ setRememberMe(e.target.checked); if(!e.target.checked){ try{localStorage.removeItem(STORAGE_KEY)}catch{} } }}
                  style={{ width:14,height:14,accentColor:T.teal,cursor:"pointer" }}/>
                <label htmlFor="rememberMe" style={{ fontFamily:T.mono,fontSize:"0.63rem",color:T.muted,cursor:"pointer",userSelect:"none" as const }}>
                  IDを次回も記憶する
                </label>
                <button type="button" onClick={()=>switchTab("recover")}
                  style={{ marginLeft:"auto",background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:T.mono,fontSize:"0.55rem",color:"rgba(0,229,255,0.4)",textDecoration:"underline" }}>
                  パスキー忘れ
                </button>
              </div>
              <SubmitBtn loading={loading} disabled={retryAfter > 0}>
                {retryAfter > 0 ? `再試行まで ${retryAfter}s` : "▶ 認証"}
              </SubmitBtn>
            </form>
          )}

          {/* ── Register ── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} style={{ display:"flex",flexDirection:"column",gap:"1rem",animation:"fadeSlide 0.2s ease-out" }}>
              <div>
                <FieldLabel hint={
                  idStatus==="available" ? "✓ 使用可能" :
                  idStatus==="taken"     ? "✕ 使用済み" :
                  idStatus==="checking"  ? "確認中..." : undefined
                }>機関員ID</FieldLabel>
                <TInput value={regId} onChange={v=>handleIdInput(v,setRegId)} placeholder="K-XXX-XXX"
                  maxLength={9} autoComplete="username" required statusColor={idStatusColor}/>
                <div style={{ fontFamily:T.mono,fontSize:"0.54rem",marginTop:"0.28rem",
                  color: idStatus==="available"?T.green : idStatus==="taken"?"#ff7070" : T.muted }}>
                  {idStatus==="idle"      && "数字6桁を入力 (例: 001234 → K-001-234)"}
                  {idStatus==="checking"  && "IDを確認中..."}
                  {idStatus==="available" && "✓ このIDは使用可能です"}
                  {idStatus==="taken"     && "✕ このIDはすでに使用されています"}
                  {idStatus==="invalid"   && "K-XXX-XXX の形式で入力してください"}
                </div>
              </div>
              <div>
                <FieldLabel>氏名</FieldLabel>
                <TInput value={regName} onChange={setRegName} placeholder="表示名" autoComplete="name" required/>
              </div>
              <div>
                <FieldLabel>パスキー</FieldLabel>
                <TInput value={regPw} onChange={setRegPw} type={showRegPw?"text":"password"}
                  placeholder="••••••••" autoComplete="new-password" required
                  suffix={
                    <button type="button" onClick={()=>setShowRegPw(v=>!v)}
                      style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",padding:0,display:"flex" }}
                      aria-label={showRegPw?"パスキーを隠す":"パスキーを表示"}>
                      <EyeIcon open={showRegPw}/>
                    </button>
                  }/>
                {regPw.length > 0 && (
                  <div style={{ marginTop:"0.45rem" }}>
                    <div style={{ display:"flex",gap:"3px",marginBottom:"0.28rem" }}>
                      {([1,2,3,4] as const).map(lvl=>(
                        <div key={lvl} style={{ flex:1,height:"2px",borderRadius:"2px",
                          background: lvl<=strength ? STR_COLOR[strength] : "rgba(255,255,255,0.08)",
                          transition:"background 0.2s" }}/>
                      ))}
                    </div>
                    <div style={{ fontFamily:T.mono,fontSize:"0.54rem",color:STR_COLOR[strength] }}>{STR_LABEL[strength]}</div>
                  </div>
                )}
              </div>
              <div>
                <FieldLabel>所属部門</FieldLabel>
                <TSelect value={regDiv} onChange={setRegDiv}>
                  {DIVISIONS.map(d=><option key={d.slug} value={d.slug}>{d.name}</option>)}
                </TSelect>
              </div>

              {/* 秘密の質問 */}
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"1rem" }}>
                <div style={{ fontFamily:T.mono,fontSize:"0.52rem",color:T.amber,letterSpacing:"0.12em",marginBottom:"0.75rem" }}>
                  ■ パスキー回復用 — 秘密の質問
                </div>
                <div style={{ marginBottom:"0.75rem" }}>
                  <FieldLabel>質問を選択</FieldLabel>
                  <TSelect value={regQuestion} onChange={setRegQuestion}>
                    {SECRET_QUESTIONS.map(q=><option key={q} value={q}>{q}</option>)}
                  </TSelect>
                </div>
                <div>
                  <FieldLabel>回答</FieldLabel>
                  <TInput value={regAnswer} onChange={setRegAnswer} placeholder="回答を入力（大文字小文字区別なし）" required autoComplete="off"/>
                  <div style={{ fontFamily:T.mono,fontSize:"0.52rem",color:T.muted,marginTop:"0.28rem" }}>
                    パスキーを忘れた際に使用します。正確に覚えておいてください。
                  </div>
                </div>
              </div>

              <SubmitBtn loading={loading} disabled={idStatus==="taken"||idStatus==="checking"}>
                ▶ 登録して参加
              </SubmitBtn>
            </form>
          )}

          {/* ── Recover ── */}
          {tab === "recover" && (
            <>
              {recDone ? (
                <div style={{ textAlign:"center", padding:"0.75rem 0", animation:"fadeSlide 0.25s ease-out" }}>
                  <div style={{ width:52,height:52,borderRadius:"50%",margin:"0 auto 1.2rem",
                    border:`1px solid rgba(0,229,255,0.35)`,display:"flex",alignItems:"center",justifyContent:"center",
                    background:T.tealGlow,boxShadow:`0 0 24px rgba(0,229,255,0.1)` }}>
                    <span style={{ fontFamily:T.mono,fontSize:"1.3rem",color:T.teal }}>✓</span>
                  </div>
                  <h3 style={{ fontFamily:T.display,fontSize:"0.95rem",fontWeight:700,color:T.text,letterSpacing:"0.06em",marginBottom:"0.7rem" }}>
                    パスキーをリセットしました
                  </h3>
                  <p style={{ fontFamily:T.mono,fontSize:"0.7rem",color:T.muted,lineHeight:1.75 }}>
                    ダッシュボードへ移動しています...
                  </p>
                </div>
              ) : recStep === "id" ? (
                <form onSubmit={handleRecoverStep1} style={{ display:"flex",flexDirection:"column",gap:"1rem",animation:"fadeSlide 0.2s ease-out" }}>
                  <div style={{ fontFamily:T.mono,fontSize:"0.65rem",color:T.muted,lineHeight:1.7,marginBottom:"0.25rem" }}>
                    登録時に設定した秘密の質問に回答することで<br/>パスキーをリセットできます。
                  </div>
                  <div>
                    <FieldLabel>機関員ID</FieldLabel>
                    <TInput value={recId} onChange={v=>handleIdInput(v,setRecId)} placeholder="K-XXX-XXX" maxLength={9} required autoComplete="username"/>
                  </div>
                  <SubmitBtn loading={loading}>▶ 質問を取得</SubmitBtn>
                  <button type="button" onClick={()=>switchTab("login")}
                    style={{ background:"none",border:"none",color:T.muted,fontFamily:T.mono,fontSize:"0.62rem",cursor:"pointer",textAlign:"center" as const }}>
                    ← ログインに戻る
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRecoverStep2} style={{ display:"flex",flexDirection:"column",gap:"1rem",animation:"fadeSlide 0.2s ease-out" }}>
                  <div style={{ background:"rgba(0,229,255,0.04)",border:`1px solid ${T.border}`,borderRadius:"3px",padding:"0.75rem",fontFamily:T.mono,fontSize:"0.72rem",color:T.teal }}>
                    ◈ {recQuestion}
                  </div>
                  <div>
                    <FieldLabel>回答</FieldLabel>
                    <TInput value={recAnswer} onChange={setRecAnswer} placeholder="回答を入力" required autoComplete="off"/>
                  </div>
                  <div>
                    <FieldLabel>新しいパスキー</FieldLabel>
                    <TInput value={recNewPw} onChange={setRecNewPw} type={showRecPw?"text":"password"}
                      placeholder="••••••••" required autoComplete="new-password"
                      suffix={
                        <button type="button" onClick={()=>setShowRecPw(v=>!v)}
                          style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",padding:0,display:"flex" }}>
                          <EyeIcon open={showRecPw}/>
                        </button>
                      }/>
                  </div>
                  <SubmitBtn loading={loading} disabled={retryAfter > 0}>
                    {retryAfter > 0 ? `再試行まで ${retryAfter}s` : "▶ パスキーをリセット"}
                  </SubmitBtn>
                  <button type="button" onClick={()=>{ setRecStep("id"); setError(""); }}
                    style={{ background:"none",border:"none",color:T.muted,fontFamily:T.mono,fontSize:"0.62rem",cursor:"pointer",textAlign:"center" as const }}>
                    ← IDの入力に戻る
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"0.6rem 1.75rem",
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontFamily:T.mono,fontSize:"0.5rem",color:"rgba(180,210,230,0.18)",letterSpacing:"0.1em" }}>TLS 1.3 — E2E ENCRYPTED</span>
          <span style={{ fontFamily:T.mono,fontSize:"0.5rem",color:"rgba(180,210,230,0.18)",letterSpacing:"0.1em" }}>v9 BUILD</span>
        </div>
      </div>
    </>
  );
}
