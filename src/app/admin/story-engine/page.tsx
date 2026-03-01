"use client";
import { apiFetch } from "@/lib/fetch";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", orange: "#ff9800", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

type MissionParticipant = { id: number; mission_id: string; user_id: string; username: string; display_name: string; status: string; joined_at: string };
type FlagRow = { user_id: string; username: string; flag_key: string; flag_value: string; set_at: string };
type VarRow = { user_id: string; username: string; var_key: string; var_value: number };
type EventRow = { user_id: string; username: string; event_id: string; fired_at: string };

export default function StoryEnginePage() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [vars, setVars] = useState<VarRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [participants, setParticipants] = useState<MissionParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("flags");
  const [search, setSearch] = useState("");

  // 通知送信 state
  const [notifTarget, setNotifTarget] = useState("all");
  const [notifType,   setNotifType]   = useState("info");
  const [notifTitle,  setNotifTitle]  = useState("");
  const [notifBody,   setNotifBody]   = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult,  setNotifResult]  = useState<string | null>(null);

  // 手動発火 state
  const [fireUserId,    setFireUserId]    = useState("");
  const [fireEventId,   setFireEventId]   = useState("");
  const [fireFlag,      setFireFlag]      = useState("");
  const [fireFlagValue, setFireFlagValue] = useState("true");
  const [fireXp,        setFireXp]        = useState(0);
  const [fireNotifTitle,setFireNotifTitle]= useState("");
  const [fireNotifBody, setFireNotifBody] = useState("");
  const [fireSending,   setFireSending]   = useState(false);
  const [fireResult,    setFireResult]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, pRes] = await Promise.all([
        fetch("/api/admin/story-states"),
        fetch("/api/admin/mission-participants"),
      ]);
      const data = await stRes.json();
      setFlags(data.flags || []);
      setVars(data.variables || []);
      setEvents(data.events || []);
      const pd = await pRes.json().catch(() => []);
      setParticipants(Array.isArray(pd) ? pd : []);
    } finally { setLoading(false); }
  }, []);

  async function updateParticipant(participantId: number, status: "approved" | "rejected") {
    try {
      const res = await apiFetch("/api/admin/mission-participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, status }),
      });
      if (res.ok) await load();
    } catch { /* silent */ }
  }

  useEffect(() => { load(); }, [load]);

  async function fireEvent() {
    if (!fireUserId.trim() || !fireEventId.trim() || fireSending) return;
    setFireSending(true); setFireResult(null);
    try {
      const res = await apiFetch("/api/admin/fire-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: fireUserId.trim(),
          eventId: fireEventId.trim(),
          flag: fireFlag.trim() || undefined,
          flagValue: fireFlagValue || "true",
          xp: fireXp > 0 ? fireXp : undefined,
          notification: fireNotifTitle.trim() ? { type: "info", title: fireNotifTitle.trim(), body: fireNotifBody.trim() } : undefined,
        }),
      });
      const data = await res.json();
      setFireResult(data.message || data.error || "完了");
      if (res.ok) await load();
    } catch { setFireResult("発火失敗"); }
    finally { setFireSending(false); setTimeout(() => setFireResult(null), 5000); }
  }

  async function sendNotification() {
    if (!notifTitle.trim() || !notifBody.trim() || notifSending) return;
    setNotifSending(true); setNotifResult(null);
    try {
      const res = await apiFetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: notifTarget, type: notifType, title: notifTitle.trim(), body: notifBody.trim() }),
      });
      const data = await res.json();
      setNotifResult(data.message || data.error || "完了");
      if (res.ok) { setNotifTitle(""); setNotifBody(""); }
    } catch { setNotifResult("送信失敗"); }
    finally { setNotifSending(false); setTimeout(() => setNotifResult(null), 4000); }
  }

  const tabStyle = (tab: string) => ({
    padding: "9px 16px", fontFamily: S.mono, fontSize: 11, cursor: "pointer", background: "none", border: "none",
    borderBottomWidth: 2, borderBottomStyle: "solid" as const,
    borderBottomColor: activeTab === tab ? S.orange : "transparent",
    color: activeTab === tab ? S.orange : S.text3, letterSpacing: ".06em",
  });

  const filterRow = (q: string) => {
    const lq = q.toLowerCase();
    if (activeTab === "flags") return flags.filter(f => !lq || f.flag_key.includes(lq) || f.username.includes(lq));
    if (activeTab === "vars") return vars.filter(v => !lq || v.var_key.includes(lq) || v.username.includes(lq));
    return events.filter(e => !lq || e.event_id.includes(lq) || e.username.includes(lq));
  };

  const rows = filterRow(search);

  const groupByKey = (data: (FlagRow | VarRow | EventRow)[], keyFn: (d: unknown) => string) => {
    const map: Record<string, unknown[]> = {};
    data.forEach(d => { const k = keyFn(d); if (!map[k]) map[k] = []; map[k].push(d); });
    return map;
  };

  return (
    <div style={{ background: S.bg, margin: "-2rem -1.5rem", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: S.panel, borderBottom: `1px solid ${S.border2}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.orange, boxShadow: `0 0 8px ${S.orange}`, animation: "blink 2s infinite" }} />
        <span style={{ fontFamily: S.mono, fontSize: 12, color: S.orange, letterSpacing: ".2em" }}>ストーリーエンジン管理</span>
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="キー / ユーザー検索..."
          style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "5px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", width: 200 }} />
        <button onClick={load} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>⟳ 更新</button>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: S.border }}>
        {[{ label: "フラグ総数", value: flags.length, color: S.green }, { label: "変数総数", value: vars.length, color: S.yellow }, { label: "発火イベント総数", value: events.length, color: S.orange }].map(s => (
          <div key={s.label} style={{ background: S.panel, padding: "12px 20px" }}>
            <div style={{ fontFamily: S.mono, fontSize: 24, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".1em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, display: "flex" }}>
        <button onClick={() => setActiveTab("flags")} style={tabStyle("flags")}>フラグ ({flags.length})</button>
        <button onClick={() => setActiveTab("vars")} style={tabStyle("vars")}>変数 ({vars.length})</button>
        <button onClick={() => setActiveTab("events")} style={tabStyle("events")}>発火イベント ({events.length})</button>
        <button onClick={() => setActiveTab("missions")} style={tabStyle("missions")}>ミッション参加 ({participants.length})</button>
        <button onClick={() => setActiveTab("fire")} style={tabStyle("fire")}>⚡ 手動発火</button>
        <button onClick={() => setActiveTab("notify")} style={tabStyle("notify")}>📣 通知送信</button>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3, padding: 40 }}>読み込み中...</div>
        ) : activeTab === "flags" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ユーザー", "フラグキー", "値", "設定日時"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em", borderBottom: `1px solid ${S.border2}`, background: S.panel2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as FlagRow[]).map((f, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.cyan }}>{f.username}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.green }}>{f.flag_key}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.yellow }}>{f.flag_value}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{new Date(f.set_at).toLocaleString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === "vars" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ユーザー", "変数キー", "値"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em", borderBottom: `1px solid ${S.border2}`, background: S.panel2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as VarRow[]).map((v, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.cyan }}>{v.username}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.yellow }}>{v.var_key}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 13, color: v.var_key === "total_xp" ? S.cyan : v.var_key === "anomaly_score" ? S.red : S.text }}>{String(v.var_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ユーザー", "イベントID", "発火日時"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em", borderBottom: `1px solid ${S.border2}`, background: S.panel2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as EventRow[]).map((e, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.cyan }}>{e.username}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.green }}>{e.event_id}</td>
                  <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{new Date(e.fired_at).toLocaleString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {activeTab === "missions" && (
        <div>
          {participants.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3, padding: 40 }}>参加申請なし</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ミッションID", "機関員", "ステータス", "申請日時", "操作"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".08em", borderBottom: `1px solid ${S.border2}`, background: S.panel2 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.filter(p => !search || p.username.includes(search) || p.mission_id.includes(search)).map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.cyan }}>{p.mission_id}</td>
                    <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 11, color: S.text }}>
                      {p.display_name || p.username}
                      <span style={{ color: S.text3, marginLeft: 6 }}>({p.username})</span>
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <span style={{
                        fontFamily: S.mono, fontSize: 10, padding: "2px 8px", borderRadius: 2,
                        color: p.status === "approved" ? S.green : p.status === "rejected" ? S.red : S.yellow,
                        border: `1px solid ${p.status === "approved" ? S.green : p.status === "rejected" ? S.red : S.yellow}`,
                        background: "transparent",
                      }}>
                        {p.status === "approved" ? "承認済" : p.status === "rejected" ? "却下" : "申請中"}
                      </span>
                    </td>
                    <td style={{ padding: "7px 12px", fontFamily: S.mono, fontSize: 10, color: S.text3 }}>
                      {new Date(p.joined_at).toLocaleString("ja-JP")}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      {p.status === "applied" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => updateParticipant(p.id, "approved")}
                            style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 10, padding: "3px 10px", cursor: "pointer" }}>
                            承認
                          </button>
                          <button onClick={() => updateParticipant(p.id, "rejected")}
                            style={{ background: "none", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 10, padding: "3px 10px", cursor: "pointer" }}>
                            却下
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "fire" && (
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: S.red, letterSpacing: ".12em", marginBottom: 4 }}>
            // イベント手動発火（管理者専用）
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>対象ユーザーID（UUID）</div>
              <input value={fireUserId} onChange={e => setFireUserId(e.target.value)} placeholder="users.id (UUID)"
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>イベントID</div>
              <input value={fireEventId} onChange={e => setFireEventId(e.target.value)} placeholder="例: manual_event_001"
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>付与フラグキー（任意）</div>
              <input value={fireFlag} onChange={e => setFireFlag(e.target.value)} placeholder="例: phase2_unlocked"
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>フラグ値</div>
              <input value={fireFlagValue} onChange={e => setFireFlagValue(e.target.value)} placeholder="true"
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>付与XP（任意）</div>
            <input type="number" value={fireXp} onChange={e => setFireXp(Number(e.target.value))} min={0}
              style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>通知タイトル（任意）</div>
            <input value={fireNotifTitle} onChange={e => setFireNotifTitle(e.target.value)} placeholder="例: 特別任務が発令されました"
              style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>通知本文</div>
            <textarea value={fireNotifBody} onChange={e => setFireNotifBody(e.target.value)} rows={2} placeholder="通知本文..."
              style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", resize: "vertical", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={fireEvent} disabled={!fireUserId.trim() || !fireEventId.trim() || fireSending}
              style={{ background: "rgba(255,82,82,.1)", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 11, padding: "8px 20px", cursor: "pointer", letterSpacing: ".08em" }}>
              {fireSending ? "発火中..." : "⚡ 発火する"}
            </button>
            {fireResult && (
              <span style={{ fontFamily: S.mono, fontSize: 11, color: fireResult.includes("失敗") ? S.red : S.green }}>
                {fireResult}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTab === "notify" && (
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: S.orange, letterSpacing: ".12em", marginBottom: 4 }}>
            // 通知送信（全員 / 部門 / レベル / 個人）
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>送信先</div>
              <select value={notifTarget} onChange={e => setNotifTarget(e.target.value)}
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }}>
                <option value="all">全機関員</option>
                <option value="division:convergence">収束部門</option>
                <option value="division:engineering">工作部門</option>
                <option value="division:foreign">外事部門</option>
                <option value="division:port">港湾部門</option>
                <option value="division:support">支援部門</option>
                <option value="level:3">LV3以上</option>
                <option value="level:4">LV4以上</option>
                <option value="level:5">LV5のみ</option>
              </select>
            </div>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>タイプ</div>
              <select value={notifType} onChange={e => setNotifType(e.target.value)}
                style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }}>
                <option value="info">情報</option>
                <option value="warning">警告</option>
                <option value="alert">緊急</option>
                <option value="xp">XP獲得</option>
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>タイトル</div>
            <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="例：緊急アラート — GSI急上昇検知"
              style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 5 }}>本文</div>
            <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={4} placeholder="通知の本文を入力してください..."
              style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={sendNotification} disabled={!notifTitle.trim() || !notifBody.trim() || notifSending}
              style={{ background: "rgba(255,152,0,.1)", border: `1px solid ${S.orange}`, color: S.orange, fontFamily: S.mono, fontSize: 11, padding: "8px 20px", cursor: "pointer", letterSpacing: ".08em" }}>
              {notifSending ? "送信中..." : "📣 送信する"}
            </button>
            {notifResult && (
              <span style={{ fontFamily: S.mono, fontSize: 11, color: notifResult.includes("失敗") ? S.red : S.green }}>
                {notifResult}
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
