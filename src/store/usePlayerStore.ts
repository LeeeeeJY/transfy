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
  originalLyrics: LyricLine[]; // Store original lyrics to avoid re-fetching
  isPlayerVisible: boolean;
  isLyricsExpanded: boolean;
  showTranslation: boolean;
  
  // Settings & Environment
  uiLanguage: string | null;
  targetLanguage: string;
  isInitialized: boolean;
  isLoadingLyrics: boolean;
  isTranslating: boolean;
  /**
   * 사용자가 검색 결과나 차트에서 직접 선택한 곡의 ID.
   * 이 값이 설정되어 있으면 스포티파이 폴러가 실제로 재생 중인 다른 곡의
   * 정보로 화면을 덮어쓰지 않습니다.
   */
  pinnedTrackId: string | null;
  provider: "spotify" | "apple" | "none"; // For tracking source

  // Flat properties for easier access (to match ClientHome usage)
  title: string;
  artist: string;
  albumArt: string;
  trackId: string | null;
  duration: number; // seconds

  /**
   * 발매 지역 표기에 맞춘 표시용 이름입니다.
   *
   * LRCLIB 가사 조회와 재생 중인 곡 판정은 원래 표기(title, artist)를 그대로
   * 써야 하므로, 화면에 보여 줄 이름만 따로 보관합니다. 아직 조회하지 못했거나
   * 국내 발매곡이 아니면 null이며, 이때는 원래 표기를 그대로 보여 줍니다.
   */
  localizedTitle: string | null;
  localizedArtist: string | null;

  // Actions
  setTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setProgress: (progress: number) => void;
  updateProgress: (progressMs: number) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setOriginalLyrics: (lyrics: LyricLine[]) => void;
  togglePlayerVisibility: (visible?: boolean) => void;
  toggleLyricsExpanded: (expanded?: boolean) => void;
  reset: () => void;
  setShowTranslation: (show: boolean) => void;
  toggleTranslation: () => void;
  
  // New Actions for Settings
  setUiLanguage: (lang: string | null) => void;
  setTargetLanguage: (lang: string) => void;
  setIsInitialized: (initialized: boolean) => void;
  setIsLoadingLyrics: (loading: boolean) => void;
  setLoadingLyrics: (loading: boolean) => void; // Alias
  setIsTranslating: (translating: boolean) => void;
  setPinnedTrackId: (trackId: string | null) => void;
  setProvider: (provider: "spotify" | "apple" | "none") => void;
  setLocalizedNames: (names: { title: string; artist: string } | null) => void;
  
  // Bulk update
  setPlayback: (state: Partial<PlayerState>) => void;
  /** 가사 다시 불러오기 시 트리거 (증가시키면 useLyricsFetcher 재실행) */
  lyricsRetryTrigger: number;
  setLyricsRetryTrigger: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  progressMs: 0,
  lyrics: [],
  originalLyrics: [],
  isPlayerVisible: false,
  isLyricsExpanded: false,
  showTranslation: true,

  // Default values
  uiLanguage: null,
  targetLanguage: 'ko',
  isInitialized: false,
  isLoadingLyrics: false,
  isTranslating: false,
  pinnedTrackId: null,
  provider: 'none',

  // Flat properties defaults
  title: '',
  artist: '',
  albumArt: '',
  trackId: null,
  duration: 0,
  localizedTitle: null,
  localizedArtist: null,
  lyricsRetryTrigger: 0,

  setTrack: (track) => set({ 
    currentTrack: track, 
    isPlayerVisible: true,
    // Sync flat properties
    title: track.title,
    artist: track.artist,
    albumArt: track.albumArt,
    trackId: track.id,
    duration: track.duration,
    // 곡이 바뀌었으므로 앞 곡의 표시용 이름은 버립니다.
    localizedTitle: null,
    localizedArtist: null
  }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress, progressMs: progress * 1000 }),
  updateProgress: (progressMs) => set({ progressMs, progress: progressMs / 1000 }),
  setLyrics: (lyrics) => set({ lyrics }),
  setOriginalLyrics: (lyrics) => set({ originalLyrics: lyrics }),
  togglePlayerVisibility: (visible) => set((state) => ({  
    isPlayerVisible: visible !== undefined ? visible : !state.isPlayerVisible 
  })),
  toggleLyricsExpanded: (expanded) => set((state) => ({ 
    isLyricsExpanded: expanded !== undefined ? expanded : !state.isLyricsExpanded 
  })),
  reset: () => set({ 
    currentTrack: null, 
    isPlaying: false, 
    progress: 0, 
    progressMs: 0,
    lyrics: [],
    originalLyrics: [],
    provider: 'none',
    title: '',
    artist: '',
    albumArt: '',
    trackId: null,
    duration: 0,
    isTranslating: false,
    pinnedTrackId: null,
    localizedTitle: null,
    localizedArtist: null
  }),
  setShowTranslation: (show) => set({ showTranslation: show }),
  toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),

  // New Actions Implementation
  setUiLanguage: (lang) => set({ uiLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
  setIsLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }),
  setLoadingLyrics: (loading) => set({ isLoadingLyrics: loading }), // Alias implementation
  setIsTranslating: (translating) => set({ isTranslating: translating }),
  setPinnedTrackId: (trackId) => set({ pinnedTrackId: trackId }),
  setProvider: (provider) => set({ provider }),
  setLocalizedNames: (names) => set({
    localizedTitle: names?.title ?? null,
    localizedArtist: names?.artist ?? null,
  }),
  setPlayback: (state) => set((prev) => {
    // 곡이 바뀌면 앞 곡의 표시용 이름이 남지 않도록 지웁니다.
    const trackChanged =
      state.trackId !== undefined &&
      state.trackId !== prev.trackId &&
      state.localizedTitle === undefined;

    return {
      ...prev,
      ...state,
      ...(trackChanged ? { localizedTitle: null, localizedArtist: null } : null),
    };
  }),
  setLyricsRetryTrigger: () => set((s) => ({ lyricsRetryTrigger: s.lyricsRetryTrigger + 1 })),
}));
