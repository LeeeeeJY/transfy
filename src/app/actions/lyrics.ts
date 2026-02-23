"use server";

import { getSyncedLyrics } from "@/lib/lrclib";

/**
 * 서버에서 LRCLIB API를 호출합니다.
 * 클라이언트에서 직접 lrclib.net을 호출하면 CORS/Network Error가 발생하므로
 * 반드시 이 서버 액션을 사용하세요.
 */
export async function getSyncedLyricsAction(
  trackName: string,
  artistName: string,
  albumName: string = "",
  duration: number = 0
): Promise<string | null> {
  try {
    return await getSyncedLyrics(trackName, artistName, albumName, duration);
  } catch (error) {
    console.error("getSyncedLyricsAction:", error);
    return null;
  }
}
