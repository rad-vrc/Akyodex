import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Kosugi_Maru } from "next/font/google";
import { StructuredData } from "@/components/structured-data";
import { WebVitals } from "@/components/web-vitals";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const kosugiMaru = Kosugi_Maru({
  variable: "--font-kosugi-maru",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
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
  
  manifest: '/manifest.json',
  
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

const fontAwesomeUrl = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css";
const sentryUrl = "https://js.sentry-cdn.com/04aa2a0affc38215961ed0d62792d68b.min.js";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={fontAwesomeUrl} />
        {/* Sentry エラー監視 */}
        <script
          src={sentryUrl}
          crossOrigin="anonymous"
          async
        />
        {/* Dify AI Chatbot */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.difyChatbotConfig = {
                token: 'rak9Yh7T7SI5JyDw',
                baseUrl: 'https://dexakyo.akyodex.com',
                inputs: {},
                systemVariables: {},
                userVariables: {},
              }
            `,
          }}
        />
        <script
          src="https://dexakyo.akyodex.com/embed.min.js"
          id="rak9Yh7T7SI5JyDw"
          defer
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
