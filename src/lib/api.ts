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

// LRCLIB API
export const getLyrics = async (artist: string, title: string, duration?: number): Promise<LyricsData> => {
  try {
    const response = await axios.get('https://lrclib.net/api/get', {
      params: {
        artist_name: artist,
        track_name: title,
        duration: duration ? Math.round(duration) : undefined,
      },
    });

    return {
      syncedLyrics: response.data.syncedLyrics,
      plainLyrics: response.data.plainLyrics,
    };
  } catch (error) {
    // If exact match fails, try search
    try {
      const searchResponse = await axios.get('https://lrclib.net/api/search', {
        params: {
          q: `${artist} ${title}`,
        },
      });
      
      const firstMatch = searchResponse.data[0];
      if (firstMatch) {
        return {
          syncedLyrics: firstMatch.syncedLyrics,
          plainLyrics: firstMatch.plainLyrics,
        };
      }
    } catch (e) {
      console.error('LRCLIB Search Error:', e);
    }
    
    return { syncedLyrics: null, plainLyrics: null };
  }
};
