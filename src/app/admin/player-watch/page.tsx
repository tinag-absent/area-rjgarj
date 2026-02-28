"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/* ── カラーパレット ── */
const S = {
  bg: "#05070d",
  panel: "#090c14",
  panel2: "#0d1120",
  panel3: "#111828",
  border: "#151d2e",
  border2: "#1e2a40",
  cyan: "#00d4ff",
  green: "#00e676",
  yellow: "#ffd740",
  red: "#ff5252",
  orange: "#ff9800",
  purple: "#ce93d8",
  pink: "#f06292",
  text: "#cdd6e8",
  text2: "#7a8aa0",
  text3: "#3a4a60",
  mono: "'Share Tech Mono','Courier New',monospace",
} as const;

const LEVEL_COLORS: Record<number, [string, string]> = {
  0: ["#445060", "#0c1018"],
  1: ["#4fc3f7", "#001824"],
  2: ["#00e676", "#001810"],
  3: ["#ffd740", "#1a1400"],
  4: ["#ff9800", "#1a0e00"],
  5: ["#ff5252", "#1a0808"],
};
const LEVEL_LABELS: Record<number, string> = {
  0: "見習い", 1: "補助要員", 2: "正規要員",
  3: "上級要員", 4: "機密取扱者", 5: "最高幹部",
};
const ARG_KEYWORDS = [
  "海は削れている", "海蝕プロジェクト", "収束", "西堂",
  "次元", "監視されている", "封印", "観測者は存在しない",
  "記憶", "境界", "消滅",
];

/* ── 型定義 ── */
type PlayerSummary = {
  id: string; agentId: string; name: string; role: string; status: string;
  level: number; xp: number; anomalyScore: number; observerLoad: number;
  divisionName: string; loginCount: number; lastLogin: string; createdAt: string;
  msgCount: number; eventCount: number; flagCount: number;
};

type FlagEntry = { value: unknown; setAt: string };

type PlayerDetail = {
  user: PlayerSummary;
  flags: Record<string, FlagEntry>;
  variables: Record<string, number>;
  events: { id: string; firedAt: string }[];
  chats: Record<string, { message: string; senderName: string; isOwn: boolean; createdAt: string }[]>;
  accessLogs: { method: string; path: string; status_code: number; created_at: string }[];
};

type Tab = "overview" | "story" | "chat" | "logs";

/* ── サブコンポーネント ── */
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: S.mono, fontSize: 9, padding: "2px 7px",
      border: `1px solid ${color}`, color, borderRadius: 2, letterSpacing: ".05em",
    }}>{text}</span>
  );
}

function StatBox({ label, value, color = S.cyan }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 14px", background: S.panel2, border: `1px solid ${S.border2}` }}>
      <div style={{ fontFamily: S.mono, fontSize: 18, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginTop: 4, letterSpacing: ".05em" }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".12em",
      textTransform: "uppercase", paddingBottom: 6, marginBottom: 10,
      borderBottom: `1px solid ${S.border}`,
    }}>{children}</div>
  );
}

