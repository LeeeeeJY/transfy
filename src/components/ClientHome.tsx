"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import LyricsView from "@/components/LyricsView";
import BottomPlayer from "@/components/BottomPlayer";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";
import { useLyricsFetcher } from "@/hooks/useLyricsFetcher";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { usePlayerStore, LyricsLine } from "@/store/usePlayerStore";
import { useRouter, useSearchParams } from "next/navigation";
import { encodeTrackUrl, parseLrc } from "@/lib/utils";

const UI_TEXT = {
  ko: {
    subtitle: "실시간 가사 번역 서비스",
    loginSpotify: "Spotify로 로그인",
    searchSongs: "노래 검색하기",
    goToLyrics: "가사 보기",
    permissionNotice:
      "로그인하면 현재 재생 중인 음악 정보를 읽어올 수 있는 권한을 요청합니다.",
    loginExpired: "로그인이 만료되었습니다.",
    loginAgain: "다시 로그인",
    titleDefault: "Transfy - 실시간 가사 번역기",

    // Landing Content
    whyTransfy: "왜 Transfy인가요?",
    featureSyncTitle: "실시간 싱크",
    featureSyncDesc:
      "재생 중인 노래를 자동으로 감지하고 가사를 즉시 동기화합니다.",
    featureMultiTitle: "다국어 번역",
    featureMultiDesc:
      "한국어, 영어, 일본어, 중국어로 가사를 실시간 번역하세요.",
    featureFastTitle: "빠른 속도",
    featureFastDesc:
      "고급 캐싱 기술과 최적화된 번역 API로 끊김 없는 경험을 제공합니다.",

    howItWorks: "사용 방법",
    step1: "Spotify 계정으로 로그인하세요.",
    step2: "앱(모바일 또는 데스크탑)에서 노래를 재생하세요.",
    step3: "Transfy가 자동으로 가사를 띄우고 실시간으로 번역해 줍니다.",
    step4: "가사의 의미를 이해하며 음악을 더 깊이 즐겨보세요!",

    faq: "자주 묻는 질문",
    faqFreeTitle: "무료인가요?",
    faqFreeDesc:
      "네, Transfy는 완전히 무료입니다. 개인 학습 목적으로 운영되는 비상업적 프로젝트입니다.",
    faqSpotifyTitle: "무료 계정도 되나요?",
    faqSpotifyDesc:
      "네! 프리미엄이든 무료 계정이든 노래만 재생되면 작동합니다.",

    servicePreparing: "서비스 준비 중입니다.",

    // SEO Content (Korean)
    seoTitle: "전 세계를 잇는 음악 경험",
    seoDesc1:
      "오늘날 음악은 국경이 없습니다. K-Pop, J-Pop, 팝송 등 전 세계 음악을 즐기지만, 언어의 장벽 때문에 가사의 깊은 의미를 놓치기도 합니다. Transfy는 이 문제를 해결하기 위해 스포티파이 실시간 가사 번역 서비스를 제공합니다.",
    seoDesc2:
      "새로운 언어를 배우고 있거나 단순히 가사의 의미를 알고 싶을 때, Transfy는 최고의 청취 경험을 선사합니다. 노래가 재생되면 즉시 번역된 가사를 띄워주어 흐름을 끊지 않고 음악에 몰입할 수 있습니다.",
    seoSubTitle1: "왜 실시간 번역인가요?",
    seoSubDesc1:
      "기존의 가사 해석은 음악 앱을 끄고 검색해서 스크롤하며 봐야 했습니다. Transfy는 듣고 있는 음악과 완벽하게 동기화되어, 마치 음악 플레이어의 기본 기능처럼 작동합니다.",
    seoSubTitle2: "지원 언어",
    seoSubDesc2:
      "현재 한국어, 영어, 일본어, 중국어 간의 상호 번역을 지원합니다. 다양한 문화권의 사용자가 언어 장벽 없이 음악을 즐길 수 있도록, 지속적으로 언어를 추가하고 AI 모델을 고도화하고 있습니다.",

    footerRights: "Transfy.",
    footerTerms: "이용약관",
    footerPrivacy: "개인정보처리방침",
    disclaimer:
      "이 프로젝트는 교육 목적으로 제작된 비상업적 개인 프로젝트입니다. 가사 데이터는 LRCLIB에서 제공받으며, 모든 저작권은 원작자에게 있습니다.",
  },
  en: {
    subtitle: "Realtime lyrics translation service",
    loginSpotify: "Sign in with Spotify",
    searchSongs: "Search Songs",
    goToLyrics: "View lyrics",
    permissionNotice:
      "When you sign in, we request permission to read your current playback information.",
    loginExpired: "Your session has expired.",
    loginAgain: "Sign in again",
    titleDefault: "Transfy - Lyrics Translator",

    whyTransfy: "Why Transfy?",
    featureSyncTitle: "Real-time Sync",
    featureSyncDesc:
      "Automatically detects your current track and syncs lyrics instantly.",
    featureMultiTitle: "Multi-language",
    featureMultiDesc:
      "Translate lyrics into Korean, English, Japanese, and Chinese with one click.",
    featureFastTitle: "Lightning Fast",
    featureFastDesc:
      "Powered by advanced caching and optimized translation APIs for zero lag.",

    howItWorks: "How it works",
    step1: "Log in with your Spotify account.",
    step2: "Play any song on your app (Mobile or Desktop).",
    step3:
      "Transfy will automatically display the lyrics and translate them in real-time.",
    step4: "Enjoy the music with deeper understanding!",

    faq: "FAQ",
    faqFreeTitle: "Is it free?",
    faqFreeDesc:
      "Yes, Transfy is completely free to use. It is a non-commercial project for educational purposes.",
    faqSpotifyTitle: "Does it work with Free plans?",
    faqSpotifyDesc:
      "Yes! Whether you have Premium or Free, as long as you are playing music, it works.",

    servicePreparing: "Service is preparing.",

    // SEO Content (English)
    seoTitle: "Global Music Experience",
    seoDesc1:
      "In today's interconnected world, music knows no boundaries. K-Pop, J-Pop, and Western Pop are enjoyed globally, yet language barriers often limit the depth of appreciation. Transfy bridges this gap by providing real-time, synchronized translations for your favorite Spotify tracks.",
    seoDesc2:
      "Whether you are learning a new language or simply want to understand the meaning behind the lyrics, Transfy enhances your listening experience. Our technology ensures that translations are delivered instantly as the song plays, allowing you to stay immersed in the rhythm while grasping the message.",
    seoSubTitle1: "Why Real-time Translation Matters",
    seoSubDesc1:
      "Static lyrics translations have existed for a long time, but they require you to look away from the music player and scroll manually. Transfy integrates directly with your listening session. By detecting the currently playing song on Spotify, we fetch and display the translated lyrics in perfect sync. This seamless integration makes it feel like a native feature of your music player.",
    seoSubTitle2: "Supported Languages",
    seoSubDesc2:
      "Currently, Transfy supports translation between major global languages including Korean, English, Japanese, and Chinese. This coverage allows users from different cultural backgrounds to enjoy music from around the world without language barriers. We are continuously working to add more languages and improve translation accuracy through advanced AI models.",

    footerRights: "Transfy.",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    disclaimer:
      "This is a non-commercial personal project for educational purposes only. Lyrics data provided by LRCLIB. All rights belong to their respective owners.",
  },
  ja: {
    subtitle: "リアルタイム歌詞翻訳サービス",
    loginSpotify: "Spotifyでログイン",
    searchSongs: "曲を検索",
    goToLyrics: "歌詞を見る",
    permissionNotice:
      "ログインすると、現在再生中の音楽情報を読み取る権限をリクエストします。",
    loginExpired: "ログインの有効期限が切れました。",
    loginAgain: "もう一度ログイン",
    titleDefault: "Transfy - 歌詞翻訳",

    whyTransfy: "Transfyを選ぶ理由",
    featureSyncTitle: "リアルタイム同期",
    featureSyncDesc: "再生中の曲を自動検出し、歌詞を即座に同期します。",
    featureMultiTitle: "多言語翻訳",
    featureMultiDesc:
      "韓国語、英語、日本語、中国語にワンクリックで翻訳できます。",
    featureFastTitle: "超高速",
    featureFastDesc:
      "高度なキャッシュ技術と最適化された翻訳APIにより、遅延のない体験を提供します。",

    howItWorks: "使い方",
    step1: "Spotifyアカウントでログインします。",
    step2: "アプリ（モバイルまたはデスクトップ）で曲を再生します。",
    step3: "Transfyが自動的に歌詞を表示し、リアルタイムで翻訳します。",
    step4: "歌詞の意味を理解しながら、音楽をもっと楽しみましょう！",

    faq: "よくある質問",
    faqFreeTitle: "無料ですか？",
    faqFreeDesc:
      "はい、Transfyは完全に無料です。個人の学習目的で運営される非営利プロジェクトです。",
    faqSpotifyTitle: "Freeプランでも使えますか？",
    faqSpotifyDesc:
      "はい！PremiumでもFreeでも、音楽が再生されていれば動作します。",

    servicePreparing: "サービス準備中です。",

    // SEO Content (Japanese)
    seoTitle: "世界をつなぐ音楽体験",
    seoDesc1:
      "今日、音楽に国境はありません。K-Pop、J-Pop、洋楽など世界中の音楽を楽しんでいますが、言葉の壁により歌詞の深い意味を逃してしまうこともあります。Transfyはこの問題を解決するため、Spotifyのリアルタイム歌詞翻訳サービスを提供します。",
    seoDesc2:
      "新しい言語を学んでいる時や、単に歌詞の意味を知りたい時、Transfyは最高のリスニング体験をお届けします。曲が再生されると即座に翻訳された歌詞が表示され、流れを止めることなく音楽に没頭できます。",
    seoSubTitle1: "なぜリアルタイム翻訳なのか？",
    seoSubDesc1:
      "従来の歌詞翻訳は、音楽アプリを閉じて検索し、スクロールしながら見る必要がありました。Transfyは聴いている音楽と完全に同期し、まるで音楽プレイヤーの標準機能のように動作します。",
    seoSubTitle2: "対応言語",
    seoSubDesc2:
      "現在、韓国語、英語、日本語、中国語間の相互翻訳に対応しています。様々な文化圏のユーザーが言葉の壁なく音楽を楽しめるよう、継続的に言語を追加しAIモデルを高度化しています。",

    footerRights: "Transfy.",
    footerTerms: "利用規約",
    footerPrivacy: "プライバシーポリシー",
    disclaimer:
      "このプロジェクトは教育目的で作成された非営利の個人プロジェクトです。歌詞データはLRCLIBから提供されており、すべての著作権は原作者に帰属します。",
  },
  zh: {
    subtitle: "实时歌词翻译服务",
    loginSpotify: "使用 Spotify 登录",
    searchSongs: "搜索歌曲",
    goToLyrics: "查看歌词",
    permissionNotice: "登录后，我们会请求读取您当前播放信息的权限。",
    loginExpired: "登录已过期。",
    loginAgain: "重新登录",
    titleDefault: "Transfy - 歌词翻译",

    whyTransfy: "为什么选择 Transfy？",
    featureSyncTitle: "实时同步",
    featureSyncDesc: "自动检测您当前播放的歌曲并即时同步歌词。",
    featureMultiTitle: "多语言翻译",
    featureMultiDesc: "一键将歌词翻译成韩语、英语、日语和中文。",
    featureFastTitle: "极速体验",
    featureFastDesc: "由先进的缓存技术和优化的翻译 API 支持，以此实现零延迟。",

    howItWorks: "使用方法",
    step1: "登录您的 Spotify 帐户。",
    step2: "在您的应用（手机或电脑）上播放任何歌曲。",
    step3: "Transfy 将自动显示歌词并实时翻译。",
    step4: "更深入地理解歌词，享受音乐！",

    faq: "常见问题",
    faqFreeTitle: "是免费的吗？",
    faqFreeDesc:
      "是的，Transfy 完全免费。这是一个用于教育目的的非商业个人项目。",
    faqSpotifyTitle: "免费版能用吗？",
    faqSpotifyDesc:
      "可以！无论您是 Premium 还是免费用户，只要在播放音乐，就可以使用。",

    servicePreparing: "服务准备中。",

    // SEO Content (Chinese)
    seoTitle: "连接全球的音乐体验",
    seoDesc1:
      "在当今互联的世界中，音乐无国界。K-Pop、J-Pop 和欧美流行音乐风靡全球，但语言障碍往往限制了对歌词深层含义的理解。Transfy 通过提供 Spotify 实时歌词翻译服务来弥补这一差距。",
    seoDesc2:
      "无论您是在学习新语言，还是仅仅想了解歌词的含义，Transfy 都能为您提供最佳的聆听体验。歌曲播放时，翻译歌词即时显示，让您在不打断流畅度的情况下沉浸在音乐中。",
    seoSubTitle1: "为什么实时翻译很重要？",
    seoSubDesc1:
      "传统的歌词翻译需要您关闭音乐应用，手动搜索并滚动浏览。Transfy 与您的聆听过程完美同步，就像音乐播放器的原生功能一样。",
    seoSubTitle2: "支持语言",
    seoSubDesc2:
      "目前支持韩语、英语、日语和中文之间的相互翻译。为了让不同文化背景的用户都能无障碍地享受音乐，我们正在持续添加更多语言并优化 AI 模型。",

    footerRights: "Transfy.",
    footerTerms: "服务条款",
    footerPrivacy: "隐私政策",
    disclaimer:
      "本项目仅供教育目的使用的非商业个人项目。歌词数据由LRCLIB提供，所有权利属于原作者。",
  },
} as const;

