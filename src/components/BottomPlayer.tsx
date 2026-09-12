"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import { Play, Pause, SkipForward, SkipBack, FileText, Globe, Languages } from "lucide-react";
import { play, pause, next, previous } from "@/lib/spotify";
import { encodeTrackUrl, parseTrackKey } from "@/lib/utils";

export default function BottomPlayer() {
  const { data: session } = useSession();
  const router = useRouter();
  const { 
    title,
    artist,
    albumArt,
    duration,
    trackId,
    isPlaying, 
    progress, 
    setIsPlaying, 
    targetLanguage,
    setTargetLanguage,
    showTranslation,
    toggleTranslation,
    isSdkReady,
    player,
    deviceId,
    pinnedTrackId
  } = usePlayerStore();

  // 스포티파이 제어가 실패했을 때 사용자에게 알리기 위한 메시지
  const [controlError, setControlError] = useState<string | null>(null);

  const showControlError = () => {
    setControlError(
      "스포티파이 제어에 실패했습니다. 앱에서 노래를 재생 중인지, 프리미엄 계정인지 확인해 주세요. 로그인이 오래되었다면 다시 로그인해 주세요."
    );
    setTimeout(() => setControlError(null), 6000);
  };

  // Play/Pause Toggle
  const togglePlay = async () => {
    if (!session?.accessToken) return;

    if (isSdkReady && player) {
      await player.togglePlay();
    } else {
      if (isPlaying) {
        const ok = await pause(session.accessToken);
        if (ok) setIsPlaying(false);
        else showControlError();
      } else {
        // 곡 상세 페이지를 열어 둔 상태에서 아직 아무것도 동기화되지 않았다면
        // (재생 중이 아니고 진행 위치가 0), 재생 버튼은 화면에 보이는 그 곡을
        // 재생해야 합니다. 그렇지 않으면 직전에 듣던 다른 곡이 재생됩니다.
        const pinnedRef = parseTrackKey(pinnedTrackId);
        const shouldStartPinnedTrack =
          pinnedRef?.source === "spotify" && progress === 0;
        const uri = shouldStartPinnedTrack
          ? `spotify:track:${pinnedRef!.id}`
          : undefined;

        const ok = await play(session.accessToken, uri, deviceId);
        // 404 등 실패 시 재생 상태는 바꾸지 않음 (활성 기기 없음 등)
        if (ok) setIsPlaying(true);
        else showControlError();
      }
    }
  };

  const nextTrack = async () => {
    if (isSdkReady && player) {
      await player.nextTrack();
    } else if (session?.accessToken) {
      if (!(await next(session.accessToken))) showControlError();
    }
  };

  const previousTrack = async () => {
    if (isSdkReady && player) {
      await player.previousTrack();
    } else if (session?.accessToken) {
      if (!(await previous(session.accessToken))) showControlError();
    }
  };

  if (!title && !artist) return null; // Hide only if no track info at all

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40 safe-area-pb">
      {controlError && (
        <div className="px-3 py-2 text-xs text-amber-400 bg-amber-500/10 border-b border-amber-500/20">
          {controlError}
        </div>
      )}
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
          {/* 가사 페이지로 이동. 이미 그 곡의 상세 페이지를 보고 있으면(고정된 곡이
              있으면) 같은 곳으로 이동하게 되므로 숨깁니다. */}
          {title && artist && !pinnedTrackId ? (
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
