"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useDiscoveredStore, type DiscoveredItem } from "@/store/discoveredStore";

// ── カテゴリ定義（SearchClient と同一）─────────────────────────

const CATEGORIES = [
  { id: "all",       label: "すべて",       color: "#00ffff", icon: "◈", desc: "全データ" },
  { id: "mission",   label: "収束案件",     color: "#ef4444", icon: "⚡", desc: "作戦記録" },
  { id: "entity",    label: "海蝕実体",     color: "#a855f7", icon: "◉", desc: "実体データ" },
  { id: "module",    label: "モジュール",   color: "#eab308", icon: "⬡", desc: "装備・機器" },
  { id: "location",  label: "ロケーション", color: "#10b981", icon: "◎", desc: "拠点・施設" },
  { id: "personnel", label: "人員",         color: "#f97316", icon: "◈", desc: "機関員記録" },
  { id: "novel",     label: "ノベル",       color: "#06b6d4", icon: "◆", desc: "記録文書" },
  { id: "post",      label: "掲示板",       color: "#64748b", icon: "▸", desc: "投稿記録" },
] as const;

type CatId = typeof CATEGORIES[number]["id"];

// ── ユーティリティ ─────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "たった今";
  if (m < 60) return `${m}分前`;
  if (h < 24) return `${h}時間前`;
  if (d < 7)  return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const catOf = (id: CatId) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];

// ── データカード ───────────────────────────────────────────────

