"use client";

import { useState } from "react";

export default function MissionApplyButton({ missionId, missionTitle }: { missionId: string; missionTitle: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (loading || status) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/apply`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("applied");
      } else if (res.status === 409) {
        setStatus(data.status ?? "applied");
      } else {
        setError(data.error ?? "申請失敗");
      }
    } catch { setError("通信エラー"); }
    finally { setLoading(false); }
  }

  if (status === "applied") {
    return (
      <span className="font-mono" style={{ fontSize: "0.65rem", padding: "0.25rem 0.75rem", backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
        申請済
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="font-mono" style={{ fontSize: "0.65rem", padding: "0.25rem 0.75rem", backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
        ✓ 承認済
      </span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <button onClick={apply} disabled={loading}
        className="font-mono"
        style={{
          fontSize: "0.65rem", padding: "0.25rem 0.75rem",
          backgroundColor: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.3)",
          color: "var(--primary)", cursor: "pointer", transition: "all 0.2s",
          opacity: loading ? 0.5 : 1,
        }}>
        {loading ? "申請中..." : "▶ 参加申請"}
      </button>
      {error && <span className="font-mono" style={{ fontSize: "0.6rem", color: "#ef4444" }}>{error}</span>}
    </div>
  );
}
