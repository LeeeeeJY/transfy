"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { usePlayerStore, LyricsLine } from "@/store/usePlayerStore";
import { translateText } from "@/app/actions/translate";
import { getCachedLyrics, saveCachedLyrics, logActivity } from "@/lib/cache";
import { useRouter, usePathname } from "next/navigation";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { useSession } from "next-auth/react";

// UI Text Dictionary
const UI_TEXT = {
  ko: {
    loading: "가사를 불러오는 중...",
    noLyrics: "가사를 찾을 수 없습니다.",
    playMusic: "음악을 재생해주세요.",
  },
  en: {
    loading: "Loading lyrics...",
    noLyrics: "No lyrics found.",
    playMusic: "Please play music.",
  },
  ja: {
    loading: "歌詞を読み込み中...",
    noLyrics: "歌詞が見つかりません。",
    playMusic: "音楽を再生してください。",
  },
  zh: {
    loading: "正在加载歌词...",
    noLyrics: "未找到歌词。",
    playMusic: "请播放音乐。",
  },
};

interface LyricsViewProps {
  initialUiLanguage?: string;
  isDummyTrack?: boolean;
}

export default function LyricsView({
  initialUiLanguage,
  isDummyTrack,
}: LyricsViewProps) {
  const router = useRouter(); // Initialize router
  const { data: session } = useSession();
  const {
    lyrics,
    progressMs,
    isLoadingLyrics,
    showTranslation,
    setLyrics,
    setPlayback,
    updateProgress,
    targetLanguage,
    uiLanguage, // Add uiLanguage
    countryCode,
    clientIp,
    setLoadingLyrics // Add setLoadingLyrics
  } = usePlayerStore();

  // Use initialUiLanguage for the first render to match server
  // Then fallback to store value (which syncs with client preference)
  const currentUiLang = initialUiLanguage || uiLanguage;

  // Get current track info from store for logging
  const { title, artist } = usePlayerStore.getState();

  // Client info for logging
  const getClientLogInfo = () => {
    if (typeof window === "undefined") {
      return {
        user_agent: "unknown",
        referer: "unknown",
        device_type: "unknown",
      };
    }

    const ua = window.navigator.userAgent || "unknown";
    const ref = document.referrer || "unknown";
    const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase());

    return {
      user_agent: ua,
      referer: ref,
      device_type: isMobile ? "mobile" : "desktop",
      ip_address: clientIp, // Use IP from store
    };
  };

  // ...

  // Get current language text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = UI_TEXT[currentUiLang as keyof typeof UI_TEXT] || UI_TEXT.en;

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null); // Track ID for caching context
  const pathname = usePathname();
  const { trackId: storeTrackId, setLyrics: setStoreLyrics, setPlayback: setStorePlayback } = usePlayerStore();

  // Extract trackId from URL
  const getTrackIdFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname;

    // Check for /lyric/ID pattern
    const lyricMatch = path.match(/\/lyric\/([^/]+)/);
    if (lyricMatch) return lyricMatch[1];

    // Check for /track/ARTIST/TITLE pattern
    // We need to generate a consistent ID from artist and title to match what ClientHome generates
    const trackMatch = path.match(/\/track\/([^/]+)\/([^/]+)/);
    if (trackMatch) {
      const artist = decodeURIComponent(trackMatch[1]);
      const title = decodeURIComponent(trackMatch[2]);
      return `static-${artist}-${title}`.replace(/\s+/g, '-').toLowerCase();
    }

    return null;
  };

  // Check if URL trackId matches store trackId and clear lyrics if mismatch
  useEffect(() => {
    // Always clear lyrics when component mounts to prevent showing previous lyrics
    // But only if we are navigating to a new track
    if (typeof window === "undefined") return;

    const urlTrackId = getTrackIdFromUrl();
    const { trackId: currentStoreTrackId } = usePlayerStore.getState();

    // If we are on a lyric page and the ID doesn't match the store, or just to be safe on mount
    if (urlTrackId && urlTrackId !== currentStoreTrackId) {
      console.log("Clearing lyrics on mount/change due to ID mismatch");
      setStoreLyrics([]);
      setLoadingLyrics(true); // Start loading
      setStorePlayback({
        isPlaying: false,
        trackId: urlTrackId, // Temporarily set trackId to URL one so we know what we are loading
        title: "",
        artist: "",
        albumArt: "",
        duration: 0,
        progressMs: 0,
        provider: "none",
      });
    }
  }, [pathname, setStoreLyrics, setStorePlayback, setLoadingLyrics]);

  // Helper function for translation
  const translateAndSetLyrics = async (
    trackId: string,
    trackTitle: string,
    trackArtist: string,
    rawLyrics: LyricsLine[]
  ) => {
    try {
      // Try DB Cache First
      const cachedData = await getCachedLyrics(trackId, targetLanguage);
      const clientInfo = getClientLogInfo();

      if (cachedData) {
        console.log("Using cached lyrics for:", trackId);
        setLyrics(cachedData);

        await logActivity("translate_view", {
          track_name: trackTitle,
          artist: trackArtist,
          target_lang: targetLanguage,
          user_email: "guest",
          is_cached: true,
          country_code: countryCode,
          ...clientInfo,
        });
      } else {
        console.log("Translating lyrics for:", trackId);
        // Only translate first 50 lines to save tokens if needed, but for now translate all
        const textsToTranslate = rawLyrics.map((l) => l.text);

        // Chunk translation if too long? 
        // translateText handles array, but if array is huge it might fail. 
        // For now assume lyrics < 100 lines usually.
        const translatedTexts = await translateText(
          textsToTranslate,
          targetLanguage
        );

        const translatedLyrics = rawLyrics.map((line, index) => ({
          ...line,
          translation: translatedTexts[index],
        }));

        setLyrics(translatedLyrics);

        // Save to DB
        await saveCachedLyrics(trackId, targetLanguage, translatedLyrics);

        await logActivity("translate_view", {
          track_name: trackTitle,
          artist: trackArtist,
          target_lang: targetLanguage,
          user_email: "guest",
          is_cached: false,
          country_code: countryCode,
          ...clientInfo,
        });
      }
    } catch (error) {
      console.error("Translation failed", error);
    }
  };

  // Auto-translate for static lyrics (e.g. from Search)
  useEffect(() => {
    const isStaticMode = usePlayerStore.getState().provider === 'none';
    const hasLyrics = lyrics.length > 0;
    // Check if we need translation: showTranslation is on, and at least one line has no translation
    const needsTranslation = showTranslation && lyrics.some(l => !l.translation);

    // Use title/artist from store as ID proxy for static tracks
    // Ideally we should have a real ID, but for search results we might not have a stable one unless we hash artist+title
    const { title, artist } = usePlayerStore.getState();

    if (isStaticMode && hasLyrics && needsTranslation && title && artist) {
      // Use a composite ID for caching
      const compositeId = `static-${artist}-${title}`.replace(/\s+/g, '-').toLowerCase();

      translateAndSetLyrics(compositeId, title, artist, lyrics);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslation, targetLanguage, lyrics.length, title, artist]); // Trigger when settings change or when lyrics load

  // Re-translate when targetLanguage changes (Old logic refactored)
  useEffect(() => {
    // Check if we need re-translation
    // Use store state directly to catch updates
    const store = usePlayerStore.getState();
    const trackIdToUse = store.trackId || currentTrackId;

    if (!trackIdToUse || lyrics.length === 0 || !showTranslation) return;

    // This is mainly for Realtime/Test mode where we have a trackId
    // For static mode, the effect above handles it
    if (store.provider !== 'none') {
      translateAndSetLyrics(trackIdToUse, store.title, store.artist, lyrics);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage, showTranslation]);

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
  const urlTrackId = typeof window !== "undefined" ? getTrackIdFromUrl() : null;
  const isDummy = isDummyTrack ?? (urlTrackId?.startsWith("dummy-") ?? false);
  const dummySong = urlTrackId ? POPULAR_SONGS.find(s => s.id === urlTrackId) : null;

  // Use store loading state directly.
  // The useEffect above sets loading to true on ID mismatch, 
  // and ClientHome sets it to false when data is loaded.
  const showLoading = isLoadingLyrics;

  if (showLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500 animate-pulse">
        {t.loading}
      </div>
    );
  }

  // Determine title/artist/artwork to display (Shared logic)
  const { title: storeTitle, artist: storeArtist, albumArt: storeAlbumArt } = usePlayerStore.getState();
  const displayTitle = dummySong?.title || storeTitle;
  const displayArtist = dummySong?.artist || storeArtist;
  const displayArt = dummySong?.albumArt || storeAlbumArt;

  // Render static view for non-logged in users or when lyrics are available but not playing
  // Also used for dummy tracks view in some cases
  if (!session || lyrics.length > 0) {
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
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {/* Header Section */}
            <div className="text-center pt-8 pb-4">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
                {displayTitle}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-zinc-400">
                {displayArtist}
              </p>
              {displayArt && (
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayArt}
                    alt={`${displayTitle} album art`}
                    className="w-48 h-48 rounded-lg shadow-xl"
                  />
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
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {/* Header Section - Always show track info even if lyrics missing */}
            <div className="text-center pt-8 pb-4">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
                {displayTitle || "Unknown Title"}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-zinc-400">
                {displayArtist || "Unknown Artist"}
              </p>
              {displayArt && (
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayArt}
                    alt={`${displayTitle} album art`}
                    className="w-48 h-48 rounded-lg shadow-xl"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center text-zinc-500 py-12">
              <div className="text-center max-w-md px-4">
                <p className="mb-2 text-lg">{t.noLyrics}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default "no lyrics" screen
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500 bg-black">
        <div className="text-center">
          <p className="mb-2">{t.noLyrics}</p>
        </div>
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
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-32 pt-12">
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={line.id}
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
  );
}
