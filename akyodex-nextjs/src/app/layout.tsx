import type { Metadata } from "next";
import { Noto_Sans_JP, Kosugi_Maru, M_PLUS_Rounded_1c } from "next/font/google";
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

const mPlusRounded1c = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded-1c",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Akyoずかん-VRChatアバター Akyo図鑑- | Akyodex-VRChat Avatar Akyo Index",
  description: "VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!",
  keywords: ["VRChat アバター インデックス", "VRChatアバター図鑑", "VRChat Avatar Index", "Akyoずかん", "VRChat アバター 検索"],
  authors: [{ name: "らど" }],
  robots: "index,follow",
  themeColor: "#f97316",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    title: "Akyoずかん-VRChatアバター Akyo図鑑-",
    description: "VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!",
    url: "https://akyodex.com/",
    siteName: "Akyoずかん",
    images: [
      {
        url: "https://akyodex.com/images/logo-200.png?v=20250925-3",
        width: 200,
        height: 200,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Akyoずかん-VRChatアバター Akyo図鑑-",
    description: "VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!",
    images: ["https://akyodex.com/images/logo-200.png?v=20250925-3"],
  },
  icons: {
    icon: [
      { url: "/images/akyodexIcon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/akyodexIcon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/akyodexIcon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/images/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

const fontAwesomeUrl = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={fontAwesomeUrl} />
      </head>
      <body
        className={`${mPlusRounded1c.variable} ${kosugiMaru.variable} ${notoSansJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
