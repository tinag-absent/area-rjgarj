"use client";

import { useState } from "react";

interface CodexEntry {
  id: string;
  title: string;
  icon: string;
  level: number;
  accent: string;
  summary: string;
  content: string;
}

const ACCENT_SOLID: Record<string, string> = {
  "var(--primary)": "#00ffff",
};
function toSolid(accent: string) {
  return ACCENT_SOLID[accent] ?? accent;
}

const ICONS: Record<string, React.ReactNode> = {
  wave: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12c1.5-2 3-3 4.5-3s3 2 4.5 2 3-3 4.5-3 3 1 4.5 3M3 18c1.5-2 3-3 4.5-3s3 2 4.5 2 3-3 4.5-3 3 1 4.5 3" />
    </svg>
  ),
  dimension: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  chart: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  building: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0H5m14 0H3m2 0h14M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  folder: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  vortex: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="6" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="2" strokeWidth={1.8} />
    </svg>
  ),
  eye: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  gear: (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function CodexAccordion({
  entries,
  userLevel,
}: {
  entries: CodexEntry[];
  userLevel: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {entries.map((entry) => {
        const locked = entry.level > userLevel;
        const accent = toSolid(entry.accent);
        const isOpen = openId === entry.id && !locked;

        return (
          <div
            key={entry.id}
            className="card"
            style={{
              borderColor: locked
                ? "rgba(255,255,255,0.05)"
                : isOpen
                ? `${accent}50`
                : `${accent}20`,
              opacity: locked ? 0.5 : 1,
              overflow: "hidden",
              transition: "border-color 0.25s",
            }}
          >
            {/* アコーディオンヘッダー */}
            <button
              onClick={() => !locked && toggle(entry.id)}
              disabled={locked}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                padding: "1rem 1.25rem",
                background: isOpen ? `${accent}08` : "transparent",
                border: "none",
                cursor: locked ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.2s",
              }}
            >
              {/* アイコン */}
              <span style={{ color: locked ? "rgba(255,255,255,0.2)" : accent, flexShrink: 0, display: "flex" }}>
                {ICONS[entry.icon] ?? null}
              </span>

              {/* タイトル + サマリー */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.2rem",
                  flexWrap: "wrap",
                }}>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.975rem",
                    color: locked ? "rgba(255,255,255,0.3)" : "white",
                  }}>
                    {entry.title}
                  </span>
                  <span className="font-mono" style={{
                    fontSize: "0.58rem",
                    padding: "0.1rem 0.4rem",
                    backgroundColor: locked ? "rgba(255,255,255,0.05)" : `${accent}18`,
                    border: `1px solid ${locked ? "rgba(255,255,255,0.1)" : `${accent}40`}`,
                    color: locked ? "rgba(255,255,255,0.3)" : accent,
                    flexShrink: 0,
                  }}>
                    {locked ? `🔒 LV${entry.level}` : `LV${entry.level}`}
                  </span>
                </div>
                <div className="font-mono" style={{
                  fontSize: "0.72rem",
                  color: locked ? "rgba(255,255,255,0.2)" : "var(--muted-foreground)",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {locked ? "[アクセス拒否 — レベルアップで解放されます]" : entry.summary}
                </div>
              </div>

              {/* 展開矢印 */}
              {!locked && (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke={accent}
                  viewBox="0 0 24 24"
                  style={{
                    flexShrink: 0,
                    opacity: 0.7,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.25s",
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* アコーディオンコンテンツ */}
            <div style={{
              maxHeight: isOpen ? "2000px" : "0",
              overflow: "hidden",
              transition: "max-height 0.4s ease",
            }}>
              <div style={{
                borderTop: `1px solid ${accent}22`,
                padding: "1rem 1.25rem 1.25rem",
              }}>
                {entry.content.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "0.8rem",
                      lineHeight: 1.8,
                      color: para.startsWith("【")
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.65)",
                      fontFamily: para.startsWith("【") ? "'Space Grotesk', sans-serif" : undefined,
                      fontWeight: para.startsWith("【") ? 600 : undefined,
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
              {/* 下部アクセントライン */}
              <div style={{ height: "2px", background: `linear-gradient(90deg, ${accent}60, transparent)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
