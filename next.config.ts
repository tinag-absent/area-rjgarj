import type { NextConfig } from "next";

const allowedOrigins = [
  "localhost:3000",
  // Vercel本番・プレビュードメインを自動で追加
  ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
  ...(process.env.VERCEL_BRANCH_URL ? [process.env.VERCEL_BRANCH_URL] : []),
  // カスタムドメインがある場合は下記に追記
  // "example.com",
];

// [SECURITY FIX V-08] Content-Security-Policy ヘッダー
// 'unsafe-inline' は Next.js の style注入のために一時的に許可しているが、
// nonce ベースへの移行を推奨。script-src は 'self' のみで外部スクリプトをブロック。
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",   // 'unsafe-eval': Next.js dev 用（本番では削除推奨）
  "style-src 'self' 'unsafe-inline'",  // 'unsafe-inline': CSS-in-JS 対応
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // 静的画像の CDN キャッシュ期間 (1週間)
    minimumCacheTTL: 604800,
  },
  // 静的アセットの長期キャッシュヘッダー
  headers: async () => [
    // [SECURITY FIX V-08] 全ページにセキュリティヘッダーを付与
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy",        value: CSP },
        { key: "X-Content-Type-Options",         value: "nosniff" },
        { key: "X-Frame-Options",                value: "DENY" },
        { key: "X-XSS-Protection",              value: "1; mode=block" },
        { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
    {
      source: "/data/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
      ],
    },
    {
      source: "/icons/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=604800, immutable" },
      ],
    },
    {
      source: "/:path*.json",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
      ],
    },
  ],
  // バンドルサイズ解析用（ANALYZE=true npx next build で有効化）
  ...(process.env.ANALYZE === "true" && {
    experimental: {
      bundlePagesRouterDependencies: true,
    },
  }),
  experimental: {
    serverActions: {
      allowedOrigins,
    },
    // Server Components のレンダリングをキャッシュ（Next.js 15+）
    // dynamicIO: true,  // 必要に応じて有効化
  },
};

export default nextConfig;