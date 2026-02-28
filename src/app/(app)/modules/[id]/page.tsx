import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Module {
  id: string;
  code: string;
  name: string;
  classification: string;
  description: string;
  range: string;
  duration: string;
  energy: string;
  developer: string;
  details?: string;
  warning?: string;
}

const CLASSIFICATION_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  safe:       { bg: "rgba(16,185,129,0.12)",  text: "#10b981", label: "安全",    border: "rgba(16,185,129,0.25)" },
  caution:    { bg: "rgba(234,179,8,0.12)",   text: "#eab308", label: "注意",    border: "rgba(234,179,8,0.25)" },
  danger:     { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", label: "危険",    border: "rgba(239,68,68,0.3)" },
  classified: { bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", label: "機密",    border: "rgba(139,92,246,0.3)" },
};

const ENERGY_COLORS: Record<string, string> = {
  "低": "#10b981", "中": "#eab308", "高": "#f97316", "超高": "#ef4444", "極高": "#dc2626",
};

async function loadModule(id: string): Promise<Module | null> {
  try {
    const { default: data } = await import("../../../../../public/data/modules-data.json");
    const modules = (data as { modules?: Module[] }).modules ?? [];
    return modules.find(m => m.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const mod = await loadModule(id);
  return { title: mod ? `${mod.name} - モジュール` : "モジュール" };
}

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 2) return <LockedContent requiredLevel={2} currentLevel={lvl} pageName="モジュール" />;

  const mod = await loadModule(id);
  if (!mod) notFound();

  const style = CLASSIFICATION_STYLES[mod.classification] ?? CLASSIFICATION_STYLES.safe;
  const energyColor = ENERGY_COLORS[mod.energy];

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "760px", margin: "0 auto" }}>
      {/* 戻るリンク */}
      <Link href="/modules" style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        color: "rgba(255,255,255,0.4)", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
        marginBottom: "2rem", transition: "color 0.2s",
      }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        モジュール一覧に戻る
      </Link>

      {/* ヘッダーカード */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem", borderColor: style.border }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <span className="font-mono" style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, letterSpacing: "0.05em" }}>
            {mod.code}
          </span>
          <span style={{
            fontSize: "0.7rem", padding: "0.2rem 0.65rem",
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            backgroundColor: style.bg, color: style.text,
            border: `1px solid ${style.border}`,
          }}>
            {style.label}
          </span>
        </div>

        <h1 style={{ fontSize: "1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", margin: "0 0 1rem" }}>
          {mod.name}
        </h1>

        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.75, margin: 0 }}>
          {mod.description}
        </p>
      </div>

      {/* スペックグリッド */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "1rem" }}>
          SPECIFICATIONS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[
            { label: "有効範囲",       value: mod.range,     color: undefined },
            { label: "持続時間",       value: mod.duration,  color: undefined },
            { label: "エネルギー消費", value: mod.energy,    color: energyColor },
            { label: "開発部門",       value: mod.developer, color: undefined },
          ].map(spec => (
            <div key={spec.label} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
                {spec.label}
              </div>
              <div className="font-mono" style={{ fontSize: "0.875rem", fontWeight: 700, color: spec.color ?? "white" }}>
                {spec.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細情報 */}
      {mod.details && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div className="font-mono" style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", letterSpacing: "0.15em", marginBottom: "1rem" }}>
            DETAILS
          </div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.85 }}>
            {mod.details.split("\n\n").map((para, i) => (
              <p key={i} style={{
                margin: "0 0 0.875rem",
                color: para.startsWith("【") ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)",
                fontWeight: para.startsWith("【") ? 600 : undefined,
              }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 警告 */}
      {mod.warning && (
        <div style={{
          padding: "1rem 1.25rem",
          backgroundColor: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.3)",
        }}>
          <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
            ⚠ WARNING
          </div>
          <div className="font-mono" style={{ fontSize: "0.8rem", color: "rgba(239,68,68,0.85)", lineHeight: 1.65 }}>
            {mod.warning}
          </div>
        </div>
      )}
    </div>
  );
}
