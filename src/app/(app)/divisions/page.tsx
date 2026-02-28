import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "機関組織図 - 海蝕機関" };

const DIVISIONS = [
  {
    id: "DIV-01",
    slug: "convergence",
    name: "収束部門",
    en: "Convergence Division",
    description: "海蝕現象の前線に立つ部門。モジュールと呼ばれる収束装置を携行し、現場での即応処置を行う。",
    personnel: 156,
    color: "#ef4444",
    specializations: ["次元収束", "実体無力化", "緊急対応"],
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "DIV-02",
    slug: "support",
    name: "支援部門",
    en: "Support Division",
    description: "現地オペレーションの調整やデータ解析、海蝕員の帰還後ケアを担当。状況に応じて現場への同行支援も実施する。",
    personnel: 178,
    color: "#10b981",
    specializations: ["医療支援", "補給管理", "通信維持"],
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: "DIV-03",
    slug: "engineering",
    name: "工作部門",
    en: "Engineering Division",
    description: "回収された海蝕実体や残滓を検証し、その特性をモジュールへ転用。部室・消耗品・小物類の製作も兼任する。",
    personnel: 134,
    color: "#f97316",
    specializations: ["モジュール開発", "技術革新", "装備保守"],
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "DIV-04",
    slug: "foreign",
    name: "外事部門",
    en: "Foreign Affairs",
    description: "行政・報道機関・階底次元住民との折衝やメディア操作を行う。スカウトや経理業務を担当することもある。",
    personnel: 102,
    color: "#a855f7",
    specializations: ["外交交渉", "情報工作", "記憶操作"],
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "DIV-05",
    slug: "port",
    name: "港湾部門",
    en: "Port Division",
    description: "境界の入り口となる土地や施設を24時間監視し、未認可の不根（ふね）や海蝕実体の侵入を阻止する。",
    personnel: 89,
    color: "#3b82f6",
    specializations: ["ゲート管理", "次元航行", "座標固定"],
    icon: (
      <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
  },
];

export default async function DivisionsPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="部門" />;

  const totalPersonnel = DIVISIONS.reduce((s, d) => s + d.personnel, 0);

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: "1rem", marginBottom: "2.5rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          INTERNAL DOCUMENT // CLASSIFIED
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.25rem", textTransform: "uppercase" as const, letterSpacing: "-0.025em" }}>
          機関組織図
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          総在籍 {totalPersonnel.toLocaleString()} 名 / {DIVISIONS.length} 部門
        </p>
      </div>

      {/* Divisions Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {DIVISIONS.map((div) => (
          <Link
            key={div.id}
            href={`/divisions/${div.slug}`}
            style={{ textDecoration: "none" }}
          >
          <div
            className="card"
            style={{
              position: "relative",
              overflow: "hidden",
              borderColor: `${div.color}22`,
              transition: "all 0.3s",
              cursor: "pointer",
            }}
          >
            {/* Background icon */}
            <div style={{
              position: "absolute", top: "1rem", right: "1rem", opacity: 0.06,
              color: div.color,
            }}>
              <div style={{ width: "80px", height: "80px", color: div.color }}>
                {div.icon}
              </div>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {/* Badge + small icon */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span className="font-mono" style={{
                  fontSize: "0.7rem", padding: "0.2rem 0.6rem",
                  border: `1px solid ${div.color}80`, color: div.color,
                  letterSpacing: "0.1em",
                }}>
                  {div.id}
                </span>
                <div style={{ color: div.color, opacity: 0.7, width: "20px", height: "20px" }}>
                  {div.icon}
                </div>
              </div>

              {/* Name */}
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "white", textTransform: "uppercase" as const, marginBottom: "0.25rem" }}>
                {div.name}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "1rem" }}>
                {div.en}
              </p>

              {/* Description */}
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.75, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem", marginBottom: "1rem" }}>
                {div.description}
              </p>

              {/* Specializations */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
                {div.specializations.map(s => (
                  <span key={s} className="font-mono" style={{
                    fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                    backgroundColor: `${div.color}10`,
                    border: `1px solid ${div.color}30`,
                    color: div.color,
                  }}>
                    {s}
                  </span>
                ))}
              </div>

              {/* Personnel count */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.4rem" }}>
                <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>在籍</span>
                <span className="font-mono" style={{ fontSize: "1rem", fontWeight: 700, color: div.color }}>{div.personnel}</span>
                <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)" }}>名</span>
              </div>
            </div>

            {/* Bottom color bar */}
            <div style={{ height: "3px", backgroundColor: `${div.color}20` }}>
              <div style={{ height: "100%", width: `${(div.personnel / 200) * 100}%`, backgroundColor: div.color, transition: "width 0.7s" }} />
            </div>
          </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
