"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";

interface Skill {
  id: string; icon: string; name: string; level: number;
  req: string[]; xp: number; desc: string; effects: string[];
}
interface Track { id: string; label: string; icon: string; color: string; skills: Skill[]; }

const TRACKS: Track[] = [
  {
    id: "convergence", label: "収束", icon: "⚡", color: "#ef4444",
    skills: [
      { id: "sk_c1", icon: "🎯", name: "基礎収束術",  level: 0, req: [],          xp: 0,   desc: "海蝕現象への基本的な対処法を習得。",             effects: ["XP獲得量 +10%", "インシデント報告の閲覧解放"] },
      { id: "sk_c2", icon: "🛡",  name: "防護フォーム", level: 1, req: ["sk_c1"],  xp: 50,  desc: "実体との接触時に自己防衛を行う姿勢と判断力。",   effects: ["チャットでの情報共有 XP +15", "収束作戦関連コンテンツの解放"] },
      { id: "sk_c3", icon: "⚔️", name: "近接収束",    level: 2, req: ["sk_c2"],  xp: 150, desc: "モジュールを使った近距離での収束技術。",           effects: ["ミッション詳細 XP +20%", "限定ミッションへのアクセス"] },
      { id: "sk_c4", icon: "💥", name: "収束マスタリー",level: 3, req: ["sk_c3"], xp: 350, desc: "複数の実体を同時に収束させる高度な技術。",         effects: ["全ミッション XP +25%", "上級ミッションのアンロック"] },
      { id: "sk_c5", icon: "🌀", name: "次元固定",    level: 4, req: ["sk_c4"],  xp: 700, desc: "次元境界そのものを一時的に固定する最高技術。",     effects: ["M-019使用資格 AAA付与", "LEVEL5専用コンテンツ一部解放"] },
    ],
  },
  {
    id: "analysis", label: "解析", icon: "🔬", color: "#3b82f6",
    skills: [
      { id: "sk_a1", icon: "📡", name: "異常感知",    level: 0, req: [],          xp: 0,   desc: "海蝕現象の初期兆候を感知する訓練。",             effects: ["マップ情報 詳細表示", "実体カタログ解放"] },
      { id: "sk_a2", icon: "🧬", name: "実体分類",    level: 1, req: ["sk_a1"],  xp: 50,  desc: "実体の種類と危険度を正確に評価する能力。",         effects: ["実体詳細ページ XP +15", "分類フィルター機能解放"] },
      { id: "sk_a3", icon: "📊", name: "GSI測定",     level: 2, req: ["sk_a2"],  xp: 150, desc: "GSI値を現場で測定・解釈する技術。",               effects: ["統計ページ解放", "高精度インシデント報告が可能に"] },
      { id: "sk_a4", icon: "🔭", name: "次元観測",    level: 3, req: ["sk_a3"],  xp: 350, desc: "次元境界の薄化を事前に予測する高度な分析。",       effects: ["DEAN監視網アクセス", "予測警報の閲覧権限"] },
      { id: "sk_a5", icon: "🌐", name: "境界理論",    level: 4, req: ["sk_a4"],  xp: 700, desc: "次元間の境界理論を完全に理解した研究者レベル。",   effects: ["世界設定辞典 全エントリ解放", "研究ルート開放"] },
    ],
  },
  {
    id: "intelligence", label: "情報", icon: "🕵️", color: "#8b5cf6",
    skills: [
      { id: "sk_i1", icon: "👁",  name: "観察眼",      level: 0, req: [],          xp: 0,   desc: "現場の状況を正確に観察・記録する基本能力。",     effects: ["閲覧履歴 詳細統計", "検索機能解放"] },
      { id: "sk_i2", icon: "🗂",  name: "情報整理",    level: 1, req: ["sk_i1"],  xp: 50,  desc: "収集した情報を体系的に整理・分析する。",           effects: ["コデックスへのアクセス", "ブックマーク機能強化"] },
      { id: "sk_i3", icon: "🔐", name: "機密取扱",    level: 2, req: ["sk_i2"],  xp: 150, desc: "機密情報を適切に取り扱う能力と資格。",             effects: ["機密開示申請が可能に", "一部CLASSIFIED情報にアクセス"] },
      { id: "sk_i4", icon: "📜", name: "歴史分析",    level: 3, req: ["sk_i3"],  xp: 350, desc: "機関の歴史的事案を深く理解し、パターンを読む。",   effects: ["機関史 機密エントリ解放", "過去事案との照合機能"] },
      { id: "sk_i5", icon: "🔮", name: "真実の目",    level: 4, req: ["sk_i4"],  xp: 700, desc: "全情報を統合し、隠された真実に迫る洞察力。",       effects: ["ARG真エンドルート解放", "全機密文書アクセス"] },
    ],
  },
  {
    id: "field", label: "現場", icon: "🏃", color: "#10b981",
    skills: [
      { id: "sk_f1", icon: "🧭", name: "現場判断",    level: 0, req: [],          xp: 0,   desc: "予期しない状況での迅速な判断力を鍛える。",         effects: ["インシデントレポート解放", "現場報告 XP +10%"] },
      { id: "sk_f2", icon: "🤝", name: "連携作戦",    level: 1, req: ["sk_f1"],  xp: 50,  desc: "他の機関員とチームで動く際の連携スキル。",         effects: ["チャット機能 XP +20%", "グループ作戦ログ閲覧"] },
      { id: "sk_f3", icon: "🚁", name: "緊急対応",    level: 2, req: ["sk_f2"],  xp: 150, desc: "緊急事態における迅速かつ適切な初動対応。",         effects: ["緊急通報システムアクセス", "緊急モジュール申請権限"] },
      { id: "sk_f4", icon: "🗺",  name: "広域展開",    level: 3, req: ["sk_f3"],  xp: 350, desc: "広いエリアにわたる複数事案の同時対応能力。",       effects: ["全国マップ詳細アクセス", "複数インシデント管理"] },
      { id: "sk_f5", icon: "🌟", name: "伝説の機関員", level: 4, req: ["sk_f4"], xp: 700, desc: "あらゆる状況を乗り越えた、機関最高峰の現場力。",   effects: ["全部門ページへのアクセス", "機関員殿堂入り記録"] },
    ],
  },
];

