"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { searchTracksAction, getTopChartsAction, Track } from '@/app/actions/search';
import { encodeTrackUrl } from '@/lib/utils';

interface SearchClientProps {
  initialLang: string;
}

export default function SearchClient({ initialLang }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Track[]>([]);
  const [topCharts, setTopCharts] = useState<Track[]>([]); // New state for top charts
  const [loading, setLoading] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(true); // Loading state for charts
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Track if search has been performed

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

  // Search function - Triggered only by manual action
  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      router.push('/search');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true); // Mark search as started

    try {
      // Update URL with search term
      router.push(`/search?q=${encodeURIComponent(term)}`);
    } catch (err) {
      console.error(err);
      setError('Failed to update URL.');
    } finally {
      // The actual fetching is handled by the useEffect on initialQuery
      // We don't set loading here because the useEffect will trigger and set loading
    }
  }, [router]); // Removed initialLang dependency as it's not used directly here anymore

  // Handle URL Query Changes (Fetching & Caching)
  useEffect(() => {
    if (!initialQuery) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const fetchResults = async () => {
      // 1. Try Cache
      try {
        const cached = sessionStorage.getItem('transfy_search_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.term === initialQuery) {
            setResults(parsed.results);
            setHasSearched(true);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      // 2. Fetch from API
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const data = await searchTracksAction(initialQuery, initialLang);
        setResults(data);

        // 3. Save to Cache
        sessionStorage.setItem('transfy_search_cache', JSON.stringify({
          term: initialQuery,
          results: data,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error(err);
        setError('Failed to search tracks. Please try again.');
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
    const value = e.target.value;
    setQuery(value);
    setHasSearched(false); // Reset search state on input change
    // Removed auto-search debounce
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleSearchClick = () => {
    handleSearch(query);
  };

  return (
    <div className="w-full space-y-8">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center">
          {/* Search Icon (Non-clickable) */}
          <div className="absolute left-4 pointer-events-none">
            <Search className="w-5 h-5 text-zinc-400" />
          </div>

          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              initialLang === 'ko' ? "노래 제목, 아티스트 검색..." :
                initialLang === 'ja' ? "曲名、アーティストを検索..." :
                  initialLang === 'zh' ? "搜索歌曲、艺术家..." :
                    "Search for songs, artists..."
            }
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 rounded-lg pl-12 pr-20 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-zinc-800 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-2">
            <button
              onClick={handleSearchClick}
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 text-green-500 animate-spin" />}
              {
                initialLang === 'ko' ? "검색" :
                  initialLang === 'ja' ? "検索" :
                    initialLang === 'zh' ? "搜索" :
                      "Search"
              }
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

      {/* Top Charts (Visible when no search has been performed) */}
      {!hasSearched && !query && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold">
              {initialLang === 'ko' ? "지금 뜨는 인기곡" :
                initialLang === 'ja' ? "今の人気曲" :
                  initialLang === 'zh' ? "热门歌曲" :
                    "Top Charts"}
            </h2>
          </div>

          {loadingCharts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {topCharts.map((track, index) => (
                <Link
                  key={track.id}
                  href={encodeTrackUrl(track.artist, track.title)}
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

                  {/* Arrow Icon */}
                  <div className="text-zinc-600 group-hover:text-white transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-5 h-5">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div className="flex flex-col gap-4"> {/* Changed to flex-col for better list view stability */}
          {results.map((track) => (
            <Link
              key={track.id}
              href={`/track/${encodeURIComponent(track.artist)}/${encodeURIComponent(track.title)}`}
              className="flex items-center gap-4 bg-zinc-900/50 hover:bg-zinc-800 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all group text-left w-full cursor-pointer h-24 overflow-hidden" // Added fixed height and overflow control
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
              <div className="flex-1 min-w-0 flex flex-col justify-center h-full"> {/* Flex column for text alignment */}
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

              {/* Arrow Icon */}
              <div className="text-zinc-600 group-hover:text-white transition-colors shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-5 h-5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-12 text-zinc-500">
          <p>{initialLang === 'ko' ? "검색 결과가 없습니다." : "No results found."}</p>
        </div>
      )}
    </div>
  );
}
