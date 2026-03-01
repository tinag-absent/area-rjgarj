"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useHistoryStore } from "@/store/historyStore";
import { LEVEL_THRESHOLDS, MAX_LEVEL } from "@/lib/constants";

// ─── design tokens ─────────────────────────────────────────────────────────────
const S = {
  bg:      "#07090f",
  panel:   "#0c1018",
  panel2:  "#111620",
  panel3:  "#0d1422",
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

/** 現在レベルの XP 下限と次レベルの XP 上限を返す */
function getLevelRange(level: number): { base: number; next: number } {
  const base = LEVEL_THRESHOLDS[level] ?? 0;
  const next = LEVEL_THRESHOLDS[level + 1] ?? LEVEL_THRESHOLDS[MAX_LEVEL] ?? base + 1;
  return { base, next };
}

// ─── components ───────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".12em",
      textTransform: "uppercase", paddingBottom: 8, marginBottom: 12,
      borderBottom: `1px solid ${S.border}`,
    }}>
      // {label}
    </div>
  );
}

function StatBox({ value, label, color = S.cyan }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: "14px 16px", flex: 1, minWidth: 100 }}>
      <div style={{ fontFamily: S.mono, fontSize: 22, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".08em" }}>{label}</div>
    </div>
  );
}

function ActivityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text2, minWidth: 80 }}>{label}</div>
      <div style={{ flex: 1, height: 4, background: S.border2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .6s ease" }} />
      </div>
      <div style={{ fontFamily: S.mono, fontSize: 10, color, minWidth: 30, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: S.mono, fontSize: 9, padding: "2px 8px",
      border: `1px solid ${color}`, color, borderRadius: 2, letterSpacing: ".05em",
    }}>{text}</span>
  );
}

