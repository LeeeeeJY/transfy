"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { usePlayerStore, LyricsLine } from "@/store/usePlayerStore";
import { translateText } from "@/app/actions/translate";
import { getCachedLyrics, saveCachedLyrics, logActivity } from "@/lib/cache";

// Dummy Data (Eminem - Lose Yourself)
const DUMMY_LYRICS_EMINEM: LyricsLine[] = [
  { id: "1", time: 1000, text: "Look, if you had one shot, or one opportunity" },
  { id: "2", time: 5000, text: "To seize everything you ever wanted" },
  { id: "3", time: 8000, text: "In one moment" },
  { id: "4", time: 10000, text: "Would you capture it or just let it slip?" },
  { id: "5", time: 13000, text: "Yo" },
  { id: "6", time: 15000, text: "His palms are sweaty, knees weak, arms are heavy" },
  { id: "7", time: 18000, text: "There's vomit on his sweater already, mom's spaghetti" },
  { id: "8", time: 21000, text: "He's nervous, but on the surface he looks calm and ready" },
  { id: "9", time: 24000, text: "To drop bombs, but he keeps on forgettin'" },
  { id: "10", time: 27000, text: "What he wrote down, the whole crowd goes so loud" },
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
    playMusic: "스포티파이에서 음악을 재생해주세요.",
    testRunning: "테스트 실행 중...",
    runTestEminem: "🎵 에미넴(Lose Yourself) 실행",
    runTestYoasobi: "🎵 YOASOBI(Idol) 실행"
  },
  en: {
    loading: "Loading lyrics...",
    noLyrics: "No lyrics found.",
    playMusic: "Please play music on Spotify.",
    testRunning: "Running test...",
    runTestEminem: "🎵 Run Test (Eminem)",
    runTestYoasobi: "🎵 Run Test (YOASOBI)"
  },
  ja: {
    loading: "歌詞を読み込み中...",
    noLyrics: "歌詞が見つかりません。",
    playMusic: "Spotifyで音楽を再生してください。",
    testRunning: "テスト実行中...",
    runTestEminem: "🎵 テスト実行 (Eminem)",
    runTestYoasobi: "🎵 テスト実行 (YOASOBI)"
  },
  zh: {
    loading: "正在加载歌词...",
    noLyrics: "未找到歌词。",
    playMusic: "请在 Spotify 上播放音乐。",
    testRunning: "测试运行中...",
    runTestEminem: "🎵 运行测试 (Eminem)",
    runTestYoasobi: "🎵 运行测试 (YOASOBI)"
  }
};

// Helper for caching
const getCacheKey = (trackId: string, lang: string) => `transfy-lyrics-${trackId}-${lang}`;

export default function LyricsView() {
  const {
    lyrics,
    progressMs,
    isLoadingLyrics,
    showTranslation,
    setLyrics,
    setPlayback,
    updateProgress,
    targetLanguage
  } = usePlayerStore();

  // Get current language text (fallback to English if not found)
  const t = UI_TEXT[targetLanguage as keyof typeof UI_TEXT] || UI_TEXT.en;

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null); // Track ID for caching context

  // Test Mode Handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTestMode = async (song: "eminem" | "yoasobi") => {
    setIsTestRunning(true);

    let trackInfo;
    let lyricsData;

    if (song === "eminem") {
      trackInfo = {
        isPlaying: true,
        trackId: "dummy-eminem",
        title: "Lose Yourself",
        artist: "Eminem",
        albumArt: "https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4",
        duration: 30000,
        progressMs: 0,
      };
      lyricsData = DUMMY_LYRICS_EMINEM;
    } else {
      trackInfo = {
        isPlaying: true,
        trackId: "dummy-yoasobi",
        title: "アイドル (Idol)",
        artist: "YOASOBI",
        albumArt: "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62", // Idol Art
        duration: 30000,
        progressMs: 0,
      };
      lyricsData = DUMMY_LYRICS_YOASOBI;
    }

    setCurrentTrackId(trackInfo.trackId);

    // 1. Set dummy Playback Info
    setPlayback(trackInfo);

    // 2. Set Lyrics (Initially without translation)
    setLyrics(lyricsData);

    // 3. Start Timer (Simulate playback)
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      updateProgress(elapsed);

      if (elapsed > 30000) {
        clearInterval(timer);
        setIsTestRunning(false);
      }
    }, 100); // Update every 100ms

    // 4. Translate or Load from Cache
    try {
      // Try DB Cache First
      const cachedData = await getCachedLyrics(trackInfo.trackId, targetLanguage);

      if (cachedData) {
        console.log("Using cached lyrics (Supabase) for:", trackInfo.trackId);
        setLyrics(cachedData);
      } else {
        console.log("Translating lyrics (Supabase) for:", trackInfo.trackId);
        const textsToTranslate = lyricsData.map(l => l.text);
        const translatedTexts = await translateText(textsToTranslate, targetLanguage);

        const translatedLyrics = lyricsData.map((line, index) => ({
          ...line,
          translation: translatedTexts[index]
        }));

        setLyrics(translatedLyrics);
        // Save to DB
        await saveCachedLyrics(trackInfo.trackId, targetLanguage, translatedLyrics);

        // Log Activity
        await logActivity("translate_test", {
          track_name: trackInfo.title,
          artist: trackInfo.artist,
          target_lang: targetLanguage,
          user_email: "test_user"
        });
      }
    } catch (error) {
      console.error("Test translation failed", error);
    }
  };

  // Re-translate when targetLanguage changes
  useEffect(() => {
    if (lyrics.length === 0 || !showTranslation || !currentTrackId) return;

    const translateCurrentLyrics = async () => {
      try {
        const cachedData = await getCachedLyrics(currentTrackId, targetLanguage);

        if (cachedData) {
          console.log("Using cached lyrics (lang switch) for:", currentTrackId);
          setLyrics(cachedData);
          return;
        }

        console.log("Translating lyrics (lang switch) for:", currentTrackId);
        const textsToTranslate = lyrics.map(l => l.text);
        const translatedTexts = await translateText(textsToTranslate, targetLanguage);

        const newLyrics = lyrics.map((line, index) => ({
          ...line,
          translation: translatedTexts[index]
        }));

        setLyrics(newLyrics);
        await saveCachedLyrics(currentTrackId, targetLanguage, newLyrics);

        // Log Activity (Lang Switch)
        await logActivity("translate_switch", {
          track_name: "Unknown (Test)",
          target_lang: targetLanguage,
          user_email: "test_user"
        });
      } catch (error) {
        console.error("Re-translation failed", error);
      }
    };

    translateCurrentLyrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage, showTranslation]); // removed currentTrackId to avoid loop, but checked inside

  // Find active line efficiently
  const activeIndex = useMemo(() => {
    return lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return progressMs >= line.time && (!nextLine || progressMs < nextLine.time);
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

  if (isLoadingLyrics) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 animate-pulse">
        {t.loading}
      </div>
    );
  }

  if (lyrics.length === 0) {
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

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-8 scrollbar-hide"
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
              <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 leading-snug">
                {line.text}
              </p>
              {showTranslation && line.translation && (
                <p className="text-lg md:text-xl font-medium text-blue-600 dark:text-blue-400 leading-snug">
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
