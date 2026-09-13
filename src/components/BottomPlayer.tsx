"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import { FileText, Globe, Languages, Music2 } from "lucide-react";
import { encodeTrackUrl, parseTrackKey } from "@/lib/utils";

/**
 * 지금 재생 중인 곡을 보여 주고 번역 설정을 제공하는 하단 바입니다.
 *
 * 재생 제어(재생·일시정지·다음·이전)는 제공하지 않습니다. 스포티파이의 재생 제어는
 * 프리미엄 계정과 활성 기기가 필요하고, 모바일 브라우저에서는 웹 플레이어가
 * 소리를 내지 못해 동작이 들쭉날쭉했습니다. 재생은 스포티파이 앱에 맡기고
 * 이 서비스는 가사 동기화에 집중합니다.
 */
export default function BottomPlayer() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const {
    title,
    artist,
    albumArt,
    duration,
    trackId,
    isPlaying,
    progress,
    targetLanguage,
    setTargetLanguage,
    showTranslation,
    toggleTranslation,
  } = usePlayerStore();

  if (!title && !artist) return null; // Hide only if no track info at all

  // 이미 가사 화면을 보고 있으면 "가사 보기"는 같은 곳으로 보내는 버튼이 됩니다.
  const isOnLyricsPage =
    pathname?.startsWith("/track/") || pathname?.startsWith("/lyric/");

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40 safe-area-pb">
      {/* 모바일: 1줄=앨범+정보+재생상태, 2줄=언어/번역/가사 버튼. 데스크톱=한 줄 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3 min-h-0">
        {/* 앨범 + 제목/아티스트 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 md:gap-3 md:w-1/2">
          {albumArt && (
            <div className="relative w-10 h-10 md:w-14 md:h-14 flex-shrink-0 rounded overflow-hidden">
              <Image src={albumArt} alt={title} fill className="object-cover" />
            </div>
          )}
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="font-semibold truncate text-white text-sm md:text-base">{title}</p>
            <p className="text-xs text-gray-400 truncate">{artist}</p>
          </div>
          {/* 재생 중인지 한눈에 보이도록 표시합니다. */}
          {session?.accessToken && isPlaying && (
            <span
              className="flex items-center gap-1 text-[10px] text-[#1DB954] flex-shrink-0"
              title="스포티파이에서 재생 중"
            >
              <Music2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">재생 중</span>
            </span>
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
          {/* 가사 화면이 아닐 때만 이동 버튼을 보여 줍니다. */}
          {!isOnLyricsPage && (
            <button
              onClick={() =>
                router.push(
                  // 재생 중인 곡의 트랙 ID를 함께 넘겨 정확한 곡을 엽니다.
                  encodeTrackUrl(artist, title, parseTrackKey(trackId) ?? undefined)
                )
              }
              className="flex items-center gap-1.5 px-2.5 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full touch-manipulation flex-shrink-0"
              title="가사 보기"
              aria-label="가사 보기"
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs whitespace-nowrap">가사</span>
            </button>
          )}
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
