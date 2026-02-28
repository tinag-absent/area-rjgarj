"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import type { User } from "@/types/user";

type Tab = "login" | "register";
type View = "account-select" | "login" | "register";

const DIVISIONS = [
  { slug: "convergence", name: "収束部門" },
  { slug: "engineering", name: "エンジニアリング部門" },
  { slug: "foreign", name: "対外部門" },
  { slug: "port", name: "港湾部門" },
  { slug: "support", name: "サポート部門" },
];

const STORAGE_KEY = "kai_saved_accounts"; // 複数アカウント用（配列）
const LEGACY_KEY  = "kai_saved_credentials"; // 旧単一アカウント用

interface SavedAccount {
  agentId: string;
  password: string;
  savedAt: number;
}

function loadSavedAccounts(): SavedAccount[] {
  try {
    // 旧形式をマイグレーション
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed.agentId) {
        const migrated: SavedAccount[] = [{ agentId: parsed.agentId, password: parsed.password || "", savedAt: Date.now() }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveAccount(agentId: string, password: string) {
  const accounts = loadSavedAccounts().filter(a => a.agentId !== agentId);
  accounts.unshift({ agentId, password, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, 10)));
}

function removeAccount(agentId: string) {
  const accounts = loadSavedAccounts().filter(a => a.agentId !== agentId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function formatAgentId(raw: string): string {
  const upper = raw.toUpperCase();
  // すでに X-XXX-... 形式（先頭が任意の1文字アルファベット）
  if (/^[A-Z]-[0-9A-Z]{1,3}-[0-9A-Z]*$/.test(upper)) return upper;
  // 先頭がアルファベット1文字 + "-" のみの入力
  if (/^[A-Z]-?$/.test(upper)) return upper.charAt(0) + "-";
  if (raw === "") return "";
  // 先頭のアルファベット1文字を抽出（なければデフォルトなし）
  const prefix = /^[A-Z]/.test(upper) ? upper.charAt(0) : null;
  if (!prefix) return upper.charAt(0) ? upper.charAt(0) : "";
  const body = upper.slice(1).replace(/^-?/, "").replace(/[^0-9A-Z]/g, "");
  if (body.length === 0) return `${prefix}-`;
  if (body.length <= 3) return `${prefix}-${body}`;
  return `${prefix}-${body.slice(0, 3)}-${body.slice(3)}`;
}

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

// ── アカウント選択画面 ────────────────────────────────────────────
function AccountSelectView({
  accounts,
  onSelect,
  onNew,
  onRemove,
  loading,
  error,
  sessionExpired,
}: {
  accounts: SavedAccount[];
  onSelect: (account: SavedAccount) => void;
  onNew: () => void;
  onRemove: (agentId: string) => void;
  loading: boolean;
  error: string;
  sessionExpired: boolean;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  return (
    <div className="card animate-fadeIn" style={{
      width: "100%", maxWidth: "28rem",
      backgroundColor: "rgba(0,0,0,0.6)",
      borderColor: "rgba(255,255,255,0.1)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
    }}>
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
        }}>アカウントを選択</p>
      </div>

      <div className="card-content">
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

        {/* 保存済みアカウント一覧 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {accounts.map((account) => (
            <div
              key={account.agentId}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.875rem 1rem",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: loading ? 0.6 : 1,
              }}
              onClick={() => !loading && onSelect(account)}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              {/* アバターアイコン */}
              <div style={{
                width: "2.25rem", height: "2.25rem",
                backgroundColor: "rgba(0,255,255,0.1)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(0,255,255,0.2)",
                flexShrink: 0,
                fontSize: "0.85rem",
                color: "var(--primary)",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
              }}>
                {account.agentId.slice(2, 5)}
              </div>

              {/* エージェントID */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-mono" style={{ fontSize: "0.9rem", color: "white", fontWeight: 600 }}>
                  {account.agentId}
                </div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginTop: "0.15rem" }}>
                  パスキー保存済み ·  タップしてログイン
                </div>
              </div>

              {/* 矢印 */}
              <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" viewBox="0 0 24 24" style={{ flexShrink: 0, marginRight: "0.25rem" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>

              {/* 削除ボタン */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  setRemoving(account.agentId);
                }}
                title="このアカウントを削除"
                style={{
                  background: "transparent", border: "none",
                  color: "rgba(255,255,255,0.2)", cursor: "pointer",
                  padding: "0.25rem", borderRadius: "0.25rem",
                  display: "flex", alignItems: "center",
                  flexShrink: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 削除確認ダイアログ */}
        {removing && (
          <div style={{
            padding: "0.875rem 1rem",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}>
            <p style={{ fontSize: "0.8rem", color: "#ef4444", fontFamily: "monospace", marginBottom: "0.75rem" }}>
              {removing} を一覧から削除しますか？
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => { onRemove(removing); setRemoving(null); }}
                style={{
                  flex: 1, padding: "0.5rem", background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
                  borderRadius: "0.25rem", cursor: "pointer",
                }}
              >
                削除
              </button>
              <button
                onClick={() => setRemoving(null)}
                style={{
                  flex: 1, padding: "0.5rem", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
                  borderRadius: "0.25rem", cursor: "pointer",
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 区切り線 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* 新しいアカウントボタン */}
        <button
          onClick={onNew}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "transparent",
            border: "1px solid rgba(0,255,255,0.2)",
            borderRadius: "0.5rem",
            color: "var(--primary)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,255,0.05)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          別のアカウントでログイン / 新規登録
        </button>
      </div>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export default function LoginForm() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";

  const [view, setView] = useState<View>("login");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form
  const [regId, setRegId] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regDiv, setRegDiv] = useState("convergence");

  // Register: email verification step
  type RegStep = "form" | "email-verify";
  const [regStep, setRegStep] = useState<RegStep>("form");
  const [regEmailCode, setRegEmailCode] = useState("");
  const [regEmailToken, setRegEmailToken] = useState("");
  const [regResendCooldown, setRegResendCooldown] = useState(0);

  type IdStatus = "idle" | "checking" | "available" | "taken" | "invalid";
  const [idStatus, setIdStatus] = useState<IdStatus>("idle");

  // 初期化: 保存済みアカウントを読み込み、あれば選択画面を表示
  useEffect(() => {
    const accounts = loadSavedAccounts();
    setSavedAccounts(accounts);
    if (accounts.length > 0) {
      setView("account-select");
    }
  }, []);

  // IDの重複チェック
  useEffect(() => {
    const ID_REGEX = /^[A-Z]-\d{3}-\d{3}$/;
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
      } catch { setIdStatus("idle"); }
    }, 500);
    return () => clearTimeout(timer);
  }, [regId]);

  const handleIdInput = useCallback((raw: string, setter: (v: string) => void) => {
    const upper = raw.toUpperCase();
    if (raw === "") { setter(""); return; }
    // 先頭がアルファベット1文字 + "-" のみ
    if (/^[A-Z]-?$/.test(upper)) { setter(upper.charAt(0) + "-"); return; }
    setter(formatAgentId(upper));
  }, []);

  // 保存済みアカウントを選択してログイン
  async function handleSelectAccount(account: SavedAccount) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: account.agentId, password: account.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");
      saveAccount(account.agentId, account.password);
      setSavedAccounts(loadSavedAccounts());
      setUser(data.user as User);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveAccount(agentId: string) {
    removeAccount(agentId);
    const updated = loadSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) setView("login");
  }

  function handleNewAccount() {
    setLoginId("");
    setLoginPw("");
    setError("");
    setView("login");
    setTab("login");
  }

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
        saveAccount(loginId, loginPw);
      }
      setUser(data.user as User);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function startRegResendCooldown() {
    setRegResendCooldown(60);
    const timer = setInterval(() => {
      setRegResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // STEP 1: メール認証コードを送信
      const res = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "メールの送信に失敗しました");
      setRegEmailCode("");
      startRegResendCooldown();
      setRegStep("email-verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegEmailVerify() {
    if (regEmailCode.trim().length !== 6) return;
    setLoading(true);
    setError("");
    try {
      // STEP 2: コード照合 → emailToken取得
      const verifyRes = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, code: regEmailCode.trim(), purpose: "register" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "認証コードが正しくありません");

      const emailToken = verifyData.emailToken;
      setRegEmailToken(emailToken);

      // STEP 3: 実際に登録
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: regId, name: regName, password: regPw, division: regDiv, emailToken }),
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
        saveAccount(regId, regPw);
        setUser(loginData.user as User);
        router.replace("/dashboard");
      } else {
        setRegStep("form");
        setTab("login");
        setLoginId(regId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegResendCode() {
    if (regResendCooldown > 0 || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");
      setRegEmailCode("");
      startRegResendCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  // ── アカウント選択画面 ──
  if (view === "account-select") {
    return (
      <AccountSelectView
        accounts={savedAccounts}
        onSelect={handleSelectAccount}
        onNew={handleNewAccount}
        onRemove={handleRemoveAccount}
        loading={loading}
        error={error}
        sessionExpired={sessionExpired}
      />
    );
  }

  // ── ログイン / 新規登録フォーム ──
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.625rem 0.875rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.375rem", color: "white",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem", color: "var(--muted-foreground)",
    display: "block", marginBottom: "0.5rem",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontFamily: "'JetBrains Mono', monospace",
  };
  const hintStyle: React.CSSProperties = {
    fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
    marginTop: "0.35rem", fontFamily: "monospace",
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
    <div className="card animate-fadeIn" style={{
      width: "100%", maxWidth: "28rem",
      backgroundColor: "rgba(0,0,0,0.6)",
      borderColor: "rgba(255,255,255,0.1)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
    }}>
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
        {/* 保存済みアカウントに戻るボタン */}
        {savedAccounts.length > 0 && (
          <button
            onClick={() => { setView("account-select"); setError(""); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.4)", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
              padding: "0 0 1rem 0", transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            保存済みアカウントに戻る
          </button>
        )}

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
            padding: "0.75rem 1rem", backgroundColor: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.3)", borderRadius: "0.375rem",
            marginBottom: "1rem", color: "#eab308", fontSize: "0.8rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⏱ セッションの有効期限が切れました。再度ログインしてください。
          </div>
        )}

        {error && (
          <div style={{
            padding: "0.75rem 1rem", backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.375rem",
            marginBottom: "1rem", color: "var(--destructive)", fontSize: "0.875rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── ログインフォーム ── */}
        {tab === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>機関員ID</label>
              <input
                type="text" value={loginId}
                onChange={(e) => handleIdInput(e.target.value, setLoginId)}
                placeholder="X-XXX-XXX" required autoComplete="username" maxLength={12}
                style={inputStyle}
              />
              <p style={hintStyle}>先頭にアルファベット1文字、続けて数字を入力（例: K123456 → K-123-456）</p>
            </div>
            <div>
              <label style={labelStyle}>パスキー</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showLoginPw ? "text" : "password"} value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                />
                <button type="button" onClick={() => setShowLoginPw((v) => !v)} style={eyeBtnStyle} tabIndex={-1}>
                  <EyeIcon open={showLoginPw} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <input
                type="checkbox" id="rememberMe" checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "1rem", height: "1rem", accentColor: "var(--primary)", cursor: "pointer" }}
              />
              <label htmlFor="rememberMe" style={{
                fontSize: "0.8rem", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontFamily: "monospace", userSelect: "none",
              }}>
                IDとパスキーを次回も記憶する
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-0.25rem" }}>
              <a href="/forgot-password" style={{ fontSize: "0.72rem", color: "rgba(0,255,255,0.5)", fontFamily: "monospace", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,255,255,0.5)")}
              >
                パスキーを忘れた方はこちら →
              </a>
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ marginTop: "0.25rem", opacity: loading ? 0.7 : 1 }}>
              {loading ? "認証中..." : "認証"}
            </button>
          </form>
        )}

        {/* ── 新規登録フォーム ── */}
        {tab === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* STEP: 入力フォーム */}
            {regStep === "form" && (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>機関員ID</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text" value={regId}
                      onChange={(e) => handleIdInput(e.target.value, setRegId)}
                      placeholder="X-XXX-XXX" required maxLength={9} pattern="[A-Za-z]-\d{3}-\d{3}"
                      style={{
                        ...inputStyle, paddingRight: "2.5rem",
                        borderColor:
                          idStatus === "available" ? "rgba(34,197,94,0.6)"
                          : idStatus === "taken" ? "rgba(239,68,68,0.6)"
                          : "rgba(255,255,255,0.1)",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <span style={{
                      position: "absolute", right: "0.75rem", top: "50%",
                      transform: "translateY(-50%)", fontSize: "0.85rem", lineHeight: 1,
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
                  {idStatus === "idle" && <p style={hintStyle}>先頭にアルファベット1文字 + 数字6桁（例: K123456 → K-123-456）</p>}
                  {idStatus === "checking" && <p style={{ ...hintStyle, color: "rgba(255,255,255,0.4)" }}>確認中...</p>}
                  {idStatus === "available" && <p style={{ ...hintStyle, color: "#22c55e" }}>✓ このIDは使用可能です</p>}
                  {idStatus === "taken" && <p style={{ ...hintStyle, color: "#ef4444" }}>✕ このIDは既に使用されています</p>}
                  {idStatus === "invalid" && regId.length > 0 && <p style={hintStyle}>先頭にアルファベット1文字 + 数字6桁（例: K123456 → K-123-456）</p>}
                </div>
                <div>
                  <label style={labelStyle}>氏名</label>
                  <input
                    type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                    placeholder="表示名" required maxLength={50} autoComplete="name" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>メールアドレス</label>
                  <input
                    type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="example@example.com" required autoComplete="email" style={inputStyle}
                  />
                  <p style={hintStyle}>認証コードを送信します。正確に入力してください。</p>
                </div>
                <div>
                  <label style={labelStyle}>パスキー</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showRegPw ? "text" : "password"} value={regPw}
                      onChange={(e) => setRegPw(e.target.value)}
                      placeholder="••••••••" required minLength={8} autoComplete="new-password"
                      style={{ ...inputStyle, paddingRight: "2.75rem" }}
                    />
                    <button type="button" onClick={() => setShowRegPw((v) => !v)} style={eyeBtnStyle} tabIndex={-1}>
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
                      <p style={{ ...hintStyle, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>所属部門</label>
                  <select value={regDiv} onChange={(e) => setRegDiv(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    {DIVISIONS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading || idStatus === "taken" || idStatus === "checking" || !regEmail.trim()}
                  className="btn-primary"
                  style={{ marginTop: "0.25rem", opacity: (loading || idStatus === "taken" || idStatus === "checking" || !regEmail.trim()) ? 0.5 : 1 }}
                >
                  {loading ? "送信中..." : "✉ メール認証コードを送信"}
                </button>
              </form>
            )}

            {/* STEP: メール認証コード入力 */}
            {regStep === "email-verify" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ padding: "0.75rem 1rem", background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)", borderRadius: "0.375rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  ✉ <span style={{ color: "var(--primary)" }}>{regEmail}</span> に<br />
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
                    value={regEmailCode}
                    onChange={e => setRegEmailCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000000"
                    style={{
                      ...inputStyle,
                      fontSize: "1.5rem",
                      letterSpacing: "0.4em",
                      textAlign: "center",
                    }}
                    onKeyDown={e => e.key === "Enter" && handleRegEmailVerify()}
                  />
                </div>

                <button
                  onClick={handleRegEmailVerify}
                  disabled={loading || regEmailCode.trim().length !== 6}
                  className="btn-primary"
                  style={{ opacity: (loading || regEmailCode.trim().length !== 6) ? 0.5 : 1 }}
                >
                  {loading ? "確認・登録中..." : "コードを確認して登録 →"}
                </button>

                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={handleRegResendCode}
                    disabled={regResendCooldown > 0 || loading}
                    style={{
                      background: "none", border: "none", cursor: regResendCooldown > 0 ? "default" : "pointer",
                      fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                      color: regResendCooldown > 0 ? "rgba(255,255,255,0.2)" : "rgba(0,255,255,0.5)",
                      padding: 0,
                    }}
                  >
                    {regResendCooldown > 0 ? `再送信まで ${regResendCooldown}秒` : "コードを再送信"}
                  </button>
                </div>

                <button
                  onClick={() => { setRegStep("form"); setError(""); setRegEmailCode(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.25)", padding: 0, marginTop: "-0.5rem",
                  }}
                >
                  ← 入力に戻る
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}