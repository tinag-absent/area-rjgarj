"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Me { uuid: string; agentId: string; name: string; role: "admin" | "super_admin" }

interface AdminUser {
  id: string; agentId: string; name: string; role: string; status: string;
  level: number; xp: number; anomalyScore: number; division: string;
  divisionName: string; loginCount: number; lastLogin: string; createdAt: string;
}

interface Analytics {
  userStats: { total: number; active_today: number; avg_level: number; avg_anomaly: number };
  levelDist: { level: number; count: number }[];
  topXP: { username: string; xp: number; level: number }[];
  recentEvents: { event_id: string; count: number }[];
  flagStats: { flag_key: string; count: number }[];
}

interface DbResult {
  ok?: boolean; readOnly?: boolean; rows?: Record<string, unknown>[];
  columns?: string[]; rowsAffected?: number; elapsed?: number;
  error?: string; requiresConfirmation?: boolean; message?: string;
}

interface BalanceConfig {
  levelThresholds: Record<string, number>;
  xpRewards: Record<string, number>;
  dailyLoginRewards: Record<string, number>;
}

// ── Design tokens ─────────────────────────────────────────────────────────

const C = {
  bg:       "hsl(220, 30%, 8%)",
  bgCard:   "hsl(220, 25%, 11%)",
  bgDeep:   "hsl(220, 30%, 6%)",
  border:   "hsl(215, 30%, 20%)",
  cyan:     "hsl(180, 70%, 50%)",
  cyanDim:  "hsl(180, 50%, 25%)",
  cyanFade: "hsla(180, 70%, 50%, 0.08)",
  red:      "hsl(0, 70%, 55%)",
  redFade:  "hsla(0, 70%, 55%, 0.1)",
  amber:    "hsl(38, 90%, 55%)",
  amberFade:"hsla(38, 90%, 55%, 0.1)",
  green:    "hsl(150, 60%, 45%)",
  greenFade:"hsla(150, 60%, 45%, 0.1)",
  muted:    "hsl(215, 20%, 55%)",
  text:     "hsl(210, 20%, 90%)",
};

// ── Micro components ──────────────────────────────────────────────────────

function Tag({ children, color = C.cyan }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", fontWeight: 600,
      padding: "0.15rem 0.5rem", borderRadius: "2px", letterSpacing: "0.1em",
      backgroundColor: `${color}18`, border: `1px solid ${color}50`, color,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: "6px", padding: "1.25rem", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", fontWeight: 600,
      color: C.cyan, letterSpacing: "0.2em", textTransform: "uppercase",
      marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem",
    }}>
      <span style={{ width: "8px", height: "1px", backgroundColor: C.cyan, display: "inline-block" }} />
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      backgroundColor: C.bgDeep, border: `1px solid ${C.border}`,
      borderRadius: "4px", padding: "1rem", textAlign: "center",
    }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.5rem", fontWeight: 700, color: accent ?? C.cyan }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "0.2rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.2rem" }}>{sub}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        backgroundColor: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "4px",
        color: C.text, fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem",
        padding: "0.5rem 0.75rem", outline: "none", width: "100%", ...style,
      }}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      backgroundColor: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "4px",
      color: C.text, fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem",
      padding: "0.5rem 0.75rem", outline: "none", width: "100%",
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "danger" | "ghost" | "amber"; disabled?: boolean; style?: React.CSSProperties;
}) {
  const colors = {
    primary: { bg: C.cyanFade, border: C.cyanDim, color: C.cyan, hover: `${C.cyan}18` },
    danger:  { bg: C.redFade,  border: C.red,     color: C.red,  hover: `${C.red}20` },
    amber:   { bg: C.amberFade,border: C.amber,   color: C.amber,hover: `${C.amber}20` },
    ghost:   { bg: "transparent", border: C.border, color: C.muted, hover: `${C.text}08` },
  };
  const c = colors[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: "4px", padding: "0.5rem 1rem", fontSize: "0.75rem",
      fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "all 0.15s", whiteSpace: "nowrap", ...style,
    }}>
      {children}
    </button>
  );
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
      backgroundColor: type === "ok" ? C.greenFade : C.redFade,
      border: `1px solid ${type === "ok" ? C.green : C.red}`,
      color: type === "ok" ? C.green : C.red, borderRadius: "4px",
      padding: "0.75rem 1.25rem", fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem",
      animation: "fadeInUp 0.2s ease",
    }}>
      {msg}
    </div>
  );
}

