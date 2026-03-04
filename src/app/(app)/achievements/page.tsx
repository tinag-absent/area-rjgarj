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

// BADGES はDBから動的取得（③ 実績エンジン化）
// evaluateBadge: DB定義の条件からクライアントサイドで判定
function evaluateBadge(
  badge: { conditionType: string; conditionKey: string; conditionValue: string; conditionMin: number },
  data: AchievData,
  user: { level: number; xp: number }
): boolean {
  switch (badge.conditionType) {
    case "loginCount": return data.loginCount >= badge.conditionMin;
    case "streak":     return data.streak     >= badge.conditionMin;
    case "level":      return user.level      >= badge.conditionMin;
    case "xp":         return user.xp         >= badge.conditionMin;
    case "flag":       return !!data.flags[badge.conditionKey];
    case "variable":   return (data.variables[badge.conditionKey] ?? 0) >= badge.conditionMin;
    default: return false;
  }
}

export default function AchievementsPage() {
  const { user } = useUserStore();
  const [data, setData] = useState<AchievData | null>(null);
  const [dbBadges, setDbBadges] = useState<(Badge & { conditionType:string; conditionKey:string; conditionValue:string; conditionMin:number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ③ DBから実績定義を動的取得
    fetch("/api/achievements", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then(r => r.ok ? r.json() : [])
      .then((defs: (Badge & { conditionType:string; conditionKey:string; conditionValue:string; conditionMin:number })[]) => {
        if (Array.isArray(defs) && defs.length > 0) setDbBadges(defs);
      }).catch(() => {});
    fetch("/api/users/me/achievements", { headers: { "X-Requested-With": "XMLHttpRequest" } })
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

  const activeBadges = dbBadges.length > 0 ? dbBadges : [];
  const unlocked = data && user ? activeBadges.filter(b => evaluateBadge(b, data, user)) : [];
  const unlockedIds = new Set(unlocked.map(b => b.id));
  const total = activeBadges.filter(b => !b.secret).length;
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
        {activeBadges.map(badge => {
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
