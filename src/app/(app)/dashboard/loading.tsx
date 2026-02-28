export default function DashboardLoading() {
  return (
    <div style={{ padding: "3rem 1.5rem" }}>
      {/* Status bar skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: "var(--border)", animation: "pulse 1.5s infinite" }} />
        <div style={{ height: "1rem", width: "12rem", backgroundColor: "var(--muted)", borderRadius: "0.25rem", animation: "pulse 1.5s infinite" }} />
      </div>

      {/* Title skeleton */}
      <div style={{ height: "2.5rem", width: "18rem", backgroundColor: "var(--muted)", borderRadius: "0.5rem", marginBottom: "0.75rem", animation: "pulse 1.5s infinite" }} />
      <div style={{ height: "1.25rem", width: "14rem", backgroundColor: "var(--muted)", borderRadius: "0.25rem", marginBottom: "3rem", animation: "pulse 1.5s infinite" }} />

      <div style={{ height: "1px", backgroundColor: "var(--border)", marginBottom: "2rem" }} />

      {/* Card skeletons */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        <div className="card" style={{ height: "16rem", animation: "pulse 1.5s infinite", opacity: 0.4 }} />
        <div className="card" style={{ height: "16rem", animation: "pulse 1.5s infinite", opacity: 0.4 }} />
      </div>
    </div>
  );
}
