import type { Metadata } from "next";
import { Noto_Sans_JP, Kosugi_Maru } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Akyoずかん - 500種類以上のなぞの生き物を探索しよう",
  description: "Akyoずかんは、500種類以上存在する「Akyo」というなぞの生き物たちを検索・閲覧できるファン向けの図鑑サイトです。",
  keywords: ["Akyo", "アキョ", "図鑑", "VRChat", "アバター"],
  authors: [{ name: "Akyodex Team" }],
  openGraph: {
    title: "Akyoずかん",
    description: "500種類以上のAkyoを探索しよう！",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: "Akyoずかん",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akyoずかん",
    description: "500種類以上のAkyoを探索しよう！",
  },
  icons: {
    icon: "/favicon.ico",
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
        className={`${notoSansJP.variable} ${kosugiMaru.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
