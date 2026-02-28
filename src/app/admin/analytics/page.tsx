"use client";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", orange: "#ff9800", blue: "#4fc3f7",
  text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

type Analytics = {
  userStats: { total: number; active_today: number; avg_level: number; avg_anomaly: number };
  levelDist: { level: number; count: number }[];
  topXP: { username: string; xp: number; level: number }[];
  recentEvents: { event_id: string; count: number }[];
  flagStats: { flag_key: string; count: number }[];
  chatStats: { chat_id: string; msg_count: number }[];
  observerLoadDist: { range: string; count: number }[];
};

const LEVEL_COLORS: Record<number, string> = {
  0: "#445060", 1: "#4fc3f7", 2: "#00e676", 3: "#ffd740", 4: "#ff9800", 5: "#ff5252",
};

function Card({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: S.panel, border: `1px solid ${S.border}` }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontFamily: S.mono, fontSize: 10, color, letterSpacing: ".15em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text2, width: 150, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ flex: 1, height: 13, background: S.panel2, border: `1px solid ${S.border}`, position: "relative" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .6s" }} />
      </div>
      <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, width: 40, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const d = await res.json();
      setData(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, color: S.text3, margin: "-2rem -1.5rem" }}>読み込み中...</div>;
  if (!data) return <div style={{ background: S.bg, minHeight: "100vh", margin: "-2rem -1.5rem", padding: 20, fontFamily: S.mono, color: S.red }}>データ取得失敗</div>;

  const maxLevel = Math.max(...(data.levelDist.map(d => d.count) || [1]));
  const maxXP = Math.max(...(data.topXP.map(d => d.xp) || [1]));
  const maxEvent = Math.max(...(data.recentEvents.map(d => d.count) || [1]));
  const maxFlag = Math.max(...(data.flagStats.map(d => d.count) || [1]));

  return (
    <div style={{ background: S.bg, margin: "-2rem -1.5rem", padding: 20, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: S.mono, fontSize: 12, color: S.orange, letterSpacing: ".2em" }}>プレイヤー行動解析 // ANALYTICS</div>
        <button onClick={load} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>⟳ 更新</button>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: S.border, marginBottom: 16 }}>
        {[
          { label: "総機関員数", value: data.userStats.total, color: S.cyan },
          { label: "本日アクティブ", value: data.userStats.active_today, color: S.green },
          { label: "平均レベル", value: Number(data.userStats.avg_level || 0).toFixed(1), color: S.yellow },
          { label: "平均異常スコア", value: Number(data.userStats.avg_anomaly || 0).toFixed(1), color: S.red },
          { label: "LV5達成率", value: `${data.levelDist.length ? Math.round(((data.levelDist.find(d => d.level === 5)?.count || 0) / data.userStats.total) * 100) : 0}%`, color: S.purple },
        ].map(s => (
          <div key={s.label} style={{ background: S.panel, padding: "14px 18px" }}>
            <div style={{ fontFamily: S.mono, fontSize: 24, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".1em", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Card title="レベル分布" color={S.cyan}>
          {[0, 1, 2, 3, 4, 5].map(lv => {
            const c = data.levelDist.find(d => d.level === lv)?.count || 0;
            return <BarRow key={lv} label={`LV${lv}`} value={c} max={maxLevel} color={LEVEL_COLORS[lv]} />;
          })}
        </Card>

        <Card title="XPランキング TOP10" color={S.yellow}>
          {data.topXP.length === 0 ? <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "center", padding: 16 }}>— データなし —</div> :
            data.topXP.map((p, i) => (
              <BarRow key={p.username} label={`${i + 1}. ${p.username} (LV${p.level})`} value={p.xp} max={maxXP} color={S.yellow} />
            ))}
        </Card>

        <Card title="チャット活動" color={S.blue}>
          {data.chatStats.length === 0 ? <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "center", padding: 16 }}>— データなし —</div> :
            data.chatStats.map(c => (
              <BarRow key={c.chat_id} label={c.chat_id} value={c.msg_count} max={Math.max(...data.chatStats.map(x => x.msg_count))} color={S.blue} />
            ))}
        </Card>

        <div style={{ gridColumn: "span 2" }}>
          <Card title="ストーリーイベント発火ランキング" color={S.green}>
            {data.recentEvents.length === 0 ? <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "center", padding: 16 }}>— データなし —</div> :
              data.recentEvents.map(e => (
                <BarRow key={e.event_id} label={e.event_id} value={e.count} max={maxEvent} color={S.green} />
              ))}
          </Card>
        </div>

        <Card title="オブザーバー負荷分布" color={S.purple}>
          {(data.observerLoadDist ?? []).length === 0
            ? <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "center", padding: 16 }}>— データなし —</div>
            : (data.observerLoadDist ?? []).map(d => {
                const loadColor = d.range === "80+" ? S.red : d.range.startsWith("6") ? "#ce93d8" : S.text2;
                return <BarRow key={d.range} label={`負荷 ${d.range}`} value={d.count} max={Math.max(...(data.observerLoadDist ?? []).map(x => x.count))} color={loadColor} />;
              })
          }
        </Card>

        <Card title="アクティブフラグ TOP15" color={S.purple}>
          {data.flagStats.length === 0 ? <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "center", padding: 16 }}>— データなし —</div> :
            data.flagStats.map(f => (
              <BarRow key={f.flag_key} label={f.flag_key} value={f.count} max={maxFlag} color={S.purple} />
            ))}
        </Card>
      </div>
    </div>
  );
}
