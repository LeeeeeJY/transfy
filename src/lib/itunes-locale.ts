import axios from "axios";
import { unstable_cache } from "next/cache";
import { pickBestMatch } from "@/lib/track-match";
import { normalizeForMatch, type TrackSource } from "@/lib/utils";

/**
 * 곡을 발매된 지역의 표기로 보여 주기 위한 조회입니다.
 *
 * 스포티파이와 아이튠즈 미국 스토어는 국내 발매곡도 로마자 표기로 돌려줍니다
 * ("IU", "BTS"). 아이튠즈의 lookup을 한국 스토어프론트로 호출하면 발매 당시의
 * 한국어 표기("아이유", "방탄소년단", "라일락")를 얻을 수 있습니다.
 *
 * 여기서 얻은 이름은 화면에 보여 주는 용도로만 씁니다. LRCLIB 가사 조회와
 * 재생 중인 곡 판정은 원래 표기를 그대로 써야 하므로 바꾸지 않습니다.
 */

/** 표시 언어별로 이름을 가져올 아이튠즈 스토어프론트 */
const STOREFRONT_BY_LANG: Record<string, { country: string; lang: string }> = {
  ko: { country: "KR", lang: "ko_kr" },
  ja: { country: "JP", lang: "ja_jp" },
  zh: { country: "TW", lang: "zh_tw" },
};

/** 미국 스토어는 기본 표기와 같으므로 조회할 필요가 없습니다. */
export function hasLocalizedStorefront(lang: string): boolean {
  return Boolean(STOREFRONT_BY_LANG[lang]);
}

const ITUNES_TIMEOUT_MS = 5000;
/** 발매 표기는 거의 바뀌지 않으므로 넉넉히 보관합니다. */
const NAMES_TTL_SECONDS = 60 * 60 * 24 * 30;
/** 한 번에 조회할 아이튠즈 후보 수 */
const CANDIDATE_LIMIT = 25;

export interface LocalizedNames {
  title: string;
  artist: string;
}

/** 표시용 이름을 붙일 수 있는 최소 정보 */
export interface LocalizableTrack {
  id: string;
  title: string;
  artist: string;
}

interface ItunesSongPayload {
  trackId?: number;
  trackName?: string;
  artistName?: string;
}

interface CandidatePool {
  /** 미국 스토어 표기의 후보들. 어느 곡인지 판정하는 데 씁니다. */
  candidates: { id: string; title: string; artist: string }[];
  /** 아이튠즈 트랙 ID별 현지 표기 */
  names: Record<string, LocalizedNames>;
}

/** 한글, 가나, 한자가 들어 있는지 봅니다. */
const NON_LATIN_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

/**
 * 찾아낸 이름으로 바꿀지 결정합니다.
 *
 * 현지 문자로 적힌 이름일 때만 바꿉니다. 로마자 표기가 돌아왔다면 지금 보여
 * 주는 이름과 같거나, 같은 곡의 다른 발매본 표기입니다. 후자를 그대로 쓰면
 * "Intentions"가 "Intentions (feat. Quavo)"로 바뀌는 식으로 곡 이름이
 * 사용자가 알고 있는 것과 달라집니다.
 */
function preferLocalized(original: string, found: string): string {
  if (!found || found === original) return original;
  return NON_LATIN_PATTERN.test(found) ? found : original;
}

/** 실제로 바뀌는 이름이 있을 때만 결과를 돌려줍니다. */
function refineNames(
  original: { title: string; artist: string },
  found: LocalizedNames
): LocalizedNames | null {
  const title = preferLocalized(original.title, found.title);
  const artist = preferLocalized(original.artist, found.artist);
  if (title === original.title && artist === original.artist) return null;
  return { title, artist };
}

function toNames(item: ItunesSongPayload): LocalizedNames | null {
  if (!item?.trackId || !item.trackName || !item.artistName) return null;
  return { title: item.trackName, artist: item.artistName };
}

/** 트랙 ID 여러 개의 현지 표기를 한 번의 호출로 가져옵니다. */
async function fetchNamesByIds(
  ids: string[],
  country: string,
  storefrontLang: string
): Promise<Record<string, LocalizedNames>> {
  if (ids.length === 0) return {};

  const response = await axios.get("https://itunes.apple.com/lookup", {
    params: { id: ids.join(","), country, lang: storefrontLang, entity: "song" },
    timeout: ITUNES_TIMEOUT_MS,
  });

  const names: Record<string, LocalizedNames> = {};
  for (const item of (response.data?.results ?? []) as ItunesSongPayload[]) {
    const parsed = toNames(item);
    if (parsed) names[String(item.trackId)] = parsed;
  }
  return names;
}

