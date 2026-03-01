"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import type { User } from "@/types/user";

type Tab = "login" | "register";

const DIVISIONS = [
  { slug: "convergence", name: "収束部門" },
  { slug: "engineering", name: "エンジニアリング部門" },
  { slug: "foreign", name: "対外部門" },
  { slug: "port", name: "港湾部門" },
  { slug: "support", name: "サポート部門" },
];

const STORAGE_KEY = "kai_saved_credentials";

/** K-XXX-XXXXXX 形式に自動フォーマットする（英数字対応） */
function formatAgentId(raw: string): string {
  const upper = raw.toUpperCase();
  // すでに K-XXX-... 形式なら末尾を大文字化してそのまま返す
  if (/^K-[0-9A-Z]{1,3}-[0-9A-Z]*$/.test(upper)) return upper;
  // "K-" のみの入力はそのまま
  if (upper === "K-" || upper === "K") return "K-";
  if (raw === "") return "";
  // K- プレフィックスを除いた英数字を抽出
  const body = upper.replace(/^K-?/, "").replace(/[^0-9A-Z]/g, "");
  if (body.length === 0) return "K-";
  if (body.length <= 3) return `K-${body}`;
  return `K-${body.slice(0, 3)}-${body.slice(3)}`;
}

/** パスワード強度を1〜4で返す */
function passwordStrength(pw: string): number {
  if (pw.length < 8) return 1;
  if (pw.length < 12) return 2;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 4;
  return 3;
}