/* ── メインページ ── */
export default function PlayerWatchPage() {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [filtered, setFiltered] = useState<PlayerSummary[]>([]);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterAnomaly, setFilterAnomaly] = useState("all");
  const [sortBy, setSortBy] = useState<"lastLogin" | "anomaly" | "level" | "msg">("lastLogin");
  const [tab, setTab] = useState<Tab>("overview");
  const [chatFilter, setChatFilter] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/player-watch");
      if (res.status === 403) { showToast("アクセス権限がありません", false); return; }
      const data = await res.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch { showToast("読み込み失敗", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  // 自動更新
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadPlayers, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadPlayers]);

  // フィルタ & ソート
  useEffect(() => {
    let list = [...players];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.agentId.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.divisionName || "").toLowerCase().includes(q)
      );
    }
    if (filterLevel !== "all") list = list.filter(p => p.level === Number(filterLevel));
    if (filterAnomaly === "high") list = list.filter(p => p.anomalyScore >= 50);
    if (filterAnomaly === "max") list = list.filter(p => p.anomalyScore >= 80);

    list.sort((a, b) => {
      if (sortBy === "lastLogin") return (b.lastLogin || "").localeCompare(a.lastLogin || "");
      if (sortBy === "anomaly") return b.anomalyScore - a.anomalyScore;
      if (sortBy === "level") return b.level - a.level;
      if (sortBy === "msg") return b.msgCount - a.msgCount;
      return 0;
    });
    setFiltered(list);
  }, [players, search, filterLevel, filterAnomaly, sortBy]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setTab("overview");
    setSelectedChatId(null);
    setChatFilter("");
    try {
      const res = await fetch(`/api/admin/player-watch?userId=${id}`);
      const data = await res.json();
      setDetail(data);
    } catch { showToast("詳細取得失敗", false); }
    finally { setDetailLoading(false); }
  };

  // 統計
  const stats = {
    total: players.length,
    online: players.filter(p => p.lastLogin && Date.now() - new Date(p.lastLogin).getTime() < 86400000).length,
    highAnomaly: players.filter(p => p.anomalyScore >= 50).length,
    lv5: players.filter(p => p.level >= 5).length,
  };

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: "9px 16px", fontFamily: S.mono, fontSize: 11, cursor: "pointer",
      background: "none", border: "none",
      borderBottom: `2px solid ${tab === id ? S.purple : "transparent"}`,
      color: tab === id ? S.purple : S.text3, letterSpacing: ".06em",
    }}>{label}</button>
  );

  /* ── チャット表示 ── */
  const renderChat = () => {
    if (!detail) return null;
    const chatIds = Object.keys(detail.chats);
    if (chatIds.length === 0) return (
      <div style={{ padding: 32, textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3 }}>
        チャット履歴なし
      </div>
    );

    const currentChat = selectedChatId
      ? (detail.chats[selectedChatId] || [])
      : [];

    const filteredChat = chatFilter
      ? currentChat.filter(m =>
        m.message.toLowerCase().includes(chatFilter.toLowerCase()) ||
        m.senderName.toLowerCase().includes(chatFilter.toLowerCase())
      )
      : currentChat;

    return (
      <div style={{ display: "flex", gap: 0, height: "100%" }}>
        {/* 会話リスト */}
        <div style={{ width: 180, borderRight: `1px solid ${S.border}`, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${S.border}`, fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".1em" }}>
            会話一覧 ({chatIds.length})
          </div>
          {chatIds.map(cid => {
            const msgs = detail.chats[cid];
            const hasArg = msgs.some(m => ARG_KEYWORDS.some(k => m.message.includes(k)));
            return (
              <div key={cid} onClick={() => setSelectedChatId(cid)}
                style={{
                  padding: "9px 10px", borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                  background: selectedChatId === cid ? "#1a0a28" : "transparent",
                  borderLeft: `2px solid ${selectedChatId === cid ? S.purple : "transparent"}`,
                }}>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 2 }}>
                  {cid} {hasArg && <span style={{ color: S.yellow }}>★ARG</span>}
                </div>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text2 }}>{msgs.length}件</div>
              </div>
            );
          })}
        </div>

        {/* メッセージ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedChatId ? (
            <>
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <input value={chatFilter} onChange={e => setChatFilter(e.target.value)}
                  placeholder="メッセージ検索..."
                  style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "4px 8px", fontFamily: S.mono, fontSize: 10, outline: "none", width: 160 }} />
                {chatFilter && <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{filteredChat.length}件</span>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filteredChat].reverse().map((msg, i) => {
                  const argMatches = ARG_KEYWORDS.filter(k => msg.message.includes(k));
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.isOwn ? "row-reverse" : "row" }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 2, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: S.mono, fontSize: 9, fontWeight: "bold",
                        background: msg.isOwn ? `${S.purple}22` : `${S.cyan}22`,
                        color: msg.isOwn ? S.purple : S.cyan,
                        alignSelf: "flex-start",
                      }}>
                        {(msg.senderName || "?").charAt(0)}
                      </div>
                      <div style={{ maxWidth: "75%" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexDirection: msg.isOwn ? "row-reverse" : "row" }}>
                          <span style={{ fontFamily: S.mono, fontSize: 10, fontWeight: "bold", color: msg.isOwn ? S.purple : S.cyan }}>{msg.senderName}</span>
                          <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{new Date(msg.createdAt).toLocaleString("ja-JP")}</span>
                        </div>
                        <div style={{
                          background: msg.isOwn ? "#1a0828" : S.panel2,
                          border: `1px solid ${msg.isOwn ? `${S.purple}40` : S.border}`,
                          padding: "6px 10px", fontSize: 11, lineHeight: 1.6, color: S.text,
                        }}>
                          {msg.message}
                        </div>
                        {argMatches.length > 0 && (
                          <div style={{ marginTop: 3, fontFamily: S.mono, fontSize: 9, color: S.yellow, padding: "2px 6px", border: `1px solid ${S.yellow}40`, display: "inline-block" }}>
                            ★ ARG: {argMatches.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 11, color: S.text3 }}>
              会話を選択してください
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── レンダリング ── */
  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg, fontFamily: S.mono }}>

      {/* ── 左パネル：プレイヤーリスト ── */}
      <div style={{ width: 270, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* ヘッダー */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.red, letterSpacing: ".1em" }}>
              ⬡ PLAYER WATCH <span style={{ fontSize: 9, color: S.text3, marginLeft: 4 }}>SUPER ADMIN</span>
            </div>
            <button onClick={loadPlayers} title="手動更新"
              style={{ background: "none", border: "none", color: S.text3, cursor: "pointer", fontSize: 12 }}>⟳</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ID / 氏名 / 部門..."
            style={{ width: "100%", background: S.bg, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 10px", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* フィルタ */}
        <div style={{ padding: "6px 10px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
          {["all", "0", "1", "2", "3", "4", "5"].map(v => (
            <button key={v} onClick={() => setFilterLevel(v)} style={{
              background: "none", border: `1px solid ${filterLevel === v ? S.cyan : S.border2}`,
              color: filterLevel === v ? S.cyan : S.text3, fontSize: 9, padding: "2px 7px", cursor: "pointer",
            }}>{v === "all" ? "ALL" : `LV${v}`}</button>
          ))}
        </div>
        <div style={{ padding: "6px 10px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 5, flexShrink: 0 }}>
          {[["all", "全員"], ["high", "異常≥50"], ["max", "異常≥80"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterAnomaly(v)} style={{
              background: "none", border: `1px solid ${filterAnomaly === v ? S.red : S.border2}`,
              color: filterAnomaly === v ? S.red : S.text3, fontSize: 9, padding: "2px 7px", cursor: "pointer",
            }}>{l}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setAutoRefresh(v => !v)} style={{
            background: autoRefresh ? `${S.green}20` : "none",
            border: `1px solid ${autoRefresh ? S.green : S.border2}`,
            color: autoRefresh ? S.green : S.text3, fontSize: 9, padding: "2px 7px", cursor: "pointer",
          }}>{autoRefresh ? "● LIVE" : "LIVE"}</button>
        </div>

        {/* ソート */}
        <div style={{ padding: "4px 10px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: S.text3, alignSelf: "center" }}>SORT:</span>
          {([["lastLogin", "最終ログイン"], ["anomaly", "異常"], ["level", "LV"], ["msg", "MSG"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)} style={{
              background: "none", border: "none", fontSize: 9,
              color: sortBy === v ? S.yellow : S.text3, cursor: "pointer", padding: "1px 4px",
            }}>{l}</button>
          ))}
        </div>

        {/* プレイヤーリスト */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, fontSize: 11, color: S.text3, textAlign: "center" }}>該当なし</div>
          ) : filtered.map(p => {
            const [col, bg] = LEVEL_COLORS[p.level] || LEVEL_COLORS[0];
            const isSelected = detail?.user.id === p.id;
            const isOnline = p.lastLogin && Date.now() - new Date(p.lastLogin).getTime() < 86400000;
            const highAnomaly = p.anomalyScore >= 50;
            return (
              <div key={p.id} onClick={() => loadDetail(p.id)}
                style={{
                  padding: "10px 12px", borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  background: isSelected ? "#0a1428" : "transparent",
                  borderLeft: `2px solid ${isSelected ? S.purple : "transparent"}`,
                }}>
                {/* アバター */}
                <div style={{
                  width: 30, height: 30, borderRadius: 2, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: S.mono, fontSize: 11, fontWeight: "bold",
                  background: bg, color: col, position: "relative",
                }}>
                  {(p.name || "?").charAt(0)}
                  {isOnline && <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: "50%", background: S.green, border: `1px solid ${S.bg}` }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: S.text3 }}>{p.agentId}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: S.text3 }}>💬{p.msgCount}</span>
                    <span style={{ fontSize: 9, color: S.text3 }}>⚡{p.eventCount}</span>
                    {highAnomaly && <span style={{ fontSize: 9, color: S.red }}>⚠{p.anomalyScore}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: 9, padding: "1px 5px", border: `1px solid ${col}`, color: col }}>LV{p.level}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 統計フッター */}
        <div style={{ borderTop: `1px solid ${S.border}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          {[["total", stats.total, S.cyan, "総数"], ["online", stats.online, S.green, "24h活動"], ["anom", stats.highAnomaly, S.red, "要注意"], ["lv5", stats.lv5, S.purple, "LV5"]].map(([k, v, c, l]) => (
            <div key={String(k)} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: String(c) }}>{v}</div>
              <div style={{ fontSize: 8, color: S.text3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 右パネル：詳細 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!detail && !detailLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: S.text3 }}>
            <div style={{ fontSize: 40, opacity: .15 }}>[ PLAYER WATCH ]</div>
            <p style={{ fontSize: 11 }}>左から機関員を選択してください</p>
            <p style={{ fontSize: 9, color: S.red, opacity: .5 }}>// SUPER ADMIN ONLY — CLASSIFIED LEVEL ∞</p>
          </div>
        ) : detailLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 11, color: S.text3 }}>読み込み中...</div>
          </div>
        ) : detail ? (
          <>
            {/* ユーザーヘッダー */}
            <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, padding: "12px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 2,
                  background: LEVEL_COLORS[detail.user.level]?.[1] || S.panel2,
                  color: LEVEL_COLORS[detail.user.level]?.[0] || S.text3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: "bold", flexShrink: 0,
                }}>
                  {(detail.user.name || "?").charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: S.text, marginBottom: 3 }}>{detail.user.name}</div>
                  <div style={{ fontSize: 10, color: S.text3, marginBottom: 6 }}>{detail.user.agentId}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge text={`LV${detail.user.level} ${LEVEL_LABELS[detail.user.level]}`} color={LEVEL_COLORS[detail.user.level]?.[0] || S.text3} />
                    <Badge text={detail.user.role.toUpperCase()} color={detail.user.role === "super_admin" ? S.purple : detail.user.role === "admin" ? S.orange : S.text3} />
                    <Badge text={detail.user.status.toUpperCase()} color={detail.user.status === "active" ? S.green : S.yellow} />
                    <Badge text={`XP ${detail.user.xp}`} color={S.cyan} />
                    {detail.user.anomalyScore >= 50 && <Badge text={`ANOMALY ${detail.user.anomalyScore}`} color={S.red} />}
                    {detail.user.divisionName && <Badge text={detail.user.divisionName} color={S.text2} />}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <StatBox label="ログイン数" value={detail.user.loginCount} color={S.cyan} />
                  <StatBox label="連続ログイン" value={`${detail.user.streak || 0}日`} color={S.green} />
                  <StatBox label="MSG数" value={detail.user.msgCount} color={S.purple} />
                  <StatBox label="イベント発火" value={detail.user.eventCount} color={S.yellow} />
                </div>
              </div>

              {/* タブ */}
              <div style={{ display: "flex", borderTop: `1px solid ${S.border}`, marginTop: 4 }}>
                {tabBtn("overview", "概要")}
                {tabBtn("story", "ストーリー状態")}
                {tabBtn("chat", `チャット履歴 (${Object.keys(detail.chats).length})`)}
                {tabBtn("logs", `アクセスログ (${detail.accessLogs.length})`)}
              </div>
            </div>

            {/* タブコンテンツ */}
            <div style={{ flex: 1, overflowY: tab === "chat" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>

              {/* ── overview ── */}
              {tab === "overview" && (
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <SectionTitle>// 基本情報</SectionTitle>
                      {[
                        ["最終ログイン", detail.user.lastLogin ? new Date(detail.user.lastLogin).toLocaleString("ja-JP") : "—"],
                        ["アカウント作成", detail.user.createdAt ? new Date(detail.user.createdAt).toLocaleDateString("ja-JP") : "—"],
                        ["XP", detail.user.xp],
                        ["レベル", `${detail.user.level} — ${LEVEL_LABELS[detail.user.level]}`],
                      ].map(([k, v]) => (
                        <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${S.border}`, fontSize: 11 }}>
                          <span style={{ color: S.text3 }}>{k}</span>
                          <span style={{ color: S.text }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <SectionTitle>// 監視指標</SectionTitle>
                      {[
                        ["異常スコア", { v: detail.user.anomalyScore, c: detail.user.anomalyScore >= 80 ? S.red : detail.user.anomalyScore >= 50 ? S.orange : S.green }],
                        ["オブザーバー負荷", { v: `${detail.user.observerLoad || 0}%`, c: S.cyan }],
                        ["フラグ数", { v: Object.keys(detail.flags).length, c: S.text }],
                        ["変数数", { v: Object.keys(detail.variables).length, c: S.text }],
                      ].map(([k, d]) => (
                        <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${S.border}`, fontSize: 11 }}>
                          <span style={{ color: S.text3 }}>{k}</span>
                          <span style={{ color: (d as { c: string }).c, fontWeight: "bold" }}>{(d as { v: string | number }).v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <SectionTitle>// 活動指標</SectionTitle>
                      {[
                        ["メッセージ数", { v: detail.user.msgCount, c: S.purple }],
                        ["イベント発火数", { v: detail.user.eventCount, c: S.yellow }],
                        ["ログイン数", { v: detail.user.loginCount, c: S.cyan }],
                        ["連続日数", { v: `${detail.user.streak || 0}日`, c: S.green }],
                      ].map(([k, d]) => (
                        <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${S.border}`, fontSize: 11 }}>
                          <span style={{ color: S.text3 }}>{k}</span>
                          <span style={{ color: (d as { c: string }).c }}>{(d as { v: string | number }).v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 最近のイベント */}
                  <div>
                    <SectionTitle>// 最近の発火イベント (最新5件)</SectionTitle>
                    {detail.events.slice(0, 5).length === 0 ? (
                      <div style={{ fontSize: 11, color: S.text3 }}>なし</div>
                    ) : detail.events.slice(0, 5).map(e => (
                      <div key={e.id + e.firedAt} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: S.panel2, border: `1px solid ${S.border}`, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: S.green }}>{e.id}</span>
                        <span style={{ fontSize: 10, color: S.text3 }}>{new Date(e.firedAt).toLocaleString("ja-JP")}</span>
                      </div>
                    ))}
                  </div>

                  {/* 重要フラグ */}
                  <div>
                    <SectionTitle>// フラグ状態 ({Object.keys(detail.flags).length})</SectionTitle>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(detail.flags).map(([k, f]) => {
                        const on = !!f.value;
                        return (
                          <span key={k} style={{
                            fontSize: 10, padding: "3px 9px",
                            border: `1px solid ${on ? S.green : S.border2}`,
                            color: on ? S.green : S.text3,
                            background: on ? "rgba(0,230,118,.04)" : "transparent",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: on ? S.green : S.text3, display: "inline-block" }} />
                            {k}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── story ── */}
              {tab === "story" && (
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <SectionTitle>// フラグ詳細 ({Object.keys(detail.flags).length}件)</SectionTitle>
                    {Object.entries(detail.flags).map(([k, f]) => {
                      const on = !!f.value;
                      return (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: S.panel2, border: `1px solid ${on ? `${S.green}30` : S.border}`, marginBottom: 4 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? S.green : S.text3, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 11, color: on ? S.text : S.text3 }}>{k}</span>
                          <span style={{ fontSize: 10, color: S.text3 }}>{f.setAt ? new Date(f.setAt).toLocaleString("ja-JP") : "—"}</span>
                          <span style={{ fontSize: 10, color: on ? S.green : S.text3 }}>{JSON.stringify(f.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <SectionTitle>// 変数 ({Object.keys(detail.variables).length}件)</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      {Object.entries(detail.variables).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: S.panel2, border: `1px solid ${S.border}` }}>
                          <span style={{ fontSize: 10, color: S.text2 }}>{k}</span>
                          <span style={{ fontSize: 12, color: S.yellow, fontWeight: "bold" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionTitle>// 発火イベント全件 ({detail.events.length}件)</SectionTitle>
                    {detail.events.map(e => (
                      <div key={e.id + e.firedAt} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: S.panel2, border: `1px solid ${S.border}`, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: S.green }}>{e.id}</span>
                        <span style={{ fontSize: 10, color: S.text3 }}>{new Date(e.firedAt).toLocaleString("ja-JP")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── chat ── */}
              {tab === "chat" && (
                <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                  {renderChat()}
                </div>
              )}

              {/* ── logs ── */}
              {tab === "logs" && (
                <div style={{ padding: 18 }}>
                  <SectionTitle>// アクセスログ (最新{detail.accessLogs.length}件)</SectionTitle>
                  {detail.accessLogs.length === 0 ? (
                    <div style={{ fontSize: 11, color: S.text3 }}>ログなし</div>
                  ) : detail.accessLogs.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "5px 10px", background: i % 2 === 0 ? S.panel2 : "transparent", border: `1px solid ${S.border}`, marginBottom: 2, alignItems: "center" }}>
                      <span style={{ fontSize: 9, padding: "1px 5px", border: `1px solid ${l.method === "GET" ? S.cyan : l.method === "POST" ? S.green : S.orange}`, color: l.method === "GET" ? S.cyan : l.method === "POST" ? S.green : S.orange, flexShrink: 0 }}>{l.method}</span>
                      <span style={{ fontSize: 10, color: l.status_code >= 400 ? S.red : S.text2, flexShrink: 0 }}>{l.status_code}</span>
                      <span style={{ flex: 1, fontSize: 10, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.path}</span>
                      <span style={{ fontSize: 9, color: S.text3, flexShrink: 0 }}>{new Date(l.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: S.panel, padding: "10px 16px",
          border: `1px solid ${toast.ok ? S.green : S.red}`,
          color: toast.ok ? S.green : S.red, fontSize: 11,
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
