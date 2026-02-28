"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";

type AchievData = {
  flags: Record<string, string>;
  variables: Record<string, number>;
  loginCount: number;
  streak: number;
  joinedAt: string;
};

type Badge = {
  id: string; name: string; desc: string; icon: string; color: string;
  check: (d: AchievData, user: { level: number; xp: number }) => boolean;
  secret?: boolean;
};

const BADGES: Badge[] = [
  { id: "first_step",    icon: "🚀", color: "#10b981", name: "初陣",           desc: "初めてログインした",                     check: (d) => d.loginCount >= 1 },
  { id: "week_streak",   icon: "🔥", color: "#f97316", name: "7日連続",         desc: "7日間連続でログインした",                 check: (d) => d.streak >= 7 },
  { id: "veteran",       icon: "⭐", color: "#ffd740", name: "ベテラン機関員",   desc: "50回以上ログインした",                   check: (d) => d.loginCount >= 50 },
  { id: "division_join", icon: "🏛", color: "#3b82f6", name: "配属完了",         desc: "部門に配属された",                       check: (d) => !!d.flags["division_joined"] },
  { id: "level2",        icon: "📈", color: "#a855f7", name: "正規要員",         desc: "LEVEL 2 に到達した",                     check: (_, u) => u.level >= 2 },
  { id: "level3",        icon: "🌟", color: "#f59e0b", name: "上級要員",         desc: "LEVEL 3 に到達した",                     check: (_, u) => u.level >= 3 },
  { id: "level4",        icon: "💎", color: "#06b6d4", name: "機密取扱者",       desc: "LEVEL 4 に到達した",                     check: (_, u) => u.level >= 4 },
  { id: "level5",        icon: "👑", color: "#ef4444", name: "最高幹部",         desc: "LEVEL 5 に到達した",                     check: (_, u) => u.level >= 5 },
  { id: "xp500",         icon: "⚡", color: "#10b981", name: "XP 500",          desc: "累計500 XPを獲得した",                   check: (d) => (d.variables["total_xp"] ?? 0) >= 500 },
  { id: "xp1000",        icon: "⚡", color: "#ffd740", name: "XP 1000",         desc: "累計1000 XPを獲得した",                  check: (d) => (d.variables["total_xp"] ?? 0) >= 1000 },
  { id: "tutorial",      icon: "📖", color: "#8b5cf6", name: "訓練修了",         desc: "チュートリアルを完了した",                check: (d) => !!d.flags["tutorial_complete"] },
  { id: "phase1",        icon: "🔓", color: "#ef4444", name: "フェーズ1解放",    desc: "フェーズ1のコンテンツを解放した",          check: (d) => !!d.flags["phase1_unlocked"], secret: true },
  { id: "phase2",        icon: "🔴", color: "#dc2626", name: "フェーズ2解放",    desc: "フェーズ2のコンテンツを解放した",          check: (d) => !!d.flags["phase2_unlocked"], secret: true },
  { id: "anomaly_high",  icon: "☢️", color: "#ef4444", name: "異常体",          desc: "異常スコアが高い状態に達した",             check: (d) => !!d.flags["anomaly_detected"], secret: true },
  { id: "observer",      icon: "👁", color: "#8b5cf6", name: "観測された者",     desc: "観測者に認識された",                      check: (d) => !!d.flags["observer_warned"], secret: true },
];

export default function AchievementsPage() {
  const { user } = useUserStore();
  const [data, setData] = useState<AchievData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/achievements")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
      <div className="font-mono" style={{ color: "var(--muted-foreground)" }}>読み込み中...</div>
    </div>
  );

  const unlocked = data && user ? BADGES.filter(b => b.check(data, user)) : [];
  const unlockedIds = new Set(unlocked.map(b => b.id));
  const total = BADGES.filter(b => !b.secret).length;
  const unlockedNonSecret = unlocked.filter(b => !b.secret).length;

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>ACHIEVEMENT RECORD</div>
        <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white" }}>実績・バッジ</h1>
        <p className="font-mono" style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
          {unlockedNonSecret} / {total} 解除済み
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(unlockedNonSecret / total) * 100}%`, backgroundColor: "var(--primary)", transition: "width 1s ease" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
        {BADGES.map(badge => {
          const earned = unlockedIds.has(badge.id);
          const isSecret = badge.secret && !earned;
          return (
            <div key={badge.id} className="card" style={{
              padding: "1.25rem",
              opacity: earned ? 1 : 0.4,
              borderColor: earned ? `${badge.color}40` : "rgba(255,255,255,0.06)",
              backgroundColor: earned ? `${badge.color}08` : "rgba(0,0,0,0.3)",
              transition: "all 0.3s",
            }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem", filter: earned ? "none" : "grayscale(1)" }}>
                {isSecret ? "❓" : badge.icon}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: earned ? "white" : "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>
                {isSecret ? "???" : badge.name}
              </div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                {isSecret ? "特定の条件を満たすと解除される" : badge.desc}
              </div>
              {earned && badge.secret && (
                <div className="font-mono" style={{ fontSize: "0.6rem", color: badge.color, marginTop: "0.4rem" }}>SECRET ✓</div>
              )}
            </div>
          );
        })}
      </div>

      {data && (
        <div className="card" style={{ marginTop: "2rem", padding: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>STATS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
            {[
              { label: "ログイン回数", value: `${data.loginCount} 回` },
              { label: "最大連続ログイン", value: `${data.streak} 日` },
              { label: "累計XP", value: `${data.variables["total_xp"] ?? 0} XP` },
              { label: "入隊日", value: data.joinedAt ? new Date(data.joinedAt).toLocaleDateString("ja-JP") : "—" },
            ].map(s => (
              <div key={s.label}>
                <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>{s.label}</div>
                <div className="font-mono" style={{ fontSize: "0.9rem", color: "white", fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
