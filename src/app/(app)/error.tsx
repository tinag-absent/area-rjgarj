"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <div
          className="font-mono"
          style={{
            fontSize: "0.75rem",
            color: "var(--destructive)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            marginBottom: "1rem",
          }}
        >
          ⚠ SYSTEM ERROR
        </div>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "white",
            marginBottom: "0.75rem",
          }}
        >
          エラーが発生しました
        </h2>
        <p
          className="font-mono"
          style={{
            fontSize: "0.8125rem",
            color: "var(--muted-foreground)",
            marginBottom: "0.5rem",
            maxWidth: "28rem",
            lineHeight: 1.5,
          }}
        >
          {error.message || "予期しないエラーが発生しました。"}
        </p>
        {error.digest && (
          <p
            className="font-mono"
            style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", opacity: 0.6, marginBottom: "2rem" }}
          >
            [ERROR ID: {error.digest}]
          </p>
        )}
        <button onClick={reset} className="btn-primary">
          再試行
        </button>
      </div>
    </div>
  );
}
