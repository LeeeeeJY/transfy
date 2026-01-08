"use client";

import { signIn, useSession } from "next-auth/react";
import LyricsView from "@/components/LyricsView";
import PlayerControls from "@/components/PlayerControls";
import AdSense from "@/components/AdSense";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";
import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";

const UI_TEXT = {
  ko: {
    subtitle: "스포티파이 실시간 가사 번역 서비스",
    loginSpotify: "Spotify로 로그인",
    guestMode: "로그인 없이 체험하기",
    permissionNotice: "로그인하면 스포티파이 재생 정보를 읽어올 수 있는 권한을 요청합니다.",
    adDesktop: "광고 영역 (데스크탑)",
  },
  en: {
    subtitle: "Realtime Spotify lyrics translation service",
    loginSpotify: "Sign in with Spotify",
    guestMode: "Try without logging in",
    permissionNotice: "When you sign in, we request permission to read your Spotify playback information.",
    adDesktop: "Ad space (desktop)",
  },
  ja: {
    subtitle: "Spotifyリアルタイム歌詞翻訳サービス",
    loginSpotify: "Spotifyでログイン",
    guestMode: "ログインせずに試す",
    permissionNotice: "ログインすると、Spotifyの再生情報を読み取る権限をリクエストします。",
    adDesktop: "広告エリア（デスクトップ）",
  },
  zh: {
    subtitle: "Spotify 实时歌词翻译服务",
    loginSpotify: "使用 Spotify 登录",
    guestMode: "无需登录体验",
    permissionNotice: "登录后，我们会请求读取您的 Spotify 播放信息的权限。",
    adDesktop: "广告区域（桌面端）",
  },
} as const;

interface ClientHomeProps {
  initialLang: "ko" | "en" | "ja" | "zh";
  initialCountry: string;
}

export default function ClientHome({ initialLang, initialCountry }: ClientHomeProps) {
  const { data: session } = useSession();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize store with server values immediately
  const initialized = useRef(false);
  if (!initialized.current) {
    usePlayerStore.setState({
      targetLanguage: initialLang,
      countryCode: initialCountry
    });
    initialized.current = true;
  }

  const { targetLanguage } = usePlayerStore();

  // Initialize Poller (only active when logged in)
  useSpotifyPoller();

  useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL: During SSR/Hydration, we MUST use initialLang to match server HTML.
  // Using targetLanguage from store directly might cause mismatches if store isn't synced yet.
  const currentLang = mounted ? targetLanguage : initialLang;

  const t = UI_TEXT[currentLang as keyof typeof UI_TEXT] || UI_TEXT.en;

  if (!session && !isGuestMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-black text-white">
        <div className="max-w-md w-full text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2">Transfy</h1>
            <p className="text-lg opacity-80">{t.subtitle}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn("spotify")}
              className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              {t.loginSpotify}
            </button>

            <button
              onClick={() => setIsGuestMode(true)}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-4 px-6 rounded-full transition-all border border-zinc-700"
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
              {t.guestMode}
            </button>
          </div>

          <div className="mt-8 text-xs text-white/50">{t.permissionNotice}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {/* Main Content Area - Grow to fill space */}
      <main className="flex-1 relative overflow-hidden w-full">
        {/* Lyrics Area - Handles its own scroll */}
        <div className="absolute inset-0">
          <LyricsView />
        </div>
      </main>

      {/* Floating Sidebar Ad - Fixed position, out of flow */}
      <div className="fixed top-20 right-4 z-40 hidden xl:block w-[300px] pointer-events-none">
        {/* Pointer events auto for ad itself */}
        <div className="pointer-events-auto">
          <AdSense
            className="w-full rounded-lg shadow-sm"
            style={{ width: '300px', height: '600px' }}
            format="vertical"
          />
        </div>
      </div>

      {/* Bottom Ad Area - Fixed height to prevent layout shift */}
      <div className="shrink-0 w-full z-10 bg-white dark:bg-black pb-[80px]">
        <AdSense style={{ minHeight: '90px' }} />
      </div>

      {/* Controls - Fixed at bottom */}
      <PlayerControls />
    </div>
  );
}
