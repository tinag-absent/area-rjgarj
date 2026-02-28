"use client";

import { useNotificationStore } from "@/store/notificationStore";

const TYPE_COLORS: Record<string, string> = {
  xp: "var(--primary)",
  levelup: "#fbbf24",
  login: "var(--primary)",
  unlock: "#a78bfa",
  chat: "var(--primary)",
  mission: "#f97316",
  info: "var(--muted-foreground)",
  warn: "#fbbf24",
  error: "var(--destructive)",
};

const TYPE_ICONS: Record<string, string> = {
  xp: "⬡", levelup: "▲", login: "◈", unlock: "◉",
  chat: "⬡", mission: "◈", info: "●", warn: "▲", error: "■",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxWidth: "22rem",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            backgroundColor: "rgba(10, 15, 25, 0.95)",
            border: `1px solid ${TYPE_COLORS[toast.type] || "var(--border)"}`,
            borderRadius: "0.5rem",
            padding: "1rem",
            cursor: "pointer",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            animation: "fadeIn 0.3s ease-in-out",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              color: TYPE_COLORS[toast.type] || "var(--primary)",
              fontSize: "1rem",
              marginTop: "0.125rem",
              flexShrink: 0,
            }}
          >
            {TYPE_ICONS[toast.type] || "●"}
          </span>
          <div style={{ flex: 1 }}>
            <div
              className="font-mono"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: TYPE_COLORS[toast.type] || "var(--foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {toast.title}
            </div>
            {toast.body && (
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--muted-foreground)",
                  marginTop: "0.25rem",
                }}
              >
                {toast.body}
              </div>
            )}
            {toast.xpAmount && (
              <div
                className="font-mono"
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--primary)",
                  marginTop: "0.25rem",
                }}
              >
                +{toast.xpAmount} XP
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted-foreground)",
              fontSize: "0.875rem",
              cursor: "pointer",
              padding: "0",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
