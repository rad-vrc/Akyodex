import type { NextConfig } from 'next';
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  void setupDevPlatform();
}

const nextConfig: NextConfig = {
  eslint: {
    // ビルド時のESLintを無視
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時の型チェックも無視（デプロイ優先）
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
