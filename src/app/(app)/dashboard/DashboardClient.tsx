"use client";

import { useEffect, useState, useRef, memo } from "react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import Link from "next/link";
import OnboardingModal from "@/components/ui/OnboardingModal";
import { LEVEL_THRESHOLDS } from "@/lib/constants";

// LEVEL_THRESHOLDS は @/lib/constants からインポート済み
const LEVEL_THRESHOLDS_ARR = [0, 100, 300, 600, 1200, 2500];
const LEVEL_NAMES = ["LEVEL 0", "LEVEL 1", "LEVEL 2", "LEVEL 3", "LEVEL 4", "LEVEL 5"];

interface DashboardUser {
  id: string; _uuid: string; name: string; role: string; status: string;
  level: number; xp: number; division: string; divisionName: string;
  anomalyScore: number; observerLoad: number; lastLogin: string | null;
  lastDailyBonus: string | null; loginCount: number; streak: number;
}

interface Notification {
  id: number; type: string; title: string; body: string; is_read: number; created_at: string;
}

interface DivisionMember {
  agentId: string; name: string; level: number;
}

// 異常スコアに応じたノイズ文字
const GLITCH_CHARS = ["̦̺͉̙̮", "̸̷", "̛̫̠̳̭̅̊", "̡̝̤͆̒", "̢̲̣͊", "̫̤̪̈͜", "͔͈̩͋͘"];

