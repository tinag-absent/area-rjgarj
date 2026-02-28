"use client";

import { useEffect, useState, useCallback } from "react";

const LEVEL_COLORS: Record<number, [string, string]> = {
  0: ["#445060", "#0c1018"],
  1: ["#4fc3f7", "#001824"],
  2: ["#00e676", "#001810"],
  3: ["#ffd740", "#1a1400"],
  4: ["#ff9800", "#1a0e00"],
  5: ["#ff5252", "#1a0808"],
};
const LEVEL_TITLES: Record<number, string> = {
  0: "見習い", 1: "補助要員", 2: "正規要員", 3: "上級要員", 4: "機密取扱者", 5: "最高幹部",
};
const ARG_KEYWORDS = ["海は削れている", "海蝕プロジェクト", "収束", "西堂", "次元", "監視されている", "封印", "観測者は存在しない", "記憶", "境界", "消滅"];
const KNOWN_FLAGS = ["first_login_done", "tutorial_complete", "division_joined", "phase1_unlocked", "phase2_unlocked", "anomaly_detected", "observer_warned", "collapse_imminent"];

type Player = {
  id: string; agentId: string; name: string; role: string; status: string;
  level: number; xp: number; anomalyScore: number; division: string; divisionName: string;
  loginCount: number; lastLogin: string; createdAt: string;
};

type PlayerDetail = Player & {
  observerLoad: number; streak: number;
  flags: Record<string, unknown>; variables: Record<string, number>;
  events: { id: string; firedAt: string }[];
};

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

