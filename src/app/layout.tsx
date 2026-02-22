import { RuntimeFeatures } from '@/components/runtime-features';
import { StructuredData } from '@/components/structured-data';
import type { Metadata, Viewport } from 'next';
import { M_PLUS_Rounded_1c } from 'next/font/google';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import './globals.css';
const mPlusRounded = M_PLUS_Rounded_1c({
  variable: '--font-m-plus-rounded',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
  colorScheme: 'light',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://akyodex.com'),
  title: {
    default: 'Akyoずかん-VRChatアバター Akyo図鑑- | Akyodex-VRChat Avatar Akyo Index',
    template: '%s | Akyoずかん',
  },
  description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
  keywords: ['Akyo', 'Akyodex', 'VRChat', 'Avatar', 'VRChatアバター図鑑', 'Akyoずかん'],
  authors: [{ name: 'らど', url: 'https://akyodex.com' }],
  creator: 'らど',
  publisher: 'Akyodex',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://akyodex.com',
    languages: {
      'ja-JP': 'https://akyodex.com',
      'en-US': 'https://akyodex.com',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    alternateLocale: ['en_US'],
    title: 'Akyoずかん-VRChatアバター Akyo図鑑-',
    description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
    url: 'https://akyodex.com',
    siteName: 'Akyoずかん',
    images: [{ url: '/images/logo-200.png', width: 200, height: 200, alt: 'Akyoずかん ロゴ' }],
  },
  twitter: {
    card: 'summary',
    title: 'Akyoずかん-VRChatアバター Akyo図鑑-',
    description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
    images: ['/images/logo-200.png'],
    creator: '@akyodex',
  },
  icons: {
    icon: [
      { url: '/images/akyodexIcon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/akyodexIcon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/akyodexIcon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/images/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
    other: [
      { rel: 'icon', url: '/images/akyodexIcon-192.png', sizes: '192x192' },
      { rel: 'icon', url: '/images/akyodexIcon-512.png', sizes: '512x512' },
    ],
  },
  category: 'entertainment',
};

/**
 * Static Root Layout (Next.js 16 with PPR)
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Mark as dynamic for Consistent Nonce in App Router
  // If we want reliable nonces for ALL scripts (including Next.js bootstrap),
  // we must extract them at the top level.
  await connection();
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
  const difyToken = process.env.NEXT_PUBLIC_DIFY_CHATBOT_TOKEN;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head suppressHydrationWarning />
      <body className={`${mPlusRounded.variable} antialiased`}>
        {children}

        {/* Dynamic features and metadata */}
        <style
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              #dify-chatbot-bubble-button {
                background-color: #EE7800 !important;
              }
              #dify-chatbot-bubble-window {
                width: 24rem !important;
                height: 40rem !important;
                position: fixed !important;
                inset: auto 1rem 1rem auto !important;
              }
            `,
          }}
        />
        <StructuredData nonce={nonce} />
        <RuntimeFeatures difyToken={difyToken} />
      </body>
    </html>
  );
}

