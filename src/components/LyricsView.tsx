"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { usePlayerStore, LyricsLine } from "@/store/usePlayerStore";
import { translateText } from "@/app/actions/translate";
import { getCachedLyrics, saveCachedLyrics, logActivity } from "@/lib/cache";
import { useRouter, usePathname } from "next/navigation";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { useSession } from "next-auth/react";

// Dummy Data (Eminem - Lose Yourself)
const DUMMY_LYRICS_EMINEM: LyricsLine[] = [
  {
    id: "1",
    time: 1000,
    text: "Look, if you had one shot, or one opportunity",
  },
  { id: "2", time: 5000, text: "To seize everything you ever wanted" },
  { id: "3", time: 8000, text: "In one moment" },
  { id: "4", time: 10000, text: "Would you capture it or just let it slip?" },
  { id: "5", time: 13000, text: "Yo" },
  {
    id: "6",
    time: 15000,
    text: "His palms are sweaty, knees weak, arms are heavy",
  },
  {
    id: "7",
    time: 18000,
    text: "There's vomit on his sweater already, mom's spaghetti",
  },
  {
    id: "8",
    time: 21000,
    text: "He's nervous, but on the surface he looks calm and ready",
  },
  { id: "9", time: 24000, text: "To drop bombs, but he keeps on forgettin'" },
  {
    id: "10",
    time: 27000,
    text: "What he wrote down, the whole crowd goes so loud",
  },
];

// Dummy Data 2 (YOASOBI - Idol)
const DUMMY_LYRICS_YOASOBI: LyricsLine[] = [
  { id: "1", time: 1000, text: "無敵の笑顔で荒らすメディア" },
  { id: "2", time: 4000, text: "知りたいその秘密ミステリアス" },
  { id: "3", time: 7000, text: "抜けてるとこさえ彼女のエリア" },
  { id: "4", time: 10000, text: "完璧で嘘つきな君は" },
  { id: "5", time: 13000, text: "天才的なアイドル様" },
  { id: "6", time: 17000, text: "今日何食べた？" },
  { id: "7", time: 19000, text: "好きな本は？" },
  { id: "8", time: 21000, text: "遊びに行くならどこに行くの？" },
  { id: "9", time: 24000, text: "何も食べてない" },
  { id: "10", time: 26000, text: "それは内緒" },
  { id: "11", time: 28000, text: "何を聞かれてものらりくらり" },
];