function Badge({ text, color, bg }: { text: string; color: string; bg?: string }) {
  return (
    <span style={{
      fontFamily: S.mono, fontSize: 9, padding: "2px 7px", border: `1px solid ${color}`,
      color, background: bg || "transparent", borderRadius: 2, letterSpacing: ".05em",
    }}>{text}</span>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text" }: { value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none", width: "100%" }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 11, outline: "none", width: "100%", cursor: "pointer" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filtered, setFiltered] = useState<Player[]>([]);
  const [selected, setSelected] = useState<PlayerDetail | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetResult, setResetResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notifBody, setNotifBody] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editName, setEditName] = useState("");
  const [editXP, setEditXP] = useState(0);
  const [editAnomaly, setEditAnomaly] = useState(0);

  const showToast = (msg: string, type = "") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch { showToast("読み込み失敗", "err"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  useEffect(() => {
    let list = players;
    if (search) list = list.filter(p => p.agentId.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));
    if (filterMode === "5") list = list.filter(p => p.level === 5);
    else if (filterMode === "4") list = list.filter(p => p.level === 4);
    else if (filterMode === "low") list = list.filter(p => p.level <= 1);
    setFiltered(list);
  }, [players, search, filterMode]);

  const selectPlayer = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      setSelected(data);
      setEditRole(data.role);
      setEditStatus(data.status);
      setEditName(data.name);
      setEditXP(data.xp);
      setEditAnomaly(data.anomalyScore);
      setActiveTab("profile");
    } catch { showToast("詳細取得失敗", "err"); }
  };

  const savePlayer = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, status: editStatus, displayName: editName, anomalyScore: editAnomaly }),
      });
      showToast("保存しました");
      await loadPlayers();
      await selectPlayer(selected.id);
    } catch { showToast("保存失敗", "err"); }
    finally { setSaving(false); }
  };

  const deletePlayer = async () => {
    if (!selected || !confirm(`${selected.agentId} を削除しますか？`)) return;
    try {
      await fetch(`/api/admin/users/${selected.id}`, { method: "DELETE" });
      showToast("削除しました", "warn");
      setSelected(null);
      await loadPlayers();
    } catch { showToast("削除失敗", "err"); }
  };

  const stats = {
    total: players.length,
    lv5: players.filter(p => p.level >= 5).length,
    avgLv: players.length ? (players.reduce((s, p) => s + p.level, 0) / players.length).toFixed(1) : "—",
    avgXp: players.length ? Math.round(players.reduce((s, p) => s + p.xp, 0) / players.length) : "—",
  };

  const sendNotification = async () => {
    if (!selected || !notifTitle.trim() || !notifBody.trim() || notifSending) return;
    setNotifSending(true); setNotifResult(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: `user:${selected.id}`, type: notifType, title: notifTitle.trim(), body: notifBody.trim() }),
      });
      const data = await res.json();
      setNotifResult(data.message || data.error || "完了");
      if (res.ok) { setNotifTitle(""); setNotifBody(""); }
    } catch { setNotifResult("送信失敗"); }
    finally { setNotifSending(false); setTimeout(() => setNotifResult(null), 4000); }
  };

  const tabStyle = (tab: string) => ({
    padding: "10px 18px", fontFamily: S.mono, fontSize: 11, cursor: "pointer",
    borderBottom: `2px solid ${activeTab === tab ? S.cyan : "transparent"}`,
    color: activeTab === tab ? S.cyan : S.text3, letterSpacing: ".06em", background: "none", border: "none",
    borderBottomWidth: 2, borderBottomStyle: "solid" as const,
    borderBottomColor: activeTab === tab ? S.cyan : "transparent",
  });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="機関員ID / 氏名..."
            style={{ flex: 1, background: S.bg, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
        </div>
        <div style={{ padding: "6px 12px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 5 }}>
          {["all", "5", "4", "low"].map(f => (
            <button key={f} onClick={() => setFilterMode(f)}
              style={{ background: "none", border: `1px solid ${filterMode === f ? S.cyan : S.border2}`, color: filterMode === f ? S.cyan : S.text3, fontFamily: S.mono, fontSize: 9, padding: "3px 8px", cursor: "pointer" }}>
              {f === "all" ? "ALL" : f === "low" ? "低LV" : `LV${f}`}
            </button>
          ))}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? <div style={{ padding: 20, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div> : filtered.map(p => {
            const [col, bg] = LEVEL_COLORS[p.level] || LEVEL_COLORS[0];
            const initials = (p.name || "?").charAt(0);
            return (
              <div key={p.id} onClick={() => selectPlayer(p.id)}
                style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selected?.id === p.id ? "#0a1828" : "transparent", borderLeft: selected?.id === p.id ? `2px solid ${S.cyan}` : "2px solid transparent" }}>
                <div style={{ width: 32, height: 32, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 11, fontWeight: "bold", background: bg, color: col, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{p.agentId}</div>
                </div>
                <span style={{ fontFamily: S.mono, fontSize: 9, padding: "2px 5px", border: `1px solid ${col}`, color: col, flexShrink: 0 }}>LV{p.level}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Stats bar */}
        <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, padding: "10px 20px", display: "flex", gap: 28, flexShrink: 0 }}>
          {[{ label: "総機関員数", value: stats.total, color: S.cyan }, { label: "LV5到達", value: stats.lv5, color: S.red }, { label: "平均レベル", value: stats.avgLv, color: S.purple }, { label: "平均XP", value: stats.avgXp, color: S.yellow }].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: S.mono, fontSize: 18, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{s.label}</div>
            </div>
          ))}
          <button onClick={loadPlayers} style={{ marginLeft: "auto", background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>⟳ 更新</button>
        </div>

        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: S.text3 }}>
            <div style={{ fontFamily: S.mono, fontSize: 36, opacity: .3 }}>[ 未選択 ]</div>
            <p style={{ fontFamily: S.mono, fontSize: 11 }}>左のリストから機関員を選択してください</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, display: "flex", flexShrink: 0 }}>
              {[["profile", "プロフィール"], ["progress", "レベル / XP"], ["story", "ストーリー状態"], ["events", "発火イベント"], ["notify", "通知を送る"], ["security", "🔑 セキュリティ"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={tabStyle(id)}>{label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {activeTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Profile card */}
                  <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: 18, display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 22, fontWeight: "bold", background: LEVEL_COLORS[selected.level]?.[1] || S.panel2, color: LEVEL_COLORS[selected.level]?.[0] || S.text3, flexShrink: 0 }}>
                      {(selected.name || "?").charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 500, color: S.text, marginBottom: 4 }}>{selected.name}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text3, marginBottom: 8 }}>{selected.agentId}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge text={`LV${selected.level} — ${LEVEL_TITLES[selected.level]}`} color={LEVEL_COLORS[selected.level]?.[0] || S.text3} />
                        <Badge text={selected.role.toUpperCase()} color={selected.role === "admin" ? S.red : selected.role === "super_admin" ? S.purple : S.text3} />
                        <Badge text={selected.status.toUpperCase()} color={selected.status === "active" ? S.green : S.yellow} />
                        <Badge text={`XP ${selected.xp}`} color={S.cyan} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "right" }}>
                      <span>ログイン数: {selected.loginCount}</span>
                      <span>最終ログイン: {selected.lastLogin ? new Date(selected.lastLogin).toLocaleDateString("ja-JP") : "—"}</span>
                      <span>作成日: {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("ja-JP") : "—"}</span>
                      <span>異常スコア: <span style={{ color: selected.anomalyScore > 30 ? S.red : S.text2 }}>{selected.anomalyScore}</span></span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FieldGroup label="表示名"><Input value={editName} onChange={setEditName} /></FieldGroup>
                    <FieldGroup label="ロール">
                      <Select value={editRole} onChange={setEditRole} options={[{ value: "player", label: "player" }, { value: "admin", label: "admin" }, { value: "super_admin", label: "super_admin" }]} />
                    </FieldGroup>
                    <FieldGroup label="ステータス">
                      <Select value={editStatus} onChange={setEditStatus} options={[{ value: "active", label: "active" }, { value: "suspended", label: "suspended" }, { value: "banned", label: "banned" }]} />
                    </FieldGroup>
                    <FieldGroup label="異常スコア"><Input type="number" value={editAnomaly} onChange={v => setEditAnomaly(Number(v))} /></FieldGroup>
                  </div>
                </div>
              )}

              {activeTab === "progress" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: S.mono, fontSize: 13, color: S.cyan }}>LEVEL {selected.level}</span>
                      <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text2 }}>{selected.xp} XP</span>
                    </div>
                    <div style={{ height: 6, background: S.border2 }}>
                      <div style={{ height: "100%", background: `linear-gradient(90deg, ${S.cyan}, #0080ff)`, width: `${Math.min(100, (selected.xp / 2500) * 100)}%` }} />
                    </div>
                  </div>
                  <FieldGroup label="XP直接設定">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" value={editXP} onChange={e => setEditXP(Number(e.target.value))}
                        style={{ flex: 1, background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none" }} />
                      <button style={{ background: "none", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 10, padding: "7px 14px", cursor: "pointer" }}>SET</button>
                    </div>
                  </FieldGroup>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>
                    <div>連続ログイン: {selected.streak}日</div>
                    <div>オブザーバー負荷: {selected.observerLoad}%</div>
                  </div>
                </div>
              )}

              {activeTab === "story" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".1em", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>// フラグ状態</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {KNOWN_FLAGS.map(f => {
                        const on = !!selected.flags[f];
                        return (
                          <span key={f} style={{ fontFamily: S.mono, fontSize: 10, padding: "4px 10px", border: `1px solid ${on ? S.green : S.border2}`, color: on ? S.green : S.text3, background: on ? "rgba(0,230,118,.05)" : "transparent", display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: on ? S.green : S.text3, display: "inline-block" }} /> {f}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".1em", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>// 変数</div>
                    {Object.entries(selected.variables).slice(0, 20).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", background: S.panel2, border: `1px solid ${S.border}`, marginBottom: 5 }}>
                        <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text2, minWidth: 160 }}>{k}</span>
                        <span style={{ fontFamily: S.mono, fontSize: 13, color: S.yellow }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "events" && (
                <div>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 10 }}>発火済みイベント: {selected.events.length}件</div>
                  {selected.events.length === 0 ? (
                    <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center", padding: 24 }}>イベントなし</div>
                  ) : selected.events.map(e => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", background: S.panel2, border: `1px solid ${S.border}`, marginBottom: 4 }}>
                      <span style={{ fontFamily: S.mono, fontSize: 11, color: S.green }}>{e.id}</span>
                      <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{new Date(e.firedAt).toLocaleString("ja-JP")}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "notify" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 6 }}>
                    送信先: <span style={{ color: S.cyan }}>{selected.agentId}</span> / {selected.name}
                  </div>
                  <FieldGroup label="通知タイプ">
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["info", "warning", "critical"] as const).map(t => (
                        <button key={t} onClick={() => setNotifType(t)}
                          style={{ background: notifType === t ? "rgba(0,212,255,.1)" : "none", border: `1px solid ${notifType === t ? S.cyan : S.border2}`, color: notifType === t ? S.cyan : S.text3, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </FieldGroup>
                  <FieldGroup label="タイトル">
                    <Input value={notifTitle} onChange={setNotifTitle} />
                  </FieldGroup>
                  <FieldGroup label="本文">
                    <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={4}
                      style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none", width: "100%", resize: "vertical", lineHeight: 1.6 }} />
                  </FieldGroup>
                  <button onClick={sendNotification} disabled={!notifTitle.trim() || !notifBody.trim() || notifSending}
                    style={{ background: "rgba(0,212,255,.1)", border: `1px solid ${S.cyan}`, color: S.cyan, fontFamily: S.mono, fontSize: 11, padding: "8px 20px", cursor: "pointer", letterSpacing: ".08em", opacity: (!notifTitle.trim() || !notifBody.trim() || notifSending) ? 0.4 : 1 }}>
                    {notifSending ? "送信中..." : "▶ 通知を送信"}
                  </button>
                  {notifResult && (
                    <div style={{ fontFamily: S.mono, fontSize: 11, color: S.green, padding: "8px 12px", border: `1px solid ${S.green}40`, background: "rgba(0,230,118,.05)" }}>
                      ✓ {notifResult}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 6 }}>
                    対象: <span style={{ color: S.cyan }}>{selected.agentId}</span> / {selected.name}
                  </div>
                  <div style={{ padding: "10px 14px", background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.2)", fontFamily: S.mono, fontSize: 10, color: "#ff8a80", lineHeight: 1.6 }}>
                    ⚠ この操作は機関員のパスキーを強制的に変更します。<br />
                    本人が新しいパスキーでログインできるよう、設定後は必ず本人に通知してください。
                  </div>
                  <FieldGroup label="新しいパスキー（8文字以上）">
                    <Input type="text" value={resetPw} onChange={setResetPw} />
                  </FieldGroup>
                  <button
                    onClick={async () => {
                      if (!resetPw || resetPw.length < 8) {
                        setResetResult({ ok: false, msg: "8文字以上のパスキーを入力してください" });
                        return;
                      }
                      setResetting(true); setResetResult(null);
                      try {
                        const res = await fetch(`/api/admin/users/${selected.id}/reset-password`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ newPassword: resetPw }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setResetResult({ ok: true, msg: "パスキーをリセットしました" });
                          setResetPw("");
                        } else {
                          setResetResult({ ok: false, msg: data.error ?? "エラーが発生しました" });
                        }
                      } catch {
                        setResetResult({ ok: false, msg: "通信エラー" });
                      } finally {
                        setResetting(false);
                      }
                    }}
                    disabled={resetting || resetPw.length < 8}
                    style={{ background: "rgba(255,152,0,.1)", border: "1px solid rgba(255,152,0,0.5)", color: "#ff9800", fontFamily: S.mono, fontSize: 11, padding: "8px 20px", cursor: "pointer", letterSpacing: ".08em", opacity: (resetting || resetPw.length < 8) ? 0.4 : 1 }}>
                    {resetting ? "処理中..." : "🔑 パスキーを強制リセット"}
                  </button>
                  {resetResult && (
                    <div style={{ fontFamily: S.mono, fontSize: 11, color: resetResult.ok ? S.green : S.red, padding: "8px 12px", border: `1px solid ${resetResult.ok ? S.green : S.red}40`, background: resetResult.ok ? "rgba(0,230,118,.05)" : "rgba(255,82,82,.05)" }}>
                      {resetResult.ok ? "✓" : "✗"} {resetResult.msg}
                    </div>
                  )}
                </div>
              )}

            </div>{/* end tab content */}
            <div style={{ padding: "12px 20px", background: S.panel, borderTop: `1px solid ${S.border}`, display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              <button onClick={savePlayer} disabled={saving} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 11, padding: "7px 18px", cursor: "pointer", letterSpacing: ".08em" }}>
                {saving ? "保存中..." : "▶ 変更を保存"}
              </button>
              <button onClick={deletePlayer} style={{ marginLeft: "auto", background: "none", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 11, padding: "7px 14px", cursor: "pointer" }}>✕ 機関員を削除</button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: S.panel, border: `1px solid ${toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.green}`, color: toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.green, fontFamily: S.mono, fontSize: 11, padding: "10px 16px", zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
