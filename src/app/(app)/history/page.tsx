"use client";

import { useState, useMemo } from "react";
import { useHistoryStore, type BrowseEntry, type SearchEntry } from "@/store/historyStore";

// ─── design tokens ────────────────────────────────────────────────────────────
const S = {
  bg:      "#07090f",
  panel:   "#0c1018",
  panel2:  "#111620",
  border:  "#1a2030",
  border2: "#263040",
  cyan:    "#00d4ff",
  green:   "#00e676",
  yellow:  "#ffd740",
  red:     "#ff5252",
  purple:  "#ce93d8",
  orange:  "#ff9800",
  text:    "#cdd6e8",
  text2:   "#7a8aa0",
  text3:   "#445060",
  mono:    "'Share Tech Mono', 'Courier New', monospace",
} as const;

// ─── category config ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<BrowseEntry["category"], { label: string; color: string; icon: string }> = {
  page:    { label: "ページ",     color: S.cyan,   icon: "◈" },
  mission: { label: "ミッション", color: S.yellow, icon: "◆" },
  codex:   { label: "コーデックス", color: S.purple, icon: "◉" },
  map:     { label: "マップ",     color: S.green,  icon: "◎" },
  novel:   { label: "読本",       color: S.orange, icon: "◇" },
  chat:    { label: "チャット",   color: "#4fc3f7", icon: "◐" },
  other:   { label: "その他",     color: S.text3,  icon: "◌" },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "たった今";
  if (m < 60) return `${m}分前`;
  if (h < 24) return `${h}時間前`;
  if (d < 7)  return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
}

function groupByDate(entries: { visitedAt?: string; searchedAt?: string }[]) {
  const groups: Record<string, typeof entries> = {};
  for (const e of entries) {
    const iso = (e as BrowseEntry).visitedAt ?? (e as SearchEntry).searchedAt;
    const key = new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

// ─── sub-components ───────────────────────────────────────────────────────────
function TabButton({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 20px",
      fontFamily: S.mono, fontSize: 11,
      background: "none", border: "none",
      borderBottom: `2px solid ${active ? S.cyan : "transparent"}`,
      color: active ? S.cyan : S.text3,
      cursor: "pointer", letterSpacing: ".08em",
    }}>{label}</button>
  );
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: S.text3 }}>
      <div style={{ fontFamily: S.mono, fontSize: 40, opacity: 0.25 }}>{icon}</div>
      <p style={{ fontFamily: S.mono, fontSize: 11, opacity: 0.5 }}>{msg}</p>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: S.panel, border: `1px solid ${S.border2}`, padding: 24, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "6px 14px", cursor: "pointer" }}>キャンセル</button>
          <button onClick={onConfirm} style={{ background: "rgba(255,82,82,.1)", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 10, padding: "6px 14px", cursor: "pointer" }}>クリア実行</button>
        </div>
      </div>
    </div>
  );
}

