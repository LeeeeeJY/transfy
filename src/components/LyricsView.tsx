"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePathname } from "next/navigation";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { useSession } from "next-auth/react";
import { ExternalLink, Loader2, Music } from "lucide-react";
import { spotifyOpenUrl } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";

// UI Text Dictionary
const UI_TEXT = {
  ko: {
    loading: "가사를 불러오는 중...",
    noLyrics: "가사를 찾을 수 없습니다.",
    noLyricsHint: "가사 서버 연결이 불안정할 수 있습니다.",
    retryLyrics: "가사 다시 불러오기",
    playMusic: "Spotify에서 음악을 재생하거나 검색해주세요.",
    translating: "번역 중...",
    readyToPlay: "음악을 재생할 준비가 되었습니다.",
    nowPlaying: "재생 중 · 가사가 자동으로 따라갑니다",
    notPlaying: "재생 중이 아닙니다 · 스포티파이에서 재생하면 가사가 따라갑니다",
    openInSpotify: "스포티파이에서 열기",
  },
  en: {
    loading: "Loading lyrics...",
    noLyrics: "No lyrics found.",
    noLyricsHint: "Lyrics server may be temporarily unavailable.",
    retryLyrics: "Retry loading lyrics",
    playMusic: "Please play music on Spotify or search.",
    translating: "Translating...",
    readyToPlay: "Ready to play music.",
    nowPlaying: "Playing · lyrics follow automatically",
    notPlaying: "Not playing · start playback on Spotify to sync",
    openInSpotify: "Open in Spotify",
  },
  ja: {
    loading: "歌詞を読み込み中...",
    noLyrics: "歌詞が見つかりません。",
    noLyricsHint: "歌詞サーバーが不安定な場合があります。",
    retryLyrics: "歌詞を再読み込み",
    playMusic: "Spotifyで音楽を再生するか、検索してください。",
    translating: "翻訳中...",
    readyToPlay: "音楽を再生する準備ができました。",
    nowPlaying: "再生中 · 歌詞が自動で追従します",
    notPlaying: "再生していません · Spotifyで再生すると同期します",
    openInSpotify: "Spotifyで開く",
  },
  zh: {
    loading: "正在加载歌词...",
    noLyrics: "未找到歌词。",
    noLyricsHint: "歌词服务可能暂时不稳定。",
    retryLyrics: "重新加载歌词",
    playMusic: "请在 Spotify 上播放音乐或搜索。",
    translating: "翻译中...",
    readyToPlay: "准备播放音乐。",
    nowPlaying: "播放中 · 歌词自动跟随",
    notPlaying: "未在播放 · 在 Spotify 上播放即可同步",
    openInSpotify: "在 Spotify 中打开",
  },
};

/** 진행 위치에 해당하는 가사 줄의 번호를 찾습니다. 없으면 -1입니다. */
function findActiveLineIndex(lyrics: { time: number }[], progressMs: number): number {
  return lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return progressMs >= line.time && (!nextLine || progressMs < nextLine.time);
  });
}

/** 사용자가 직접 스크롤한 뒤 자동 스크롤을 멈춰 두는 시간 */
const MANUAL_SCROLL_PAUSE_MS = 4000;
/** 활성 줄이 이 범위 안에 보이면 자동 스크롤을 하지 않습니다 (화면 높이 비율) */
const COMFORT_ZONE_TOP = 0.2;
const COMFORT_ZONE_BOTTOM = 0.75;

/**
 * 이 곡을 스포티파이에서 바로 여는 버튼입니다.
 *
 * 이 서비스는 재생을 제어하지 않으므로 재생은 스포티파이에 맡깁니다.
 * 휴대폰에서는 이 주소가 스포티파이 앱으로 열립니다.
 */
