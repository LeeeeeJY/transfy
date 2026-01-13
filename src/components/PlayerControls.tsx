"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { Globe, Languages, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface PlayerControlsProps {
  onLogout?: () => void;
}

export default function PlayerControls({ onLogout }: PlayerControlsProps) {
  const {
    showTranslation,
    toggleTranslation,
    targetLanguage,
    setTargetLanguage,
    title,
    artist,
    albumArt
  } = usePlayerStore();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      signOut({ callbackUrl: "/" });
    }
  };

  return (
    <div className="sticky bottom-0 left-0 w-full bg-black/90 backdrop-blur-md border-t border-zinc-800 p-3 md:p-4 z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        {/* Track Info (Top line on mobile, Left on desktop) */}
        <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
          {albumArt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={albumArt} alt="Album Art" className="w-10 h-10 md:w-12 md:h-12 rounded-md shadow-sm shrink-0" />
          )}
          <div className="truncate flex-1">
            <h3 className="font-semibold text-sm md:text-base truncate text-white">{title || "재생 중 아님"}</h3>
            <p className="text-xs md:text-sm text-zinc-500 truncate">{artist}</p>
          </div>
        </div>

        {/* Controls (Bottom line on mobile, Right on desktop) */}
        <div className="flex items-center justify-end w-full md:w-auto gap-2 md:gap-4 shrink-0">

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1.5">
            <Globe className="w-4 h-4 text-zinc-400" />
            <select
              className="bg-transparent text-sm focus:outline-none text-white w-auto cursor-pointer"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              <option value="ko" className="bg-zinc-800 text-white">한국어</option>
              <option value="en" className="bg-zinc-800 text-white">English</option>
              <option value="ja" className="bg-zinc-800 text-white">日本語</option>
              <option value="zh" className="bg-zinc-800 text-white">中文</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTranslation}
              className={`p-2 rounded-full transition-colors ${showTranslation
                ? "bg-blue-900/30 text-blue-400"
                : "bg-zinc-800 text-zinc-400"
                }`}
              title="번역 켜기/끄기"
            >
              <Languages className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
