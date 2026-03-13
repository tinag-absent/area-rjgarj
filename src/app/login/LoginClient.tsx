"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DIVISIONS, AGENT_ID_REGEX } from "@/lib/constants";

// ── デザイントークン ────────────────────────────────────────────
const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', sans-serif";

// ── 型 ────────────────────────────────────────────────────────
type Tab = "login" | "register";

interface FieldError {
  agentId?: string;
  password?: string;
  displayName?: string;
  division?: string;
  secretQuestion?: string;
  secretAnswer?: string;
  general?: string;
}

// ── ユーティリティ ─────────────────────────────────────────────
function apiFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...init?.headers,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}

// ── 入力フィールドコンポーネント ────────────────────────────────
function Field({
  label, id, type = "text", value, onChange, error, placeholder, autoComplete, hint,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: MONO,
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          color: hasError ? "#ef4444" : focused ? "var(--primary)" : "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "0.7rem 0.875rem",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${
            hasError
              ? "rgba(239,68,68,0.5)"
              : focused
              ? "rgba(0,255,255,0.45)"
              : "rgba(255,255,255,0.1)"
          }`,
          borderRadius: "0.375rem",
          color: "white",
          fontFamily: MONO,
          fontSize: "0.9rem",
          outline: "none",
          transition: "border-color 0.15s, background 0.15s",
          boxSizing: "border-box",
        }}
      />
      {hint && !error && (
        <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", margin: 0 }}>
          {hint}
        </p>
      )}
      {error && (
        <p style={{ fontFamily: MONO, fontSize: "0.63rem", color: "#ef4444", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── セレクトフィールド ─────────────────────────────────────────
function SelectField({
  label, id, value, onChange, options, error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: MONO,
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          color: hasError ? "#ef4444" : focused ? "var(--primary)" : "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "0.7rem 0.875rem",
          background: "rgba(10,15,25,0.95)",
          border: `1px solid ${
            hasError
              ? "rgba(239,68,68,0.5)"
              : focused
              ? "rgba(0,255,255,0.45)"
              : "rgba(255,255,255,0.1)"
          }`,
          borderRadius: "0.375rem",
          color: value ? "white" : "rgba(255,255,255,0.3)",
          fontFamily: MONO,
          fontSize: "0.85rem",
          outline: "none",
          transition: "border-color 0.15s",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <option value="" disabled style={{ color: "rgba(255,255,255,0.3)" }}>
          — 選択してください —
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0c1018", color: "white" }}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ fontFamily: MONO, fontSize: "0.63rem", color: "#ef4444", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── 送信ボタン ────────────────────────────────────────────────
function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%",
        padding: "0.8rem",
        background: loading
          ? "rgba(0,255,255,0.04)"
          : "linear-gradient(135deg, rgba(0,255,255,0.12), rgba(0,200,255,0.08))",
        border: `1px solid ${loading ? "rgba(0,255,255,0.15)" : "rgba(0,255,255,0.4)"}`,
        borderRadius: "0.375rem",
        color: loading ? "rgba(0,255,255,0.3)" : "var(--primary)",
        fontFamily: MONO,
        fontSize: "0.85rem",
        letterSpacing: "0.15em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        textTransform: "uppercase",
        boxShadow: loading ? "none" : "0 0 20px rgba(0,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◈</span>
          処理中...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ── リダイレクト先の安全チェック ───────────────────────────────
// 以下の場合はダッシュボードに戻す：
//  - 未指定 / ルート / ログイン・登録ページ
//  - /api/ や /_next/ などの内部・システムパス
//  - 権限が必要なページ（/admin, /classified など）でロールが不足
//  - レベルゲートに引っかかるページ
//  - 外部URLや二重スラッシュ等の不正な値（オープンリダイレクト防止）
interface SafeRedirectUser { role?: string; level?: number }

function getSafeRedirect(from: string | null | undefined, user?: SafeRedirectUser): string {
  const FALLBACK = "/dashboard";

  if (!from) return FALLBACK;

  // 外部URL・プロトコル付き・//で始まる（オープンリダイレクト防止）
  if (!/^\/[^/]/.test(from)) return FALLBACK;

  // pathnameだけ取り出す（クエリ・ハッシュは保持する）
  let pathname: string;
  try {
    pathname = new URL(from, "http://x").pathname;
  } catch {
    return FALLBACK;
  }

  // ルート・認証ページ
  if (["/", "/login", "/register"].includes(pathname)) return FALLBACK;

  // 内部システムパス
  const INTERNAL_PREFIXES = ["/api/", "/_next/", "/favicon", "/images", "/icons", "/fonts"];
  if (INTERNAL_PREFIXES.some((p) => pathname.startsWith(p))) return FALLBACK;

  // 管理者ページ（権限不足）
  if (pathname.startsWith("/admin")) {
    const isAdmin = user?.role === "admin" || user?.role === "super_admin";
    if (!isAdmin) return FALLBACK;
  }

  // レベルゲート（ミドルウェアの定義と同期）
  const LEVEL_GATES: { path: string; minLevel: number }[] = [
    { path: "/console",    minLevel: 3 },
    { path: "/missions",   minLevel: 2 },
    { path: "/classified", minLevel: 5 },
  ];
  for (const gate of LEVEL_GATES) {
    if (pathname.startsWith(gate.path)) {
      const level = Math.floor(user?.level ?? 0);
      if (level < gate.minLevel) return FALLBACK;
    }
  }

  return from;
}

// ── ログインフォーム ─────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: (redirectTo: string) => void }) {
  const searchParams = useSearchParams();
  const [agentId, setAgentId]     = useState("");
  const [password, setPassword]   = useState("");
  const [errors, setErrors]       = useState<FieldError>({});
  const [loading, setLoading]     = useState(false);

  const validate = (): boolean => {
    const e: FieldError = {};
    if (!agentId.trim())  e.agentId  = "機関員IDを入力してください";
    if (!password)        e.password = "パスキーを入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId.trim().toUpperCase(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error ?? "ログインに失敗しました";
        if (res.status === 429) {
          setErrors({ general: `試行回数が上限に達しました。しばらく待ってから再試行してください。` });
        } else if (res.status === 401) {
          setErrors({ general: "機関員IDまたはパスキーが正しくありません" });
        } else {
          setErrors({ general: msg });
        }
        return;
      }

      const from = searchParams?.get("from");
      const redirectTo = getSafeRedirect(from, data.user);
      onSuccess(redirectTo);
    } catch {
      setErrors({ general: "通信エラーが発生しました。再試行してください。" });
    } finally {
      setLoading(false);
    }
  }, [agentId, password, searchParams, onSuccess]);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <Field
        id="login-agent-id"
        label="機関員 ID"
        value={agentId}
        onChange={setAgentId}
        error={errors.agentId}
        placeholder="K-ABC-123"
        autoComplete="username"
        hint="例: K-ABC-123"
      />
      <Field
        id="login-password"
        label="パスキー"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {errors.general && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "0.375rem",
          fontFamily: MONO,
          fontSize: "0.75rem",
          color: "#ef4444",
          lineHeight: 1.6,
        }}>
          ⚠ {errors.general}
        </div>
      )}

      <SubmitButton loading={loading} label="認証 →" />
    </form>
  );
}

// ── 登録フォーム ─────────────────────────────────────────────
const SECRET_QUESTIONS = [
  "初めて飼ったペットの名前は？",
  "生まれた病院の名前は？",
  "小学校の頃の親友の名前は？",
  "初めて住んだ街の名前は？",
  "子供の頃の夢は？",
];

const DIVISION_OPTIONS = DIVISIONS.map((d) => ({ value: d.slug, label: d.name }));
const QUESTION_OPTIONS = SECRET_QUESTIONS.map((q) => ({ value: q, label: q }));

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [displayName,     setDisplayName]     = useState("");
  const [agentId,         setAgentId]         = useState("");
  const [division,        setDivision]        = useState("");
  const [password,        setPassword]        = useState("");
  const [secretQuestion,  setSecretQuestion]  = useState("");
  const [secretAnswer,    setSecretAnswer]    = useState("");
  const [errors,          setErrors]          = useState<FieldError>({});
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [assignedId,      setAssignedId]      = useState("");

  const validate = (): boolean => {
    const e: FieldError = {};
    if (!displayName.trim())   e.displayName    = "表示名を入力してください";
    if (!agentId.trim())       e.agentId        = "希望IDを入力してください";
    else if (!AGENT_ID_REGEX.test(agentId.trim().toUpperCase()))
      e.agentId = "形式が正しくありません（例: K-ABC-123）";
    if (!division)             e.division       = "配属部門を選択してください";
    if (!password)             e.password       = "パスキーを入力してください";
    else if (password.length < 8) e.password   = "8文字以上で入力してください";
    if (!secretQuestion)       e.secretQuestion = "秘密の質問を選択してください";
    if (!secretAnswer.trim())  e.secretAnswer   = "答えを入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          agentId: agentId.trim().toUpperCase(),
          division,
          password,
          secretQuestion,
          secretAnswer: secretAnswer.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error ?? "登録に失敗しました";
        if (res.status === 409) {
          setErrors({ agentId: "このIDはすでに使用されています" });
        } else if (res.status === 429) {
          setErrors({ general: "登録試行回数が上限に達しました。時間をおいて再試行してください。" });
        } else {
          setErrors({ general: msg });
        }
        return;
      }

      setAssignedId(data.agentId ?? agentId.trim().toUpperCase());
      setDone(true);
    } catch {
      setErrors({ general: "通信エラーが発生しました。再試行してください。" });
    } finally {
      setLoading(false);
    }
  }, [displayName, agentId, division, password, secretQuestion, secretAnswer]);

  // ── 登録完了画面 ──
  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
        <div style={{ fontSize: "2.5rem", filter: "drop-shadow(0 0 12px rgba(0,255,200,0.6))" }}>◈</div>
        <div>
          <p style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.18em", marginBottom: "0.5rem" }}>
            REGISTRATION COMPLETE
          </p>
          <h2 style={{ fontFamily: SANS, fontSize: "1.2rem", fontWeight: 700, color: "white", margin: "0 0 0.5rem" }}>
            機関員登録完了
          </h2>
          <p style={{ fontFamily: MONO, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>
            あなたの機関員IDは<br />
            <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "1rem" }}>{assignedId}</span><br />
            です。忘れずに記録してください。
          </p>
        </div>
        <button
          type="button"
          onClick={onSuccess}
          style={{
            padding: "0.7rem 2rem",
            background: "rgba(0,255,255,0.1)",
            border: "1px solid rgba(0,255,255,0.35)",
            borderRadius: "0.375rem",
            color: "var(--primary)",
            fontFamily: MONO,
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          ログイン画面へ →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <Field
        id="reg-display-name"
        label="表示名"
        value={displayName}
        onChange={setDisplayName}
        error={errors.displayName}
        placeholder="海蝕 太郎"
        autoComplete="name"
        hint="チャットなどに表示される名前"
      />
      <Field
        id="reg-agent-id"
        label="希望 機関員 ID"
        value={agentId}
        onChange={setAgentId}
        error={errors.agentId}
        placeholder="K-ABC-123"
        autoComplete="off"
        hint="形式: [A-Z]-[3文字]-[3〜5文字]（例: K-ABC-123）"
      />
      <SelectField
        id="reg-division"
        label="配属希望部門"
        value={division}
        onChange={setDivision}
        options={DIVISION_OPTIONS}
        error={errors.division}
      />
      <Field
        id="reg-password"
        label="パスキー（8文字以上）"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        placeholder="••••••••"
        autoComplete="new-password"
      />
      <SelectField
        id="reg-secret-question"
        label="秘密の質問"
        value={secretQuestion}
        onChange={setSecretQuestion}
        options={QUESTION_OPTIONS}
        error={errors.secretQuestion}
      />
      <Field
        id="reg-secret-answer"
        label="秘密の答え"
        value={secretAnswer}
        onChange={setSecretAnswer}
        error={errors.secretAnswer}
        placeholder="答えを入力"
        autoComplete="off"
        hint="パスキーを忘れた際の本人確認に使用します"
      />

      {errors.general && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "0.375rem",
          fontFamily: MONO,
          fontSize: "0.75rem",
          color: "#ef4444",
          lineHeight: 1.6,
        }}>
          ⚠ {errors.general}
        </div>
      )}

      <SubmitButton loading={loading} label="機関員登録 →" />
    </form>
  );
}

// ── メインコンポーネント ───────────────────────────────────────
export default function LoginClient() {
  const [activeTab, setActiveTab] = useState<Tab>("login");

  const handleLoginSuccess = useCallback((redirectTo: string) => {
    // router.push() はクライアントサイドナビゲーションのため、
    // Set-Cookie されたばかりの kai_token がミドルウェアに届かず
    // 未認証と判定されてログインループが発生する。
    // window.location.href でフルリクエストを強制してCookieを確実に送る。
    window.location.href = redirectTo;
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    setActiveTab("login");
  }, []);

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanMove {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 30% 20%, rgba(0,40,60,0.5) 0%, transparent 60%), #07090f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* スキャンライン装飾 */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
        }} />
        {/* グリッドドット */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "radial-gradient(circle, rgba(0,200,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* カード */}
        <div style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: "26rem",
          background: "rgba(5,8,15,0.95)",
          border: "1px solid rgba(0,255,255,0.12)",
          borderRadius: "0.75rem",
          boxShadow: "0 0 60px rgba(0,200,255,0.06), 0 24px 64px rgba(0,0,0,0.6)",
          overflow: "hidden",
          animation: "fadeIn 0.4s ease-out",
        }}>
          {/* ヘッダー */}
          <div style={{
            padding: "2rem 2rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "1.75rem",
              color: "var(--primary)",
              filter: "drop-shadow(0 0 10px rgba(0,255,255,0.4))",
              marginBottom: "0.5rem",
            }}>⬡</div>
            <h1 style={{
              fontFamily: SANS, fontSize: "1.1rem", fontWeight: 700,
              color: "white", letterSpacing: "0.15em", textTransform: "uppercase",
              margin: "0 0 0.25rem",
            }}>
              海蝕機関
            </h1>
            <p style={{
              fontFamily: MONO, fontSize: "0.58rem",
              color: "rgba(0,255,255,0.4)", letterSpacing: "0.2em",
              textTransform: "uppercase", margin: 0,
            }}>
              KAISHOKU AGENCY SYSTEM
            </p>
          </div>

          {/* タブ */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {(["login", "register"] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              const label = tab === "login" ? "ログイン" : "新規登録";
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.875rem",
                    background: isActive ? "rgba(0,255,255,0.05)" : "transparent",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? "var(--primary)" : "transparent"}`,
                    color: isActive ? "var(--primary)" : "rgba(255,255,255,0.35)",
                    fontFamily: MONO,
                    fontSize: "0.72rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* フォームエリア */}
          <div style={{ padding: "1.75rem 2rem 2rem" }}>
            {activeTab === "login" ? (
              <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "2rem" }}>Loading...</div>}>
                <LoginForm onSuccess={handleLoginSuccess} />
              </Suspense>
            ) : (
              <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "2rem" }}>Loading...</div>}>
                <RegisterForm onSuccess={handleRegisterSuccess} />
              </Suspense>
            )}
          </div>

          {/* フッター */}
          <div style={{
            padding: "0.875rem 2rem",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            textAlign: "center",
          }}>
            <p style={{
              fontFamily: MONO, fontSize: "0.55rem",
              color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em", margin: 0,
            }}>
              CLASSIFIED SYSTEM — UNAUTHORIZED ACCESS PROHIBITED
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
