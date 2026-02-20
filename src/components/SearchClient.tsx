"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, TrendingUp, PlayCircle, FileText } from 'lucide-react';
import { searchTracksAction, getTopChartsAction, Track } from '@/app/actions/search';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSession } from 'next-auth/react';
import { play } from '@/lib/spotify';

interface SearchClientProps {
  initialLang: string;
}

const SEARCH_UI_TEXT = {
  ko: {
    placeholder: "노래 제목, 아티스트 검색...",
    searchButton: "검색",
    recentlyPlayed: "최근 재생한 곡",
    topCharts: "지금 뜨는 인기곡 (Top 100)",
    topChartsSpotify: "내 취향 저격 (Top Tracks)",
    noResults: "검색 결과가 없습니다.",
  },
  en: {
    placeholder: "Search for songs, artists...",
    searchButton: "Search",
    recentlyPlayed: "Recently Played Songs",
    topCharts: "Top Charts (Top 100)",
    topChartsSpotify: "Your Top Tracks",
    noResults: "No results found.",
  },
  ja: {
    placeholder: "曲名、アーティストを検索...",
    searchButton: "検索",
    recentlyPlayed: "最近再生した曲",
    topCharts: "今の人気曲 (Top 100)",
    topChartsSpotify: "あなたのトップトラック",
    noResults: "検索結果がありません。",
  },
  zh: {
    placeholder: "搜索歌曲、艺术家...",
    searchButton: "搜索",
    recentlyPlayed: "最近播放的歌曲",
    topCharts: "热门歌曲 (Top 100)",
    topChartsSpotify: "您的热门歌曲",
    noResults: "未找到结果。",
  }
} as const;

export default function SearchClient({ initialLang }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { data: session } = useSession();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Track[]>([]);
  const [topCharts, setTopCharts] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const { setTrack, setIsPlaying } = usePlayerStore();

  // Get UI text based on language
  const t = SEARCH_UI_TEXT[initialLang as keyof typeof SEARCH_UI_TEXT] || SEARCH_UI_TEXT.en;

  // Fetch Top Charts on mount
  useEffect(() => {
    const fetchTopCharts = async () => {
      setLoadingCharts(true);
      try {
        const data = await getTopChartsAction(initialLang);
        setTopCharts(data);
      } catch (err) {
        console.error("Failed to fetch top charts", err);
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchTopCharts();
  }, [initialLang]);

  // Search function
  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      router.push('/search');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      router.push(`/search?q=${encodeURIComponent(term)}`);
    } catch (err) {
      console.error(err);
      setError('Failed to update URL.');
    }
  }, [router]);

  // Handle URL Query Changes
  useEffect(() => {
    if (!initialQuery) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const data = await searchTracksAction(initialQuery, initialLang);
        setResults(data);
      } catch (err) {
        console.error(err);
        setError('Failed to search tracks.');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleSearchClick = () => {
    handleSearch(query);
  };

  const handleTrackClick = async (track: Track) => {
    if (session?.accessToken) {
      // Logged In: Play and Navigate to Track Page (Synced View)
      await play(session.accessToken, track.uri);
      setTrack(track);
      setIsPlaying(true);
      router.push(`/track/${encodeURIComponent(track.artist)}/${encodeURIComponent(track.title)}`);
    } else {
      // Guest: Navigate to Track Page (Static View)
      router.push(`/track/${encodeURIComponent(track.artist)}/${encodeURIComponent(track.title)}`);
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
            placeholder={t.placeholder}
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 rounded-lg pl-12 pr-20 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-zinc-800 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-2">
            <button
              onClick={handleSearchClick}
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 text-green-500 animate-spin" />}
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

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div className="flex flex-col gap-4">
          {results.map((track) => (
            <div
              key={track.id}
              onClick={() => handleTrackClick(track)}
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
                    onClick={() => handleTrackClick(track)}
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