// ── Tab: Analytics ─────────────────────────────────────────────────────────

function TabAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/admin/analytics").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <div style={{ color: C.muted, fontFamily: "monospace", padding: "2rem" }}>LOADING...</div>;
  if (!data) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <StatBox label="総ユーザー数" value={data.userStats.total} />
        <StatBox label="本日アクティブ" value={data.userStats.active_today} accent={C.green} />
        <StatBox label="平均レベル" value={(data.userStats.avg_level ?? 0).toFixed(1)} />
        <StatBox label="平均異常スコア" value={(data.userStats.avg_anomaly ?? 0).toFixed(1)} accent={C.amber} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Card>
          <SectionTitle>レベル分布</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.levelDist.map(d => (
              <div key={d.level} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted, width: "3rem" }}>LV {d.level}</span>
                <div style={{ flex: 1, height: "6px", backgroundColor: C.bgDeep, borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "3px", backgroundColor: C.cyan,
                    width: `${(d.count / data.userStats.total) * 100}%`, transition: "width 0.5s ease",
                  }} />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.text, width: "2rem", textAlign: "right" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>XP上位ユーザー</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {data.topXP.slice(0, 8).map((u, i) => (
              <div key={u.username} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.3rem 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: i < 3 ? C.amber : C.muted, width: "1.5rem" }}>#{i + 1}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: C.text, flex: 1 }}>{u.username}</span>
                <Tag color={C.amber}>{u.xp.toLocaleString()} XP</Tag>
                <Tag>LV {u.level}</Tag>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>発火済みイベント TOP</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {data.recentEvents.slice(0, 10).map(e => (
              <div key={e.event_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted }}>{e.event_id}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.cyan }}>{e.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>フラグ分布 TOP</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {data.flagStats.slice(0, 10).map(f => (
              <div key={f.flag_key} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted }}>{f.flag_key}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.green }}>{f.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Users ─────────────────────────────────────────────────────────────

function TabUsers({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [editLevel, setEditLevel] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAnomaly, setEditAnomaly] = useState("");
  const [grantXp, setGrantXp] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/admin/users").then(r => r.json());
    setUsers(data);
    setFiltered(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.agentId.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) ||
      u.divisionName.toLowerCase().includes(q) || u.role.includes(q)
    ));
  }, [search, users]);

  function openEdit(u: AdminUser) {
    setSelected(u); setEditLevel(String(u.level)); setEditRole(u.role);
    setEditStatus(u.status); setEditAnomaly(String(u.anomalyScore)); setGrantXp("");
  }

  async function saveEdit() {
    if (!selected) return;
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clearanceLevel: parseInt(editLevel) || undefined,
        role: editRole || undefined,
        status: editStatus || undefined,
        anomalyScore: parseFloat(editAnomaly) || undefined,
      }),
    });
    if (res.ok) { showToast("更新しました"); loadUsers(); }
    else showToast("更新失敗", "err");
  }

  async function doGrantXp() {
    if (!selected || !grantXp) return;
    const amount = parseInt(grantXp);
    if (isNaN(amount) || amount <= 0) { showToast("正の整数を入力", "err"); return; }
    // We grant to own user using /api/users/me/xp — for others we use admin PUT
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // placeholder — actual XP grant via story_variables
    });
    // Fallback: call fire-event with xp
    const res2 = await fetch("/api/admin/fire-event", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected.id, eventId: "admin_grant_xp", xp: amount }),
    });
    if (res2.ok) { showToast(`${amount} XP付与しました`); setGrantXp(""); loadUsers(); }
    else showToast("XP付与失敗", "err");
    void res;
  }

  const roleColor = (r: string) => r === "super_admin" ? C.amber : r === "admin" ? C.cyan : C.muted;
  const statusColor = (s: string) => s === "active" ? C.green : s === "suspended" ? C.red : C.amber;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: "1.5rem" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <SectionTitle>ユーザー管理 ({filtered.length})</SectionTitle>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Input value={search} onChange={setSearch} placeholder="検索..." style={{ width: "200px" }} />
            <Btn variant="ghost" onClick={loadUsers}>↺</Btn>
          </div>
        </div>
        {loading ? (
          <div style={{ color: C.muted, fontFamily: "monospace", fontSize: "0.8rem" }}>LOADING...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace", fontSize: "0.73rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Agent ID", "名前", "部門", "LV", "XP", "Role", "Status", "最終ログイン", ""].map(h => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} onClick={() => openEdit(u)} style={{
                    borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                    backgroundColor: selected?.id === u.id ? `${C.cyan}08` : "transparent",
                    transition: "background 0.1s",
                  }}>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.cyan }}>{u.agentId}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.text }}>{u.name}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.muted }}>{u.divisionName || "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.text }}>{u.level}</td>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.muted }}>{u.xp.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}><Tag color={roleColor(u.role)}>{u.role}</Tag></td>
                    <td style={{ padding: "0.5rem 0.75rem" }}><Tag color={statusColor(u.status)}>{u.status}</Tag></td>
                    <td style={{ padding: "0.5rem 0.75rem", color: C.muted }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("ja-JP") : "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}><span style={{ color: C.cyan }}>›</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <SectionTitle>編集: {selected.agentId}</SectionTitle>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.1rem" }}>×</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>CLEARANCE LEVEL (1-5)</label>
              <Input value={editLevel} onChange={setEditLevel} type="number" />
            </div>
            {isSuperAdmin && (
              <div>
                <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>ROLE</label>
                <Select value={editRole} onChange={setEditRole} options={[
                  { value: "player", label: "player" },
                  { value: "admin", label: "admin" },
                  { value: "super_admin", label: "super_admin" },
                ]} />
              </div>
            )}
            <div>
              <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>STATUS</label>
              <Select value={editStatus} onChange={setEditStatus} options={[
                { value: "active", label: "active" },
                { value: "inactive", label: "inactive" },
                { value: "suspended", label: "suspended" },
              ]} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>ANOMALY SCORE (0-100)</label>
              <Input value={editAnomaly} onChange={setEditAnomaly} type="number" />
            </div>
            <Btn onClick={saveEdit}>変更を保存</Btn>

            <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "0.25rem 0" }} />

            <div>
              <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>XP付与</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input value={grantXp} onChange={setGrantXp} placeholder="100" type="number" />
                <Btn variant="amber" onClick={doGrantXp}>付与</Btn>
              </div>
            </div>

            <div style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: C.bgDeep, borderRadius: "4px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {[
                ["UUID", selected.id],
                ["XP", selected.xp.toLocaleString()],
                ["ログイン数", selected.loginCount],
                ["作成日", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("ja-JP") : "—"],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: C.muted }}>{k}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: C.text }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Notifications ─────────────────────────────────────────────────────

