import type { NextConfig } from "next";

const allowedOrigins = [
  "localhost:3000",
  // Vercel本番・プレビュードメインを自動で追加
  ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
  ...(process.env.VERCEL_BRANCH_URL ? [process.env.VERCEL_BRANCH_URL] : []),
  // カスタムドメインがある場合は下記に追記
  // "example.com",
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // 静的画像の CDN キャッシュ期間 (1週間)
    minimumCacheTTL: 604800,
  },
  // 静的アセットの長期キャッシュヘッダー
  headers: async () => [
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