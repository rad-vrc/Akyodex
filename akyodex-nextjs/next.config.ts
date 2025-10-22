import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages対応設定
  images: {
    // R2から画像を配信するためのカスタムローダー
    unoptimized: true, // Cloudflare Imagesを使う場合はfalseに変更可能
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.akyodex.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '**.vrchat.com',
        pathname: '/**',
      },
    ],
  },
  // i18n対応準備
  i18n: undefined, // App Routerでは別の方法で実装
  // 環境変数の検証（オプション）
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://akyodex.com',
    NEXT_PUBLIC_R2_BASE: process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com',
  },
};

export default nextConfig;