function DataCard({
  item,
  onRemove,
}: {
  item: DiscoveredItem;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = catOf(item.category as CatId);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${cat.color}`,
        borderRadius: "0.5rem",
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      {/* ── カード ヘッダー ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "0.9rem 1.2rem",
          cursor: "pointer",
          transition: "background 0.12s",
        }}
        onClick={() => setExpanded(v => !v)}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {/* アイコン */}
        <div style={{
          flexShrink: 0, width: "2rem", height: "2rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "1rem",
          color: cat.color,
          background: `${cat.color}12`,
          borderRadius: "0.25rem",
        }}>
          {cat.icon}
        </div>

        {/* メイン情報 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem",
            color: cat.color, marginBottom: "0.15rem", letterSpacing: "0.06em",
          }}>
            {item.matchedId}
          </div>
          <div style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "0.88rem",
            color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.title}
          </div>
          {item.subtitle && (
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem",
              color: "rgba(255,255,255,0.28)", marginTop: "0.1rem",
            }}>
              {item.subtitle}
            </div>
          )}
        </div>

        {/* バッジ */}
        {item.badge && (
          <span style={{
            flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem",
            padding: "0.12rem 0.4rem", borderRadius: "2px",
            background: `${item.badgeColor}20`, color: item.badgeColor,
            border: `1px solid ${item.badgeColor}40`, whiteSpace: "nowrap",
          }}>
            {item.badge}
          </span>
        )}

        {/* 発見日時 */}
        <div style={{
          flexShrink: 0, textAlign: "right", minWidth: 54,
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem",
          color: "rgba(255,255,255,0.2)", lineHeight: 1.4,
        }}>
          {relativeTime(item.discoveredAt)}
        </div>

        {/* 展開アロー */}
        <div style={{
          flexShrink: 0, color: "rgba(255,255,255,0.2)",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>
          ▸
        </div>
      </div>

      {/* ── 展開パネル ── */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "1rem 1.2rem 1.2rem",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}>

          {/* 説明文 */}
          {item.description && (
            <p style={{
              fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.82rem",
              color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: 0,
            }}>
              {item.description}
            </p>
          )}

          {/* メタ情報グリッド */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem",
          }}>
            <MetaField label="カテゴリ" value={cat.label} color={cat.color} />
            <MetaField label="発見クエリ" value={item.discoveredQuery} color="rgba(255,255,255,0.4)" mono />
            <MetaField label="発見日時" value={formatDate(item.discoveredAt)} color="rgba(255,255,255,0.4)" mono />
            {item.subtitle && (
              <MetaField label="補足" value={item.subtitle} color="rgba(255,255,255,0.4)" />
            )}
          </div>

          {/* アクション行 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.25rem" }}>
            <Link
              href={item.href}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.45rem 1rem",
                background: `${cat.color}12`,
                border: `1px solid ${cat.color}40`,
                borderRadius: "0.25rem",
                color: cat.color,
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
                letterSpacing: "0.06em", textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = `${cat.color}22`)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = `${cat.color}12`)}
            >
              詳細を見る →
            </Link>

            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.25rem",
                color: "rgba(255,255,255,0.2)",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem",
                padding: "0.4rem 0.8rem", cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              ✕ 記録を削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem",
        color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "0.2rem",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? "'JetBrains Mono',monospace" : "'Space Grotesk',sans-serif",
        fontSize: mono ? "0.68rem" : "0.78rem",
        color,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── 空状態 ───────────────────────────────────────────────────

function EmptyState({ catId }: { catId: CatId }) {
  const cat = catOf(catId);
  return (
    <div style={{ textAlign: "center", padding: "5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "3rem",
        color: "rgba(255,255,255,0.04)", letterSpacing: "0.2em",
      }}>
        {catId === "all" ? "◈" : cat.icon}
      </div>
      <p style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem",
        color: "rgba(255,255,255,0.18)", lineHeight: 2.2, margin: 0,
      }}>
        {catId === "all"
          ? <>発見済みデータはありません<br /><span style={{ color: "rgba(255,255,255,0.1)" }}>検索ページでIDを検索し、結果をクリックすると記録されます</span></>
          : <>{cat.label}カテゴリの発見済みデータはありません</>
        }
      </p>
      <Link
        href="/search"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.5rem 1.2rem",
          background: "rgba(0,255,255,0.06)",
          border: "1px solid rgba(0,255,255,0.2)",
          borderRadius: "0.25rem",
          color: "var(--primary)",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
          letterSpacing: "0.06em", textDecoration: "none",
        }}
      >
        検索ページへ →
      </Link>
    </div>
  );
}

// ── 確認ダイアログ ─────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "hsl(220,30%,8%)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        minWidth: 320,
        display: "flex", flexDirection: "column", gap: "1.25rem",
      }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.25rem",
            color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
            padding: "0.45rem 0.9rem", cursor: "pointer",
          }}>
            キャンセル
          </button>
          <button onClick={onConfirm} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "0.25rem",
            color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
            padding: "0.45rem 0.9rem", cursor: "pointer",
          }}>
            削除実行
          </button>
        </div>
      </div>
    </div>
  );
}

// ── メインページ ───────────────────────────────────────────────

export default function DiscoveredPage() {
  const { items, removeItem, clearAll, clearByCategory } = useDiscoveredStore();

  const [activeTab, setActiveTab] = useState<CatId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "alpha">("newest");
  const [confirmClear, setConfirmClear] = useState(false);

  // カテゴリ別件数
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const cat of CATEGORIES.slice(1)) {
      c[cat.id] = items.filter(i => i.category === cat.id).length;
    }
    return c;
  }, [items]);

  // フィルタ + ソート
  const displayItems = useMemo(() => {
    let list = activeTab === "all" ? items : items.filter(i => i.category === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.matchedId.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.discoveredQuery.toLowerCase().includes(q)
      );
    }
    if (sortOrder === "newest") return [...list].sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
    if (sortOrder === "oldest") return [...list].sort((a, b) => a.discoveredAt.localeCompare(b.discoveredAt));
    return [...list].sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }, [items, activeTab, searchQuery, sortOrder]);

  const activeCat = catOf(activeTab);

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
          CODEX // DISCOVERED DATA
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "white", margin: "0 0 0.2rem" }}>
              発見済みデータ
            </h1>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "var(--muted-foreground)", margin: 0 }}>
              ID検索で閲覧したデータを自動記録 — ローカル保存
            </p>
          </div>
          {/* トータル数 */}
          <div style={{ marginLeft: "auto", display: "flex", gap: "1.5rem" }}>
            {CATEGORIES.slice(1).filter(c => counts[c.id] > 0).slice(0, 4).map(cat => (
              <div key={cat.id} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.25rem", color: cat.color, lineHeight: 1 }}>
                  {counts[cat.id]}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", marginTop: "0.2rem" }}>
                  {cat.label}
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.25rem", color: "var(--primary)", lineHeight: 1 }}>
                {items.length}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", marginTop: "0.2rem" }}>
                TOTAL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── タブ ── */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "1.25rem",
        overflowX: "auto",
      }}>
        {CATEGORIES.map(cat => {
          const cnt = counts[cat.id] ?? 0;
          const isActive = activeTab === cat.id;
          const hasData = cat.id === "all" ? items.length > 0 : cnt > 0;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as CatId)}
              disabled={!hasData && cat.id !== "all"}
              style={{
                flexShrink: 0,
                padding: "0.6rem 0.875rem",
                background: "none", border: "none",
                borderBottom: `2px solid ${isActive ? cat.color : "transparent"}`,
                marginBottom: "-1px",
                color: isActive ? cat.color : hasData ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem",
                letterSpacing: "0.04em",
                cursor: hasData || cat.id === "all" ? "pointer" : "not-allowed",
                transition: "color 0.15s, border-color 0.15s",
                display: "flex", alignItems: "center", gap: "0.35rem",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ opacity: isActive ? 1 : hasData ? 0.7 : 0.3 }}>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={{
                fontSize: "0.58rem", padding: "0.05rem 0.3rem", borderRadius: "2px",
                background: isActive ? `${cat.color}22` : "rgba(255,255,255,0.06)",
                color: isActive ? cat.color : hasData ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
                minWidth: "1.4em", textAlign: "center",
              }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ツールバー ── */}
      {items.length > 0 && (
        <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* 絞り込み */}
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="タイトル・ID・クエリで絞り込み..."
            style={{
              flex: "1 1 180px",
              padding: "0.5rem 0.875rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.25rem",
              color: "white",
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem",
              outline: "none",
            }}
          />

          {/* ソート */}
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
            style={{
              padding: "0.5rem 0.75rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.25rem",
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem",
              outline: "none", cursor: "pointer",
            }}
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="alpha">名前順</option>
          </select>

          {/* 件数 */}
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>
            {displayItems.length} 件
          </span>

          {/* クリアボタン */}
          <button
            onClick={() => setConfirmClear(true)}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.25rem",
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem",
              padding: "0.45rem 0.75rem", cursor: "pointer",
              marginLeft: "auto",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.35)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            {activeTab === "all" ? "✕ 全削除" : `✕ ${activeCat.label}を削除`}
          </button>
        </div>
      )}

      {/* ── リスト ── */}
      {displayItems.length === 0 ? (
        <EmptyState catId={activeTab} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {displayItems.map(item => (
            <DataCard
              key={`${item.category}-${item.id}`}
              item={item}
              onRemove={() => removeItem(item.id, item.category)}
            />
          ))}
        </div>
      )}

      {/* ── 確認ダイアログ ── */}
      {confirmClear && (
        <ConfirmDialog
          message={
            activeTab === "all"
              ? `発見済みデータを全件（${items.length}件）削除しますか？`
              : `${activeCat.label}の発見済みデータを全件（${counts[activeTab] ?? 0}件）削除しますか？`
          }
          onConfirm={() => {
            if (activeTab === "all") clearAll();
            else clearByCategory(activeTab as DiscoveredItem["category"]);
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
