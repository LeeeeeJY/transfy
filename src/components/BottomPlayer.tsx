"use client";

import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import { Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2, Globe, Languages } from "lucide-react";
import { play, pause, next, previous } from "@/lib/spotify";

export default function BottomPlayer() {
  const { data: session } = useSession();
  const { 
    title,
    artist,
    albumArt,
    duration,
    isPlaying, 
    progress, 
    lyrics,
    isLyricsExpanded,
    setIsPlaying, 
    toggleLyricsExpanded,
    targetLanguage,
    setTargetLanguage,
    showTranslation,
    toggleTranslation,
    isSdkReady,
    player
  } = usePlayerStore();

  // Play/Pause Toggle
  const togglePlay = async () => {
    if (!session?.accessToken) return;

    if (isSdkReady && player) {
      await player.togglePlay();
    } else {
      if (isPlaying) {
        await pause(session.accessToken);
        setIsPlaying(false);
      } else {
        await play(session.accessToken);
        setIsPlaying(true);
      }
    }
  };

  const nextTrack = async () => {
    if (isSdkReady && player) {
      await player.nextTrack();
    } else if (session?.accessToken) {
      await next(session.accessToken);
    }
  };

  const previousTrack = async () => {
    if (isSdkReady && player) {
      await player.previousTrack();
    } else if (session?.accessToken) {
      await previous(session.accessToken);
    }
  };

  if (!title && !artist) return null; // Hide only if no track info at all

  // Render Logic (Lyrics View vs Bottom Bar)
  if (isLyricsExpanded) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 md:p-8 text-white transition-all duration-300">
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between w-full mb-4 md:mb-8">
          {/* Language Controls */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-full px-3 py-1.5">
              <Globe className="w-4 h-4 text-zinc-400" />
              <select
                className="bg-transparent text-sm focus:outline-none text-white w-auto cursor-pointer max-w-[80px] md:max-w-none"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                <option value="ko" className="bg-zinc-800 text-white">한국어</option>
                <option value="en" className="bg-zinc-800 text-white">English</option>
                <option value="ja" className="bg-zinc-800 text-white">日本語</option>
                <option value="zh" className="bg-zinc-800 text-white">中文</option>
              </select>
            </div>
            <button
              onClick={toggleTranslation}
              className={`p-2 rounded-full transition-colors ${showTranslation
                ? "bg-blue-900/30 text-blue-400"
                : "bg-zinc-800/50 text-zinc-400"
                }`}
              title="번역 켜기/끄기"
            >
              <Languages className="w-5 h-5" />
            </button>
          </div>

          {/* Close Button */}
          <button 
            onClick={() => toggleLyricsExpanded(false)}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <Minimize2 size={24} />
          </button>
        </div>
        
        <div className="flex flex-col items-center mb-4 md:mb-8 flex-shrink-0">
          <div className="relative w-32 h-32 md:w-64 md:h-64 mb-4 shadow-2xl">
            {albumArt && (
              <Image 
                src={albumArt} 
                alt={title} 
                fill 
                className="object-cover rounded-lg"
              />
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-center px-4">{title}</h2>
          <p className="text-gray-400 text-base md:text-lg">{artist}</p>
        </div>

        <div className="w-full max-w-2xl flex-1 overflow-y-auto text-center space-y-8 scrollbar-hide mx-auto py-8">
          {lyrics.length > 0 ? (
            lyrics.map((line, index) => {
              const isActive = progress >= line.time / 1000 && (index === lyrics.length - 1 || progress < lyrics[index + 1].time / 1000);
              return (
                <div 
                  key={index} 
                  className={`transition-all duration-300 px-4 flex flex-col gap-2 ${isActive ? 'scale-105' : 'opacity-60'}`}
                >
                  <p 
                    className={`${isActive ? 'text-green-400 text-xl md:text-3xl font-bold' : 'text-gray-300 text-lg md:text-2xl'}`}
                  >
                    {line.text}
                  </p>
                  {showTranslation && line.translation && (
                    <p 
                      className={`${isActive ? 'text-green-300/90 text-lg md:text-xl' : 'text-gray-400 text-base md:text-lg'}`}
                    >
                      {line.translation}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">가사를 불러오는 중이거나 가사가 없습니다.</p>
          )}
        </div>

        {session?.accessToken && (
          <div className="mt-4 md:mt-8 flex items-center justify-center gap-6 pb-4 md:pb-0 flex-shrink-0">
             <button onClick={previousTrack} className="hover:text-green-400"><SkipBack size={32} /></button>
             <button onClick={togglePlay} className="p-4 bg-green-500 rounded-full text-black hover:scale-105 transition">
               {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" />}
             </button>
             <button onClick={nextTrack} className="hover:text-green-400"><SkipForward size={32} /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-2 md:p-4 z-40 flex items-center justify-between gap-2 md:gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0 md:w-1/3">
        {albumArt && (
          <div className="relative w-10 h-10 md:w-14 md:h-14 flex-shrink-0">
            <Image src={albumArt} alt={title} fill className="object-cover rounded" />
          </div>
        )}
        <div className="overflow-hidden min-w-0">
          <p className="font-semibold truncate text-white text-sm md:text-base">{title}</p>
          <p className="text-xs text-gray-400 truncate">{artist}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 md:w-1/3">
        {session?.accessToken && (
          <>
            <div className="flex items-center gap-2 md:gap-4 mb-1 md:mb-2">
              <button onClick={previousTrack} className="text-gray-400 hover:text-white"><SkipBack size={20} /></button>
              <button onClick={togglePlay} className="p-1.5 md:p-2 bg-white rounded-full text-black hover:scale-105 transition">
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
              </button>
              <button onClick={nextTrack} className="text-gray-400 hover:text-white"><SkipForward size={20} /></button>
            </div>
            <div className="w-full max-w-[120px] md:max-w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-1000 ease-linear" 
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-4 flex-1 md:w-1/3">
        {/* Language Controls - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1.5 mr-2">
          <Globe className="w-3 h-3 text-zinc-400" />
          <select
            className="bg-transparent text-xs focus:outline-none text-white w-auto cursor-pointer"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            <option value="ko" className="bg-zinc-800 text-white">한국어</option>
            <option value="en" className="bg-zinc-800 text-white">English</option>
            <option value="ja" className="bg-zinc-800 text-white">日本語</option>
            <option value="zh" className="bg-zinc-800 text-white">中文</option>
          </select>
        </div>
        <button
          onClick={toggleTranslation}
          className={`hidden md:block p-2 rounded-full transition-colors ${showTranslation
            ? "bg-blue-900/30 text-blue-400"
            : "bg-zinc-800 text-zinc-400"
            }`}
          title="번역 켜기/끄기"
        >
          <Languages className="w-4 h-4" />
        </button>

        <button 
          onClick={() => toggleLyricsExpanded(true)}
          className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full"
        >
          <Maximize2 size={20} />
        </button>
      </div>
    </div>
  );
}
