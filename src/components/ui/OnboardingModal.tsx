"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/fetch";

const STEPS = [
  {
    id: "welcome",
    icon: "⬡",
    title: "海蝕機関へようこそ",
    subtitle: "WELCOME TO KAISHOKU AGENCY",
    body: `あなたは今日、「海蝕機関」に配属されました。

この機関は、私たちの世界（一次元素材次元）に隣接する「階宙次元」からの侵食——
通称「海蝕現象」を観測・収束することを使命としています。

まずは基本的な操作を確認してください。`,
    color: "var(--primary)",
  },
  {
    id: "id",
    icon: "◈",
    title: "あなたの機関員ID",
    subtitle: "AGENT IDENTIFICATION",
    body: `あなたに割り当てられた機関員IDは、K-XXX-XXX 形式です。

このIDは機関内での唯一の識別子です。
通信ログやレポートには必ずこのIDが記録されます。

IDは変更できません。大切にしてください。`,
    color: "#a855f7",
  },
  {
    id: "xp",
    icon: "★",
    title: "XPとクリアランスレベル",
    subtitle: "EXPERIENCE & CLEARANCE",
    body: `機関での活動を通じてXP（経験値）を獲得し、
クリアランスレベルが上昇します。

レベルが上がるほど、より多くの機密情報へのアクセスが可能になります。

毎日ログインするとボーナスXPが付与されます。`,
    color: "#f59e0b",
  },
  {
    id: "anomaly",
    icon: "☢",
    title: "異常スコアについて",
    subtitle: "ANOMALY SCORE WARNING",
    body: `あなたの行動パターンにより「異常スコア」が変動します。

スコアが上昇すると、機関の監視システムが反応し、
通信に干渉が生じることがあります。

これは…正常な現象です。気にしないでください。

たぶん。`,
    color: "#ef4444",
  },
];

export default function OnboardingModal({ loginCount }: { loginCount: number }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const STORAGE_KEY = "kai_onboarding_done";

  useEffect(() => {
    // 初回ログインかつ未完了の場合のみ表示
    if (loginCount <= 1 && !localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [loginCount]);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      complete();
    }
  }

  function complete() {
    setClosing(true);
    localStorage.setItem(STORAGE_KEY, "1");
    // tutorial_complete フラグをサーバーにも記録
    apiFetch("/api/auth/tutorial-complete", { method: "POST" }).catch(() => {});
    setTimeout(() => setVisible(false), 400);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
      opacity: closing ? 0 : 1,
      transition: "opacity 0.4s",
    }}>
      <div style={{
        width: "100%", maxWidth: "32rem",
        backgroundColor: "rgba(5,8,15,0.97)",
        border: `1px solid ${current.color}40`,
        borderRadius: "0.5rem",
        boxShadow: `0 0 60px ${current.color}20`,
        overflow: "hidden",
        transform: closing ? "scale(0.95)" : "scale(1)",
        transition: "transform 0.4s",
      }}>
        {/* プログレスバー */}
        <div style={{ height: "2px", backgroundColor: "rgba(255,255,255,0.05)" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: current.color, transition: "width 0.4s ease, background-color 0.4s" }} />
        </div>

        {/* ヘッダー */}
        <div style={{ padding: "1.75rem 2rem 0", textAlign: "center" }}>
          <div style={{
            fontSize: "2.5rem", marginBottom: "1rem",
            filter: `drop-shadow(0 0 8px ${current.color})`,
            transition: "filter 0.4s",
          }}>
            {current.icon}
          </div>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: current.color, letterSpacing: "0.2em", marginBottom: "0.5rem", transition: "color 0.4s" }}>
            {current.subtitle}
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.4rem",
            fontWeight: 700, color: "white", marginBottom: "1.25rem",
          }}>
            {current.title}
          </h2>
        </div>

        {/* 本文 */}
        <div style={{ padding: "0 2rem 1.5rem" }}>
          <div style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "0.375rem",
            padding: "1.25rem",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.9,
            whiteSpace: "pre-wrap",
          }}>
            {current.body}
          </div>
        </div>

        {/* フッター */}
        <div style={{ padding: "0 2rem 1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* ステップドット */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? "1.5rem" : "0.4rem",
                height: "0.4rem",
                borderRadius: "9999px",
                backgroundColor: i === step ? current.color : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.625rem" }}>
            {/* スキップ */}
            <button onClick={complete}
              className="font-mono"
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "0.05em", padding: "0.5rem 0.75rem" }}>
              スキップ
            </button>
            {/* 次へ / 完了 */}
            <button onClick={next}
              className="font-mono"
              style={{
                padding: "0.5rem 1.5rem",
                backgroundColor: `${current.color}20`,
                border: `1px solid ${current.color}80`,
                color: current.color,
                fontSize: "0.8rem",
                cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}>
              {step === STEPS.length - 1 ? "▶ 任務開始" : "次へ ›"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
