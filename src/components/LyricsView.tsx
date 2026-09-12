"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePathname } from "next/navigation";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { useSession } from "next-auth/react";
import { Loader2, Music } from "lucide-react";
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
  },
  en: {
    loading: "Loading lyrics...",
    noLyrics: "No lyrics found.",
    noLyricsHint: "Lyrics server may be temporarily unavailable.",
    retryLyrics: "Retry loading lyrics",
    playMusic: "Please play music on Spotify or search.",
    translating: "Translating...",
    readyToPlay: "Ready to play music.",
  },
  ja: {
    loading: "歌詞を読み込み中...",
    noLyrics: "歌詞が見つかりません。",
    noLyricsHint: "歌詞サーバーが不安定な場合があります。",
    retryLyrics: "歌詞を再読み込み",
    playMusic: "Spotifyで音楽を再生するか、検索してください。",
    translating: "翻訳中...",
    readyToPlay: "音楽を再生する準備ができました。",
  },
  zh: {
    loading: "正在加载歌词...",
    noLyrics: "未找到歌词。",
    noLyricsHint: "歌词服务可能暂时不稳定。",
    retryLyrics: "重新加载歌词",
    playMusic: "请在 Spotify 上播放音乐或搜索。",
    translating: "翻译中...",
    readyToPlay: "准备播放音乐。",
  },
};

interface LyricsViewProps {
  initialUiLanguage?: string;
}

export default function LyricsView({ initialUiLanguage }: LyricsViewProps) {
  const { data: session } = useSession();
  const {
    lyrics,
    progressMs,
    isLoadingLyrics,
    showTranslation,
    isTranslating,
    setLyrics,
    setLoadingLyrics,
    setOriginalLyrics,
    setLyricsRetryTrigger,
    uiLanguage,
    pinnedTrackId,
    trackId: storeTrackId,
    setLyrics: setStoreLyrics,
    setPlayback: setStorePlayback
  } = usePlayerStore();

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

  // Check mismatch immediately for rendering.
  // 사용자가 검색 결과에서 직접 선택한 곡(pinnedTrackId)이 있으면 서버가 확정한
  // 곡 정보가 정답이므로, URL에서 유추한 ID와 비교하지 않습니다.
  const isIdMismatch =
    !pinnedTrackId && urlTrackId && storeTrackId && urlTrackId !== storeTrackId;

  // Check if URL trackId matches store trackId and clear lyrics if mismatch
  useEffect(() => {
    // Always clear lyrics when component mounts to prevent showing previous lyrics
    // But only if we are navigating to a new track
    
    // If we are using Spotify provider, we should trust the store's trackId and ignore URL mismatch
    // because URL might be static (from search) but playback is real.
    const isSpotifyProvider = usePlayerStore.getState().provider === 'spotify';
    
    if (isIdMismatch && !isSpotifyProvider) {
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

  // Find active line efficiently
  const activeIndex = useMemo(() => {
    return lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return (
        progressMs >= line.time && (!nextLine || progressMs < nextLine.time)
      );
    });
  }, [progressMs, lyrics]);

  // Auto scroll side effect
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
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
  const { title: storeTitle, artist: storeArtist, albumArt: storeAlbumArt } = usePlayerStore.getState();
  const displayTitle = dummySong?.title || storeTitle;
  const displayArtist = dummySong?.artist || storeArtist;
  const displayArt = dummySong?.albumArt || storeAlbumArt;

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
        </div>

        <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-4 pb-32">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={line.id ?? `line-${index}`}
                ref={isActive ? activeLineRef : null}
                className={`transition-all duration-500 ease-in-out cursor-pointer ${isActive
                  ? "opacity-100 scale-105 origin-left"
                  : "opacity-40 hover:opacity-70 blur-[1px] hover:blur-0"
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
