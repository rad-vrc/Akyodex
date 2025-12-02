import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Kosugi_Maru } from "next/font/google";
import { StructuredData } from "@/components/structured-data";
import { WebVitals } from "@/components/web-vitals";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { headers } from "next/headers";
import "./globals.css";

// Note: M PLUS Rounded 1c doesn't have Japanese subset in next/font
// So we load it via CSS @import in globals.css for Japanese characters
// These fonts are used as fallbacks and for CSS variable definitions

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const kosugiMaru = Kosugi_Maru({
  variable: "--font-kosugi-maru",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
});

// Viewport設定（Next.js 15のベストプラクティス）
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
  colorScheme: 'light',
};

// メタデータ設定
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

  // manifest.ts will be automatically detected by Next.js

  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    alternateLocale: ['en_US'],
    title: 'Akyoずかん-VRChatアバター Akyo図鑑-',
    description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
    url: 'https://akyodex.com',
    siteName: 'Akyoずかん',
    images: [
      {
        url: '/images/logo-200.png',
        width: 200,
        height: 200,
        alt: 'Akyoずかん ロゴ',
      },
    ],
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
    apple: [
      { url: '/images/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/images/akyodexIcon-192.png', sizes: '192x192' },
      { rel: 'icon', url: '/images/akyodexIcon-512.png', sizes: '512x512' },
    ],
  },

  // 検証とアナリティクス用（必要に応じて追加）
  verification: {
    // google: 'your-google-site-verification',
    // yandex: 'your-yandex-verification',
    // bing: 'your-bing-verification',
  },

  // カテゴリー
  category: 'entertainment',
};

// External resources - loaded with preconnect and optimized loading
const fontAwesomeUrl = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css";
const sentryUrl = "https://js.sentry-cdn.com/04aa2a0affc38215961ed0d62792d68b.min.js";

// Preconnect domains for faster resource loading
const preconnectDomains = [
  "https://fonts.googleapis.com",  // Google Fonts CSS
  "https://fonts.gstatic.com",     // Google Fonts files
  "https://cdn.jsdelivr.net",
  "https://js.sentry-cdn.com",
  "https://images.akyodex.com",    // R2 images
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get nonce from middleware
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
  const difyToken = process.env.NEXT_PUBLIC_DIFY_CHATBOT_TOKEN;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head suppressHydrationWarning>
        {/* Preconnect to external domains for faster loading */}
        {preconnectDomains.map((domain) => (
          <link key={domain} rel="preconnect" href={domain} crossOrigin="anonymous" />
        ))}
        
        {/* DNS Prefetch for CDN domains */}
        <link rel="dns-prefetch" href="https://vrchat.com" />
        <link rel="dns-prefetch" href="https://api.vrchat.cloud" />
        
        {/* FontAwesome - loaded with low priority (icons are not critical) */}
        <link 
          rel="stylesheet" 
          href={fontAwesomeUrl}
          media="print"
          // @ts-expect-error onLoad is valid for link elements
          onLoad="this.media='all'"
        />
        {/* Fallback for JS disabled */}
        <noscript>
          <link rel="stylesheet" href={fontAwesomeUrl} />
        </noscript>
        
        {/* Sentry エラー監視 - deferred for better FCP */}
        <script
          src={sentryUrl}
          crossOrigin="anonymous"
          defer
          {...(nonce && { nonce })}
        />
        {difyToken ? (
          <>
            {/* Dify AI Chatbot - Config must be set before loading embed script */}
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.difyChatbotConfig = { token: '${difyToken}' };`,
              }}
            />
            <script
              src="https://udify.app/embed.min.js"
              id={difyToken}
              defer
              nonce={nonce}
            />
          </>
        ) : null}
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
        <StructuredData />
      </head>
      <body
        className={`${kosugiMaru.variable} ${notoSansJP.variable} antialiased`}
      >
        <WebVitals />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
