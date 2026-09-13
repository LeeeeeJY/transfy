import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Providers } from "./providers";
import { authOptions } from "@/lib/auth";
import { getLanguageFromHeaders } from "@/lib/server-utils";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Transfy | 실시간 가사 번역",
    template: "%s | Transfy", // This template adds " | Transfy" to child pages
  },
  description: "스포티파이 노래 가사를 실시간으로 동기화하여 한국어, 영어, 일본어, 중국어로 번역해주는 서비스입니다. 가사 해석과 함께 음악을 즐겨보세요.",
  keywords: [
    "스포티파이",
    "가사 번역",
    "실시간 가사",
    "Spotify Lyrics",
    "팝송 번역",
    "J-POP 번역",
    "Transfy",
    "트랜스파이",
    "노래방 가사",
  ],
  authors: [{ name: "Transfy" }],
  creator: "Transfy Team",
  publisher: "Transfy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Transfy - 스포티파이 실시간 가사 번역",
    description: "지금 듣고 있는 노래의 가사를 실시간으로 번역해서 확인하세요.",
    url: SITE_URL,
    siteName: "Transfy",
    locale: "ko_KR",
    type: "website",
    },
  twitter: {
    card: "summary_large_image",
    title: "Transfy - 스포티파이 실시간 가사 번역",
    description: "지금 듣고 있는 노래의 가사를 실시간으로 번역해서 확인하세요.",
  },
  verification: {
    google: "0PWBWB6ToMEJhAMptckEcI75i3GES3M_wJlRAwnCdYE",
    other: {
      "naver-site-verification": "네이버_웹마스터도구_인증코드를_여기에_입력하세요",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomPlayer from "@/components/BottomPlayer";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 세션을 서버에서 먼저 읽어 두면 첫 화면부터 로그인 상태로 그려집니다.
  // 이렇게 하지 않으면 이미 로그인한 사용자에게도 로그인 버튼과 로그인 안내 화면이
  // 잠깐 보였다가 사라집니다. 언어 판별과는 서로 기다릴 이유가 없어 함께 처리합니다.
  const [initialLang, session] = await Promise.all([
    getLanguageFromHeaders(),
    getServerSession(authOptions),
  ]);

  return (
    <html lang={initialLang}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Transfy",
              "url": SITE_URL,
              "description": "Real-time Spotify lyrics translation service",
              "applicationCategory": "MultimediaApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col`}
      >
        <Providers session={session}>
          <Header initialLang={initialLang} />
          <div className="pt-14 flex-1 flex flex-col">
            {children}
          </div>
          <BottomPlayer />
          <Footer initialLang={initialLang} />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
