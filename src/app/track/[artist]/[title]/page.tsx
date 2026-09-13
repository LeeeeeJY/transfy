import { Metadata } from "next";
import { cache } from "react";
import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders } from "@/lib/server-utils";
import { POPULAR_SONGS } from "@/data/dummySongs";
import {
  decodeTrackUrlParam,
  cleanTitle,
  normalizeForMatch,
  externalTrackKey,
  staticTrackKey,
  encodeTrackUrl,
  type TrackSource,
} from "@/lib/utils";
import { pickBestMatch } from "@/lib/track-match";
import { localizeTrackNames } from "@/lib/itunes-locale";
import { absoluteUrl } from "@/lib/site";
import { searchTracksAction, getTrackByIdAction } from "@/app/actions/search";

type Props = {
  params: Promise<{ artist: string; title: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Unified Track Info Interface
interface TrackInfo {
  /** 스토어에서 사용할 곡 키 */
  id: string;
  title: string;
  artist: string;
  /** 발매 지역 표기에 맞춘 표시용 이름. 가사 조회에는 쓰지 않습니다. */
  localizedTitle: string | null;
  localizedArtist: string | null;
  albumArt: string;
  duration: number; // seconds
  lyrics: string | null;
  syncedLyrics?: string | null; // LRC format
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSource(value: string | undefined): TrackSource | null {
  return value === "spotify" || value === "itunes" ? value : null;
}

const getTrackInfo = cache(
  async (
    artistSlug: string,
    titleSlug: string,
    refId: string,
    refSource: string,
    uiLang: string
  ): Promise<TrackInfo | null> => {
    const artist = decodeTrackUrlParam(artistSlug);
    const title = decodeTrackUrlParam(titleSlug);
    const fallbackId = staticTrackKey(artist, title);

    // 1. Check Dummy Data first (Fastest)
    const dummySong = POPULAR_SONGS.find(
      (s) =>
        normalizeForMatch(s.artist) === normalizeForMatch(artist) &&
        normalizeForMatch(s.title) === normalizeForMatch(title)
    );

    if (dummySong) {
      const localized = await localizeTrackNames(
        dummySong.title,
        dummySong.artist,
        uiLang
      );

      return {
        id: fallbackId,
        title: dummySong.title,
        artist: dummySong.artist,
        localizedTitle: localized?.title ?? null,
        localizedArtist: localized?.artist ?? null,
        albumArt: dummySong.albumArt,
        duration: 0,
        lyrics: dummySong.lyrics,
        syncedLyrics: null, // Dummy data doesn't have LRC yet, assume plain text
      };
    }

    // 2. 검색 결과나 차트에서 넘어온 경우: ID로 그 곡을 정확히 조회합니다.
    const source = parseSource(refSource);
    if (refId && source) {
      const exact = await getTrackByIdAction(refId, source);
      if (exact) {
        // 국내 발매곡은 발매 당시의 한국어 표기를 함께 찾아 둡니다.
        const localized = await localizeTrackNames(
          exact.title,
          exact.artist,
          uiLang,
          source === "itunes" ? exact.id : ""
        );

        return {
          id: externalTrackKey(source, exact.id),
          title: exact.title,
          artist: exact.artist,
          localizedTitle: localized?.title ?? null,
          localizedArtist: localized?.artist ?? null,
          albumArt: exact.albumArt || "/file.svg",
          duration: exact.duration,
          lyrics: null, // 가사는 클라이언트(useLyricsFetcher)에서 LRCLIB로 조회
          syncedLyrics: null,
        };
      }
    }

    // 3. ID가 없는 경우(직접 접속, 검색 엔진 유입, 사이트맵)에만 제목으로 검색합니다.
    try {
      const lang = uiLang;

      // 3-1. 아티스트 + 제목으로 검색
      let searchResultTracks = await searchTracksAction(`${artist} ${title}`, lang);
      let best = pickBestMatch(searchResultTracks, artist, title);

      // 3-2. 부가 표기(feat 등)를 뗀 제목으로 재검색
      if (!best) {
        const cleanedTitle = cleanTitle(title);
        if (cleanedTitle !== title) {
          searchResultTracks = await searchTracksAction(`${artist} ${cleanedTitle}`, lang);
          best = pickBestMatch(searchResultTracks, artist, title);
        }
      }

      // 3-3. 제목만으로 검색 (아티스트 표기가 다른 경우: BTS / 방탄소년단)
      if (!best) {
        searchResultTracks = await searchTracksAction(title, lang);
        best = pickBestMatch(searchResultTracks, artist, title);
      }

      // 확실한 후보가 없으면 URL의 제목·아티스트를 그대로 씁니다.
      // 다른 곡을 보여 주는 것보다, 곡 정보 없이 가사를 찾아보는 편이 낫습니다.
      if (!best) return null;

      return {
        id: fallbackId,
        title: best.title,
        artist: best.artist,
        // searchTracksAction이 목록을 만들면서 발매 표기를 함께 붙여 둡니다.
        localizedTitle: best.displayTitle ?? null,
        localizedArtist: best.displayArtist ?? null,
        albumArt: best.albumArt || "/file.svg",
        duration: best.duration,
        lyrics: null,
        syncedLyrics: null,
      };
    } catch (e) {
      console.error("Error fetching track info:", e);
      return null;
    }
  }
);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { artist, title } = await params;
  const query = await searchParams;
  const decodedArtist = decodeTrackUrlParam(artist);
  const decodedTitle = decodeTrackUrlParam(title);
  const lang = await getLanguageFromHeaders();

  // Fetch real info for better metadata
  const trackInfo = await getTrackInfo(
    artist,
    title,
    firstParam(query.id) ?? "",
    firstParam(query.src) ?? "",
    lang
  );
  const displayTitle =
    trackInfo?.localizedTitle || trackInfo?.title || decodedTitle;
  const displayArtist =
    trackInfo?.localizedArtist || trackInfo?.artist || decodedArtist;

  const pageTitle = `${displayTitle} - ${displayArtist}`; // Removed " | Transfy" here because layout template adds it
  const description = trackInfo?.lyrics
    ? `Lyrics and translation for ${displayTitle} by ${displayArtist}. ${trackInfo.lyrics.substring(0, 100)}...`
    : `Real-time synced lyrics and translation for ${displayTitle} by ${displayArtist}.`;

  return {
    title: pageTitle,
    description,
    // 조회용 쿼리스트링은 색인에서 제외하고 경로만 대표 주소로 씁니다.
    alternates: {
      canonical: encodeTrackUrl(decodedArtist, decodedTitle),
    },
    keywords: [
      `${displayTitle} lyrics`,
      `${displayArtist} lyrics`,
      `${displayTitle} translation`,
      `${displayTitle} 가사`,
      "lyrics translation",
    ],
    openGraph: {
      title: pageTitle,
      description,
      type: "music.song",
      images: trackInfo?.albumArt ? [trackInfo.albumArt] : [],
    },
  };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const { artist, title } = await params;
  const query = await searchParams;

  // Common props
  const initialLang = await getLanguageFromHeaders();

  const trackInfo = await getTrackInfo(
    artist,
    title,
    firstParam(query.id) ?? "",
    firstParam(query.src) ?? "",
    initialLang
  );
  const decodedArtist = decodeTrackUrlParam(artist);
  const decodedTitle = decodeTrackUrlParam(title);

  // 화면과 구조화 데이터에는 발매 지역 표기를 우선 씁니다.
  const pageTitle = trackInfo?.localizedTitle || trackInfo?.title || decodedTitle;
  const pageArtist = trackInfo?.localizedArtist || trackInfo?.artist || decodedArtist;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": pageTitle,
    "byArtist": {
      "@type": "MusicGroup",
      "name": pageArtist,
    },
    "url": absoluteUrl(`/track/${artist}/${title}`),
    ...(trackInfo && {
      "image": trackInfo.albumArt,
      "lyrics": {
        "@type": "CreativeWork",
        "text": trackInfo.lyrics
      }
    })
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Hidden Content for SEO Bots */}
      <div className="sr-only">
        <h1>{pageTitle} Lyrics - {pageArtist}</h1>
        <p>Translated lyrics for {pageTitle} by {pageArtist}</p>
        {trackInfo?.lyrics && <pre>{trackInfo.lyrics}</pre>}
      </div>

      <ClientHome
        initialLang={initialLang}
        isLyricPageInitial={true}
        // Pass the fetched track info to ClientHome
        initialTrack={{
          // ID로 정확히 조회한 곡은 그 ID를, 그러지 못한 곡은 URL에서 만든 키를 씁니다.
          // URL 기준 키를 쓰면 API가 다른 표기(BTS / 방탄소년단)를 돌려줘도 어긋나지 않습니다.
          id: trackInfo?.id || staticTrackKey(decodedArtist, decodedTitle),
          title: trackInfo?.title || decodedTitle,
          artist: trackInfo?.artist || decodedArtist,
          localizedTitle: trackInfo?.localizedTitle ?? null,
          localizedArtist: trackInfo?.localizedArtist ?? null,
          albumArt: trackInfo?.albumArt || "",
          duration: trackInfo?.duration || 0,
          lyrics: trackInfo?.lyrics || "",
          syncedLyrics: trackInfo?.syncedLyrics || null
        }}
      />
    </>
  );
}