// XP bar with animated fill
function XpBar({ xp, level }: { xp: number; level: number }) {
  const { base, next } = getLevelRange(level);
  const range = next - base;
  const progress = range > 0 ? Math.min(100, ((xp - base) / range) * 100) : 100;
  const remaining = Math.max(0, next - xp);
  const [col] = LEVEL_COLORS[level] ?? LEVEL_COLORS[0];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontFamily: S.mono, fontSize: 10 }}>
        <span style={{ color: col }}>LEVEL {level} — {LEVEL_TITLES[level] ?? "不明"}</span>
        <span style={{ color: S.text3 }}>{xp - base} / {range} XP</span>
      </div>
      <div style={{ height: 6, background: S.border2, position: "relative" }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${col}, ${col}99)`,
          transition: "width .8s ease",
        }} />
        {/* tick marks */}
        {[25, 50, 75].map((t) => (
          <div key={t} style={{ position: "absolute", top: 0, left: `${t}%`, width: 1, height: "100%", background: S.border }} />
        ))}
      </div>
      <div style={{ marginTop: 4, fontFamily: S.mono, fontSize: 9, color: S.text3, textAlign: "right" }}>
        次のレベルまで {remaining} XP
      </div>
    </div>
  );
}

// Radar-style visualization (SVG)
function RadarWidget({ stats }: { stats: { label: string; value: number }[] }) {
  const N = stats.length;
  const cx = 90, cy = 90, r = 70;
  const angleStep = (Math.PI * 2) / N;
  const points = stats.map((s, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const ratio = s.value / 100;
    return { x: cx + Math.cos(angle) * r * ratio, y: cy + Math.sin(angle) * r * ratio };
  });
  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const axisPoints = stats.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  const labelPoints = stats.map((s, i) => {
    const angle = angleStep * i - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (r + 18), y: cy + Math.sin(angle) * (r + 18), label: s.label };
  });

  return (
    <svg viewBox="0 0 180 180" style={{ width: "100%", maxWidth: 200 }}>
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <polygon key={pct}
          points={axisPoints.map((p) => `${cx + (p.x - cx) * pct},${cy + (p.y - cy) * pct}`).join(" ")}
          fill="none" stroke={S.border2} strokeWidth={0.8} />
      ))}
      {/* axes */}
      {axisPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={S.border2} strokeWidth={0.8} />
      ))}
      {/* data polygon */}
      <polygon points={polyPoints} fill={`${S.cyan}20`} stroke={S.cyan} strokeWidth={1.5} />
      {/* data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={S.cyan} />
      ))}
      {/* labels */}
      {labelPoints.map((p, i) => (
        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: S.mono, fontSize: 8, fill: S.text3 }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ─── activity calendar ────────────────────────────────────────────────────────
// [SECURITY FIX #9] Math.random() によるモックデータを廃止。
// 実際のアクティビティデータは /api/users/me/activity から取得して表示すること。
// ここでは 0 埋めのプレースホルダーを表示する。
function ActivityCalendar() {
  const today = new Date();
  const days = Array.from({ length: 52 * 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (52 * 7 - 1 - i));
    // TODO: サーバーから実際のアクティビティ件数を取得して渡すこと
    const activity = 0;
    return { date: d, activity };
  });
  const colorForActivity = (n: number) => {
    if (n === 0) return S.border;
    if (n === 1) return "#003020";
    if (n === 2) return "#005030";
    if (n === 3) return "#00a060";
    return S.green;
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(52, 10px)`, gridTemplateRows: `repeat(7, 10px)`, gap: 2 }}>
        {days.map((d, i) => (
          <div key={i} title={`${d.date.toLocaleDateString("ja-JP")} — ${d.activity}件`}
            style={{ width: 10, height: 10, background: colorForActivity(d.activity), borderRadius: 1 }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", justifyContent: "flex-end" }}>
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>少</span>
        {[S.border, "#003020", "#005030", "#00a060", S.green].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, background: c, borderRadius: 1 }} />
        ))}
        <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>多</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, syncFromServer } = useUserStore();
  const { browseHistory, searchHistory } = useHistoryStore();

  // [SECURITY FIX #8] マウント時にサーバーから最新の xp / level / anomalyScore を同期する。
  // クライアント側の localStorage キャッシュのみに依存しない。
  useEffect(() => {
    syncFromServer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ユーザーがない場合はローディング or フォールバック
  const displayUser = user ?? {
    id: "demo-001",
    agentId: "KIN-0000",
    name: "ゲスト機関員",
    role: "player" as const,
    status: "active" as const,
    level: 2,
    xp: 1420,
    division: "alpha",
    divisionName: "α分隊",
    loginCount: 7,
    lastLogin: new Date(Date.now() - 3600_000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400_000 * 32).toISOString(),
    streak: 3,
    anomalyScore: 14,
    observerLoad: 42,
  };

  const [col, bg] = LEVEL_COLORS[displayUser.level ?? 0] ?? LEVEL_COLORS[0];
  const initials = (displayUser.name || "?").charAt(0);

  const radarStats = [
    { label: "XP", value: Math.min(100, (displayUser.xp / 5000) * 100) },
    { label: "ログイン", value: Math.min(100, (displayUser.loginCount / 100) * 100) },
    { label: "活動量", value: Math.min(100, (browseHistory.length / 50) * 100) },
    { label: "探索", value: Math.min(100, (searchHistory.length / 30) * 100) },
    { label: "継続", value: Math.min(100, ((displayUser.streak ?? 0) / 30) * 100) },
    { label: "安定度", value: Math.max(0, 100 - (displayUser.anomalyScore ?? 0)) },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 4rem)", margin: "-2rem -1.5rem", background: S.bg, overflowY: "auto" }}>
      {/* ── header banner ── */}
      <div style={{
        background: `linear-gradient(160deg, #0c1220 0%, ${bg} 100%)`,
        borderBottom: `1px solid ${S.border}`,
        padding: "28px 32px",
        display: "flex", alignItems: "flex-start", gap: 24,
        position: "relative", overflow: "hidden",
      }}>
        {/* scanline overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.08) 2px, rgba(0,0,0,.08) 4px)",
          pointerEvents: "none",
        }} />

        {/* avatar */}
        <div style={{
          width: 80, height: 80, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: S.mono, fontSize: 28, fontWeight: "bold",
          background: bg, color: col,
          border: `2px solid ${col}60`,
          position: "relative",
        }}>
          {initials}
          <div style={{
            position: "absolute", bottom: -6, right: -6,
            width: 14, height: 14, borderRadius: "50%",
            background: displayUser.status === "active" ? S.green : S.yellow,
            border: `2px solid ${S.bg}`,
          }} />
        </div>

        {/* info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: S.text, marginBottom: 4 }}>
            {displayUser.name}
          </div>
          <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text3, marginBottom: 10 }}>
            {displayUser.agentId}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge text={`LV${displayUser.level} — ${LEVEL_TITLES[displayUser.level] ?? "不明"}`} color={col} />
            <Badge text={displayUser.role.toUpperCase()} color={displayUser.role === "admin" ? S.red : S.text3} />
            <Badge text={displayUser.divisionName ?? "未配属"} color={S.purple} />
            <Badge text={displayUser.status.toUpperCase()} color={displayUser.status === "active" ? S.green : S.yellow} />
          </div>
        </div>

        {/* join date */}
        <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "right", flexShrink: 0 }}>
          <div>登録日</div>
          <div style={{ color: S.text2, marginTop: 2 }}>
            {displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleDateString("ja-JP") : "—"}
          </div>
          <div style={{ marginTop: 8 }}>最終ログイン</div>
          <div style={{ color: S.text2, marginTop: 2 }}>
            {displayUser.lastLogin ? new Date(displayUser.lastLogin).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* XP bar */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px" }}>
          <SectionHeader label="進捗 / Progression" />
          <XpBar xp={displayUser.xp} level={displayUser.level} />
        </div>

        {/* stats row */}
        <div>
          <SectionHeader label="統計 / Statistics" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatBox value={displayUser.xp} label="累計XP" color={col} />
            <StatBox value={displayUser.loginCount} label="ログイン回数" color={S.cyan} />
            <StatBox value={displayUser.streak ?? 0} label="連続ログイン日" color={S.yellow} />
            <StatBox value={browseHistory.length} label="閲覧記録" color={S.purple} />
            <StatBox value={searchHistory.length} label="検索記録" color={S.orange} />
            <StatBox value={displayUser.anomalyScore ?? 0} label="異常スコア" color={(displayUser.anomalyScore ?? 0) > 30 ? S.red : S.green} />
          </div>
        </div>

        {/* 2 col: radar + activity bars */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* radar */}
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px", flex: "0 0 240px" }}>
            <SectionHeader label="能力分布 / Radar" />
            <RadarWidget stats={radarStats} />
          </div>

          {/* activity bars */}
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px", flex: 1 }}>
            <SectionHeader label="活動指標 / Activity" />
            <ActivityBar label="XP" value={displayUser.xp} max={5000} color={col} />
            <ActivityBar label="ログイン" value={displayUser.loginCount} max={100} color={S.cyan} />
            <ActivityBar label="連続日" value={displayUser.streak ?? 0} max={30} color={S.yellow} />
            <ActivityBar label="閲覧" value={browseHistory.length} max={50} color={S.purple} />
            <ActivityBar label="検索" value={searchHistory.length} max={30} color={S.orange} />
            <ActivityBar label="安定度" value={Math.max(0, 100 - (displayUser.anomalyScore ?? 0))} max={100} color={S.green} />

            {/* observer load */}
            <div style={{ marginTop: 20, padding: "12px 14px", background: S.panel2, border: `1px solid ${S.border2}` }}>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 8, letterSpacing: ".08em" }}>
                // OBSERVER LOAD
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: S.border2 }}>
                  <div style={{
                    height: "100%",
                    width: `${displayUser.observerLoad ?? 0}%`,
                    background: (displayUser.observerLoad ?? 0) > 70 ? S.red : (displayUser.observerLoad ?? 0) > 40 ? S.yellow : S.green,
                    transition: "width .8s ease",
                  }} />
                </div>
                <span style={{ fontFamily: S.mono, fontSize: 13, color: S.text, minWidth: 40 }}>
                  {displayUser.observerLoad ?? 0}%
                </span>
              </div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginTop: 6 }}>
                {(displayUser.observerLoad ?? 0) > 70 ? "⚠ 観測者負荷が高い状態です" : "正常範囲内"}
              </div>
            </div>
          </div>
        </div>

        {/* activity calendar */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px" }}>
          <SectionHeader label="活動カレンダー / Activity Calendar" />
          <ActivityCalendar />
        </div>

        {/* recent browse history */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px" }}>
          <SectionHeader label="最近の閲覧 / Recent Browse" />
          {browseHistory.length === 0 ? (
            <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center", padding: "16px 0" }}>記録なし</div>
          ) : (
            browseHistory.slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.title}</span>
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{new Date(entry.visitedAt).toLocaleDateString("ja-JP")}</span>
              </div>
            ))
          )}
        </div>

        {/* recent search history */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: "18px 20px", marginBottom: 24 }}>
          <SectionHeader label="最近の検索 / Recent Search" />
          {searchHistory.length === 0 ? (
            <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center", padding: "16px 0" }}>記録なし</div>
          ) : (
            searchHistory.slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                <span style={{ fontFamily: S.mono, fontSize: 11, color: S.cyan }}>⌕</span>
                <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text, flex: 1 }}>{entry.query}</span>
                <span style={{ fontFamily: S.mono, fontSize: 10, color: entry.resultCount === 0 ? S.red : S.green }}>
                  {entry.resultCount === 0 ? "結果なし" : `${entry.resultCount}件`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
