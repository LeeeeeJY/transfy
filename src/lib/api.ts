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

// LRCLIB API
export const getLyrics = async (artist: string, title: string, duration?: number, album?: string): Promise<LyricsData> => {
  const fetchFromLrcLib = async (params: any) => {
    try {
      const response = await axios.get('https://lrclib.net/api/get', { params });
      return response.data;
    } catch (e) {
      return null;
    }
  };

  const searchFromLrcLib = async (q: string) => {
    try {
      const response = await axios.get('https://lrclib.net/api/search', { params: { q } });
      return response.data[0]; // Best match
    } catch (e) {
      return null;
    }
  };

  // 1. Try Exact Match (Strict)
  let data = await fetchFromLrcLib({
    artist_name: artist,
    track_name: title,
    album_name: album,
    duration: duration ? Math.round(duration) : undefined,
  });

  // 2. Try Search with Duration (High Accuracy)
  if (!data?.plainLyrics && !data?.syncedLyrics) {
    // If duration is provided, filter search results by duration
    if (duration) {
       try {
        const searchRes = await axios.get('https://lrclib.net/api/search', { 
          params: { q: `${artist} ${title}` } 
        });
        // Find a track with similar duration (+- 5 seconds tolerance)
        data = searchRes.data.find((t: any) => Math.abs(t.duration - duration) < 5);
       } catch(e) {}
    }
  }

  // 3. Try Loose Search (Just Artist + Title)
  if (!data?.plainLyrics && !data?.syncedLyrics) {
    data = await searchFromLrcLib(`${artist} ${title}`);
  }

  // 4. Try Cleaned Title Search (Remove Feat, etc.)
  if (!data?.plainLyrics && !data?.syncedLyrics) {
    const cleanedTitle = cleanTitle(title);
    if (cleanedTitle !== title) {
      console.log(`Retrying with cleaned title: ${cleanedTitle}`);
      data = await searchFromLrcLib(`${artist} ${cleanedTitle}`);
    }
  }

  // 5. Try Search by Title Only (Handle cases where Artist name is localized/mismatched)
  if (!data?.plainLyrics && !data?.syncedLyrics) {
    console.log(`Retrying with just title: ${title}`);
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', { 
        params: { q: title } 
      });
      
      if (duration) {
        // Precise match: Title contains original query AND duration matches
        data = searchRes.data.find((t: any) => 
           t.trackName.toLowerCase().includes(title.toLowerCase()) && 
           Math.abs(t.duration - duration) < 5
        );
      } else {
        // Without duration, find exact title match to reduce false positives
        data = searchRes.data.find((t: any) => t.trackName.toLowerCase() === title.toLowerCase());
      }
    } catch(e) {}
  }

  if (data) {
    return {
      syncedLyrics: data.syncedLyrics,
      plainLyrics: data.plainLyrics,
    };
  }
    
  return { syncedLyrics: null, plainLyrics: null };
};
