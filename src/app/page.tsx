"use client";

import { signIn, useSession } from "next-auth/react";
import LyricsView from "@/components/LyricsView";
import PlayerControls from "@/components/PlayerControls";
import AdSense from "@/components/AdSense";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Initialize Poller (only active when logged in)
  useSpotifyPoller();

  if (!session && !isGuestMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-black text-white">
        <div className="max-w-md w-full text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2">Transfy</h1>
            <p className="text-lg opacity-80">
              스포티파이 실시간 가사 번역 서비스
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn("spotify")}
              className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Spotify로 로그인
            </button>

            <button
              onClick={() => setIsGuestMode(true)}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-4 px-6 rounded-full transition-all border border-zinc-700"
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
              로그인 없이 체험하기
            </button>
          </div>

          <div className="mt-8 text-xs text-white/50">
            로그인하면 스포티파이 재생 정보를 읽어올 수 있는 권한을 요청합니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* AdSense Top (Mobile) / Side (Desktop could be handled with grid) */}
        {/* For simplicity, we put ads top and bottom of content or absolute */}

        {/* Lyrics Area */}
        <LyricsView />

        {/* Floating Ad or Fixed Ad */}
        <div className="fixed top-4 right-4 z-40 hidden xl:block w-[300px]">
          {/* Desktop Sidebar Ad Placeholder */}
          <div className="bg-zinc-100 dark:bg-zinc-800 text-xs p-2 text-center rounded">
            광고 영역 (데스크탑)
          </div>
        </div>
      </main>

      {/* Controls */}
      <PlayerControls />

      {/* Bottom Ad (Visible mostly on mobile above controls) */}
      <div className="mb-[80px] shrink-0">
        <AdSense />
      </div>
    </div>
  );
}
