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
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
