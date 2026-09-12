"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Loader2,
  TrendingUp,
  PlayCircle,
  FileText,
  X,
} from "lucide-react";
import {
  searchTracksAction,
  getTopChartsAction,
  Track,
} from "@/app/actions/search";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useSession } from "next-auth/react";
import { play } from "@/lib/spotify";
import { encodeTrackUrl, type TrackSource } from "@/lib/utils";
import { trackLyricsOpen, trackSearch } from "@/lib/analytics";

interface SearchClientProps {
  initialLang: string;
}

const INITIAL_VISIBLE = 10;

const SEARCH_UI_TEXT = {
  ko: {
    placeholder: "노래 제목, 아티스트 검색...",
    searchButton: "검색",
    recentlyPlayed: "최근 재생한 곡",
    topCharts: "지금 뜨는 인기곡 (Top 100)",
    topChartsSpotify: "최근 많이 들은 곡",
    noResults: "검색 결과가 없습니다.",
    showMore: "더보기",
    playNoDevice: "재생할 기기가 없습니다. Spotify 앱에서 재생하거나, Premium이면 이 탭을 새로고침 후 다시 시도해 주세요.",
  },
  en: {
    placeholder: "Search for songs, artists...",
    searchButton: "Search",
    recentlyPlayed: "Recently Played Songs",
    topCharts: "Top Charts (Top 100)",
    topChartsSpotify: "Current Top Tracks",
    noResults: "No results found.",
    showMore: "Show more",
    playNoDevice: "No active device. Play from the Spotify app, or refresh this tab if you have Premium.",
  },
  ja: {
    placeholder: "曲名、アーティストを検索...",
    searchButton: "検索",
    recentlyPlayed: "最近再生した曲",
    topCharts: "今の人気曲 (Top 100)",
    topChartsSpotify: "最近よく聴く曲",
    noResults: "検索結果がありません。",
    showMore: "もっと見る",
    playNoDevice: "再生できるデバイスがありません。Spotifyアプリで再生するか、Premiumの場合はこのタブを再読み込みしてください。",
  },
  zh: {
    placeholder: "搜索歌曲、艺术家...",
    searchButton: "搜索",
    recentlyPlayed: "最近播放的歌曲",
    topCharts: "热门歌曲 (Top 100)",
    topChartsSpotify: "最近常听的歌曲",
    noResults: "未找到结果。",
    showMore: "查看更多",
    playNoDevice: "没有可用的播放设备。请在 Spotify 应用中播放，或如为 Premium 用户请刷新本页面后重试。",
  },
} as const;

