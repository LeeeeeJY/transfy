import { create } from "zustand";

export interface LyricsLine {
  id: string;
  time: number; // milliseconds
  text: string;
  translation?: string;
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

  // Lyrics State
  lyrics: LyricsLine[];
  isLoadingLyrics: boolean;
  
  // Settings
  showTranslation: boolean;
  targetLanguage: string;
  
  // Actions
  setPlayback: (state: Partial<PlayerState>) => void;
  setLyrics: (lyrics: LyricsLine[]) => void;
  setLoadingLyrics: (loading: boolean) => void;
  updateProgress: (ms: number) => void;
  toggleTranslation: () => void;
  setTargetLanguage: (lang: string) => void;
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
  
  lyrics: [],
  isLoadingLyrics: false,
  
  showTranslation: true,
  targetLanguage: "ko", // Default to Korean
  
  setPlayback: (state) => set((prev) => ({ ...prev, ...state, lastUpdated: Date.now() })),
  setLyrics: (lyrics) => set({ lyrics }),
  setLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }),
  updateProgress: (ms) => set({ progressMs: ms, lastUpdated: Date.now() }),
  toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
}));
