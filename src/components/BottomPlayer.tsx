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
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-white transition-all duration-300">
        <button 
          onClick={() => toggleLyricsExpanded(false)}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full"
        >
          <Minimize2 size={24} />
        </button>
        
        {/* Language Controls in Expanded View */}
        <div className="absolute top-6 left-6 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-800/50 rounded-full px-3 py-1.5">
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
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-64 h-64 mb-4 shadow-2xl">
            {albumArt && (
              <Image 
                src={albumArt} 
                alt={title} 
                fill 
                className="object-cover rounded-lg"
              />
            )}
          </div>
          <h2 className="text-2xl font-bold text-center">{title}</h2>
          <p className="text-gray-400 text-lg">{artist}</p>
        </div>

        <div className="w-full max-w-2xl h-[40vh] overflow-y-auto text-center space-y-6 scrollbar-hide">
          {lyrics.length > 0 ? (
            lyrics.map((line, index) => {
              const isActive = progress >= line.time / 1000 && (index === lyrics.length - 1 || progress < lyrics[index + 1].time / 1000);
              return (
                <p 
                  key={index} 
                  className={`transition-all duration-300 ${isActive ? 'text-green-400 text-2xl font-bold scale-105' : 'text-gray-500 text-xl'}`}
                >
                  {line.text}
                </p>
              );
            })
          ) : (
            <p className="text-gray-500">가사를 불러오는 중이거나 가사가 없습니다.</p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-6">
           <button onClick={previousTrack} className="hover:text-green-400"><SkipBack size={32} /></button>
           <button onClick={togglePlay} className="p-4 bg-green-500 rounded-full text-black hover:scale-105 transition">
             {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" />}
           </button>
           <button onClick={nextTrack} className="hover:text-green-400"><SkipForward size={32} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-40 flex items-center justify-between">
      <div className="flex items-center gap-4 w-1/3">
        {albumArt && (
          <div className="relative w-14 h-14">
            <Image src={albumArt} alt={title} fill className="object-cover rounded" />
          </div>
        )}
        <div className="overflow-hidden">
          <p className="font-semibold truncate text-white">{title}</p>
          <p className="text-xs text-gray-400 truncate">{artist}</p>
        </div>
      </div>

      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={previousTrack} className="text-gray-400 hover:text-white" disabled={!session}><SkipBack size={20} /></button>
          <button onClick={togglePlay} className="p-2 bg-white rounded-full text-black hover:scale-105 transition" disabled={!session}>
            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white" disabled={!session}><SkipForward size={20} /></button>
        </div>
        <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-1000 ease-linear" 
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 w-1/3">
        {/* Language Controls in Minimized View */}
        <div className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1.5 mr-2">
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
          className={`p-2 rounded-full transition-colors ${showTranslation
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