// UI Text Dictionary
const UI_TEXT = {
  ko: {
    loading: "가사를 불러오는 중...",
    noLyrics: "가사를 찾을 수 없습니다.",
    playMusic: "음악을 재생해주세요.",
    testRunning: "테스트 실행 중...",
    runTestEminem: "🎵 에미넴(Lose Yourself) 실행",
    runTestYoasobi: "🎵 YOASOBI(Idol) 실행",
  },
  en: {
    loading: "Loading lyrics...",
    noLyrics: "No lyrics found.",
    playMusic: "Please play music.",
    testRunning: "Running test...",
    runTestEminem: "🎵 Run Test (Eminem)",
    runTestYoasobi: "🎵 Run Test (YOASOBI)",
  },
  ja: {
    loading: "歌詞を読み込み中...",
    noLyrics: "歌詞が見つかりません。",
    playMusic: "音楽を再生してください。",
    testRunning: "テスト実行中...",
    runTestEminem: "🎵 テスト実行 (Eminem)",
    runTestYoasobi: "🎵 テスト実行 (YOASOBI)",
  },
  zh: {
    loading: "正在加载歌词...",
    noLyrics: "未找到歌词。",
    playMusic: "请播放音乐。",
    testRunning: "测试运行中...",
    runTestEminem: "🎵 运行测试 (Eminem)",
    runTestYoasobi: "🎵 运行测试 (YOASOBI)",
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
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Added timer ref
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null); // Track ID for caching context
  const pathname = usePathname();
  const { trackId: storeTrackId, setLyrics: setStoreLyrics, setPlayback: setStorePlayback } = usePlayerStore();

  // Extract trackId from URL
  const getTrackIdFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname;
    const match = path.match(/\/lyric\/([^/]+)/);
    return match ? match[1] : null;
  };

  // Check if URL trackId matches store trackId and clear lyrics if mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlTrackId = getTrackIdFromUrl();

    // If we're on a lyric page with a trackId
    if (urlTrackId && pathname.startsWith("/lyric/")) {
      // Check if URL trackId doesn't match store trackId
      if (urlTrackId !== storeTrackId) {
        // Clear lyrics and playback state if mismatch
        console.log(`URL trackId (${urlTrackId}) doesn't match store trackId (${storeTrackId}), clearing lyrics`);
        setStoreLyrics([]);
        setStorePlayback({
          isPlaying: false,
          trackId: null,
          title: "",
          artist: "",
          albumArt: "",
          duration: 0,
          progressMs: 0,
          provider: "none",
        });
      }
    }
  }, [pathname, storeTrackId, setStoreLyrics, setStorePlayback]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-start test mode based on URL - only for supported dummy tracks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlTrackId = getTrackIdFromUrl();
      if (!urlTrackId) return;

      // Check if this is a dummy track from POPULAR_SONGS
      const dummySong = POPULAR_SONGS.find(s => s.id === urlTrackId);

      if (dummySong) {
        // Only handle eminem and yoasobi for now (they have lyrics data)
        if (urlTrackId === "dummy-eminem" && !isTestRunning) {
          handleTestMode("eminem");
        } else if (urlTrackId === "dummy-yoasobi" && !isTestRunning) {
          handleTestMode("yoasobi");
        }
        // For other dummy tracks without lyrics data, we'll show "no lyrics" message
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Run when pathname changes

  // Test Mode Handler
  const handleTestMode = async (song: "eminem" | "yoasobi") => {
    if (timerRef.current) clearInterval(timerRef.current); // Clear existing timer
    setIsTestRunning(true);

    let trackInfo;
    let lyricsData;

    if (song === "eminem") {
      trackInfo = {
        isPlaying: true,
        trackId: "dummy-eminem",
        title: "Lose Yourself",
        artist: "Eminem",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4",
        duration: 30000,
        progressMs: 0,
        provider: "test" as const,
      };
      lyricsData = DUMMY_LYRICS_EMINEM;
    } else {
      trackInfo = {
        isPlaying: true,
        trackId: "dummy-yoasobi",
        title: "アイドル (Idol)",
        artist: "YOASOBI",
        albumArt:
          "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62", // Idol Art
        duration: 30000,
        progressMs: 0,
        provider: "test" as const,
      };
      lyricsData = DUMMY_LYRICS_YOASOBI;
    }

    setCurrentTrackId(trackInfo.trackId);

    // 1. Set dummy Playback Info
    setPlayback(trackInfo);

    // 2. Navigate to lyric page for consistency
    router.push(`/lyric/${trackInfo.trackId}`);

    // 3. Set Lyrics (Initially without translation)
    setLyrics(lyricsData);

    // 4. Start Timer (Simulate playback)
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      updateProgress(elapsed);

      if (elapsed > 30000) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTestRunning(false);
        // Ensure we signal that playback has stopped, keeping provider as 'test' to trigger redirect in ClientHome
        setPlayback({ isPlaying: false });
      }
    }, 100); // Update every 100ms

    // 5. Translate or Load from Cache
    await translateAndSetLyrics(trackInfo.trackId, trackInfo.title, trackInfo.artist, lyricsData);
  };

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
  }, [showTranslation, targetLanguage]); // Trigger when settings change (lyrics change is handled by initial load)

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

  // Check if we're on a lyric page with a trackId that should have lyrics
  const isSupportedDummyTrack = urlTrackId === "dummy-eminem" || urlTrackId === "dummy-yoasobi";

  // If we are on a supported dummy URL but lyrics are empty, show loading
  const showLoading = isLoadingLyrics || (isSupportedDummyTrack && lyrics.length === 0 && !isTestRunning);

  if (showLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 animate-pulse">
        {t.loading}
      </div>
    );
  }

  // Render static view for non-logged in users or when lyrics are available but not playing
  // Also used for dummy tracks view in some cases
  if (!session || lyrics.length > 0) {
    // Determine title/artist/artwork to display
    const { title: storeTitle, artist: storeArtist, albumArt: storeAlbumArt } = usePlayerStore.getState();
    const displayTitle = dummySong?.title || storeTitle;
    const displayArtist = dummySong?.artist || storeArtist;
    const displayArt = dummySong?.albumArt || storeAlbumArt;

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
        <div className="h-full overflow-y-auto px-4 py-8 bg-black text-white">
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
              <div className="mt-12 p-6 bg-zinc-900 rounded-xl text-center">
                <p className="text-zinc-400 mb-4">
                  {t.playMusic}
                </p>
                {/* Optional: Add login button here if needed */}
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
    // If we're on a lyric page with a trackId but no lyrics, show appropriate message
    if (pathname.startsWith("/lyric/") && urlTrackId) {
      // Check if it's a dummy track without lyrics data
      if (dummySong && !isSupportedDummyTrack) {
        // Show SEO-friendly content with lyrics text from dummySongs
        // This ensures AdSense crawler sees content on every page
        return (
          <div className="h-full overflow-y-auto px-4 py-8 bg-black text-white">
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              {/* Header Section */}
              <div className="text-center pt-8 pb-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">
                  {dummySong.title}
                </h1>
                <p className="text-2xl md:text-3xl mb-6 text-zinc-400">
                  {dummySong.artist}
                </p>
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dummySong.albumArt}
                    alt={`${dummySong.title} album art`}
                    className="w-48 h-48 rounded-lg shadow-xl"
                  />
                </div>
              </div>

              {/* Lyrics Content */}
              {dummySong.lyrics && (
                <div className="bg-zinc-900 p-8 rounded-xl shadow-lg">
                  <h2 className="text-2xl font-bold mb-6 text-white">
                    가사 (Lyrics)
                  </h2>
                  <div className="prose prose-lg max-w-none prose-invert">
                    <pre className="whitespace-pre-wrap text-zinc-300 font-sans text-base leading-relaxed">
                      {dummySong.lyrics}
                    </pre>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-zinc-900 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  노래 정보
                </h3>
                <p className="text-zinc-300 mb-2">
                  <strong>제목:</strong> {dummySong.title}
                </p>
                <p className="text-zinc-300 mb-2">
                  <strong>아티스트:</strong> {dummySong.artist}
                </p>
                <p className="text-sm text-zinc-400 mt-4">
                  실시간 동기화 가사 번역 기능은 준비 중입니다. 위 가사는 참고용으로 제공됩니다.
                </p>
              </div>

              {/* Call to Action */}
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-4">
                  더 많은 가사 번역을 보려면 다른 노래를 검색해보세요.
                </p>
              </div>
            </div>
          </div>
        );
      }

      // For other lyric pages without lyrics
      return (
        <div className="flex h-full items-center justify-center text-zinc-500">
          <div className="text-center max-w-md px-4">
            <p className="mb-2 text-lg">{t.noLyrics}</p>
            <p className="text-sm text-zinc-400">{t.playMusic}</p>
          </div>
        </div>
      );
    }

    // Default "no lyrics" screen with test buttons (only show on home or non-lyric pages)
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="mb-2">{t.noLyrics}</p>
          <p className="text-sm mb-6">{t.playMusic}</p>

          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => handleTestMode("eminem")}
              disabled={isTestRunning}
              className="w-full max-w-xs px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestRunning ? t.testRunning : t.runTestEminem}
            </button>

            <button
              onClick={() => handleTestMode("yoasobi")}
              disabled={isTestRunning}
              className="w-full max-w-xs px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestRunning ? t.testRunning : t.runTestYoasobi}
            </button>
          </div>
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
      className="h-full overflow-y-auto px-4 py-8 scrollbar-hide bg-black text-white"
    >
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-[50vh] pt-[10vh]">
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