function OpenInSpotifyButton({
  trackId,
  title,
  artist,
  label,
}: {
  trackId: string | null;
  title: string;
  artist: string;
  label: string;
}) {
  // 곡 정보가 하나도 없으면 검색 주소조차 만들 수 없으므로 버튼을 숨깁니다.
  if (!title && !artist) return null;

  return (
    <a
      href={spotifyOpenUrl(trackId, title, artist)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#1ed760]"
    >
      <ExternalLink className="w-4 h-4" />
      {label}
    </a>
  );
}

interface LyricsViewProps {
  initialUiLanguage?: string;
}

export default function LyricsView({ initialUiLanguage }: LyricsViewProps) {
  const { data: session } = useSession();
  // 스토어 전체를 구독하면 진행 위치가 바뀔 때마다(초당 10회) 가사 목록 전체를
  // 다시 그리게 되어 스크롤이 끊깁니다. 필요한 값만 따로 구독합니다.
  const lyrics = usePlayerStore((s) => s.lyrics);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const provider = usePlayerStore((s) => s.provider);
  const isLoadingLyrics = usePlayerStore((s) => s.isLoadingLyrics);
  const showTranslation = usePlayerStore((s) => s.showTranslation);
  const isTranslating = usePlayerStore((s) => s.isTranslating);
  const uiLanguage = usePlayerStore((s) => s.uiLanguage);
  const pinnedTrackId = usePlayerStore((s) => s.pinnedTrackId);
  const storeTrackId = usePlayerStore((s) => s.trackId);
  const storeTitle = usePlayerStore((s) => s.title);
  const storeArtist = usePlayerStore((s) => s.artist);
  const storeAlbumArt = usePlayerStore((s) => s.albumArt);
  const localizedTitle = usePlayerStore((s) => s.localizedTitle);
  const localizedArtist = usePlayerStore((s) => s.localizedArtist);

  // 활성 줄 번호만 구독하므로, 줄이 실제로 바뀔 때만 다시 그립니다.
  const activeIndex = usePlayerStore((s) => findActiveLineIndex(s.lyrics, s.progressMs));

  const setLyrics = usePlayerStore((s) => s.setLyrics);
  const setLoadingLyrics = usePlayerStore((s) => s.setLoadingLyrics);
  const setOriginalLyrics = usePlayerStore((s) => s.setOriginalLyrics);
  const setLyricsRetryTrigger = usePlayerStore((s) => s.setLyricsRetryTrigger);
  const setStoreLyrics = setLyrics;
  const setStorePlayback = usePlayerStore((s) => s.setPlayback);

  const pathname = usePathname();

  // Extract trackId from URL using pathname prop for consistency
  const getTrackIdFromUrl = (): string | null => {
    if (!pathname) return null;

    // Check for /lyric/ID pattern
    const lyricMatch = pathname.match(/\/lyric\/([^/]+)/);
    if (lyricMatch) return lyricMatch[1];

    // Check for /track/ARTIST/TITLE pattern
    const trackMatch = pathname.match(/\/track\/([^/]+)\/([^/]+)/);
    if (trackMatch) {
      const artist = decodeURIComponent(trackMatch[1]);
      const title = decodeURIComponent(trackMatch[2]);
      
      // If we are in Spotify mode (logged in), we should rely on the store's trackId 
      // instead of generating a static one, to avoid mismatch.
      // But initially, we might only have the URL.
      // Let's return the static ID, but handle the mismatch logic smarter.
      return `static-${artist}-${title}`.replace(/\s+/g, '-').toLowerCase();
    }

    return null;
  };

  const urlTrackId = getTrackIdFromUrl();

  /**
   * 실제 재생을 따라가는 중인지 여부.
   * 이때는 스토어의 곡 정보가 정답이므로 URL과 비교하면 안 됩니다.
   */
  const isFollowingPlayback = provider === "spotify";

  // Check mismatch immediately for rendering.
  //
  // 다음 두 경우에는 URL에서 유추한 ID와 비교하지 않습니다.
  //  - 사용자가 검색 결과에서 직접 선택한 곡이 있는 경우(pinnedTrackId): 서버가 확정한 정보가 정답입니다.
  //  - 실제 재생을 따라가는 중인 경우: 사용자가 스포티파이에서 곡을 넘기면 스토어의 곡이
  //    URL과 달라지는 것이 정상입니다. 이때도 불일치로 보면 showLoading이 계속 참이 되어
  //    가사 화면이 "불러오는 중"에서 영영 빠져나오지 못합니다.
  const isIdMismatch =
    !pinnedTrackId &&
    !isFollowingPlayback &&
    urlTrackId &&
    storeTrackId &&
    urlTrackId !== storeTrackId;

  // Check if URL trackId matches store trackId and clear lyrics if mismatch
  useEffect(() => {
    if (isIdMismatch) {
      console.log("Clearing lyrics on mount/change due to ID mismatch");
      setStoreLyrics([]);
      setLoadingLyrics(true); // Start loading
      setStorePlayback({
        isPlaying: false,
        trackId: urlTrackId!, // Temporarily set trackId to URL one so we know what we are loading
        title: "",
        artist: "",
        albumArt: "",
        duration: 0,
        progressMs: 0,
        provider: "none",
      });
    }
  }, [isIdMismatch, urlTrackId, setStoreLyrics, setStorePlayback, setLoadingLyrics]);

  // Use initialUiLanguage for the first render to match server
  // Then fallback to store value (which syncs with client preference)
  const currentUiLang = initialUiLanguage || uiLanguage || "en";

  // Get current language text
  const t = UI_TEXT[currentUiLang as keyof typeof UI_TEXT] || UI_TEXT.en;

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 가사 조회와 번역은 useLyricsFetcher(ClientHome에서 실행)가 담당합니다.
  // 여기서 다시 번역하면 같은 곡을 두 번 번역하게 되므로 호출하지 않습니다.

  /** 진행 위치에 해당하는 줄이 있는지 여부 */
  const hasActiveLine = activeIndex >= 0;

  // 사용자가 직접 스크롤한 시각. 그 직후에는 자동 스크롤이 끼어들지 않게 합니다.
  const lastManualScrollAt = useRef(0);

  useEffect(() => {
    const markManual = () => {
      lastManualScrollAt.current = Date.now();
    };
    // 스크롤 이벤트는 자동 스크롤로도 발생하므로, 사용자 조작만 잡습니다.
    window.addEventListener("wheel", markManual, { passive: true });
    window.addEventListener("touchmove", markManual, { passive: true });
    return () => {
      window.removeEventListener("wheel", markManual);
      window.removeEventListener("touchmove", markManual);
    };
  }, []);

  // Auto scroll side effect
  useEffect(() => {
    const element = activeLineRef.current;
    if (!element) return;

    // 방금 직접 스크롤했다면 잠시 자동 스크롤을 멈춥니다.
    if (Date.now() - lastManualScrollAt.current < MANUAL_SCROLL_PAUSE_MS) return;

    // 이미 읽기 좋은 위치에 있으면 굳이 움직이지 않습니다.
    // 줄이 바뀔 때마다 무조건 스크롤하면 화면이 계속 흔들립니다.
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isComfortablyVisible =
      rect.top >= viewportHeight * COMFORT_ZONE_TOP &&
      rect.bottom <= viewportHeight * COMFORT_ZONE_BOTTOM;
    if (isComfortablyVisible) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]); // Only run when activeIndex changes

  // Determine if we should show loading state for dummy tracks
  // urlTrackId is already declared above
  const dummySong = urlTrackId ? POPULAR_SONGS.find(s => s.id === urlTrackId) : null;

  // Use store loading state directly.
  // The useEffect above sets loading to true on ID mismatch, 
  // and ClientHome sets it to false when data is loaded.
  // Also treat ID mismatch as loading to prevent flash of old content
  const showLoading = isLoadingLyrics || isIdMismatch;

  // 홈(/)에서는 항상 최근 들은 노래 대시보드 표시
  if (pathname === "/" || pathname === "") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-start bg-black w-full h-full flex-1">
        <Dashboard initialUiLanguage={currentUiLang} />
      </div>
    );
  }

  if (showLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500 animate-pulse bg-black w-full h-full flex-1">
        {t.loading}
      </div>
    );
  }

  // Determine title/artist/artwork to display (Shared logic)
  //
  // 국내 발매곡은 발매 당시의 한국어 표기(localizedTitle)로 보여 줍니다.
  // 가사 조회에 쓰는 원래 표기는 스토어에 그대로 남아 있습니다.
  const displayTitle = dummySong?.title || localizedTitle || storeTitle;
  const displayArtist = dummySong?.artist || localizedArtist || storeArtist;
  const displayArt = dummySong?.albumArt || storeAlbumArt;

  // 스포티파이에서 곡을 찾을 때는 스포티파이가 쓰는 원래 표기로 검색해야 합니다.
  const searchTitle = dummySong?.title || storeTitle;
  const searchArtist = dummySong?.artist || storeArtist;

  // Render static view for non-logged in users
  if (!session) {
    // Use lyrics from store if available, otherwise dummy lyrics
    const displayLyrics = lyrics.length > 0
      ? lyrics
      : (dummySong?.lyrics ? dummySong.lyrics.split('\n').map((text, i) => ({
        id: `${i}`,
        time: 0,
        text,
        translation: undefined // Explicitly add optional translation property
      })) : []);

    if (displayLyrics.length > 0) {
      return (
        <div className="w-full px-4 py-8 bg-black text-white">
          {/* Translating Overlay */}
          {isTranslating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all duration-300">
              <div className="bg-zinc-900 border border-zinc-700 text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
                <Loader2 className="w-10 h-10 text-[#1DB954] animate-spin" />
                <p className="text-lg font-medium">{t.translating}</p>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="text-center pt-8 pb-4 relative">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
                {displayTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-zinc-400">
                {displayArtist}
              </p>
              {displayArt && displayArt !== "/file.svg" ? (
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayArt}
                    alt={`${displayTitle} album art`}
                    className="w-48 h-48 rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="flex justify-center mb-8">
                  <div className="w-48 h-48 bg-zinc-800 rounded-lg shadow-xl flex items-center justify-center">
                    <Music className="w-20 h-20 text-zinc-600" />
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <OpenInSpotifyButton
                  trackId={storeTrackId}
                  title={searchTitle}
                  artist={searchArtist}
                  label={t.openInSpotify}
                />
              </div>
            </div>

            {/* Lyrics Content */}
            <div className="space-y-6">
              {displayLyrics.map((line, index) => (
                <div key={line.id || index} className="space-y-2">
                  <p className="text-lg md:text-xl text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                    {line.text}
                  </p>
                  {showTranslation && line.translation && (
                    <p className="text-base md:text-lg text-blue-400 leading-relaxed whitespace-pre-wrap break-words">
                      {line.translation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!session && (
              <div className="mt-12 p-6 bg-zinc-900 rounded-xl text-center hidden">
                {/* Removed Transfy text */}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Show "no lyrics" message if:
  // 1. No lyrics and we're on a lyric page
  // 2. Or we're on a dummy track page that doesn't have lyrics data
  if (lyrics.length === 0) {
    // If we're on a lyric page with a trackId but no lyrics, show appropriate message with Header info
    if (pathname.startsWith("/lyric/") || pathname.startsWith("/track/") || urlTrackId) {
      return (
        <div className="w-full px-4 py-8 bg-black text-white">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header Section - Always show track info even if lyrics missing */}
            <div className="text-center pt-8 pb-4">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
                {displayTitle || "Unknown Title"}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-zinc-400">
                {displayArtist || "Unknown Artist"}
              </p>
              {displayArt && displayArt !== "/file.svg" ? (
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayArt}
                    alt={`${displayTitle} album art`}
                    className="w-48 h-48 rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="flex justify-center mb-8">
                  <div className="w-48 h-48 bg-zinc-800 rounded-lg shadow-xl flex items-center justify-center">
                    <Music className="w-20 h-20 text-zinc-600" />
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <OpenInSpotifyButton
                  trackId={storeTrackId}
                  title={searchTitle}
                  artist={searchArtist}
                  label={t.openInSpotify}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-zinc-500 py-12">
              <div className="text-center max-w-md px-4">
                <p className="mb-2 text-lg">{t.noLyrics}</p>
                <p className="mb-4 text-sm text-zinc-600">{t.noLyricsHint}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOriginalLyrics([]);
                    setLyrics([]);
                    setLoadingLyrics(true);
                    setLyricsRetryTrigger();
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                >
                  {t.retryLyrics}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default "idle" screen for Home Page
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-start text-zinc-500 bg-black w-full h-full flex-1">
        <Dashboard initialUiLanguage={currentUiLang} />
      </div>
    );
  }

  // Active Sync View (Only for logged in users with sync lyrics)
  // This part is unreachable if (!session) due to the first if block covering it
  // But we keep the structure for clarity
  return (
    <div
      ref={containerRef}
      className="w-full px-4 py-8 bg-black text-white"
    >
      {/* Translating Overlay */}
      {isTranslating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all duration-300">
          <div className="bg-zinc-900 border border-zinc-700 text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
            <Loader2 className="w-10 h-10 text-[#1DB954] animate-spin" />
            <p className="text-lg font-medium">{t.translating}</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center pt-8 pb-4 relative">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
            {displayTitle}
          </h1>
          <p className="text-xl md:text-2xl mb-6 text-zinc-400">
            {displayArtist}
          </p>
          
          {displayArt && displayArt !== "/file.svg" ? (
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayArt}
                alt={`${displayTitle} album art`}
                className="w-48 h-48 rounded-lg shadow-xl"
              />
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div className="w-48 h-48 bg-zinc-800 rounded-lg shadow-xl flex items-center justify-center">
                <Music className="w-20 h-20 text-zinc-600" />
              </div>
            </div>
          )}

          {/* 재생 중인지 알려 주어, 가사가 스크롤되지 않는 이유를 알 수 있게 합니다. */}
          <div className="flex justify-center">
            {isPlaying ? (
              <span className="inline-flex items-center gap-2 text-sm text-[#1DB954]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1DB954] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1DB954]" />
                </span>
                {t.nowPlaying}
              </span>
            ) : (
              <span className="text-sm text-zinc-500">{t.notPlaying}</span>
            )}
          </div>

          <div className="flex justify-center mt-4">
            <OpenInSpotifyButton
              trackId={storeTrackId}
              title={searchTitle}
              artist={searchArtist}
              label={t.openInSpotify}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-4 pb-32">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            // 현재 줄이 정해졌을 때만 나머지를 흐리게 처리합니다.
            // 재생이 시작되기 전이나 첫 줄의 시작 시각 이전에는 활성 줄이 없는데,
            // 그때도 흐리게 두면 가사 전체가 읽기 어려워집니다.
            const isDimmed = hasActiveLine && !isActive;
            return (
              <div
                key={line.id ?? `line-${index}`}
                ref={isActive ? activeLineRef : null}
                className={`transition-all duration-500 ease-in-out cursor-pointer ${isActive
                  ? "opacity-100 scale-105 origin-left"
                  : isDimmed
                    ? "opacity-40 hover:opacity-70 blur-[1px] hover:blur-0"
                    : "opacity-100"
                  }`}
                onClick={() => {
                  // Optional: Seek functionality could be added here
                }}
              >
                <p className="text-2xl md:text-3xl font-bold text-white mb-1 leading-snug whitespace-pre-wrap break-words">
                  {line.text}
                </p>
                {showTranslation && line.translation && (
                  <p className="text-lg md:text-xl font-medium text-blue-400 leading-snug whitespace-pre-wrap break-words">
                    {line.translation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
