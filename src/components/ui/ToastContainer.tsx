"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import type { Toast } from "@/store/notificationStore";

// ── デザイントークン ────────────────────────────────────────────────
const MONO = "'Share Tech Mono','Fira Code',monospace";

// SVGアイコンをインラインで返す関数
function ToastIcon({ type, accent }: { type: string; accent: string }) {
  const sz = 14;
  const props = { width: sz, height: sz, fill: "none" as const, stroke: accent, strokeWidth: "1.8" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (type === "xp" || type === "chat") return (
    <svg {...props} viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
  if (type === "levelup" || type === "warn") return (
    <svg {...props} viewBox="0 0 24 24">
      <polygon points="12 2 22 22 2 22" />
    </svg>
  );
  if (type === "login" || type === "mission") return (
    <svg {...props} viewBox="0 0 24 24">
      <path d="M12 2L2 9l10 13L22 9z" />
      <line x1="2" y1="9" x2="22" y2="9" />
    </svg>
  );
  if (type === "unlock") return (
    <svg {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  if (type === "info") return (
    <svg {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
  if (type === "error") return (
    <svg {...props} viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
  return <svg {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
}

const TYPE_CONFIG: Record<Toast["type"], {
  accent: string;
  glow: string;
  bg: string;
  label: string;
}> = {
  xp:      { accent: "#00e5ff", glow: "rgba(0,229,255,0.18)",  bg: "rgba(0,229,255,0.04)",  label: "XP獲得" },
  levelup: { accent: "#fbbf24", glow: "rgba(251,191,36,0.22)", bg: "rgba(251,191,36,0.06)", label: "LEVEL UP" },
  login:   { accent: "#00e676", glow: "rgba(0,230,118,0.18)",  bg: "rgba(0,230,118,0.04)",  label: "認証" },
  unlock:  { accent: "#a78bfa", glow: "rgba(167,139,250,0.18)",bg: "rgba(167,139,250,0.04)",label: "解放" },
  chat:    { accent: "#00e5ff", glow: "rgba(0,229,255,0.14)",  bg: "rgba(0,229,255,0.03)",  label: "通信" },
  mission: { accent: "#f97316", glow: "rgba(249,115,22,0.18)", bg: "rgba(249,115,22,0.04)", label: "任務" },
  info:    { accent: "#94a3b8", glow: "rgba(148,163,184,0.14)",bg: "rgba(148,163,184,0.03)",label: "INFO" },
  warn:    { accent: "#fbbf24", glow: "rgba(251,191,36,0.18)", bg: "rgba(251,191,36,0.04)", label: "警告" },
  error:   { accent: "#f87171", glow: "rgba(248,113,113,0.18)",bg: "rgba(248,113,113,0.05)",label: "エラー" },
};

// ── プログレスバー ──────────────────────────────────────────────────
function ProgressBar({ duration, accent, paused }: {
  duration: number;
  accent: string;
  paused: boolean;
}) {
  const [width, setWidth] = useState(100);
  const startRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current);
      elapsedRef.current += Date.now() - startRef.current;
      return;
    }
    cancelAnimationFrame(rafRef.current);
    startRef.current = Date.now();

    const tick = () => {
      const total = elapsedRef.current + (Date.now() - startRef.current);
      const pct = Math.max(0, 100 - (total / duration) * 100);
      setWidth(pct);
      if (pct > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, duration]);

  return (
    <div style={{
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: "2px",
      background: "rgba(255,255,255,0.06)",
      borderRadius: "0 0 4px 4px",
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%",
        width: `${width}%`,
        background: `linear-gradient(90deg, ${accent}88, ${accent})`,
        boxShadow: `0 0 6px ${accent}`,
        transition: "none",
      }} />
    </div>
  );
}

// ── XPカウントアップ ────────────────────────────────────────────────
function XpCounter({ amount, accent }: { amount: number; accent: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.ceil(amount / 20);
    const timer = setInterval(() => {
      start = Math.min(start + step, amount);
      setDisplay(start);
      if (start >= amount) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [amount]);

  return (
    <span style={{
      fontFamily: MONO,
      fontSize: "1.15rem",
      fontWeight: 700,
      color: accent,
      letterSpacing: "0.05em",
      textShadow: `0 0 12px ${accent}`,
    }}>
      +{display} XP
    </span>
  );
}

// ── LEVEL UPエフェクト ──────────────────────────────────────────────
function LevelUpFlash({ accent }: { accent: string }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      borderRadius: "4px",
      pointerEvents: "none",
      animation: "toastLevelFlash 0.6s ease-out forwards",
      background: `radial-gradient(ellipse at 50% 50%, ${accent}22 0%, transparent 70%)`,
    }} />
  );
}

// ── 個別トーストカード ──────────────────────────────────────────────
function ToastCard({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cfg = TYPE_CONFIG[toast.type];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(onRemove, 280);
  }, [onRemove]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleRemove}
      style={{
        position: "relative",
        background: `linear-gradient(135deg, rgba(4,10,18,0.97) 0%, ${cfg.bg} 100%)`,
        border: `1px solid ${cfg.accent}44`,
        borderLeft: `3px solid ${cfg.accent}`,
        borderRadius: "4px",
        padding: "0.85rem 0.9rem 1rem",
        cursor: "pointer",
        backdropFilter: "blur(16px)",
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${cfg.glow}`,
        overflow: "hidden",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        transform: mounted && !exiting
          ? hovered ? "translateX(-3px) scale(1.01)" : "translateX(0)"
          : exiting ? "translateX(100%) scale(0.95)" : "translateX(110%)",
        opacity: mounted && !exiting ? 1 : 0,
        maxWidth: "22rem",
        width: "22rem",
      }}
    >
      {/* LEVEL UPエフェクト */}
      {toast.type === "levelup" && <LevelUpFlash accent={cfg.accent} />}

      {/* スキャンラインオーバーレイ */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
        borderRadius: "4px",
      }} />

      {/* コンテンツ */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>

        {/* アイコン */}
        <div style={{
          width: "2rem", height: "2rem", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${cfg.accent}33`,
          borderRadius: "3px",
          background: cfg.bg,
          boxShadow: `0 0 10px ${cfg.glow}`,
        }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: toast.type === "levelup" ? "toastIconPulse 0.8s ease-in-out infinite alternate" : undefined,
          }}>
            <ToastIcon type={toast.type} accent={cfg.accent} />
          </span>
        </div>

        {/* テキスト */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* タイプラベル + タイトル */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.2em",
              color: cfg.accent, textTransform: "uppercase",
              border: `1px solid ${cfg.accent}44`, borderRadius: "2px",
              padding: "0.1rem 0.3rem",
              textShadow: `0 0 6px ${cfg.accent}88`,
              flexShrink: 0,
            }}>
              {cfg.label}
            </span>
            <span style={{
              fontFamily: MONO, fontSize: "0.72rem", fontWeight: 600,
              color: toast.type === "error" ? cfg.accent : "rgba(208,232,240,0.92)",
              letterSpacing: "0.06em",
              textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
            }}>
              {toast.title}
            </span>
          </div>

          {/* ボディ */}
          {toast.body && (
            <div style={{
              fontFamily: MONO, fontSize: "0.68rem",
              color: "rgba(160,195,220,0.65)",
              marginTop: "0.3rem", lineHeight: 1.5,
              letterSpacing: "0.02em",
            }}>
              {toast.body}
            </div>
          )}

          {/* XPカウンター */}
          {toast.xpAmount != null && toast.xpAmount > 0 && (
            <div style={{ marginTop: "0.4rem" }}>
              <XpCounter amount={toast.xpAmount} accent={cfg.accent} />
            </div>
          )}
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={(e) => { e.stopPropagation(); handleRemove(); }}
          style={{
            background: "none", border: "none", padding: "0.1rem",
            cursor: "pointer", flexShrink: 0,
            color: "rgba(160,195,220,0.3)",
            fontFamily: MONO, fontSize: "0.75rem",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = cfg.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(160,195,220,0.3)"; }}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* プログレスバー */}
      <ProgressBar duration={duration} accent={cfg.accent} paused={hovered} />
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────────────────────
export default function ToastContainer() {
  const toasts      = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);
  const clearAll    = useNotificationStore((s) => s.clearToasts);

  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes toastLevelFlash {
          0%   { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes toastIconPulse {
          from { opacity: 0.7; text-shadow: 0 0 4px currentColor; }
          to   { opacity: 1;   text-shadow: 0 0 14px currentColor; }
        }
      `}</style>

      <div
        role="region"
        aria-label="通知"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column-reverse",
          gap: "0.6rem",
          pointerEvents: "none",
        }}
      >
        {/* 複数件ある場合の全消去ボタン */}
        {toasts.length >= 2 && (
          <button
            onClick={clearAll}
            style={{
              alignSelf: "flex-end",
              pointerEvents: "auto",
              background: "rgba(4,10,18,0.9)",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: "3px",
              color: "rgba(148,163,184,0.55)",
              fontFamily: MONO,
              fontSize: "0.55rem",
              letterSpacing: "0.12em",
              padding: "0.25rem 0.55rem",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "rgba(248,113,113,0.8)";
              e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "rgba(148,163,184,0.55)";
              e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)";
            }}
          >
            ALL CLEAR ×{toasts.length}
          </button>
        )}

        {/* トースト一覧（新しいものが上） */}
        {[...toasts].reverse().map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastCard
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
