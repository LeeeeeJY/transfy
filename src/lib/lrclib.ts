import axios from "axios";

const LRCLIB_API_URL = "https://lrclib.net/api";

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

export async function getSyncedLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number
): Promise<string | null> {
  try {
    const params: Record<string, string | number> = {
      track_name: trackName,
      artist_name: artistName,
    };

    if (albumName) params.album_name = albumName;
    if (duration > 0) params.duration = Math.round(duration);

    const response = await axios.get<LrcLibResponse>(`${LRCLIB_API_URL}/get`, {
      params,
    });
    return response.data.syncedLyrics;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // 404 is expected when lyrics are not found, suppress error log
      return null;
    }
    console.error("LRCLIB Error:", error);
    return null;
  }
}

export function parseLrc(lrc: string): { time: number; text: string }[] {
  const lines = lrc.split("\n");
  const result: { time: number; text: string }[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, "0"), 10); // Handle 2 or 3 digit ms
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
      const text = line.replace(timeRegex, "").trim();

      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
