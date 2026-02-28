import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "モジュール - 海蝕機関" };

async function loadModulesData() {
  try {
    const { default: data } = await import("../../../../public/data/modules-data.json");
    return (data as { modules?: unknown[] }).modules ?? [];
  } catch {
    return [];
  }
}

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
  "低": "#10b981",
  "中": "#eab308",
  "高": "#f97316",
  "超高": "#ef4444",
  "極高": "#dc2626",
};

export default async function ModulesPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 2) return <LockedContent requiredLevel={2} currentLevel={lvl} pageName="モジュール" />;

  const modules = await loadModulesData() as Module[];

  const classStats = {
    safe:       modules.filter(m => m.classification === "safe").length,
    caution:    modules.filter(m => m.classification === "caution").length,
    danger:     modules.filter(m => m.classification === "danger").length,
    classified: modules.filter(m => m.classification === "classified").length,
  };

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          EQUIPMENT DATABASE // LEVEL 2 CLEARANCE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          モジュール
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          {modules.length} 件のモジュールが登録されています
        </p>
      </div>

      {/* Classification stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {(["safe", "caution", "danger", "classified"] as const).map(cls => {
          const s = CLASSIFICATION_STYLES[cls];
          return (
            <div key={cls} className="card" style={{ padding: "1rem", textAlign: "center", borderColor: s.border }}>
              <div style={{ fontSize: "1.75rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.text }}>
                {classStats[cls]}
              </div>
              <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modules grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
        {modules.map((mod) => {
          const style = CLASSIFICATION_STYLES[mod.classification] ?? CLASSIFICATION_STYLES.safe;
          return (
            <div
              key={mod.id}
              className="card"
              style={{ borderColor: style.border }}
            >
              <div style={{ padding: "1.25rem" }}>
                {/* Top row: code + classification badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>
                    {mod.code}
                  </span>
                  <span style={{
                    fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "2px",
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    backgroundColor: style.bg, color: style.text,
                  }}>
                    {style.label}
                  </span>
                </div>

                {/* Name */}
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "white", marginBottom: "0.5rem" }}>
                  {mod.name}
                </div>

                {/* Description */}
                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  {mod.description}
                </p>

                {/* Specs grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: mod.warning ? "0.75rem" : 0 }}>
                  {[
                    { label: "有効範囲", value: mod.range },
                    { label: "持続時間", value: mod.duration },
                    { label: "エネルギー消費", value: mod.energy, energyColor: ENERGY_COLORS[mod.energy] },
                    { label: "開発部門", value: mod.developer },
                  ].map(spec => (
                    <div key={spec.label}>
                      <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>
                        {spec.label}
                      </div>
                      <div className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: spec.energyColor ?? "white" }}>
                        {spec.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warning */}
                {mod.warning && (
                  <div style={{
                    marginTop: "0.75rem", padding: "0.625rem 0.875rem",
                    backgroundColor: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "4px",
                  }}>
                    <div className="font-mono" style={{ fontSize: "0.65rem", color: "#ef4444", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>
                      ⚠ WARNING
                    </div>
                    <div className="font-mono" style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.8)", lineHeight: 1.5 }}>
                      {mod.warning}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {modules.length === 0 && (
          <div className="font-mono" style={{ color: "var(--muted-foreground)", padding: "3rem", textAlign: "center", gridColumn: "1/-1" }}>
            [データなし]
          </div>
        )}
      </div>
    </div>
  );
}