// ─── Browse History Tab ───────────────────────────────────────────────────────
function BrowseHistoryTab() {
  const { browseHistory, removeBrowse, clearBrowse } = useHistoryStore();
  const [filterCat, setFilterCat] = useState<BrowseEntry["category"] | "all">("all");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(false);

  const filtered = useMemo(() => {
    let list = browseHistory;
    if (filterCat !== "all") list = list.filter((e) => e.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.path.toLowerCase().includes(q));
    }
    return list;
  }, [browseHistory, filterCat, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="タイトルまたはパスで絞り込み..."
          style={{ background: S.bg, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 12px", fontFamily: S.mono, fontSize: 11, outline: "none", minWidth: 220 }}
        />
        <div style={{ display: "flex", gap: 5 }}>
          {(["all", ...Object.keys(CATEGORY_META)] as const).map((cat) => {
            const meta = cat === "all" ? null : CATEGORY_META[cat as BrowseEntry["category"]];
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat as typeof filterCat)}
                style={{ background: "none", border: `1px solid ${active ? (meta?.color ?? S.cyan) : S.border2}`, color: active ? (meta?.color ?? S.cyan) : S.text3, fontFamily: S.mono, fontSize: 9, padding: "3px 9px", cursor: "pointer" }}>
                {cat === "all" ? "ALL" : meta?.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{filtered.length} 件</span>
          <button onClick={() => setConfirm(true)}
            style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text3, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>
            ✕ 全削除
          </button>
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <EmptyState icon="◌" msg="閲覧履歴がありません" />
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <div style={{ padding: "8px 20px", background: S.panel, borderBottom: `1px solid ${S.border}`, fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em" }}>
                // {date}
              </div>
              {(entries as BrowseEntry[]).map((entry) => {
                const meta = CATEGORY_META[entry.category];
                return (
                  <div key={entry.id}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: `1px solid ${S.border}`, background: "transparent", transition: "background .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = S.panel2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontFamily: S.mono, fontSize: 16, color: meta.color, flexShrink: 0, lineHeight: 1 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.title}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.path}</div>
                    </div>
                    <span style={{ fontFamily: S.mono, fontSize: 9, padding: "2px 7px", border: `1px solid ${meta.color}40`, color: meta.color, flexShrink: 0 }}>{meta.label}</span>
                    <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, flexShrink: 0, minWidth: 60, textAlign: "right" }}>{relativeTime(entry.visitedAt)}</span>
                    <button onClick={() => removeBrowse(entry.id)}
                      style={{ background: "none", border: "none", color: S.text3, cursor: "pointer", fontSize: 14, padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
                      title="削除">✕</button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          message="閲覧履歴をすべて削除しますか？この操作は取り消せません。"
          onConfirm={() => { clearBrowse(); setConfirm(false); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

// ─── Search History Tab ───────────────────────────────────────────────────────
function SearchHistoryTab() {
  const { searchHistory, removeSearch, clearSearch, addSearch } = useHistoryStore();
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(false);

  // デモ用サンプルデータを挿入する
  const [demoAdded, setDemoAdded] = useState(false);
  const addDemo = () => {
    if (demoAdded) return;
    const samples = [
      { query: "海蝕プロジェクト", resultCount: 12, context: "コーデックス" },
      { query: "西堂 研究記録", resultCount: 3, context: "読本" },
      { query: "観測者の正体", resultCount: 0, context: "コーデックス" },
      { query: "収束フェーズ", resultCount: 7, context: "ミッション" },
      { query: "境界消滅報告書", resultCount: 2, context: "コーデックス" },
    ];
    samples.forEach((s) => addSearch(s));
    setDemoAdded(true);
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return searchHistory;
    const q = filter.toLowerCase();
    return searchHistory.filter((e) => e.query.toLowerCase().includes(q));
  }, [searchHistory, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="検索クエリで絞り込み..."
          style={{ background: S.bg, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 12px", fontFamily: S.mono, fontSize: 11, outline: "none", minWidth: 220 }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{filtered.length} 件</span>
          <button onClick={() => setConfirm(true)}
            style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text3, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>
            ✕ 全削除
          </button>
        </div>
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: S.text3, paddingTop: 80 }}>
            <div style={{ fontFamily: S.mono, fontSize: 40, opacity: 0.25 }}>⌕</div>
            <p style={{ fontFamily: S.mono, fontSize: 11, opacity: 0.5 }}>検索履歴がありません</p>
            <button onClick={addDemo}
              style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text3, fontFamily: S.mono, fontSize: 10, padding: "6px 16px", cursor: "pointer" }}>
              [DEV] サンプルデータを追加
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <div style={{ padding: "8px 20px", background: S.panel, borderBottom: `1px solid ${S.border}`, fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em" }}>
                // {date}
              </div>
              {(entries as SearchEntry[]).map((entry) => (
                <div key={entry.id}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = S.panel2)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontFamily: S.mono, fontSize: 14, color: S.cyan, flexShrink: 0 }}>⌕</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: S.text }}>{entry.query}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                      {entry.context && (
                        <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{entry.context}</span>
                      )}
                      <span style={{ fontFamily: S.mono, fontSize: 10, color: entry.resultCount === 0 ? S.red : S.green }}>
                        {entry.resultCount === 0 ? "結果なし" : `${entry.resultCount} 件`}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, flexShrink: 0, minWidth: 60, textAlign: "right" }}>{relativeTime(entry.searchedAt)}</span>
                  <button onClick={() => removeSearch(entry.id)}
                    style={{ background: "none", border: "none", color: S.text3, cursor: "pointer", fontSize: 14, padding: "0 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          message="検索履歴をすべて削除しますか？この操作は取り消せません。"
          onConfirm={() => { clearSearch(); setConfirm(false); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [tab, setTab] = useState<"browse" | "search">("browse");
  const { browseHistory, searchHistory } = useHistoryStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 4rem)", margin: "-2rem -1.5rem", background: S.bg, overflow: "hidden" }}>
      {/* header */}
      <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: S.mono, fontSize: 16, color: S.cyan, letterSpacing: ".1em" }}>HISTORY.LOG</div>
          <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginTop: 2, letterSpacing: ".08em" }}>
            機関員アクセス記録 — CLASSIFIED
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: S.mono, fontSize: 18, color: S.cyan }}>{browseHistory.length}</div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>閲覧記録</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: S.mono, fontSize: 18, color: S.yellow }}>{searchHistory.length}</div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>検索記録</div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, display: "flex", flexShrink: 0 }}>
        <TabButton id="browse" label="▸ 閲覧履歴" active={tab === "browse"} onClick={() => setTab("browse")} />
        <TabButton id="search" label="⌕ 検索履歴" active={tab === "search"} onClick={() => setTab("search")} />
        <div style={{ marginLeft: "auto", padding: "0 16px", display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".08em" }}>
            [ ローカルストレージ / 暗号化なし ]
          </span>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "browse" && <BrowseHistoryTab />}
        {tab === "search" && <SearchHistoryTab />}
      </div>
    </div>
  );
}
