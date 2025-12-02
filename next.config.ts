import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ビルド時の型チェックを無視（デプロイ優先）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ビルド時のESLintを無視
  eslint: {
    ignoreDuringBuilds: true,
  },

  // パフォーマンス最適化: バンドルサイズ削減
  experimental: {
    // パッケージのTree Shakingを有効化
    optimizePackageImports: [
      'react',
      'react-dom',
    ],
  },
  // Cloudflare Pages対応設定
  images: {
    // Image optimization configuration
    // To enable Cloudflare Images:
    // 1. Set NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES=true
    // 2. Set NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_account_hash
    // 3. Change unoptimized to false
    unoptimized: process.env.NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES !== 'true',
    
    // Use custom loader when Cloudflare Images is enabled
    ...(process.env.NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES === 'true' && {
      loader: 'custom',
      loaderFile: './src/lib/cloudflare-image-loader.ts',
    }),
    
    // Image formats and sizes
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Remote patterns for image sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imagedelivery.net', // Cloudflare Images CDN
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.akyodex.com', // R2 fallback
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '**.vrchat.com', // VRChat API fallback
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

  // 301リダイレクト（旧URL → 新URL）
  async redirects() {
    return [
      // index.html (クエリパラメータなし) → /zukan
      {
        source: '/index.html',
        destination: '/zukan',
        permanent: true, // 301 Redirect
      },
      // index.html?id=XXX → /zukan?id=XXX
      // Accepts alphanumeric IDs (e.g., 001, 0001, 612, etc.)
      {
        source: '/index.html',
        has: [
          {
            type: 'query',
            key: 'id',
            value: '(?<id>[0-9A-Za-z]+)',
          },
        ],
        destination: '/zukan?id=:id',
        permanent: true, // 301 Redirect
      },
    ];
  },

  // セキュリティヘッダー & パフォーマンスヘッダー
  async headers() {
    return [
      // 全ページ共通のセキュリティヘッダー
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
      // 静的アセットの長期キャッシュ（Cloudflare CDN最適化）
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // フォントファイルの長期キャッシュ
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // APIルートのキャッシュ設定
      {
        source: '/api/avatar-image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
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

  // パフォーマンス最適化: ソースマップを無効化（本番環境のみ）
  productionBrowserSourceMaps: false,

  // パフォーマンス最適化: コンソールログを本番で削除
  compiler: {
    // 本番環境でconsole.logを削除
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // バンドル分析用（必要時に有効化）
  // bundleAnalyzer: process.env.ANALYZE === 'true',
};

export default nextConfig;
