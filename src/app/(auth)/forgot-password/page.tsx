"use client";

import { useState } from "react";
import Link from "next/link";

const DIVISIONS = [
  { slug: "convergence", name: "収束部門" },
  { slug: "engineering", name: "工作部門" },
  { slug: "foreign",     name: "外事部門" },
  { slug: "port",        name: "港湾部門" },
  { slug: "support",     name: "支援部門" },
];

/* ── スタイル定数 ── */
const card: React.CSSProperties = {
  width: "100%", maxWidth: "28rem",
  backgroundColor: "rgba(0,0,0,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.75rem",
  backdropFilter: "blur(10px)",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
  overflow: "hidden",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.875rem",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.375rem", color: "white",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.875rem", outline: "none",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem", color: "var(--muted-foreground)",
  display: "block", marginBottom: "0.4rem",
  textTransform: "uppercase", letterSpacing: "0.1em",
  fontFamily: "'JetBrains Mono', monospace",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem",
  background: "rgba(0,255,255,0.1)",
  border: "1px solid rgba(0,255,255,0.4)",
  borderRadius: "0.375rem", color: "var(--primary)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.85rem", letterSpacing: "0.05em",
  cursor: "pointer", transition: "all 0.2s",
};
const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  opacity: 0.4, cursor: "not-allowed",
};