const FLAG_PREFIX = "skill_unlocked:";

export default function SkillTreeClient() {
  const { user, addXp } = useUserStore();
  const addToast = useNotificationStore(s => s.addToast);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [unlocking, setUnlocking]     = useState<string | null>(null);

  const currentXp    = user?.xp    ?? 0;
  const currentLevel = user?.level ?? 0;

  // すべてのスキルフラグを一括取得（story-state エンドポイント利用）
  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/users/me");
      if (!res.ok) return;
      // flags を個別フェッチ — /api/users/me/flags GET は未実装のため
      // story-state から取得する
      const stRes  = await fetch("/api/users/me/story-state");
      if (stRes.ok) {
        const st = await stRes.json();
        const flags: Record<string, unknown> = st.flags ?? {};
        const ids = Object.keys(flags)
          .filter(k => k.startsWith(FLAG_PREFIX) && flags[k])
          .map(k => k.replace(FLAG_PREFIX, ""));
        setUnlockedIds(new Set(ids));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  const isUnlocked  = (id: string) => unlockedIds.has(id);
  const isAvailable = (skill: Skill) => {
    if (currentLevel < skill.level) return false;
    return skill.req.every(r => unlockedIds.has(r));
  };

  async function unlockSkill(skill: Skill) {
    if (unlocking || isUnlocked(skill.id)) return;
    if (!isAvailable(skill)) return;
    if (skill.xp > 0 && currentXp < skill.xp) {
      addToast({ type: "info" as never, title: "XP不足", body: `このスキルには ${skill.xp} XP が必要です（現在: ${currentXp} XP）` });
      return;
    }
    setUnlocking(skill.id);
    try {
      // フラグを保存
      const flagRes = await fetch("/api/users/me/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `${FLAG_PREFIX}${skill.id}`, value: true }),
      });
      if (!flagRes.ok) throw new Error();

      // XP消費（skill.xp > 0のみ）
      if (skill.xp > 0) {
        const xpRes = await fetch("/api/users/me/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: -skill.xp }),
        });
        if (xpRes.ok) {
          const xpData = await xpRes.json();
          updateXp(xpData.totalXp);
        }
      }

      setUnlockedIds(prev => new Set([...prev, skill.id]));
      addToast({ type: "xp" as never, title: `スキル解放: ${skill.name}`, body: skill.effects[0] ?? "", xpAmount: 0 });
    } catch {
      addToast({ type: "info" as never, title: "エラー", body: "スキルの解放に失敗しました" });
    } finally { setUnlocking(null); }
  }

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          SKILL ACQUISITION SYSTEM // ABILITY MATRIX
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          スキルツリー
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
            機関員能力の習得・管理システム
          </p>
          <span className="font-mono" style={{ fontSize: "0.75rem", color: "#ffd740", padding: "2px 10px", border: "1px solid #ffd74040" }}>
            保有 XP: {currentXp.toLocaleString()}
          </span>
          <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", padding: "2px 10px", border: "1px solid rgba(0,255,255,0.2)" }}>
            解放済: {unlockedIds.size} / {TRACKS.reduce((s, t) => s + t.skills.length, 0)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>読み込み中...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {TRACKS.map(track => (
            <div key={track.id} className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{track.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1rem", color: track.color }}>
                  {track.label}トラック
                </span>
                <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>
                  {track.skills.filter(s => isUnlocked(s.id)).length}/{track.skills.length} 解放済
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
                {track.skills.map((skill, idx) => {
                  const unlocked   = isUnlocked(skill.id);
                  const available  = isAvailable(skill);
                  const affordable = skill.xp === 0 || currentXp >= skill.xp;
                  const canUnlock  = available && affordable && !unlocked;
                  const isProcessing = unlocking === skill.id;

                  return (
                    <div key={skill.id}
                      onClick={() => canUnlock && unlockSkill(skill)}
                      style={{
                        position: "relative", width: "160px", padding: "1rem",
                        backgroundColor: unlocked
                          ? `${track.color}18`
                          : canUnlock
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.3)",
                        border: unlocked
                          ? `1px solid ${track.color}60`
                          : canUnlock
                          ? "1px solid rgba(255,255,255,0.15)"
                          : "1px solid rgba(255,255,255,0.06)",
                        cursor: canUnlock ? "pointer" : "default",
                        transition: "all 0.2s",
                        opacity: isProcessing ? 0.6 : 1,
                      }}>
                      {/* 接続線 */}
                      {idx > 0 && (
                        <div className="font-mono" style={{
                          position: "absolute", left: "-18px", top: "50%", transform: "translateY(-50%)",
                          fontSize: "0.6rem",
                          color: isUnlocked(track.skills[idx - 1].id) ? track.color : "rgba(255,255,255,0.15)",
                        }}>→</div>
                      )}
                      {/* 状態バッジ */}
                      <div style={{ position: "absolute", top: "6px", right: "6px" }}>
                        {unlocked ? (
                          <span style={{ fontSize: "0.55rem", color: track.color, fontFamily: "monospace" }}>✓ 解放済</span>
                        ) : canUnlock ? (
                          <span style={{ fontSize: "0.55rem", color: "#ffd740", fontFamily: "monospace" }}>解放可</span>
                        ) : (
                          <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                            {currentLevel < skill.level ? `LV${skill.level}必要` : "前提必要"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", filter: available ? "none" : "grayscale(100%)" }}>
                        {skill.icon}
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.8rem", color: available ? "white" : "rgba(255,255,255,0.35)", marginBottom: "0.4rem", lineHeight: 1.3 }}>
                        {skill.name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: available ? "var(--muted-foreground)" : "rgba(255,255,255,0.2)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                        {skill.desc}
                      </div>
                      {unlocked && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
                          {skill.effects.map(e => (
                            <div key={e} className="font-mono" style={{ fontSize: "0.58rem", color: track.color, marginBottom: "0.15rem" }}>+ {e}</div>
                          ))}
                        </div>
                      )}
                      {!unlocked && skill.xp > 0 && (
                        <div className="font-mono" style={{ fontSize: "0.58rem", color: affordable && available ? "#ffd740" : "rgba(255,255,255,0.25)", marginTop: "0.25rem" }}>
                          {affordable || !available ? `⚡ ${skill.xp} XP` : `🔒 XP不足 (${skill.xp})`}
                        </div>
                      )}
                      {canUnlock && (
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", backgroundColor: track.color, opacity: 0.5 }} />
                      )}
                      {isProcessing && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", fontSize: "0.7rem", color: track.color, fontFamily: "monospace" }}>
                          解放中...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem", padding: "1.25rem" }}>
        <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          ▸ 操作ガイド
        </div>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          {[
            { color: "var(--primary)", label: "「解放可」— クリックでスキルを解放（XP消費）" },
            { color: "#ffd740",        label: "XP表示 — 解放に必要なポイント" },
            { color: "rgba(255,255,255,0.3)", label: "グレー — レベル不足または前提スキル未解放" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
              <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
