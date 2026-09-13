"use server";

import { localizeTrackNames, type LocalizedNames } from "@/lib/itunes-locale";

/**
 * 지금 보고 있는 곡을 발매 지역 표기로 보여 주기 위해 이름을 조회합니다.
 *
 * 확실한 결과가 없으면 null을 돌려주므로, 호출부는 원래 표기를 그대로 쓰면 됩니다.
 */
export async function getLocalizedTrackNamesAction(
  title: string,
  artist: string,
  lang: string,
  itunesId: string = ""
): Promise<LocalizedNames | null> {
  return localizeTrackNames(title, artist, lang, itunesId);
}
