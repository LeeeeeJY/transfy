"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, FileText, Globe, Languages, Music2 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { encodeTrackUrl, parseTrackKey } from "@/lib/utils";

/** 재생 위치를 0에서 100 사이의 비율로 환산합니다. */
function toPercent(progress: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.max(0, (progress / duration) * 100));
}

/** 초 단위 시간을 분:초 형태로 표시합니다. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 진행 위치는 0.1초마다 갱신되므로, 진행 바만 따로 떼어 두어 곡 정보와 번역
 * 설정 영역이 불필요하게 다시 그려지지 않게 합니다.
 */
function useProgressPercent(): number {
  return usePlayerStore((s) => toPercent(s.progress, s.duration));
}

/**
 * 좁은 화면에서 하단 바 맨 위에 얇게 붙는 진행 바입니다.
 * 줄을 하나 더 쓰지 않으므로 가사에 내어 줄 수 있는 화면이 그만큼 넓어집니다.
 */
function ProgressHairline() {
  const percent = useProgressPercent();

  return (
    <div className="h-0.5 w-full bg-white/10 md:hidden" aria-hidden="true">
      <div
        className="h-full bg-[#1DB954] transition-[width] duration-150 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** 넓은 화면에서 바 가운데에 경과 시간, 전체 시간과 함께 놓이는 진행 바입니다. */
function ProgressWithTimes() {
  const percent = useProgressPercent();
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);

  return (
    <div className="hidden min-w-0 flex-[1.4] items-center gap-2.5 md:flex">
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-zinc-500">
        {formatTime(progress)}
      </span>
      <div
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[#1DB954] transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-[11px] tabular-nums text-zinc-500">
        {formatTime(duration)}
      </span>
    </div>
  );
}

/**
 * 지금 재생 중인 곡을 보여 주고 번역 설정을 제공하는 하단 바입니다.
 *
 * 재생 제어(재생·일시정지·다음·이전)는 제공하지 않습니다. 스포티파이의 재생 제어는
 * 프리미엄 계정과 활성 기기가 필요하고, 모바일 브라우저에서는 웹 플레이어가
 * 소리를 내지 못해 동작이 들쭉날쭉했습니다. 재생은 스포티파이 앱에 맡기고
 * 이 서비스는 가사 동기화에 집중합니다.
 *
 * 배치는 흔히 쓰이는 재생 바 구조를 따릅니다. 넓은 화면에서는 곡 정보, 진행 위치,
 * 번역 설정을 세 칸으로 나누어 놓고, 좁은 화면에서는 한 줄로 모은 다음 진행 위치만
 * 바 맨 위의 얇은 막대로 옮깁니다. 가운데 정렬 너비를 헤더와 똑같이 맞추었기 때문에,
 * 넓은 화면에서 앨범 아트가 로고와, 번역 설정이 상단 메뉴와 같은 선에 놓입니다.
 */
export default function BottomPlayer() {
  const router = useRouter();
  const pathname = usePathname();

  // 진행 위치가 바뀔 때마다 바 전체를 다시 그리지 않도록 필요한 값만 구독합니다.
  const title = usePlayerStore((s) => s.title);
  const artist = usePlayerStore((s) => s.artist);
  const localizedTitle = usePlayerStore((s) => s.localizedTitle);
  const localizedArtist = usePlayerStore((s) => s.localizedArtist);
  const albumArt = usePlayerStore((s) => s.albumArt);
  const trackId = usePlayerStore((s) => s.trackId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const provider = usePlayerStore((s) => s.provider);
  const hasDuration = usePlayerStore((s) => s.duration > 0);
  const targetLanguage = usePlayerStore((s) => s.targetLanguage);
  const setTargetLanguage = usePlayerStore((s) => s.setTargetLanguage);
  const showTranslation = usePlayerStore((s) => s.showTranslation);
  const toggleTranslation = usePlayerStore((s) => s.toggleTranslation);

  if (!title && !artist) return null; // 곡 정보가 전혀 없을 때만 숨깁니다.

  // 국내 발매곡은 발매 당시의 한국어 표기로 보여 줍니다.
  const displayTitle = localizedTitle || title;
  const displayArtist = localizedArtist || artist;

  // 이미 가사 화면을 보고 있으면 "가사 보기"는 같은 곳으로 보내는 버튼이 됩니다.
  const isOnLyricsPage =
    pathname?.startsWith("/track/") || pathname?.startsWith("/lyric/");

  // 실제 재생을 따라가는 중일 때만 진행 위치를 보여 줍니다. 검색으로 열어 둔 곡은
  // 재생 위치가 없어서, 그대로 두면 0에 멈춘 막대만 남습니다.
  const isFollowingPlayback = provider === "spotify" && hasDuration;

  return (
    <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-xl">
      {isFollowingPlayback && <ProgressHairline />}

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-[72px] md:gap-5 lg:px-8">
        {/* 왼쪽: 앨범 아트와 곡 정보 */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:w-0">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10 md:h-14 md:w-14">
            {albumArt ? (
              <Image
                src={albumArt}
                alt={displayTitle}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              // 앨범 아트가 없어도 왼쪽 끝이 들쭉날쭉해 보이지 않게 자리를 지킵니다.
              <Music2 className="absolute inset-0 m-auto h-5 w-5 text-zinc-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white md:text-base">
              {displayTitle}
            </p>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">
              <span className="truncate">{displayArtist}</span>
              {/* 재생 중인지 한눈에 보이도록 표시합니다. */}
              {isPlaying && provider === "spotify" && (
                <span
                  className="flex shrink-0 items-center gap-1 text-[#1DB954]"
                  title="스포티파이에서 재생 중"
                >
                  <span className="hidden text-zinc-600 sm:inline">·</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1DB954] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1DB954]" />
                  </span>
                  <span className="hidden sm:inline">재생 중</span>
                  <span className="sr-only sm:hidden">재생 중</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 가운데: 진행 위치. 좁은 화면에서는 바 맨 위의 얇은 막대가 대신합니다. */}
        {isFollowingPlayback && <ProgressWithTimes />}

        {/* 오른쪽: 번역 설정과 가사 화면 이동 */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:w-0 md:flex-1">
          <div className="relative flex h-9 items-center gap-1.5 rounded-full bg-zinc-800 pl-2.5 pr-2 sm:pl-3 transition-colors hover:bg-zinc-700 focus-within:ring-2 focus-within:ring-white/40">
            <Globe className="hidden h-3.5 w-3.5 shrink-0 text-zinc-400 sm:block" />
            <select
              className="w-14 cursor-pointer appearance-none bg-transparent pr-4 text-xs font-medium text-white focus:outline-none"
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
            {/* appearance-none으로 사라진 화살표를 대신 그려 줍니다. */}
            <ChevronDown
              className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-400"
              aria-hidden="true"
            />
          </div>

          <button
            onClick={toggleTranslation}
            aria-pressed={showTranslation}
            className={`flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              showTranslation
                ? "bg-blue-900/40 text-blue-400 hover:bg-blue-900/60"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
            title="번역 켜기/끄기"
            aria-label="번역 켜기/끄기"
          >
            <Languages className="h-4 w-4" />
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
              className="flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title="가사 보기"
              aria-label="가사 보기"
            >
              <FileText className="h-4 w-4" />
              <span className="whitespace-nowrap">가사</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
