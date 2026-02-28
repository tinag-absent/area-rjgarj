"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

// ── 型定義 ────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  category: "mission" | "entity" | "module" | "location" | "personnel" | "novel" | "post";
  title: string;
  subtitle?: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  matchedId: string;
}

// ── タブ定義 ─────────────────────────────────────────────────

const TABS = [
  { id: "all",       label: "すべて",       color: "#00ffff", icon: "◈" },
  { id: "mission",   label: "収束案件",     color: "#ef4444", icon: "⚡" },
  { id: "entity",    label: "海蝕実体",     color: "#a855f7", icon: "◉" },
  { id: "module",    label: "モジュール",   color: "#eab308", icon: "⬡" },
  { id: "location",  label: "ロケーション", color: "#10b981", icon: "◎" },
  { id: "personnel", label: "人員",         color: "#f97316", icon: "◈" },
  { id: "novel",     label: "ノベル",       color: "#06b6d4", icon: "◆" },
  { id: "post",      label: "掲示板",       color: "#64748b", icon: "▸" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── 結果カード ────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const tab = TABS.find(t => t.id === result.category) ?? TABS[0];
  return (
    <Link href={result.href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: `3px solid ${tab.color}`,
          borderRadius: "0.5rem",
          padding: "0.875rem 1.25rem",
          display: "flex", alignItems: "center", gap: "1rem",
          transition: "background 0.15s", cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      >
        {/* カテゴリアイコン */}
        <div style={{ flexShrink: 0, width: "1.75rem", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.95rem", color: tab.color, opacity: 0.8 }}>
          {tab.icon}
        </div>

        {/* メイン */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: tab.color, marginBottom: "0.2rem", letterSpacing: "0.05em" }}>
            {result.matchedId}
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "white", marginBottom: result.subtitle ? "0.15rem" : 0 }}>
            {result.title}
          </div>
          {result.subtitle && (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
              {result.subtitle}
            </div>
          )}
        </div>

        {/* バッジ */}
        {result.badge && (
          <span style={{
            flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem",
            padding: "0.15rem 0.45rem", borderRadius: "2px",
            background: `${result.badgeColor}22`, color: result.badgeColor,
            border: `1px solid ${result.badgeColor}44`, whiteSpace: "nowrap",
          }}>
            {result.badge}
          </span>
        )}

        <div style={{ flexShrink: 0, color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem" }}>→</div>
      </div>
    </Link>
  );
}

// ── メインコンポーネント ──────────────────────────────────────

export default function SearchClient() {
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 表示する結果：選択タブでフィルタ
  const displayResults = activeTab === "all"
    ? allResults
    : allResults.filter(r => r.category === activeTab);

  const totalAll = allResults.length;

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&category=all`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data = await res.json();
      setAllResults(data.results ?? []);
      setCounts(data.counts ?? {});
      setLastQuery(trimmed);
      setSearched(true);
    } catch (err: any) {
      setError(err.message ?? "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveTab("all");
    doSearch(inputValue);
  }

  function handleClear() {
    setInputValue("");
    setAllResults([]);
    setCounts({});
    setSearched(false);
    setLastQuery("");
    setError("");
    setActiveTab("all");
    inputRef.current?.focus();
  }

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "860px", margin: "0 auto" }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          DATABASE // LEVEL 4 CLEARANCE
        </div>
        <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "white", margin: "0 0 0.2rem" }}>
          ID検索
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>
          IDまたはコードの完全一致で全カテゴリを横断検索
        </p>
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="例: E-001 / K-001-234 / MISSION-2025-DEC-BEPPU / mod-003"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "0.8rem 2.5rem 0.8rem 1rem",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${inputValue ? "rgba(0,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "0.375rem", color: "white",
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.92rem",
              outline: "none", transition: "border-color 0.2s", letterSpacing: "0.04em",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(0,255,255,0.5)")}
            onBlur={e => (e.target.style.borderColor = inputValue ? "rgba(0,255,255,0.35)" : "rgba(255,255,255,0.1)")}
          />
          {inputValue && (
            <button type="button" onClick={handleClear} style={{
              position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem",
              fontFamily: "'JetBrains Mono',monospace", lineHeight: 1,
            }}>✕</button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            padding: "0.8rem 1.5rem", flexShrink: 0,
            background: loading || !inputValue.trim() ? "rgba(0,255,255,0.05)" : "rgba(0,255,255,0.12)",
            border: `1px solid ${loading || !inputValue.trim() ? "rgba(0,255,255,0.12)" : "rgba(0,255,255,0.4)"}`,
            borderRadius: "0.375rem",
            color: loading || !inputValue.trim() ? "rgba(0,255,255,0.3)" : "var(--primary)",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem",
            letterSpacing: "0.08em", cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
            transition: "all 0.15s", whiteSpace: "nowrap",
          }}
        >
          {loading ? "検索中…" : "検索 →"}
        </button>
      </form>

      {/* タブ（検索後のみ表示） */}
      {searched && !loading && (
        <div style={{
          display: "flex", gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}>
          {TABS.map(tab => {
            const cnt = tab.id === "all" ? totalAll : (counts[tab.id] ?? 0);
            const isActive = activeTab === tab.id;
            // 該当なしのタブは薄く表示（非表示にしない）
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flexShrink: 0,
                  padding: "0.625rem 1rem",
                  background: "none", border: "none",
                  borderBottom: `2px solid ${isActive ? tab.color : "transparent"}`,
                  marginBottom: "-1px",
                  color: isActive ? tab.color : cnt > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                  letterSpacing: "0.05em", cursor: cnt > 0 || tab.id === "all" ? "pointer" : "default",
                  transition: "color 0.15s, border-color 0.15s",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: "0.6rem", padding: "0.05rem 0.3rem", borderRadius: "2px",
                  background: isActive ? `${tab.color}25` : "rgba(255,255,255,0.07)",
                  color: isActive ? tab.color : cnt > 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
                  minWidth: "1.4em", textAlign: "center",
                }}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* エラー */}
      {error && (
        <div style={{
          padding: "0.75rem 1rem", marginBottom: "1rem",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "0.375rem", color: "#ef4444",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem",
        }}>⚠ {error}</div>
      )}

      {/* 初期状態 */}
      {!searched && !loading && (
        <div style={{ textAlign: "center", padding: "5rem 0" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "2.5rem", color: "rgba(255,255,255,0.06)", marginBottom: "1.5rem", letterSpacing: "0.2em" }}>◈</div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.73rem", color: "rgba(255,255,255,0.18)", lineHeight: 2.2, margin: 0 }}>
            IDを入力して Enter または「検索」を押す<br />
            <span style={{ color: "rgba(255,255,255,0.1)" }}>
              E-001 · K-001-234 · MISSION-2025-DEC-BEPPU · mod-003 · loc-001 · novel-001
            </span>
          </p>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "var(--primary)", letterSpacing: "0.25em" }}>
            SEARCHING...
          </div>
        </div>
      )}

      {/* 結果 */}
      {searched && !loading && (
        <>
          {/* 件数ヘッダー */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: "var(--muted-foreground)" }}>
              {displayResults.length > 0 ? (
                <><span style={{ color: activeTabMeta.color }}>{displayResults.length}</span> 件 — <span style={{ color: "rgba(255,255,255,0.45)" }}>{lastQuery}</span></>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.25)" }}>
                  "{lastQuery}" — {activeTab === "all" ? "該当なし" : `${activeTabMeta.label}に該当なし`}
                </span>
              )}
            </div>
            {displayResults.length > 0 && (
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            )}
          </div>

          {/* 結果ゼロ */}
          {displayResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "3.5rem 0" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.5rem", color: "rgba(255,255,255,0.06)", marginBottom: "1rem" }}>◉</div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.9, margin: 0 }}>
                {activeTab === "all"
                  ? <>ID "<span style={{ color: "rgba(255,255,255,0.4)" }}>{lastQuery}</span>" に完全一致するデータはありません</>
                  : <>{activeTabMeta.label}に "<span style={{ color: "rgba(255,255,255,0.4)" }}>{lastQuery}</span>" は存在しません</>
                }
              </p>
            </div>
          )}

          {/* リスト */}
          {displayResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {displayResults.map(r => (
                <ResultCard key={`${r.category}-${r.id}`} result={r} />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