// ステップ定義（メール認証を追加）
type Step = "id" | "verify" | "email" | "request" | "done";

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "id",      label: "ID確認" },
    { key: "verify",  label: "本人確認" },
    { key: "email",   label: "メール認証" },
    { key: "request", label: "申請" },
    { key: "done",    label: "完了" },
  ];
  const idx = steps.findIndex(s => s.key === current);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "1rem 1.5rem 0" }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: "bold",
            background: i < idx ? "rgba(0,255,255,0.3)" : i === idx ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${i <= idx ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: i <= idx ? "var(--primary)" : "rgba(255,255,255,0.3)",
          }}>
            {i < idx ? "✓" : i + 1}
          </div>
          <div style={{ marginLeft: 6 }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: i === idx ? "var(--primary)" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
              {s.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < idx ? "rgba(0,255,255,0.3)" : "rgba(255,255,255,0.08)", margin: "0 8px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function formatAgentId(raw: string): string {
  const upper = raw.toUpperCase();
  if (/^[A-Z]-[0-9A-Z]{1,3}-[0-9A-Z]*$/.test(upper)) return upper;
  if (/^[A-Z]-?$/.test(upper)) return upper.charAt(0) + "-";
  if (raw === "") return "";
  const prefix = /^[A-Z]/.test(upper) ? upper.charAt(0) : null;
  if (!prefix) return upper.charAt(0) ? upper.charAt(0) : "";
  const body = upper.slice(1).replace(/^-?/, "").replace(/[^0-9A-Z]/g, "");
  if (body.length === 0) return `${prefix}-`;
  if (body.length <= 3) return `${prefix}-${body}`;
  return `${prefix}-${body.slice(0, 3)}-${body.slice(3)}`;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // step: id
  const [agentId, setAgentId] = useState("");

  // step: verify
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [division, setDivision]       = useState("convergence");
  const [maskedEmail, setMaskedEmail] = useState("");

  // step: email（メール認証）
  const [emailCode, setEmailCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // step: request
  const [reason, setReason] = useState("");

  function startResendCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleLookup() {
    if (!agentId.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/identity-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "lookup", agentId: agentId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }
      setStep("verify");
    } catch { setError("通信エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    if (!displayName.trim() || !email.trim() || !division) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/identity-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", agentId, displayName, email, divisionSlug: division }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "入力情報が一致しません"); return; }
      setMaskedEmail(data.maskedEmail ?? "");
      startResendCooldown();
      setStep("email");
    } catch { setError("通信エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleEmailVerify() {
    if (emailCode.trim().length !== 6) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/identity-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "email", agentId, emailCode: emailCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "認証コードが正しくありません"); return; }
      setVerifyToken(data.verifyToken);
      setStep("request");
    } catch { setError("通信エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/identity-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", agentId, displayName, email, divisionSlug: division }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }
      setEmailCode("");
      startResendCooldown();
    } catch { setError("通信エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleRequest() {
    if (reason.trim().length < 5) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/identity-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "request", verifyToken, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "エラーが発生しました"); return; }
      setStep("done");
    } catch { setError("通信エラーが発生しました"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1rem" }}>
      <div style={card}>

        {/* ヘッダー */}
        <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
          <div style={{
            margin: "0 auto 0.875rem", width: "2.75rem", height: "2.75rem",
            backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <svg width="22" height="22" fill="none" stroke="var(--primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", letterSpacing: "0.08em", margin: 0 }}>
            パスキー再設定申請
          </h2>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.25rem", letterSpacing: "0.05em" }}>
            本人確認・メール認証後、管理者に申請します
          </p>
        </div>

        <StepIndicator current={step} />

        <div style={{ padding: "1.5rem" }}>

          {/* エラー表示 */}
          {error && (
            <div style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "0.375rem", marginBottom: "1rem",
              color: "#ef4444", fontSize: "0.8rem",
              fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* ── STEP 1: ID入力 ── */}
          {step === "id" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem 1rem", background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)", borderRadius: "0.375rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                登録時の情報で本人確認を行います。<br />
                確認後、登録メールアドレスに認証コードを送信します。
              </div>
              <div>
                <label style={labelStyle}>機関員ID</label>
                <input
                  value={agentId}
                  onChange={e => setAgentId(formatAgentId(e.target.value))}
                  placeholder="X-XXX-XXX"
                  maxLength={9}
                  style={inputStyle}
                  onKeyDown={e => e.key === "Enter" && handleLookup()}
                />
              </div>
              <button onClick={handleLookup} disabled={loading || !agentId.trim()} style={loading || !agentId.trim() ? btnDisabled : btnPrimary}>
                {loading ? "確認中..." : "次へ →"}
              </button>
            </div>
          )}

          {/* ── STEP 2: 本人確認 ── */}
          {step === "verify" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem 1rem", background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)", borderRadius: "0.375rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                <span style={{ color: "var(--primary)" }}>{agentId}</span> の登録情報を入力してください。<br />
                3項目すべてが一致した場合のみ、登録メールに認証コードを送信します。
              </div>

              <div>
                <label style={labelStyle}>登録時の表示名（氏名）</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="登録した表示名"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>登録時のメールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>所属部門</label>
                <select
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {DIVISIONS.map(d => (
                    <option key={d.slug} value={d.slug}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => { setStep("id"); setError(""); }} style={{
                  flex: 1, padding: "0.7rem",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.375rem", color: "rgba(255,255,255,0.4)",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem",
                  cursor: "pointer",
                }}>← 戻る</button>
                <button
                  onClick={handleVerify}
                  disabled={loading || !displayName.trim() || !email.trim()}
                  style={{ flex: 2, ...(loading || !displayName.trim() || !email.trim() ? btnDisabled : btnPrimary) }}
                >
                  {loading ? "照合中..." : "本人確認 →"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: メール認証コード入力 ── */}
          {step === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem 1rem", background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)", borderRadius: "0.375rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                ✉ 登録メールアドレス{maskedEmail ? ` (${maskedEmail})` : ""} に<br />
                6桁の認証コードを送信しました。<br />
                <span style={{ color: "rgba(255,255,255,0.3)" }}>コードの有効期限は10分です。</span>
              </div>

              <div>
                <label style={labelStyle}>認証コード（6桁）</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="000000"
                  style={{
                    ...inputStyle,
                    fontSize: "1.5rem",
                    letterSpacing: "0.4em",
                    textAlign: "center",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleEmailVerify()}
                />
              </div>

              <button
                onClick={handleEmailVerify}
                disabled={loading || emailCode.trim().length !== 6}
                style={loading || emailCode.trim().length !== 6 ? btnDisabled : btnPrimary}
              >
                {loading ? "確認中..." : "コードを確認 →"}
              </button>

              <div style={{ textAlign: "center" }}>
                <button
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: "none", border: "none", cursor: resendCooldown > 0 ? "default" : "pointer",
                    fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                    color: resendCooldown > 0 ? "rgba(255,255,255,0.2)" : "rgba(0,255,255,0.5)",
                    padding: 0,
                  }}
                >
                  {resendCooldown > 0 ? `再送信まで ${resendCooldown}秒` : "コードを再送信"}
                </button>
              </div>

              <button
                onClick={() => { setStep("verify"); setError(""); setEmailCode(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.25)", padding: 0, marginTop: "-0.5rem",
                }}
              >
                ← 本人確認に戻る
              </button>
            </div>
          )}

          {/* ── STEP 4: 申請理由 ── */}
          {step === "request" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem 1rem", background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: "0.375rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "#00e676", lineHeight: 1.7 }}>
                ✓ メール認証が完了しました。<br />
                <span style={{ color: "rgba(255,255,255,0.4)" }}>申請理由を入力して送信してください。管理者が確認後、新しいパスキーを設定します。</span>
              </div>
              <div>
                <label style={labelStyle}>申請理由（5文字以上）</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                  placeholder="例：パスワードを忘れてしまいログインできない状態です。"
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: reason.trim().length >= 5 ? "#00e676" : "rgba(255,255,255,0.3)", marginTop: "0.25rem" }}>
                  {reason.trim().length} 文字
                </div>
              </div>
              <button
                onClick={handleRequest}
                disabled={loading || reason.trim().length < 5}
                style={loading || reason.trim().length < 5 ? btnDisabled : btnPrimary}
              >
                {loading ? "送信中..." : "申請を送信"}
              </button>
            </div>
          )}

          {/* ── STEP 5: 完了 ── */}
          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto", background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" fill="none" stroke="#00e676" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "1rem", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "white", marginBottom: "0.5rem" }}>
                  申請を受け付けました
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
                  管理者が内容を確認し、新しいパスキーを設定します。<br />
                  承認されるとサイト内の通知でお知らせします。<br />
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.25)" }}>※ しばらく時間がかかる場合があります</span>
                </div>
              </div>
              <Link href="/login" style={{
                display: "block", padding: "0.7rem",
                background: "rgba(0,255,255,0.08)",
                border: "1px solid rgba(0,255,255,0.25)",
                borderRadius: "0.375rem",
                color: "var(--primary)",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem",
                textDecoration: "none", textAlign: "center",
                letterSpacing: "0.05em",
              }}>
                ← ログイン画面に戻る
              </Link>
            </div>
          )}

          {/* ログインに戻るリンク（完了以外） */}
          {step !== "done" && (
            <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
              <Link href="/login" style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                color: "rgba(255,255,255,0.25)", textDecoration: "none",
                transition: "color 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >
                ← ログイン画面に戻る
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