const STRENGTH_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
const STRENGTH_LABEL = ["", "8文字以上必要です", "もう少し長くすると安全です", "英大文字・数字を混ぜるとより安全です", "非常に強力なパスキーです"];

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register form
  const [regId, setRegId] = useState("");
  const [regName, setRegName] = useState("");
  const [regPw, setRegPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regDiv, setRegDiv] = useState("convergence");

  // IDの重複チェック状態
  type IdStatus = "idle" | "checking" | "available" | "taken" | "invalid";
  const [idStatus, setIdStatus] = useState<IdStatus>("idle");

  // デバウンス付きIDチェック
  useEffect(() => {
    const ID_REGEX = /^K-\d{3}-\d{3}$/;
    if (!ID_REGEX.test(regId)) {
      setIdStatus(regId.length > 0 ? "invalid" : "idle");
      return;
    }
    setIdStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-id?agentId=${encodeURIComponent(regId)}`);
        const data = await res.json();
        setIdStatus(data.available === true ? "available" : "taken");
      } catch {
        setIdStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [regId]);

  // 保存済み認証情報を復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { agentId } = JSON.parse(saved);
        if (agentId) setLoginId(agentId);
        // パスワードは保存・復元しない（セキュリティポリシー）
        setRememberMe(true);
      }
    } catch { /* 無視 */ }
  }, []);

  const handleIdInput = useCallback((raw: string, setter: (v: string) => void) => {
    const upper = raw.toUpperCase();
    if (upper === "K-" || upper === "K") { setter("K-"); return; }
    if (raw === "") { setter(""); return; }
    setter(formatAgentId(upper));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: loginId, password: loginPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ agentId: loginId })); // ⚠️ パスワードは保存しない
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setUser(data.user as User);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: regId, name: regName, password: regPw, division: regDiv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: regId, password: regPw }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        setUser(loginData.user as User);
        router.replace("/dashboard");
      } else {
        setTab("login");
        setLoginId(regId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.375rem",
    color: "white",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
    display: "block",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontFamily: "'JetBrains Mono', monospace",
  };

  const hintStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    color: "rgba(255,255,255,0.3)",
    marginTop: "0.35rem",
    fontFamily: "monospace",
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: "absolute", right: "0.75rem", top: "50%",
    transform: "translateY(-50%)",
    background: "transparent", border: "none",
    color: "rgba(255,255,255,0.4)", cursor: "pointer",
    padding: 0, display: "flex", alignItems: "center",
  };

  const strength = passwordStrength(regPw);

  return (
    <div
      className="card animate-fadeIn"
      style={{
        width: "100%", maxWidth: "28rem",
        backgroundColor: "rgba(0,0,0,0.6)",
        borderColor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div className="card-header text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{
          margin: "0 auto 1rem", width: "3rem", height: "3rem",
          backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <svg width="24" height="24" fill="none" stroke="var(--primary)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="glitch-text" style={{
          fontSize: "1.5rem", fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700, letterSpacing: "0.1em", color: "white",
        }}>機関員認証</h2>
        <p className="font-mono" style={{
          fontSize: "0.75rem", color: "var(--muted-foreground)",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>関係者以外立入禁止</p>
      </div>

      <div className="card-content">
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "1.5rem" }}>
          {(["login", "register"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} className="font-mono"
              style={{
                flex: 1, padding: "0.75rem", background: "transparent", border: "none",
                color: tab === t ? "var(--primary)" : "var(--muted-foreground)",
                fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em",
                cursor: "pointer",
                borderBottom: `2px solid ${tab === t ? "var(--primary)" : "transparent"}`,
                transition: "all 0.2s",
              }}
            >
              {t === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        {sessionExpired && (
          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: "0.375rem", marginBottom: "1rem",
            color: "#eab308", fontSize: "0.8rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⏱ セッションの有効期限が切れました。再度ログインしてください。
          </div>
        )}

        {error && (
          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.375rem", marginBottom: "1rem",
            color: "var(--destructive)", fontSize: "0.875rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── ログインフォーム ── */}
        {tab === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* 機関員ID */}
            <div>
              <label style={labelStyle}>機関員ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => handleIdInput(e.target.value, setLoginId)}
                placeholder="K-XXX-XXX"
                required
                autoComplete="username"
                maxLength={12}
                style={inputStyle}
              />
              <p style={hintStyle}>数字を入力すると K-XXX-XXX 形式に自動変換されます</p>
            </div>

            {/* パスキー */}
            <div>
              <label style={labelStyle}>パスキー</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showLoginPw ? "text" : "password"}
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                />
                <button type="button" onClick={() => setShowLoginPw((v) => !v)}
                  style={eyeBtnStyle} tabIndex={-1}
                  aria-label={showLoginPw ? "パスキーを隠す" : "パスキーを表示"}>
                  <EyeIcon open={showLoginPw} />
                </button>
              </div>
            </div>

            {/* 記憶チェックボックス */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMe(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem(STORAGE_KEY);
                }}
                style={{ width: "1rem", height: "1rem", accentColor: "var(--primary)", cursor: "pointer" }}
              />
              <label htmlFor="rememberMe" style={{
                fontSize: "0.8rem", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontFamily: "monospace", userSelect: "none",
              }}>
                IDとパスキーを次回も記憶する
              </label>
            </div>

            <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", fontFamily:"monospace", textAlign:"right", marginTop:"-0.25rem" }}>
              パスキーを忘れた場合は管理者にお問い合わせください
            </p>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ marginTop: "0.25rem", opacity: loading ? 0.7 : 1 }}>
              {loading ? "認証中..." : "認証"}
            </button>
          </form>
        )}

        {/* ── 新規登録フォーム ── */}
        {tab === "register" && (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* 機関員ID */}
            <div>
              <label style={labelStyle}>機関員ID</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={regId}
                  onChange={(e) => handleIdInput(e.target.value, setRegId)}
                  placeholder="K-XXX-XXX"
                  required
                  maxLength={9}
                  pattern="K-\d{3}-\d{3}"
                  style={{
                    ...inputStyle,
                    paddingRight: "2.5rem",
                    borderColor:
                      idStatus === "available" ? "rgba(34,197,94,0.6)"
                      : idStatus === "taken" ? "rgba(239,68,68,0.6)"
                      : "rgba(255,255,255,0.1)",
                    transition: "border-color 0.2s",
                  }}
                />
                {/* ステータスアイコン */}
                <span style={{
                  position: "absolute", right: "0.75rem", top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.85rem", lineHeight: 1,
                  color:
                    idStatus === "available" ? "#22c55e"
                    : idStatus === "taken" ? "#ef4444"
                    : idStatus === "checking" ? "rgba(255,255,255,0.4)"
                    : "transparent",
                  pointerEvents: "none",
                }}>
                  {idStatus === "checking" && "…"}
                  {idStatus === "available" && "✓"}
                  {idStatus === "taken" && "✕"}
                </span>
              </div>
              {/* ステータスメッセージ */}
              {idStatus === "idle" && (
                <p style={hintStyle}>数字6桁を入力（例: 001234 → K-001-234）</p>
              )}
              {idStatus === "checking" && (
                <p style={{ ...hintStyle, color: "rgba(255,255,255,0.4)" }}>確認中...</p>
              )}
              {idStatus === "available" && (
                <p style={{ ...hintStyle, color: "#22c55e" }}>✓ このIDは使用可能です</p>
              )}
              {idStatus === "taken" && (
                <p style={{ ...hintStyle, color: "#ef4444" }}>✕ このIDは既に使用されています</p>
              )}
              {idStatus === "invalid" && regId.length > 0 && (
                <p style={hintStyle}>数字6桁を入力（例: 001234 → K-001-234）</p>
              )}
            </div>

            {/* 氏名 */}
            <div>
              <label style={labelStyle}>氏名</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="表示名"
                required
                maxLength={50}
                autoComplete="name"
                style={inputStyle}
              />
            </div>

            {/* パスキー + 強度インジケーター */}
            <div>
              <label style={labelStyle}>パスキー</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showRegPw ? "text" : "password"}
                  value={regPw}
                  onChange={(e) => setRegPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                />
                <button type="button" onClick={() => setShowRegPw((v) => !v)}
                  style={eyeBtnStyle} tabIndex={-1}
                  aria-label={showRegPw ? "パスキーを隠す" : "パスキーを表示"}>
                  <EyeIcon open={showRegPw} />
                </button>
              </div>
              {regPw.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.3rem" }}>
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        backgroundColor: level <= strength ? STRENGTH_COLOR[strength] : "rgba(255,255,255,0.1)",
                        transition: "background-color 0.2s",
                      }} />
                    ))}
                  </div>
                  <p style={{ ...hintStyle, color: STRENGTH_COLOR[strength] }}>
                    {STRENGTH_LABEL[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* 所属部門 */}
            <div>
              <label style={labelStyle}>所属部門</label>
              <select value={regDiv} onChange={(e) => setRegDiv(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {DIVISIONS.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || idStatus === "taken" || idStatus === "checking"}
              className="btn-primary"
              style={{ marginTop: "0.25rem", opacity: (loading || idStatus === "taken" || idStatus === "checking") ? 0.5 : 1 }}
            >
              {loading ? "登録中..." : "登録して参加"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
