import axios from 'axios';

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // in seconds
}

export interface LyricsData {
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

// iTunes Search API
export const searchTracks = async (term: string): Promise<Track[]> => {
  if (!term) return [];
  
  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term,
        media: 'music',
        entity: 'song',
        limit: 20,
      },
    });

    return response.data.results.map((item: any) => ({
      id: item.trackId,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      albumArt: item.artworkUrl100.replace('100x100', '600x600'), // Get higher resolution
      duration: item.trackTimeMillis / 1000,
    }));
  } catch (error) {
    console.error('iTunes Search Error:', error);
    return [];
  }
};

// Helper to clean title
function cleanTitle(title: string): string {
  // Remove text in brackets like (Feat. X), [Remix], - Remastered
  return title
    .replace(/\s*[\(\[](?:feat|ft|prod|with|remix|mix|ver|edit|deluxe|ost|original|remaster).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(?:remaster|remix|live).*$/gi, '')
    .trim();
}

const LRCLIB_TIMEOUT_MS = 8000; // LRCLIB 응답이 느릴 수 있어 8초로 설정

// LRCLIB API
export const getLyrics = async (artist: string, title: string, duration?: number, album?: string): Promise<LyricsData> => {
  const fetchFromLrcLib = async (params: Record<string, string | number | undefined>) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ) as Record<string, string | number>;
    try {
      const response = await axios.get('https://lrclib.net/api/get', {
        params: cleanParams,
        timeout: LRCLIB_TIMEOUT_MS,
      });
      return response.data;
    } catch {
      return null;
    }
  };

  const searchFromLrcLib = async (q: string) => {
    try {
      const response = await axios.get('https://lrclib.net/api/search', {
        params: { q },
        timeout: LRCLIB_TIMEOUT_MS,
      });
      return response.data?.[0] ?? null;
    } catch {
      return null;
    }
  };

  // 1. 정확 매칭 (한 번만)
  let data = await fetchFromLrcLib({
    artist_name: artist,
    track_name: title,
    album_name: album ?? "",
    duration: duration ? Math.round(duration) : undefined,
  });

  // 2. 검색 1회만 (LRCLIB 불안정 시 페이지 블로킹 최소화)
  if (!data?.plainLyrics && !data?.syncedLyrics) {
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: { q: `${artist} ${title}` },
        timeout: LRCLIB_TIMEOUT_MS,
      });
      const list = searchRes.data ?? [];
      if (duration && list.length) {
        data = list.find((t: { duration?: number }) => Math.abs((t.duration ?? 0) - duration) < 5) ?? list[0];
      } else {
        data = list[0] ?? null;
      }
    } catch {
      /* ignore */
    }
  }

  if (data) {
    return {
      syncedLyrics: data.syncedLyrics,
      plainLyrics: data.plainLyrics,
    };
  }
    
  return { syncedLyrics: null, plainLyrics: null };
};
