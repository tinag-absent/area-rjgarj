export default function EntitiesLoading() {
  return (
    <div style={{ padding: "3rem 1.5rem" }}>
      <div style={{ height: "2rem", width: "12rem", backgroundColor: "var(--muted)", borderRadius: "0.5rem", marginBottom: "0.75rem", animation: "pulse 1.5s infinite" }} />
      <div style={{ height: "1rem", width: "8rem", backgroundColor: "var(--muted)", borderRadius: "0.25rem", marginBottom: "2rem", animation: "pulse 1.5s infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ height: "10rem", animation: "pulse 1.5s infinite", opacity: 0.4 }} />
        ))}
      </div>
    </div>
  );
}
