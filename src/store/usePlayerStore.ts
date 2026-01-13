import { create } from "zustand";

export interface LyricsLine {
  id: string;
  time: number; // milliseconds
  text: string;
  translation?: string;
}

// Helper to detect browser language
function getBrowserLanguage(): "ko" | "en" | "ja" | "zh" {
  if (typeof window === "undefined") return "en";
  const browserLang = window.navigator.language || window.navigator.languages?.[0] || "en";
  const lower = browserLang.toLowerCase();
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("en")) return "en";
  return "en"; // Default to English for unsupported languages
}

interface PlayerState {
  // Playback State
  isPlaying: boolean;
  trackId: string | null;
  title: string;
  artist: string;
  albumArt: string;
  duration: number;
  progressMs: number;
  lastUpdated: number; // Timestamp for interpolation
  provider: 'spotify' | 'apple' | 'none';

  // Lyrics State
  lyrics: LyricsLine[];
  isLoadingLyrics: boolean;

  // Settings
  showTranslation: boolean;
  targetLanguage: string; // Translation Target Language
  uiLanguage: string; // UI Interface Language
  countryCode: string; // User's country code (e.g., KR, US)
  clientIp: string; // User's IP address

  // Navigation State
  isInitialized: boolean;

  // Actions
  setPlayback: (state: Partial<PlayerState>) => void;
  setLyrics: (lyrics: LyricsLine[]) => void;
  setLoadingLyrics: (loading: boolean) => void;
  updateProgress: (ms: number) => void;
  toggleTranslation: () => void;
  setTargetLanguage: (lang: string) => void;
  setUiLanguage: (lang: string) => void;
  setCountryCode: (code: string) => void;
  setClientIp: (ip: string) => void;
  setInitialized: (val: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  trackId: null,
  title: "",
  artist: "",
  albumArt: "",
  duration: 0,
  progressMs: 0,
  lastUpdated: Date.now(),
  provider: 'none',

  lyrics: [],
  isLoadingLyrics: false,

  showTranslation: true,
  targetLanguage: getBrowserLanguage(),
  uiLanguage: getBrowserLanguage(), // Initialize same as browser
  countryCode: "Unknown",
  clientIp: "Unknown",

  isInitialized: false,

  setPlayback: (state) => set((prev) => ({ ...prev, ...state, lastUpdated: Date.now() })),
  setLyrics: (lyrics) => set({ lyrics }),
  setLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }),
  updateProgress: (ms) => set({ progressMs: ms, lastUpdated: Date.now() }),
  toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setUiLanguage: (lang) => set({ uiLanguage: lang }),
  setCountryCode: (code) => set({ countryCode: code }),
  setClientIp: (ip) => set({ clientIp: ip }),
  setInitialized: (val) => set({ isInitialized: val }),
}));
