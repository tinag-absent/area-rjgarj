"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ERROR_TYPES: Record<string, { code: string; title: string; body: string; color: string; action: string; actionHref: string }> = {
  auth: {
    code: "AUTH_EXPIRED",
    title: "セッションが失効しました",
    body: "認証トークンの有効期限が切れています。再度ログインしてください。",
    color: "#f59e0b",
    action: "ログインページへ",
    actionHref: "/login",
  },
  forbidden: {
    code: "ACCESS_DENIED",
    title: "アクセス権限がありません",
    body: "このページを閲覧するには上位クリアランスが必要です。機関員レベルが不足しています。",
    color: "#ef4444",
    action: "ダッシュボードに戻る",
    actionHref: "/dashboard",
  },
  network: {
    code: "CONNECTION_LOST",
    title: "通信エラーが発生しました",
    body: "サーバーへの接続が切断されました。ネットワーク接続を確認してください。",
    color: "#8b5cf6",
    action: "再試行",
    actionHref: "",
  },
  default: {
    code: "SYSTEM_ERROR",
    title: "エラーが発生しました",
    body: "予期しないシステムエラーが発生しました。問題が続く場合は管理者にお問い合わせください。",
    color: "#ef4444",
    action: "ダッシュボードに戻る",
    actionHref: "/dashboard",
  },
};

function classifyError(message: string): keyof typeof ERROR_TYPES {
  const m = message.toLowerCase();
  if (m.includes("401") || m.includes("unauthorized") || m.includes("session") || m.includes("token")) return "auth";
  if (m.includes("403") || m.includes("forbidden") || m.includes("clearance") || m.includes("access")) return "forbidden";
  if (m.includes("fetch") || m.includes("network") || m.includes("econnrefused")) return "network";
  return "default";
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [glitch, setGlitch] = useState(false);
  const type = classifyError(error.message || "");
  const meta = ERROR_TYPES[type];

  useEffect(() => {
    setGlitch(true);
    const t = setTimeout(() => setGlitch(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "28rem" }}>
        {/* エラーコード */}
        <div className="font-mono" style={{
          fontSize: "0.65rem", color: meta.color, textTransform: "uppercase",
          letterSpacing: "0.2em", marginBottom: "1.5rem",
          opacity: glitch ? 0.3 : 1, transition: "opacity 0.1s",
        }}>
          ⚠ {meta.code}
          {error.digest && <span style={{ marginLeft: "1rem", color: "rgba(255,255,255,0.2)" }}>#{error.digest}</span>}
        </div>

        {/* タイトル */}
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700,
          color: "white", marginBottom: "1rem",
        }}>
          {meta.title}
        </h2>

        {/* 説明 */}
        <p className="font-mono" style={{
          fontSize: "0.78rem", color: "var(--muted-foreground)",
          marginBottom: "0.75rem", lineHeight: 1.7,
        }}>
          {meta.body}
        </p>

        {/* 技術情報（折りたたみ） */}
        {error.message && (
          <details style={{ marginBottom: "2rem", textAlign: "left" }}>
            <summary className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", cursor: "pointer", letterSpacing: "0.1em" }}>
              技術情報を表示
            </summary>
            <div style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: "0.375rem", fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}>
              {error.message}
            </div>
          </details>
        )}

        {/* アクションボタン */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          {meta.actionHref ? (
            <Link href={meta.actionHref} className="btn-primary" style={{ display: "inline-block", padding: "0.625rem 1.5rem" }}>
              {meta.action}
            </Link>
          ) : (
            <button onClick={reset} className="btn-primary">
              {meta.action}
            </button>
          )}
          <button onClick={reset}
            style={{ padding: "0.625rem 1.5rem", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
            再試行
          </button>
        </div>
      </div>
    </div>
  );
}