const GlitchText = memo(function GlitchText({ text, intensity }: { text: string; intensity: number }) {
  const [display, setDisplay] = useState(text);
  
  useEffect(() => {
    if (intensity < 20) { setDisplay(text); return; }
    const interval = setInterval(() => {
      if (Math.random() < intensity / 200) {
        const arr = text.split("");
        const idx = Math.floor(Math.random() * arr.length);
        arr[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        setDisplay(arr.join(""));
        setTimeout(() => setDisplay(text), 150);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [text, intensity]);
  
  return <span>{display}</span>;
});

export default function DashboardClient({
  user,
  notifications: initialNotifs,
  divisionMembers,
}: {
  user: DashboardUser;
  notifications: Notification[];
  divisionMembers: DivisionMember[];
}) {
  const storeUser = useUserStore((s) => s.user);
  const addXp = useUserStore((s) => s.addXp);
  const addToast = useNotificationStore((s) => s.addToast);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifs);
  const [xpAnimating, setXpAnimating] = useState(false);
  const prevXpRef = useRef<number>(0);

  const displayUser = storeUser ?? user;
  const level = displayUser.level;
  const xp = displayUser.xp;
  const anomalyScore = user.anomalyScore;
  const observerLoad = user.observerLoad;

  const currentLevelXp = LEVEL_THRESHOLDS_ARR[level] ?? 0;
  const nextLevelXp = LEVEL_THRESHOLDS_ARR[Math.min(level + 1, 5)] ?? 2500;
  const xpPercent = level >= 5 ? 100 : Math.min(100, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastBonus = user.lastDailyBonus ? new Date(user.lastDailyBonus).toISOString().slice(0, 10) : null;
    setDailyClaimed(lastBonus === today);
  }, [user.lastDailyBonus]);

  // イベントトリガーチェック & 通知リフレッシュ
  useEffect(() => {
    async function checkTriggers() {
      try {
        const res = await fetch("/api/users/me/check-triggers", { method: "POST" });
        const data = await res.json();
        if (data.fired && data.fired.length > 0) {
          // 新しい通知を取得
          const notifRes = await fetch("/api/users/me/notifications");
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setNotifications(notifData);
          }
        }
      } catch { /* silent */ }
    }
    checkTriggers();
  }, []);

  // XP増加アニメーション
  useEffect(() => {
    if (prevXpRef.current > 0 && xp > prevXpRef.current) {
      setXpAnimating(true);
      setTimeout(() => setXpAnimating(false), 800);
    }
    prevXpRef.current = xp;
  }, [xp]);

  async function handleDailyLogin() {
    if (dailyClaimed) return;
    const res = await fetch("/api/users/me/daily-login", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setDailyClaimed(true);
      addXp(data.xpGained);
      addToast({
        type: "login",
        title: "デイリーログインボーナス",
        body: `${data.streak}日連続 | +${data.reward} XP`,
        xpAmount: data.reward,
      });
      if (data.user.level > level) {
        addToast({ type: "levelup", title: `LEVEL UP → LEVEL ${data.user.level}`, body: "新しいコンテンツが解放されました" });
      }
    }
  }

  const unreadNotifs = notifications.filter((n) => !n.is_read);

  // 異常スコア演出
  const anomalyGlitch = anomalyScore > 20;
  const anomalyNoise = anomalyScore > 40;
  const anomalyWarning = anomalyScore > 60;

  // Observer Load 演出  
  const observerSurveilled = observerLoad > 60;
  const observerCritical = observerLoad > 85;

  return (
    <>
    <div
      className="container animate-fadeIn"
      style={{
        padding: "3rem 1.5rem",
        // 異常スコア高い場合のノイズ演出
        filter: anomalyNoise ? `brightness(${1 - anomalyScore * 0.001}) contrast(${1 + anomalyScore * 0.003})` : undefined,
        transition: "filter 2s ease",
      }}
    >
      {/* 観測者警告バナー (observerLoad > 60) */}
      {observerSurveilled && (
        <div style={{
          padding: "0.625rem 1.25rem",
          backgroundColor: observerCritical ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.08)",
          border: `1px solid ${observerCritical ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.3)"}`,
          borderLeft: `3px solid ${observerCritical ? "#ef4444" : "#8b5cf6"}`,
          marginBottom: "1.5rem",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          color: observerCritical ? "#ef4444" : "#8b5cf6",
          letterSpacing: "0.05em",
        }}>
          {observerCritical
            ? "⚠ 観測者の干渉が臨界域に達しています。あなたは監視されています。"
            : "▸ オブザーバー負荷が上昇中です。行動を慎重にしてください。"
          }
        </div>
      )}

      {/* 異常スコア警告 (anomalyScore > 60) */}
      {anomalyWarning && (
        <div style={{
          padding: "0.625rem 1.25rem",
          backgroundColor: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderLeft: "3px solid #ef4444",
          marginBottom: "1.5rem",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          color: "#ef4444",
        }}>
          ⚠ 観測者からの警告: 異常スコアが {anomalyScore.toFixed(1)} に達しています。これ以上の異常行動は処分対象となります。
        </div>
      )}

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <div className="status-dot" />
        <span className="font-mono" style={{ fontSize: "0.875rem", letterSpacing: "0.1em", color: "rgb(16, 185, 129)" }}>
          認証済み — セキュア接続確立
        </span>
        {anomalyGlitch && (
          <span className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", marginLeft: "auto", letterSpacing: "0.1em" }}>
            [異常検出: {anomalyScore.toFixed(0)}]
          </span>
        )}
      </div>

      <h1 style={{ fontSize: "2.5rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
        機関員ダッシュボード
      </h1>
      <p style={{ fontSize: "1.125rem", color: "var(--muted-foreground)", fontWeight: 300, marginBottom: "3rem" }}>
        ようこそ、<span style={{ color: "var(--primary)" }}>
          <GlitchText text={displayUser.name} intensity={anomalyScore} />
        </span> さん
      </p>

      <div className="separator" />

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Profile card */}
        <div className="card" style={{ backgroundColor: "rgba(26,39,56,0.5)", backdropFilter: "blur(10px)", borderColor: "rgba(0,255,255,0.2)" }}>
          <div className="card-header">
            <div className="card-title">機関員プロフィール</div>
          </div>
          <div className="card-content">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>機関員ID</div>
                <div className="font-mono" style={{ fontSize: "1.25rem", color: "white" }}>{displayUser.id}</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>氏名</div>
                <div style={{ fontSize: "1.25rem", color: "white" }}>{displayUser.name}</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>所属部門</div>
                <div style={{ fontSize: "1.125rem", color: "white" }}>{displayUser.divisionName || "未配属"}</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>権限レベル</div>
                <div className="font-mono" style={{ fontSize: "1.25rem", color: "var(--primary)", fontWeight: 700 }}>{LEVEL_NAMES[level]}</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>異常スコア</div>
                <div className="font-mono" style={{ fontSize: "1rem", color: anomalyScore > 50 ? "#ef4444" : anomalyScore > 20 ? "#f59e0b" : "var(--foreground)" }}>
                  {anomalyScore.toFixed(1)}
                  {anomalyScore > 50 && <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem" }}>⚠</span>}
                </div>
                {anomalyScore > 0 && (
                  <div style={{ marginTop: "0.25rem", height: "3px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", width: "80%" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, anomalyScore)}%`, backgroundColor: anomalyScore > 60 ? "#ef4444" : anomalyScore > 30 ? "#f59e0b" : "#10b981", transition: "width 0.8s ease" }} />
                  </div>
                )}
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.5rem" }}>観測負荷</div>
                <div className="font-mono" style={{ fontSize: "1rem", color: observerLoad > 80 ? "#ef4444" : observerLoad > 60 ? "#8b5cf6" : "var(--foreground)" }}>
                  {observerLoad.toFixed(1)} / 100
                </div>
                {observerLoad > 0 && (
                  <div style={{ marginTop: "0.25rem", height: "3px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", width: "80%" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, observerLoad)}%`, backgroundColor: observerLoad > 80 ? "#ef4444" : "#8b5cf6", transition: "width 0.8s ease" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* XP Card */}
        <div className="card" style={{ backgroundColor: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="card-header">
            <div className="card-title" style={{ color: "var(--muted-foreground)" }}>経験値 & レベル</div>
          </div>
          <div className="card-content">
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "3rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1,
                  transition: "color 0.3s, transform 0.3s",
                  transform: xpAnimating ? "scale(1.1)" : "scale(1)",
                  display: "inline-block",
                  textShadow: xpAnimating ? "0 0 20px rgba(0,255,255,0.8)" : undefined,
                }}>
                {xp}
              </div>
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>総XP</div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{LEVEL_NAMES[level]}</span>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {level < 5 ? `→ LEVEL ${level + 1}` : "最高レベル"}
                </span>
              </div>
              <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${xpPercent}%`,
                  backgroundColor: "var(--primary)",
                  borderRadius: "3px",
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: xpAnimating ? "0 0 8px rgba(0,255,255,0.6)" : undefined,
                }} />
              </div>
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.5rem", textAlign: "center" }}>
                {level < 5 ? `${xp - currentLevelXp} / ${nextLevelXp - currentLevelXp} XP` : "MAX"}
              </div>
            </div>

            {/* Daily login button */}
            <button
              onClick={handleDailyLogin}
              disabled={dailyClaimed}
              style={{
                width: "100%", padding: "0.625rem",
                backgroundColor: dailyClaimed ? "rgba(255,255,255,0.05)" : "rgba(0,255,255,0.1)",
                border: `1px solid ${dailyClaimed ? "rgba(255,255,255,0.1)" : "rgba(0,255,255,0.3)"}`,
                borderRadius: "0.375rem",
                color: dailyClaimed ? "var(--muted-foreground)" : "var(--primary)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
                textTransform: "uppercase" as const, letterSpacing: "0.05em",
                cursor: dailyClaimed ? "default" : "pointer", transition: "all 0.2s",
              }}>
              {dailyClaimed ? "✓ 本日のボーナス受取済み" : "◈ デイリーログインボーナス"}
            </button>

            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "0.375rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>ログイン回数</span>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "white" }}>{user.loginCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>連続ログイン</span>
                <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>{user.streak}日</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division members + Quick links row */}
      <div style={{ display: "grid", gridTemplateColumns: divisionMembers.length > 0 ? "1fr 1fr" : "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Division members */}
        {divisionMembers.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "0.875rem" }}>
                {displayUser.divisionName} — 部門メンバー
              </div>
            </div>
            <div className="card-content">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {divisionMembers.slice(0, 6).map(m => (
                  <div key={m.agentId} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.5rem", backgroundColor: m.agentId === displayUser.id ? "rgba(0,255,255,0.05)" : "transparent", borderRadius: "0.25rem" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: ["#4fc3f7","#00e676","#ffd740","#ff9800","#ff5252","#8b5cf6"][m.level] || "#445060", flexShrink: 0 }} />
                    <span className="font-mono" style={{ fontSize: "0.72rem", color: m.agentId === displayUser.id ? "var(--primary)" : "var(--foreground)", flex: 1 }}>
                      {m.agentId}
                    </span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)" }}>LV{m.level}</span>
                  </div>
                ))}
                {divisionMembers.length > 6 && (
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", textAlign: "center", marginTop: "0.25rem" }}>
                    他 {divisionMembers.length - 6} 名
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ fontSize: "0.875rem" }}>クイックアクセス</div>
          </div>
          <div className="card-content">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                { href: "/chat", label: "通信ログ", icon: "◉", level: 1 },
                { href: "/reports", label: "レポート", icon: "▦", level: 1 },
                { href: "/bulletin", label: "掲示板", icon: "◫", level: 1 },
                { href: "/skill-tree", label: "スキルツリー", icon: "◫", level: 1 },
                { href: "/missions", label: "収束案件", icon: "▲", level: 4 },
                { href: "/classified", label: "機密情報", icon: "■", level: 5 },
              ].filter(item => level >= item.level).map(item => (
                <Link key={item.href} href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "0.25rem",
                    color: "var(--muted-foreground)",
                    fontSize: "0.78rem", textDecoration: "none",
                    transition: "all 0.2s",
                  }}>
                  <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {unreadNotifs.length > 0 && (
        <div className="card" style={{ borderColor: "rgba(0,255,255,0.15)" }}>
          <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="card-title">
              <span>システム通知</span>
              <span style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "9999px", padding: "0.125rem 0.5rem", fontSize: "0.625rem", marginLeft: "0.5rem" }}>
                {unreadNotifs.length}
              </span>
            </div>
          </div>
          <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {notifications.slice(0, 5).map((n) => {
              const typeColor = n.type === "critical" ? "#ef4444" : n.type === "warning" ? "#f59e0b" : "var(--primary)";
              return (
                <div
                  key={n.id}
                  style={{
                    padding: "0.75rem",
                    backgroundColor: n.is_read ? "rgba(255,255,255,0.02)" : "rgba(0,255,255,0.05)",
                    border: `1px solid ${n.is_read ? "rgba(255,255,255,0.05)" : `${typeColor}20`}`,
                    borderLeft: n.is_read ? undefined : `3px solid ${typeColor}60`,
                    borderRadius: "0.375rem",
                    display: "flex", gap: "0.75rem", alignItems: "flex-start",
                  }}>
                  <span style={{ color: typeColor, fontSize: "0.875rem" }}>
                    {n.type === "critical" ? "⚠" : n.type === "warning" ? "▸" : "●"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--foreground)", fontWeight: 600 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>{n.body}</div>}
                    <div className="font-mono" style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                      {new Date(n.created_at).toLocaleString("ja-JP")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* anomalyScore > 80: 機密ページへの追加テキスト */}
      {anomalyScore > 80 && (
        <div className="card" style={{ marginTop: "1.5rem", borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.04)" }}>
          <div className="card-content">
            <div className="font-mono" style={{ fontSize: "0.72rem", color: "#ef4444", lineHeight: 2 }}>
              ⚠ 高異常スコア検出 — 追加コンテンツ解放条件達成<br />
              あなたの異常スコアが臨界値を超えました。<br />
              <Link href="/classified" style={{ color: "#ef4444", textDecoration: "underline" }}>
                機密情報ページ
              </Link>
              に新しいコンテンツが解放されています。
            </div>
          </div>
        </div>
      )}
    </div>

    {user.loginCount <= 1 && <OnboardingModal loginCount={user.loginCount} />}
    </>
  );
}