/**
 * 미국 스토어에서 후보를 찾고, 그 후보들의 현지 표기를 함께 가져옵니다.
 *
 * 한국 스토어프론트는 검색이 항상 0건이라 검색은 미국 스토어로 해야 하고,
 * 이름만 한국 스토어프론트에서 다시 조회합니다.
 */
async function fetchCandidatePool(
  term: string,
  country: string,
  storefrontLang: string
): Promise<CandidatePool> {
  const response = await axios.get("https://itunes.apple.com/search", {
    params: {
      term,
      media: "music",
      entity: "song",
      limit: CANDIDATE_LIMIT,
      country: "US",
    },
    timeout: ITUNES_TIMEOUT_MS,
  });

  const candidates = ((response.data?.results ?? []) as ItunesSongPayload[])
    .filter((item) => item?.trackId && item.trackName && item.artistName)
    .map((item) => ({
      id: String(item.trackId),
      title: item.trackName as string,
      artist: item.artistName as string,
    }));

  if (candidates.length === 0) return { candidates: [], names: {} };

  const names = await fetchNamesByIds(
    candidates.map((c) => c.id),
    country,
    storefrontLang
  );
  return { candidates, names };
}

const getCachedNamesByIds = unstable_cache(fetchNamesByIds, ["itunes-names-by-id-v1"], {
  revalidate: NAMES_TTL_SECONDS,
});

const getCachedCandidatePool = unstable_cache(
  fetchCandidatePool,
  ["itunes-candidate-pool-v1"],
  { revalidate: NAMES_TTL_SECONDS }
);

/** 캐시 키가 흔들리지 않도록 중복을 없애고 순서를 맞춥니다. */
function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean))).sort();
}

/**
 * 후보 목록에서 이 곡과 확실히 같은 곡을 골라 현지 표기를 돌려줍니다.
 *
 * 제목의 앞부분만 겹치는 후보를 채택하면 다른 곡의 이름이 붙으므로,
 * 곡을 고를 때 쓰는 pickBestMatch를 그대로 사용합니다.
 */
function pickNames(
  pool: CandidatePool,
  track: { title: string; artist: string }
): LocalizedNames | null {
  const best = pickBestMatch(pool.candidates, track.artist, track.title);
  if (!best) return null;

  const found = pool.names[best.id];
  if (!found) return null;

  // 제목이 완전히 같을 때만 제목까지 바꿉니다. 부가 표기만 다른 후보가 잡혔다면
  // 아티스트 이름만 가져오고 제목은 지금 보여 주는 것을 그대로 둡니다.
  const sameTitle = normalizeForMatch(best.title) === normalizeForMatch(track.title);

  return refineNames(track, {
    title: sameTitle ? found.title : track.title,
    artist: found.artist,
  });
}

/**
 * 곡 하나의 현지 표기를 가져옵니다. 확실하지 않으면 null을 돌려주므로,
 * 호출부는 원래 이름을 그대로 쓰면 됩니다.
 *
 * @param itunesId 아이튠즈에서 가져온 곡이라면 그 트랙 ID. 있으면 검색을 건너뜁니다.
 */
export async function localizeTrackNames(
  title: string,
  artist: string,
  lang: string,
  itunesId: string = ""
): Promise<LocalizedNames | null> {
  const storefront = STOREFRONT_BY_LANG[lang];
  if (!storefront || !title || !artist) return null;

  try {
    if (itunesId) {
      const names = await getCachedNamesByIds(
        [itunesId],
        storefront.country,
        storefront.lang
      );
      const found = names[itunesId];
      // ID로 찾은 곡은 같은 곡이 확실하므로 제목까지 그대로 씁니다.
      return found ? refineNames({ title, artist }, found) : null;
    }

    const pool = await getCachedCandidatePool(
      `${artist} ${title}`,
      storefront.country,
      storefront.lang
    );
    return pickNames(pool, { title, artist });
  } catch (error) {
    // 이름 조회는 부가 기능이므로, 실패하면 원래 표기로 계속 동작해야 합니다.
    console.warn(
      "iTunes localized name lookup failed:",
      (error as Error)?.message || error
    );
    return null;
  }
}

/**
 * 아티스트 이름 하나의 현지 표기를 가져옵니다.
 *
 * 아이튠즈의 아티스트 조회(entity=musicArtist)는 한국 스토어프론트에서도 "IU"처럼
 * 로마자 표기를 그대로 돌려줍니다. 한국어 표기는 곡 정보에만 붙어 있으므로,
 * 그 아티스트의 곡을 찾아 거기에 적힌 아티스트 이름을 가져옵니다.
 */
