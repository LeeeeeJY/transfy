import axios from 'axios';

export interface LrcLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
}

export async function fetchLyrics(trackName: string, artistName: string, albumName: string, duration: number) {
  try {
    const response = await axios.get<LrcLibResponse[]>('https://lrclib.net/api/search', {
      params: {
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName,
      },
    });

    // Find the best match based on duration (within 5 seconds)
    const bestMatch = response.data.find((track) => Math.abs(track.duration - duration) < 5);

    if (bestMatch && bestMatch.syncedLyrics) {
      return parseSyncedLyrics(bestMatch.syncedLyrics);
    }
    
    return [];
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return [];
  }
}

function parseSyncedLyrics(lrc: string) {
  const lines = lrc.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = (minutes * 60 + seconds) * 1000 + milliseconds;
      const text = line.replace(timeRegex, '').trim();
      
      if (text) {
        result.push({ time, text });
      }
    }
  }
  
  return result;
}