function TabNotifications() {
  const [target, setTarget] = useState("all");
  const [targetSub, setTargetSub] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const targetStr = target === "all" ? "all"
    : target === "division" ? `division:${targetSub}`
    : target === "level" ? `level:${targetSub}`
    : `user:${targetSub}`;

  async function send() {
    if (!title || !body) { setLog(p => [`[ERROR] title と body は必須です`, ...p]); return; }
    setSending(true);
    const res = await fetch("/api/admin/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: targetStr, type: notifType, title, body }),
    });
    const data = await res.json();
    if (res.ok) {
      setLog(p => [`[OK] ${data.message ?? `${data.sent}名に送信`}`, ...p]);
      setTitle(""); setBody("");
    } else {
      setLog(p => [`[ERROR] ${data.error}`, ...p]);
    }
    setSending(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      <Card>
        <SectionTitle>通知送信</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>TARGET</label>
            <Select value={target} onChange={setTarget} options={[
              { value: "all", label: "全ユーザー" },
              { value: "division", label: "部門 (division:slug)" },
              { value: "level", label: "レベル以上 (level:N)" },
              { value: "user", label: "特定ユーザー (user:uuid)" },
            ]} />
          </div>
          {target !== "all" && (
            <div>
              <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>
                {target === "division" ? "DIVISION SLUG" : target === "level" ? "LEVEL (以上)" : "USER UUID"}
              </label>
              <Input value={targetSub} onChange={setTargetSub} placeholder={target === "division" ? "alpha" : target === "level" ? "3" : "uuid..."} />
            </div>
          )}
          <div>
            <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>TYPE</label>
            <Select value={notifType} onChange={setNotifType} options={[
              { value: "info", label: "info" }, { value: "warn", label: "warn" },
              { value: "error", label: "error" }, { value: "mission", label: "mission" },
              { value: "unlock", label: "unlock" }, { value: "xp", label: "xp" },
            ]} />
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>TITLE</label>
            <Input value={title} onChange={setTitle} placeholder="通知タイトル" />
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>BODY</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="通知本文..."
              style={{
                backgroundColor: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "4px",
                color: C.text, fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem",
                padding: "0.5rem 0.75rem", outline: "none", width: "100%", resize: "vertical",
              }}
            />
          </div>
          <Btn onClick={send} disabled={sending}>{sending ? "送信中..." : "送信"}</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle>送信ログ</SectionTitle>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {log.length === 0 && <span style={{ color: C.muted }}>まだ送信していません</span>}
          {log.map((l, i) => (
            <div key={i} style={{ color: l.startsWith("[OK]") ? C.green : C.red }}>{l}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Fire Event ────────────────────────────────────────────────────────

function TabFireEvent() {
  const [userId, setUserId] = useState("");
  const [eventId, setEventId] = useState("");
  const [xp, setXp] = useState("");
  const [flag, setFlag] = useState("");
  const [flagValue, setFlagValue] = useState("true");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [log, setLog] = useState<{ text: string; ok: boolean }[]>([]);
  const [firing, setFiring] = useState(false);

  const presets = [
    { label: "ミッション完了", eventId: "mission_complete", xp: "100" },
    { label: "初回ログイン", eventId: "first_login", xp: "50" },
    { label: "レベルアップ演出", eventId: "level_up", xp: "0" },
    { label: "異常観測", eventId: "anomaly_detected", xp: "30" },
  ];

  async function fire() {
    if (!userId || !eventId) { setLog(p => [{ text: "[ERROR] userId と eventId は必須", ok: false }, ...p]); return; }
    setFiring(true);
    const payload: Record<string, unknown> = { userId, eventId };
    if (xp && parseInt(xp) > 0) payload.xp = parseInt(xp);
    if (flag) { payload.flag = flag; payload.flagValue = flagValue; }
    if (notifTitle) payload.notification = { title: notifTitle, body: notifBody, type: "info" };

    const res = await fetch("/api/admin/fire-event", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLog(p => [{ text: res.ok ? `[OK] ${data.message}` : `[ERROR] ${data.error}`, ok: res.ok }, ...p]);
    setFiring(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Card>
          <SectionTitle>プリセット</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {presets.map(p => (
              <button key={p.eventId} onClick={() => { setEventId(p.eventId); setXp(p.xp); }}
                style={{
                  backgroundColor: eventId === p.eventId ? C.cyanFade : C.bgDeep,
                  border: `1px solid ${eventId === p.eventId ? C.cyan : C.border}`,
                  color: eventId === p.eventId ? C.cyan : C.muted,
                  borderRadius: "4px", padding: "0.6rem", fontSize: "0.7rem",
                  fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>イベント発火</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              ["USER UUID", userId, setUserId, "xxxxxxxx-xxxx-..."],
              ["EVENT ID", eventId, setEventId, "mission_complete"],
              ["XP付与量", xp, setXp, "0"],
              ["FLAG KEY", flag, setFlag, "mission_cleared (省略可)"],
              ["FLAG VALUE", flagValue, setFlagValue, "true"],
              ["通知タイトル", notifTitle, setNotifTitle, "省略可"],
              ["通知本文", notifBody, setNotifBody, "省略可"],
            ].map(([label, val, set, ph]) => (
              <div key={String(label)}>
                <label style={{ fontSize: "0.65rem", color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                <Input value={String(val)} onChange={set as (v: string) => void} placeholder={String(ph)} />
              </div>
            ))}
            <Btn onClick={fire} disabled={firing}>{firing ? "発火中..." : "イベント発火"}</Btn>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>実行ログ</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
          {log.length === 0 && <span style={{ color: C.muted }}>まだ発火していません</span>}
          {log.map((l, i) => (
            <div key={i} style={{ color: l.ok ? C.green : C.red }}>{l.text}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: SQL Terminal (super_admin only) ──────────────────────────────────

function TabSQL() {
  const [sql, setSql] = useState("SELECT * FROM users LIMIT 10;");
  const [result, setResult] = useState<DbResult | null>(null);
  const [running, setRunning] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const QUERIES = [
    { label: "ユーザー一覧", sql: "SELECT id, username, display_name, role, clearance_level, status FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC;" },
    { label: "XPランキング", sql: "SELECT u.username, sv.var_value AS xp FROM story_variables sv JOIN users u ON u.id = sv.user_id WHERE sv.var_key = 'total_xp' ORDER BY xp DESC LIMIT 20;" },
    { label: "フラグ一覧", sql: "SELECT u.username, pf.flag_key, pf.flag_value, pf.set_at FROM progress_flags pf JOIN users u ON u.id = pf.user_id ORDER BY pf.set_at DESC LIMIT 50;" },
    { label: "発火イベント", sql: "SELECT u.username, fe.event_id, fe.fired_at FROM fired_events fe JOIN users u ON u.id = fe.user_id ORDER BY fe.fired_at DESC LIMIT 50;" },
    { label: "通知一覧", sql: "SELECT n.id, u.username, n.type, n.title, n.is_read, n.created_at FROM notifications n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC LIMIT 50;" },
  ];

  async function run(confirmed = false) {
    setRunning(true);
    const res = await fetch("/api/admin/db-query", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, confirmed }),
    });
    const data = await res.json();
    if (data.requiresConfirmation) {
      setPendingConfirm(true);
      setResult({ message: data.message });
    } else {
      setPendingConfirm(false);
      setResult(data);
    }
    setRunning(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {QUERIES.map(q => (
          <button key={q.label} onClick={() => setSql(q.sql)} style={{
            backgroundColor: C.bgDeep, border: `1px solid ${C.border}`, color: C.muted,
            borderRadius: "3px", padding: "0.3rem 0.75rem", fontSize: "0.7rem",
            fontFamily: "monospace", cursor: "pointer",
          }}>{q.label}</button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <textarea ref={textareaRef} value={sql} onChange={e => setSql(e.target.value)} onKeyDown={handleKeyDown} rows={8}
          spellCheck={false}
          style={{
            width: "100%", backgroundColor: C.bgDeep, border: "none", outline: "none",
            color: C.cyan, fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem",
            padding: "1rem", resize: "vertical", lineHeight: 1.6,
          }}
        />
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.5rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: C.muted }}>⌘+Enter で実行 | SELECT のみ / 書き込みは確認あり</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {pendingConfirm && <Btn variant="danger" onClick={() => run(true)}>確認して実行</Btn>}
            <Btn onClick={() => run()} disabled={running}>{running ? "実行中..." : "▶ 実行"}</Btn>
          </div>
        </div>
      </Card>

      {result && (
        <Card>
          {result.error ? (
            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: C.red }}>[ERROR] {result.error}</div>
          ) : result.message ? (
            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: C.amber }}>{result.message}</div>
          ) : (
            <>
              <div style={{ fontFamily: "monospace", fontSize: "0.65rem", color: C.muted, marginBottom: "0.75rem" }}>
                {result.rowsAffected} 行 | {result.elapsed}ms | {result.readOnly ? "READ" : "WRITE"}{result.truncated ? " | 500行で切り捨て" : ""}
              </div>
              {result.columns && result.rows && result.rows.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {result.columns.map(c => (
                          <th key={c} style={{ padding: "0.4rem 0.75rem", textAlign: "left", color: C.muted, whiteSpace: "nowrap" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          {result.columns!.map(c => (
                            <td key={c} style={{ padding: "0.4rem 0.75rem", color: C.text, maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {String(row[c] ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.rows?.length === 0 && <div style={{ color: C.muted, fontFamily: "monospace", fontSize: "0.8rem" }}>結果なし</div>}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Tab: Balance (super_admin only) ────────────────────────────────────────

function TabBalance() {
  const [config, setConfig] = useState<BalanceConfig | null>(null);
  const [draft, setDraft] = useState<BalanceConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    fetch("/api/admin/balance").then(r => r.json()).then(d => { setConfig(d); setDraft(JSON.parse(JSON.stringify(d))); });
  }, []);

  function patchXp(key: string, val: string) {
    if (!draft) return;
    setDraft({ ...draft, xpRewards: { ...draft.xpRewards, [key]: parseInt(val) || 0 } });
  }

  function patchLevel(key: string, val: string) {
    if (!draft) return;
    setDraft({ ...draft, levelThresholds: { ...draft.levelThresholds, [key]: parseInt(val) || 0 } });
  }

  function patchDaily(key: string, val: string) {
    if (!draft) return;
    setDraft({ ...draft, dailyLoginRewards: { ...draft.dailyLoginRewards, [key]: parseInt(val) || 0 } });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch("/api/admin/balance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (res.ok) { setConfig(draft); setToast({ msg: data.message, type: "ok" }); }
    else setToast({ msg: data.error, type: "err" });
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  }

  if (!draft) return <div style={{ color: C.muted, fontFamily: "monospace", padding: "2rem" }}>LOADING...</div>;
  void config;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
        <Card>
          <SectionTitle>レベル閾値 XP</SectionTitle>
          {Object.entries(draft.levelThresholds).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted, width: "3.5rem" }}>LV {k}</span>
              <Input value={String(v)} onChange={val => patchLevel(k, val)} type="number" style={{ width: "auto", flex: 1 }} />
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle>XP報酬</SectionTitle>
          {Object.entries(draft.xpRewards).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: C.muted, width: "8rem", flexShrink: 0 }}>{k}</span>
              <Input value={String(v)} onChange={val => patchXp(k, val)} type="number" style={{ flex: 1 }} />
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle>デイリーログイン報酬</SectionTitle>
          {Object.entries(draft.dailyLoginRewards).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted, width: "3.5rem" }}>Day {k}</span>
              <Input value={String(v)} onChange={val => patchDaily(k, val)} type="number" style={{ flex: 1 }} />
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={save} disabled={saving} style={{ padding: "0.6rem 2rem" }}>
          {saving ? "保存中..." : "バランス設定を保存"}
        </Btn>
      </div>
    </div>
  );
}

// ── Main AdminClient ───────────────────────────────────────────────────────

type TabId = "analytics" | "users" | "notifications" | "events" | "sql" | "balance";

export default function AdminClient({ me }: { me: Me }) {
  const isSuperAdmin = me.role === "super_admin";
  const [activeTab, setActiveTab] = useState<TabId>("analytics");

  const tabs: { id: TabId; label: string; superAdminOnly?: boolean }[] = [
    { id: "analytics",     label: "📊 分析" },
    { id: "users",         label: "👤 ユーザー" },
    { id: "notifications", label: "📢 通知" },
    { id: "events",        label: "⚡ イベント" },
    { id: "sql",           label: "🗄 SQL",     superAdminOnly: true },
    { id: "balance",       label: "⚖ バランス", superAdminOnly: true },
  ];

  const visibleTabs = tabs.filter(t => !t.superAdminOnly || isSuperAdmin);

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bgDeep}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, padding: "2rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.muted, letterSpacing: "0.2em", marginBottom: "0.4rem" }}>
              SEA EROSION AGENCY
            </div>
            <h1 style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "1.5rem", fontWeight: 700,
              color: C.text, letterSpacing: "-0.02em", margin: 0,
            }}>
              ADMIN CONSOLE
            </h1>
            <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Tag color={isSuperAdmin ? C.amber : C.cyan}>{me.role.toUpperCase()}</Tag>
              <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted }}>{me.agentId}</span>
            </div>
          </div>

          {/* System status bar */}
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.muted,
            display: "flex", gap: "1.5rem", alignItems: "center",
          }}>
            <span style={{ color: C.green }}>● SYSTEM ONLINE</span>
            <span>{new Date().toLocaleString("ja-JP")}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: "0", borderBottom: `1px solid ${C.border}`,
          marginBottom: "1.5rem", overflowX: "auto",
        }}>
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              backgroundColor: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${C.cyan}` : `2px solid transparent`,
              color: activeTab === tab.id ? C.cyan : C.muted,
              fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
              padding: "0.75rem 1.25rem", cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s", letterSpacing: "0.05em",
            }}>
              {tab.label}
              {tab.superAdminOnly && (
                <span style={{ marginLeft: "0.4rem", fontSize: "0.55rem", color: C.amber }}>SA</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "analytics"     && <TabAnalytics />}
          {activeTab === "users"         && <TabUsers isSuperAdmin={isSuperAdmin} />}
          {activeTab === "notifications" && <TabNotifications />}
          {activeTab === "events"        && <TabFireEvent />}
          {activeTab === "sql"           && isSuperAdmin && <TabSQL />}
          {activeTab === "balance"       && isSuperAdmin && <TabBalance />}
        </div>
      </div>
    </>
  );
}
