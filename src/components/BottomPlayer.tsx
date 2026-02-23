"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import { Play, Pause, SkipForward, SkipBack, FileText, Globe, Languages } from "lucide-react";
import { play, pause, next, previous } from "@/lib/spotify";
import { encodeTrackUrl } from "@/lib/utils";

export default function BottomPlayer() {
  const { data: session } = useSession();
  const router = useRouter();
  const { 
    title,
    artist,
    albumArt,
    duration,
    isPlaying, 
    progress, 
    setIsPlaying, 
    targetLanguage,
    setTargetLanguage,
    showTranslation,
    toggleTranslation,
    isSdkReady,
    player,
    deviceId
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
        const ok = await play(session.accessToken, undefined, deviceId);
        if (ok) setIsPlaying(true);
        // 404 등 실패 시 재생 상태는 바꾸지 않음 (활성 기기 없음 등)
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40 safe-area-pb">
      {/* 모바일: 1줄=앨범+정보+재생컨트롤, 2줄=언어/번역/가사 버튼. 데스크톱=한 줄 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3 min-h-0">
        {/* 앨범 + 제목/아티스트 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 md:gap-3 md:w-1/3">
          {albumArt && (
            <div className="relative w-10 h-10 md:w-14 md:h-14 flex-shrink-0 rounded overflow-hidden">
              <Image src={albumArt} alt={title} fill className="object-cover" />
            </div>
          )}
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="font-semibold truncate text-white text-sm md:text-base">{title}</p>
            <p className="text-xs text-gray-400 truncate">{artist}</p>
          </div>
        </div>

        {/* 재생 컨트롤 (중앙) */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 md:flex-1 md:w-1/3">
          {session?.accessToken && (
            <div className="flex items-center gap-1 md:gap-3">
              <button onClick={previousTrack} className="p-2 text-gray-400 hover:text-white rounded-full touch-manipulation" aria-label="이전 곡">
                <SkipBack size={20} />
              </button>
              <button onClick={togglePlay} className="p-2 md:p-2.5 bg-white rounded-full text-black hover:scale-105 transition touch-manipulation" aria-label={isPlaying ? "일시정지" : "재생"}>
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
              </button>
              <button onClick={nextTrack} className="p-2 text-gray-400 hover:text-white rounded-full touch-manipulation" aria-label="다음 곡">
                <SkipForward size={20} />
              </button>
            </div>
          )}
        </div>

        {/* 언어 / 번역 / 가사 보기: 모바일에서만 다음 줄로 */}
        <div className="flex items-center justify-end gap-1 flex-shrink-0 w-full md:w-auto md:flex-1 md:basis-0 pt-1 md:pt-0 border-t border-zinc-800 md:border-t-0">
          <div className="flex items-center gap-0.5 md:gap-2 bg-zinc-800 rounded-full pl-2 pr-1.5 py-1 md:pl-3 md:pr-2 md:py-1.5">
            <Globe className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 hidden sm:block" />
            <select
              className="bg-transparent text-xs focus:outline-none text-white cursor-pointer py-0.5 pr-6 md:pr-6 appearance-none w-[60px] sm:w-[72px] md:w-auto md:min-w-0"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              title="번역 언어"
              aria-label="번역 언어"
            >
              <option value="ko" className="bg-zinc-800 text-white">한국어</option>
              <option value="en" className="bg-zinc-800 text-white">EN</option>
              <option value="ja" className="bg-zinc-800 text-white">日本語</option>
              <option value="zh" className="bg-zinc-800 text-white">中文</option>
            </select>
          </div>
          <button
            onClick={toggleTranslation}
            className={`p-2 rounded-full transition-colors touch-manipulation ${showTranslation ? "bg-blue-900/30 text-blue-400" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
            title="번역 켜기/끄기"
            aria-label="번역 켜기/끄기"
          >
            <Languages className="w-4 h-4" />
          </button>
          {title && artist ? (
            <button
              onClick={() => router.push(encodeTrackUrl(artist, title))}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full touch-manipulation flex-shrink-0"
              title="가사 보기"
              aria-label="가사 보기"
            >
              <FileText className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 진행 바: 전체 너비로 별도 줄 (모바일에서도 잘 보이게) */}
      {session?.accessToken && (
        <div className="w-full px-3 pb-2 md:px-4 md:pb-3 md:pt-0">
          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden max-w-2xl mx-auto md:block">
            <div
              className="h-full bg-green-500 transition-all duration-1000 ease-linear"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
