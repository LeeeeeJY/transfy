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

const LRCLIB_TIMEOUT_MS = 8000; // 서버 응답이 느릴 수 있어 8초로 설정
const LRCLIB_RETRY_DELAY_MS = 500;

function isRetryableNetworkError(err: unknown): boolean {
  const code = axios.isAxiosError(err) ? err.code : (err as NodeJS.ErrnoException)?.code;
  const msg = (err as Error)?.message ?? "";
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "ECONNREFUSED" ||
    msg.includes("socket hang up") ||
    msg.includes("socket disconnected")
  );
}

export async function getSyncedLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number
): Promise<string | null> {
  const params: Record<string, string | number> = {
    track_name: trackName,
    artist_name: artistName,
  };
  if (albumName) params.album_name = albumName;
  if (duration > 0) params.duration = Math.round(duration);

  const doRequest = async (): Promise<string | null> => {
    try {
      const response = await axios.get<LrcLibResponse>(`${LRCLIB_API_URL}/get`, {
        params,
        timeout: LRCLIB_TIMEOUT_MS,
      });
      return response.data.syncedLyrics ?? null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      if (isRetryableNetworkError(error)) throw error; // 재시도하도록
      console.warn("LRCLIB:", (error as Error)?.message || error);
      return null;
    }
  };

  try {
    const result = await doRequest();
    if (result !== null) return result;
    return null; // 404 등으로 가사 없음
  } catch (firstErr) {
    if (!isRetryableNetworkError(firstErr)) return null;
    console.warn("LRCLIB connection failed, retrying once...", (firstErr as Error)?.message);
    await new Promise((r) => setTimeout(r, LRCLIB_RETRY_DELAY_MS));
  }

  try {
    return await doRequest();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    console.warn("LRCLIB:", (error as Error)?.message || "connection failed");
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
