import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // seconds
  uri: string;
}

export interface LyricLine {
  id?: string;
  time: number; // milliseconds
  text: string;
  translation?: string;
}

// Alias for backward compatibility
export type LyricsLine = LyricLine; 

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  progressMs: number; // milliseconds
  lyrics: LyricLine[];
  isPlayerVisible: boolean;
  isLyricsExpanded: boolean;
  deviceId: string | null;
  showTranslation: boolean;
  
  // Settings & Environment
  uiLanguage: string | null;
  targetLanguage: string;
  countryCode: string;
  clientIp: string;
  isInitialized: boolean;
  isLoadingLyrics: boolean;
  provider: "spotify" | "apple" | "none"; // For tracking source

  // Flat properties for easier access (to match ClientHome usage)
  title: string;
  artist: string;
  albumArt: string;
  trackId: string | null;
  duration: number; // seconds

  // Actions
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setProgress: (progress: number) => void;
  updateProgress: (progressMs: number) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  togglePlayerVisibility: (visible?: boolean) => void;
  toggleLyricsExpanded: (expanded?: boolean) => void;
  setDeviceId: (id: string) => void;
  reset: () => void;
  setShowTranslation: (show: boolean) => void;
  
  // New Actions for Settings
  setUiLanguage: (lang: string | null) => void;
  setTargetLanguage: (lang: string) => void;
  setEnvironment: (country: string, ip: string) => void;
  setIsInitialized: (initialized: boolean) => void;
  setIsLoadingLyrics: (loading: boolean) => void;
  setLoadingLyrics: (loading: boolean) => void; // Alias
  setProvider: (provider: "spotify" | "apple" | "none") => void;
  
  // Bulk update
  setPlayback: (state: Partial<PlayerState>) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  progressMs: 0,
  lyrics: [],
  isPlayerVisible: false,
  isLyricsExpanded: false,
  deviceId: null,
  showTranslation: true,

  // Default values
  uiLanguage: null,
  targetLanguage: 'ko',
  countryCode: '',
  clientIp: '',
  isInitialized: false,
  isLoadingLyrics: false,
  provider: 'none',

  // Flat properties defaults
  title: '',
  artist: '',
  albumArt: '',
  trackId: null,
  duration: 0,

  setTrack: (track) => set({ 
    currentTrack: track, 
    isPlayerVisible: true,
    // Sync flat properties
    title: track.title,
    artist: track.artist,
    albumArt: track.albumArt,
    trackId: track.id,
    duration: track.duration
  }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress, progressMs: progress * 1000 }),
  updateProgress: (progressMs) => set({ progressMs, progress: progressMs / 1000 }),
  setLyrics: (lyrics) => set({ lyrics }),
  togglePlayerVisibility: (visible) => set((state) => ({ 
    isPlayerVisible: visible !== undefined ? visible : !state.isPlayerVisible 
  })),
  toggleLyricsExpanded: (expanded) => set((state) => ({ 
    isLyricsExpanded: expanded !== undefined ? expanded : !state.isLyricsExpanded 
  })),
  setDeviceId: (id) => set({ deviceId: id }),
  reset: () => set({ 
    currentTrack: null, 
    isPlaying: false, 
    progress: 0, 
    progressMs: 0,
    lyrics: [],
    provider: 'none',
    title: '',
    artist: '',
    albumArt: '',
    trackId: null,
    duration: 0
  }),
  setShowTranslation: (show) => set({ showTranslation: show }),

  // New Actions Implementation
  setUiLanguage: (lang) => set({ uiLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setEnvironment: (country, ip) => set({ countryCode: country, clientIp: ip }),
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
  setIsLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }),
  setLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }), // Alias implementation
  setProvider: (provider) => set({ provider }),
  
  setPlayback: (state) => set((prev) => ({ ...prev, ...state })),
}));
