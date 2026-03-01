import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "2rem" }}>
      <div>
        <div className="font-mono" style={{ fontSize: "6rem", fontWeight: 700, color: "var(--primary)", opacity: 0.3, lineHeight: 1 }}>404</div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 700, color: "white", margin: "1rem 0 0.5rem" }}>
          ページが見つかりません
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "2rem" }}>
          [ERROR] REQUESTED RESOURCE NOT FOUND — SECTOR UNKNOWN
        </p>
        <Link href="/dashboard" className="btn-primary" style={{ display: "inline-block", padding: "0.625rem 1.5rem", backgroundColor: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "0.375rem", fontWeight: 600 }}>
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