export default function SearchClient({ initialLang }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { data: session } = useSession();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Track[]>([]);
  const [topCharts, setTopCharts] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingMoreResults, setLoadingMoreResults] = useState(false);
  const [loadingMoreCharts, setLoadingMoreCharts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Pagination State
  const [resultsOffset, setResultsOffset] = useState(0);
  const [chartsOffset, setChartsOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [hasMoreCharts, setHasMoreCharts] = useState(true);

  const { setTrack, setIsPlaying, deviceId } = usePlayerStore();

  // Get UI text based on language
  const t =
    SEARCH_UI_TEXT[initialLang as keyof typeof SEARCH_UI_TEXT] ||
    SEARCH_UI_TEXT.en;

  // Fetch Top Charts on mount
  useEffect(() => {
    const fetchTopCharts = async () => {
      setLoadingCharts(true);
      try {
        // Initial fetch: limit 10, offset 0
        const data = await getTopChartsAction(initialLang, 10, 0);
        setTopCharts(data);
        setChartsOffset(10);
        setHasMoreCharts(data.length === 10);
      } catch (err) {
        console.error("Failed to fetch top charts", err);
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchTopCharts();
  }, [initialLang]);

  const loadMoreCharts = async () => {
    if (loadingMoreCharts || !hasMoreCharts) return;
    
    setLoadingMoreCharts(true);
    try {
      const nextData = await getTopChartsAction(initialLang, 10, chartsOffset);
      if (nextData.length === 0) {
        setHasMoreCharts(false);
      } else {
        setTopCharts(prev => [...prev, ...nextData]);
        setChartsOffset(prev => prev + 10);
        if (nextData.length < 10) setHasMoreCharts(false);
      }
    } catch (err) {
      console.error("Failed to load more charts", err);
    } finally {
      setLoadingMoreCharts(false);
    }
  };

  // Search function
  const handleSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setResults([]);
        setHasSearched(false);
        setResultsOffset(0);
        router.push("/search");
        return;
      }

      setLoading(true);
      setError(null);
      setHasSearched(true);
      setResultsOffset(0); // Reset offset on new search

      try {
        router.push(`/search?q=${encodeURIComponent(term)}`);
      } catch (err) {
        console.error(err);
        setError("Failed to update URL.");
      }
    },
    [router],
  );

  // Handle URL Query Changes
  useEffect(() => {
    if (!initialQuery) {
      setResults([]);
      setHasSearched(false);
      setResultsOffset(0);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setResultsOffset(0);

      try {
        // Initial search: limit 10, offset 0
        const data = await searchTracksAction(initialQuery, initialLang, 10, 0);
        setResults(data);
        setResultsOffset(10);
        setHasMoreResults(data.length === 10);
        trackSearch(initialLang, data.length > 0);
      } catch (err) {
        console.error(err);
        setError("Failed to search tracks.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [initialQuery, initialLang]);

  // Sync input with URL query
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const loadMoreResults = async () => {
    if (loadingMoreResults || !hasMoreResults) return;

    setLoadingMoreResults(true);
    try {
      const nextData = await searchTracksAction(initialQuery, initialLang, 10, resultsOffset);
      if (nextData.length === 0) {
        setHasMoreResults(false);
      } else {
        setResults(prev => [...prev, ...nextData]);
        setResultsOffset(prev => prev + 10);
        if (nextData.length < 10) setHasMoreResults(false);
      }
    } catch (err) {
      console.error("Failed to load more results", err);
    } finally {
      setLoadingMoreResults(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(query);
    }
  };

  const handleSearchClick = () => {
    handleSearch(query);
  };

  /** 검색 결과의 트랙이 어느 서비스에서 왔는지 판별합니다. */
  const trackSourceOf = (track: Track): TrackSource =>
    track.uri?.startsWith("spotify:") ? "spotify" : "itunes";

  const handleTrackClick = async (
    track: Track,
    origin: "search" | "charts"
  ) => {
    setPlayError(null);
    // 트랙 ID를 함께 넘겨야 상세 페이지가 제목으로 다시 검색하지 않고
    // 사용자가 누른 바로 그 곡을 불러옵니다.
    const trackPath = encodeTrackUrl(track.artist, track.title, {
      id: track.id,
      source: trackSourceOf(track),
    });
    trackLyricsOpen(origin, initialLang);
    if (session?.accessToken) {
      const playOk = await play(session.accessToken, track.uri, deviceId);
      setTrack(track);
      if (playOk) setIsPlaying(true);
      else {
        setPlayError(t.playNoDevice);
        setTimeout(() => setPlayError(null), 6000);
      }
      // 재생 실패 시 메시지를 잠깐 보여준 뒤 이동
      if (playOk) router.push(trackPath);
      else setTimeout(() => router.push(trackPath), 2200);
    } else {
      router.push(trackPath);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none">
            <Search className="w-5 h-5 text-zinc-400" />
          </div>

          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={t.placeholder}
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 rounded-lg pl-12 pr-20 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-zinc-800 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-2">
            {isSearchFocused && query && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery("");
                  router.push("/search");
                }}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSearchClick}
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              {loading && (
                <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
              )}
              {t.searchButton}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-center text-red-400 text-sm bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}
      {playError && (
        <div className="text-center text-amber-400 text-sm bg-amber-500/10 py-2 rounded-lg border border-amber-500/20">
          {playError}
        </div>
      )}

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div className="flex flex-col gap-4">
          {results.map((track) => (
            <div
              key={track.id}
              onClick={() => handleTrackClick(track, "search")}
              className="flex items-center gap-4 bg-zinc-900/50 hover:bg-zinc-800 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all group text-left w-full cursor-pointer h-24 overflow-hidden"
            >
              {/* Album Art */}
              <div className="relative w-16 h-16 rounded-md overflow-hidden shadow-lg group-hover:shadow-green-500/20 transition-all shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={track.albumArt}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                <h3 className="font-bold text-lg text-white truncate group-hover:text-green-400 transition-colors w-full">
                  {track.title}
                </h3>
                <p className="text-zinc-400 text-sm truncate w-full">
                  {track.artist}
                </p>
                <p className="text-zinc-600 text-xs mt-1 truncate w-full">
                  {track.album}
                </p>
              </div>

              {/* Action Icon */}
              <div className="text-zinc-600 group-hover:text-green-500 transition-colors shrink-0">
                {session ? (
                  <PlayCircle className="w-8 h-8" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>
            </div>
          ))}
          
          {hasMoreResults && (
            <button
              type="button"
              onClick={loadMoreResults}
              disabled={loadingMoreResults}
              className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-sm font-medium flex justify-center items-center gap-2"
            >
              {loadingMoreResults && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.showMore}
            </button>
          )}
        </div>
      )}

      {/* Dashboard (Visible when no search has been performed) */}
      {!hasSearched && !query && (
        <div className="space-y-12">
          {/* Recently Played (Moved to Dashboard) */}

          {/* Top Artists (Only if logged in) - Removed from Search, moved to Dashboard */}

          {/* Top Charts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold">
                {session ? t.topChartsSpotify : t.topCharts}
              </h2>
            </div>

            {loadingCharts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {topCharts.map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track, "charts")}
                    className="flex items-center gap-4 bg-zinc-900/30 hover:bg-zinc-800 p-4 rounded-xl border border-zinc-800/30 hover:border-zinc-700 transition-all group text-left w-full cursor-pointer h-20 overflow-hidden"
                  >
                    {/* Rank */}
                    <div className="w-8 text-center text-lg font-bold text-zinc-500 group-hover:text-green-500 transition-colors italic">
                      {index + 1}
                    </div>

                    {/* Album Art */}
                    <div className="relative w-12 h-12 rounded-md overflow-hidden shadow-md group-hover:shadow-green-500/10 transition-all shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                      <h3 className="font-bold text-base text-white truncate group-hover:text-green-400 transition-colors w-full">
                        {track.title}
                      </h3>
                      <p className="text-zinc-400 text-xs truncate w-full">
                        {track.artist}
                      </p>
                    </div>

                    {/* Action Icon */}
                    <div className="text-zinc-600 group-hover:text-white transition-colors shrink-0">
                      {session ? (
                        <PlayCircle className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                ))}
                
                {hasMoreCharts && (
                  <button
                    type="button"
                    onClick={loadMoreCharts}
                    disabled={loadingMoreCharts}
                    className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-sm font-medium flex justify-center items-center gap-2"
                  >
                    {loadingMoreCharts && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t.showMore}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-12 text-zinc-500">
          <p>{t.noResults}</p>
        </div>
      )}
    </div>
  );
}
