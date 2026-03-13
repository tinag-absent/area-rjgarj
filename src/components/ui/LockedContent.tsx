export default function LockedContent({
  requiredLevel,
  currentLevel,
  pageName,
}: {
  requiredLevel: number;
  currentLevel: number;
  pageName?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "2rem",
      }}
    >
      <div
        className="card animate-fadeIn"
        style={{
          maxWidth: "28rem",
          width: "100%",
          textAlign: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: "3rem 2rem",
        }}
      >
        <div
          style={{
            fontSize: "3rem",
            marginBottom: "1.5rem",
            color: "var(--destructive)",
          }}
        >
          🔒
        </div>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--destructive)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "1rem",
          }}
        >
          アクセス拒否
        </h2>
        <p
          className="font-mono"
          style={{
            fontSize: "0.875rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.75,
            marginBottom: "1.5rem",
          }}
        >
          {pageName ? `「${pageName}」へのアクセスには` : "このコンテンツへのアクセスには"}
          <br />
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>
            LEVEL {requiredLevel}
          </span>{" "}
          以上のクリアランスが必要です。
          <br />
          <br />
          現在のクリアランスレベル:{" "}
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>
            LEVEL {currentLevel}
          </span>
        </p>
        <div
          className="font-mono"
          style={{
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
            opacity: 0.6,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          [ACCESS DENIED — CLEARANCE INSUFFICIENT]
        </div>
      </div>
    </div>
  );
}