interface TrackInfo {
  id?: string; // Optional URL-based ID to prevent mismatch
  title: string;
  artist: string;
  albumArt: string;
  lyrics: string | null;
  syncedLyrics?: string | null;
}

interface ClientHomeProps {
  initialLang: "ko" | "en" | "ja" | "zh";
  initialCountry: string;
  initialIp: string;
  isLyricPageInitial?: boolean;
  isDummyTrack?: boolean;
  initialTrack?: TrackInfo;
}

export default function ClientHome({
  initialLang,
  initialCountry,
  initialIp,
  isLyricPageInitial = false,
  isDummyTrack = false,
  initialTrack,
}: ClientHomeProps) {
  const { data: session } = useSession();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const initialized = useRef(false);
  const { isInitialized } = usePlayerStore();
  const [isLyricPage] = useState(isLyricPageInitial);

  useEffect(() => {
    if (!initialized.current) {
      if (!isInitialized) {
        usePlayerStore.setState({
          targetLanguage: initialLang,
          uiLanguage: initialLang,
          countryCode: initialCountry,
          clientIp: initialIp,
          isInitialized: true,
        });
      }
      initialized.current = true;
    }
  }, [initialLang, initialCountry, initialIp, isInitialized]);

  // Handle Initial Track Data for Lyric Pages
  useEffect(() => {
    if (initialTrack && isLyricPageInitial) {
      // Split plain lyrics by newline and convert to LyricsLine format
      // In future, we should use syncedLyrics for better experience
      const lyricsText = initialTrack.lyrics;

      if (!lyricsText || lyricsText === "Lyrics not found.") {
        usePlayerStore.setState({
          title: initialTrack.title,
          artist: initialTrack.artist,
          albumArt: initialTrack.albumArt,
          lyrics: [], // No lyrics available
          isPlaying: false, // It's static view initially
          provider: "none",
          isInitialized: true,
          // Use provided ID (from URL) if available
          trackId:
            initialTrack.id ||
            `static-${initialTrack.artist}-${initialTrack.title}`
              .replace(/\s+/g, "-")
              .toLowerCase(),
          isLoadingLyrics: false, // Loading finished, but no lyrics
        });
        return;
      }

      const trackIdForStore =
        initialTrack.id ||
        `static-${initialTrack.artist}-${initialTrack.title}`
          .replace(/\s+/g, "-")
          .toLowerCase();

      let lyricsArray: LyricsLine[] = [];
      if (initialTrack.syncedLyrics) {
        lyricsArray = parseLrc(initialTrack.syncedLyrics);
      } else {
        const lyricsLines = lyricsText.split("\n");
        lyricsArray = lyricsLines
          .filter((line) => line.trim().length > 0)
          .map((line, index) => ({
            id: `line-${index}`,
            time: index * 3000,
            text: line.trim(),
          }));
      }
      // trackId 접두사로 originalLyrics 설정 → 클라이언트에서 같은 곡 LRCLIB 재호출 방지
      const originalLyricsWithId = lyricsArray.map((line, idx) => ({
        ...line,
        id: `${trackIdForStore}-${idx}`,
      }));

      usePlayerStore.setState({
        title: initialTrack.title,
        artist: initialTrack.artist,
        albumArt: initialTrack.albumArt,
        lyrics: originalLyricsWithId,
        originalLyrics: originalLyricsWithId,
        isPlaying: false,
        provider: "none",
        isInitialized: true,
        trackId: trackIdForStore,
        isLoadingLyrics: false,
      });
    }
  }, [initialTrack, isLyricPageInitial]);

  const uiLang = initialLang;
  const t = UI_TEXT[uiLang as keyof typeof UI_TEXT] || UI_TEXT.en;

  useSpotifyPoller(); // Re-enabled for cross-device sync
  useLyricsFetcher(); // Fetch lyrics when track changes

  const { title, artist, isPlaying, trackId, provider } = usePlayerStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL Query Params for consistency (Album Art, Album Name)
  useEffect(() => {
    const cover = searchParams.get("cover");
    const album = searchParams.get("album");

    if (cover || album) {
      usePlayerStore.setState((state) => ({
        ...state,
        albumArt: cover || state.albumArt,
        // We don't store album name in store yet, but could add it if needed
        // For now, cover art is the main visual consistency issue
      }));
    }
  }, [searchParams]);

  // Navigation Logic: /lyric or /lyric/만 가사 페이지로 정리. 홈(/)에서는 자동 이동하지 않음.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;
    if (isPlaying && trackId && title && artist && (currentPath === "/lyric" || currentPath === "/lyric/")) {
      router.replace(encodeTrackUrl(artist, title));
    }
  }, [isPlaying, trackId, router, title, artist]);

  // Reset store on logout
  useEffect(() => {
    if (!session && provider !== "none" && !initialTrack) {
      usePlayerStore.setState({
        isPlaying: false,
        title: "",
        artist: "",
        albumArt: "",
        trackId: null,
        lyrics: [],
        progress: 0,
        provider: "none",
      });
      sessionStorage.removeItem("transfy_redirected_track");
    }
  }, [session, provider, initialTrack]);

  // Guest mode logic for lyric pages
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/track") &&
      !session
    ) {
      setTimeout(() => setIsGuestMode(true), 0);
    }
  }, [session]);

  // Dynamic Title
  useEffect(() => {
    if ((session || isGuestMode) && isPlaying && title && artist) {
      document.title = `${title} - ${artist} | Transfy`;
    } else {
      if (!isPlaying) {
        // Removed explicit document.title assignment here to let Next.js Metadata handle it
      }
    }
  }, [
    session,
    isGuestMode,
    isPlaying,
    title,
    artist,
    t.titleDefault,
    provider,
  ]);

  // 로그인 만료: 토큰 갱신 실패 또는 accessToken 없음
  const sessionWithToken = session as { accessToken?: string | null; error?: string } | null;
  const isSessionExpired =
    session &&
    (sessionWithToken?.error || !sessionWithToken?.accessToken);

  if (isSessionExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md w-full text-center space-y-8 mt-16">
          <div>
            <div className="flex justify-center mb-6">
              <Link href="/" className="hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="Transfy Logo"
                  className="w-24 h-24 shadow-2xl rounded-full hover:scale-110 transition-transform duration-300"
                />
              </Link>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-2">Transfy</h1>
            <p className="text-lg text-amber-400/90">{t.loginExpired}</p>
            <p className="text-sm text-zinc-500 mt-2">{t.permissionNotice}</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => signIn("spotify")}
              className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg cursor-pointer"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              {t.loginAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session && !isGuestMode && !isLyricPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md w-full text-center space-y-8 mt-16">
          <div>
            <div className="flex justify-center mb-6">
              <Link href="/" className="hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="Transfy Logo"
                  className="w-24 h-24 shadow-2xl rounded-full hover:scale-110 transition-transform duration-300"
                />
              </Link>
            </div>

            <h1 className="text-5xl font-bold tracking-tight mb-2">Transfy</h1>
            <p className="text-lg opacity-80">{t.subtitle}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn("spotify")}
              className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-6 rounded-full transition-all transform hover:scale-105 shadow-lg cursor-pointer"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              {t.loginSpotify}
            </button>

            <button
              onClick={() => router.push("/search")}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-4 px-6 rounded-full transition-all border border-zinc-700 cursor-pointer"
            >
              <Search className="w-5 h-5 text-gray-400" />
              {t.searchSongs}
            </button>
          </div>

          <div className="mt-8 text-xs text-white/50">{t.permissionNotice}</div>
        </div>

        <div className="max-w-4xl w-full mt-24 text-left space-y-16">
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center mb-12">
              {t.whyTransfy}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-4xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold mb-2">
                  {t.featureSyncTitle}
                </h3>
                <p className="text-white/70">{t.featureSyncDesc}</p>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-4xl mb-4">🌏</div>
                <h3 className="text-xl font-semibold mb-2">
                  {t.featureMultiTitle}
                </h3>
                <p className="text-white/70">{t.featureMultiDesc}</p>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-2">
                  {t.featureFastTitle}
                </h3>
                <p className="text-white/70">{t.featureFastDesc}</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold">{t.howItWorks}</h2>
            <ol className="list-decimal list-inside space-y-4 text-lg text-white/80">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
              <li>{t.step4}</li>
            </ol>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold">{t.faq}</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-2">{t.faqFreeTitle}</h3>
                <p className="text-white/70">{t.faqFreeDesc}</p>
              </div>
              <div className="bg-white/5 p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-2">
                  {t.faqSpotifyTitle}
                </h3>
                <p className="text-white/70">{t.faqSpotifyDesc}</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold">{t.seoTitle}</h2>
            <article className="prose prose-invert max-w-none text-white/80">
              <p>{t.seoDesc1}</p>
              <p className="mt-4">{t.seoDesc2}</p>
              <h3 className="text-xl font-semibold mt-6 mb-2">
                {t.seoSubTitle1}
              </h3>
              <p>{t.seoSubDesc1}</p>
              <h3 className="text-xl font-semibold mt-6 mb-2">
                {t.seoSubTitle2}
              </h3>
              <p>{t.seoSubDesc2}</p>
            </article>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <main className="flex-1 w-full bg-black flex flex-col">
        <LyricsView
          initialUiLanguage={initialLang}
          isDummyTrack={isDummyTrack}
        />
      </main>

      {session && <SpotifyPlayer />}
      {session && <BottomPlayer />}
    </div>
  );
}
