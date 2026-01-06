"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { Globe, Languages, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function PlayerControls() {
  const {
    showTranslation,
    toggleTranslation,
    targetLanguage,
    setTargetLanguage,
    title,
    artist,
    albumArt
  } = usePlayerStore();

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {albumArt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={albumArt} alt="Album Art" className="w-12 h-12 rounded-md shadow-sm" />
          )}
          <div className="truncate">
            <h3 className="font-semibold text-sm md:text-base truncate dark:text-white">{title || "재생 중 아님"}</h3>
            <p className="text-xs md:text-sm text-zinc-500 truncate">{artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">

          {/* Language Selector (Simple Toggle for Demo, can be Select) */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5">
            <Globe className="w-4 h-4 text-zinc-500" />
            <select
              className="bg-transparent text-sm focus:outline-none dark:text-zinc-300"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <button
            onClick={toggleTranslation}
            className={`p-2 rounded-full transition-colors ${showTranslation
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            title="번역 켜기/끄기"
          >
            <Languages className="w-5 h-5" />
          </button>

          <button
            onClick={() => signOut()}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
