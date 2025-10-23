import type { NextConfig } from "next";

// 開発時のみCloudflare Pages開発プラットフォームをセットアップ
if (process.env.NODE_ENV === 'development') {
  (async () => {
    try {
      const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
      await setupDevPlatform();
    } catch {
      // ビルド時など、モジュールがない場合は無視
    }
  })();
}

const nextConfig: NextConfig = {
  // ビルド時の型チェックを無視（デプロイ優先）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ビルド時のESLintを無視
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    // Next.js 16対応: APIルート経由の画像読み込み
    localPatterns: [
      {
        pathname: '/api/avatar-image',
        search: '**',
      },
    ],
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // i18n対応準備
  i18n: undefined, // App Routerでは別の方法で実装

  // 環境変数の検証（オプション）
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://akyodex.com',
    NEXT_PUBLIC_R2_BASE: process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com',
  },

  // パフォーマンス最適化
  reactStrictMode: true,
  
  // 本番環境での最適化
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