export async function localizeArtistName(
  artist: string,
  lang: string
): Promise<string | null> {
  const storefront = STOREFRONT_BY_LANG[lang];
  if (!storefront || !artist) return null;

  try {
    const pool = await getCachedCandidatePool(
      artist,
      storefront.country,
      storefront.lang
    );

    const wanted = normalizeForMatch(artist);
    for (const candidate of pool.candidates) {
      // 참여 아티스트가 함께 적힌 곡("BTS & Megan Thee Stallion")은 건너뛰고,
      // 이 아티스트 혼자 부른 곡에서만 이름을 가져옵니다.
      if (normalizeForMatch(candidate.artist) !== wanted) continue;

      const found = pool.names[candidate.id];
      if (!found) continue;

      const localized = preferLocalized(artist, found.artist);
      if (localized !== artist) return localized;
    }

    return null;
  } catch (error) {
    console.warn(
      "iTunes localized artist lookup failed:",
      (error as Error)?.message || error
    );
    return null;
  }
}

/**
 * 목록에 들어 있는 아티스트들의 현지 표기를 가져옵니다.
 * 돌려주는 객체의 키는 입력한 아티스트의 id입니다.
 */
export async function localizeArtistList(
  artists: { id: string; name: string }[],
  lang: string,
  { maxLookups = 6 }: { maxLookups?: number } = {}
): Promise<Record<string, string>> {
  if (!STOREFRONT_BY_LANG[lang] || artists.length === 0) return {};

  const found = await Promise.all(
    artists.slice(0, maxLookups).map(async (artist) => {
      const localized = await localizeArtistName(artist.name, lang);
      return localized ? ([artist.id, localized] as const) : null;
    })
  );

  const result: Record<string, string> = {};
  for (const entry of found) {
    if (entry) result[entry[0]] = entry[1];
  }
  return result;
}

/**
 * 목록에 들어 있는 곡들의 현지 표기를 한꺼번에 가져옵니다.
 * 돌려주는 객체의 키는 입력한 곡의 id입니다.
 *
 * @param source 목록의 출처. 아이튠즈에서 온 목록은 트랙 ID를 알고 있으므로
 *   한 번의 호출로 끝납니다.
 * @param term 사용자가 입력한 검색어. 스포티파이 목록이라도 이 검색어로
 *   아이튠즈를 한 번만 조회해 후보를 모을 수 있습니다.
 * @param maxLookups 검색어가 없어 곡마다 따로 찾아야 할 때의 조회 상한입니다.
 *   화면에 실제로 보이는 개수만 조회해 호출 수를 아낍니다.
 */
export async function localizeTrackList(
  tracks: LocalizableTrack[],
  lang: string,
  {
    source,
    term = "",
    maxLookups = 6,
  }: { source: TrackSource; term?: string; maxLookups?: number }
): Promise<Record<string, LocalizedNames>> {
  const storefront = STOREFRONT_BY_LANG[lang];
  if (!storefront || tracks.length === 0) return {};

  try {
    const result: Record<string, LocalizedNames> = {};

    if (source === "itunes") {
      const ids = normalizeIds(tracks.map((t) => t.id));
      const names = await getCachedNamesByIds(ids, storefront.country, storefront.lang);
      for (const track of tracks) {
        const found = names[track.id];
        const refined = found ? refineNames(track, found) : null;
        if (refined) result[track.id] = refined;
      }
      return result;
    }

    // 검색어가 없는 목록(최근 재생, 자주 들은 곡)은 곡마다 따로 찾아야 하므로
    // 화면에 보이는 앞쪽 몇 곡만 조회합니다.
    if (!term) {
      const found = await Promise.all(
        tracks.slice(0, maxLookups).map(async (track) => {
          const names = await localizeTrackNames(track.title, track.artist, lang);
          return names ? ([track.id, names] as const) : null;
        })
      );
      for (const entry of found) {
        if (entry) result[entry[0]] = entry[1];
      }
      return result;
    }

    const pool = await getCachedCandidatePool(
      term,
      storefront.country,
      storefront.lang
    );

    for (const track of tracks) {
      const names = pickNames(pool, track);
      if (names) result[track.id] = names;
    }
    return result;
  } catch (error) {
    console.warn(
      "iTunes localized name list lookup failed:",
      (error as Error)?.message || error
    );
    return {};
  }
}
