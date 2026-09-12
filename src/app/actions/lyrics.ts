"use server";

import { unstable_cache } from "next/cache";
import { getSyncedLyrics } from "@/lib/lrclib";

/**
 * 싱크 가사 캐시 수명(7일).
 *
 * 번역 캐시보다 짧게 잡았습니다. LRCLIB는 사용자가 가사를 고쳐 올리는 서비스라서,
 * 오래된 가사를 너무 길게 붙잡고 있으면 수정된 내용이 반영되지 않습니다.
 */
const LYRICS_CACHE_SECONDS = 60 * 60 * 24 * 7;

/** 가사를 찾지 못했음을 알리는 오류 (캐시 계층 오류와 구분하기 위함) */
class LyricsNotFoundError extends Error {
  constructor() {
    super("Synced lyrics not found");
    this.name = "LyricsNotFoundError";
  }
}

/**
 * LRCLIB에서 싱크 가사를 가져옵니다.
 * 가사가 없으면 예외를 던져서, "가사 없음"이 캐시에 남지 않게 합니다.
 * 그렇지 않으면 나중에 가사가 등록되어도 캐시 수명이 끝날 때까지 보이지 않습니다.
 */
async function fetchSyncedLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number
): Promise<string> {
  const lrc = await getSyncedLyrics(trackName, artistName, albumName, duration);
  if (!lrc) throw new LyricsNotFoundError();
  return lrc;
}

/**
 * 가사 원문을 데이터 캐시에 저장합니다.
 * 인수(제목, 아티스트, 앨범, 재생 시간)가 캐시 키가 되므로 같은 곡은 한 번만 조회합니다.
 * LRCLIB가 일시적으로 응답하지 않아도, 캐시에 남아 있으면 가사를 계속 보여 줄 수 있습니다.
 */
const fetchSyncedLyricsCached = unstable_cache(fetchSyncedLyrics, ["lrclib-synced-v1"], {
  revalidate: LYRICS_CACHE_SECONDS,
});

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
  if (!trackName || !artistName) return null;

  // 재생 시간은 초 단위로 반올림해, 같은 곡이 서로 다른 캐시 항목으로 갈리지 않게 합니다.
  const roundedDuration = duration > 0 ? Math.round(duration) : 0;

  try {
    return await fetchSyncedLyricsCached(trackName, artistName, albumName, roundedDuration);
  } catch (error) {
    if (error instanceof LyricsNotFoundError) return null;
    // 캐시 계층 문제일 때만 캐시를 건너뛰고 다시 시도합니다.
    console.error("Lyrics cache unavailable, fetching without cache:", error);
  }

  try {
    return await fetchSyncedLyrics(trackName, artistName, albumName, roundedDuration);
  } catch (error) {
    if (!(error instanceof LyricsNotFoundError)) {
      console.error("getSyncedLyricsAction:", error);
    }
    return null;
  }
}
