import { Metadata } from "next";
import { cache } from "react";
import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders, getClientIp } from "@/lib/server-utils";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { decodeTrackUrlParam, cleanTitle } from "@/lib/utils";
import { searchTracksAction } from "@/app/actions/search";

type Props = {
  params: Promise<{ artist: string; title: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Unified Track Info Interface
interface TrackInfo {
  title: string;
  artist: string;
  albumArt: string;
  lyrics: string | null;
  syncedLyrics?: string | null; // LRC format
}

const getTrackInfo = cache(async (artistSlug: string, titleSlug: string): Promise<TrackInfo | null> => {
  const artist = decodeTrackUrlParam(artistSlug);
  const title = decodeTrackUrlParam(titleSlug);
  const lang = await getLanguageFromHeaders(); // Get user language preference

  // 1. Check Dummy Data first (Fastest)
  const dummySong = POPULAR_SONGS.find(s =>
    s.artist.toLowerCase() === artist.toLowerCase() &&
    s.title.toLowerCase() === title.toLowerCase()
  );

  if (dummySong) {
    return {
      title: dummySong.title,
      artist: dummySong.artist,
      albumArt: dummySong.albumArt,
      lyrics: dummySong.lyrics,
      syncedLyrics: null // Dummy data doesn't have LRC yet, assume plain text
    };
  }

  // 2. Fetch Real Data (Parallel)
  try {
    // Use Server Action for search (handles both Spotify and iTunes fallback)
    // 1. Try Exact Search
    let searchResultTracks = await searchTracksAction(`${artist} ${title}`, lang);

    // 2. If no results, try Cleaned Title Search (Remove Feat, etc.)
    if (searchResultTracks.length === 0) {
      const cleanedTitle = cleanTitle(title);
      if (cleanedTitle !== title) {
        console.log(`Retrying search with cleaned title: ${artist} ${cleanedTitle}`);
        searchResultTracks = await searchTracksAction(`${artist} ${cleanedTitle}`, lang);
      }
    }

    // 3. If still no results, try just Title (Artist might be different format)
    if (searchResultTracks.length === 0) {
       console.log(`Retrying search with just title: ${title}`);
       // Search by title only, then filter by artist locally
       const titleOnlyResults = await searchTracksAction(title, lang);
       searchResultTracks = titleOnlyResults.filter(t => 
         t.artist.toLowerCase().includes(artist.toLowerCase()) || 
         artist.toLowerCase().includes(t.artist.toLowerCase())
       );
    }

    // 가사는 서버에서 LRCLIB 호출하지 않음 (타임아웃/불안정 시 페이지 16초+ 대기 방지). 클라이언트에서만 요청.
    const itunesTracks = searchResultTracks;

    // Find best match from iTunes
    // Filter candidates first
    const candidates = itunesTracks.filter(t => {
      const tArtist = t.artist.toLowerCase();
      const tTitle = t.title.toLowerCase();
      const searchArtist = artist.toLowerCase();
      const searchTitle = title.toLowerCase();
      const cleanedSearchTitle = cleanTitle(title).toLowerCase();

      // Check Artist Match
      const artistMatch = tArtist.includes(searchArtist) || searchArtist.includes(tArtist);

      // Check Title Match (Original OR Cleaned)
      const titleMatch = tTitle.includes(searchTitle) || searchTitle.includes(tTitle) || 
                         tTitle.includes(cleanedSearchTitle) || cleanedSearchTitle.includes(tTitle);

      return artistMatch && titleMatch;
    });

    // Sort candidates to find the best match
    // Priority:
    // 1. Exact Title Match
    // 2. Shortest Title Length (prefer original over remixes)
    candidates.sort((a, b) => {
      const searchTitle = title.toLowerCase();
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      const aExact = aTitle === searchTitle;
      const bExact = bTitle === searchTitle;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return aTitle.length - bTitle.length;
    });

    const trackMetadata = candidates[0];

    if (!trackMetadata) {
      return null;
    }

    return {
      title: trackMetadata.title || title,
      artist: trackMetadata.artist || artist,
      albumArt: trackMetadata.albumArt || "/file.svg",
      lyrics: "Lyrics not found.", // 클라이언트(useLyricsFetcher)에서 LRCLIB 호출
      syncedLyrics: null
    };
  } catch (e) {
    console.error("Error fetching track info:", e);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, title } = await params;
  const decodedArtist = decodeTrackUrlParam(artist);
  const decodedTitle = decodeTrackUrlParam(title);

  // Fetch real info for better metadata
  const trackInfo = await getTrackInfo(artist, title);
  const displayTitle = trackInfo?.title || decodedTitle;
  const displayArtist = trackInfo?.artist || decodedArtist;

  const pageTitle = `${displayTitle} - ${displayArtist}`; // Removed " | Transfy" here because layout template adds it
  const description = trackInfo?.lyrics
    ? `Lyrics and translation for ${displayTitle} by ${displayArtist}. ${trackInfo.lyrics.substring(0, 100)}...`
    : `Real-time synced lyrics and translation for ${displayTitle} by ${displayArtist}.`;

  return {
    title: pageTitle,
    description,
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

export default async function TrackPage({ params }: Props) {
  const { artist, title } = await params;

  const trackInfo = await getTrackInfo(artist, title);
  const decodedArtist = decodeTrackUrlParam(artist);
  const decodedTitle = decodeTrackUrlParam(title);

  // Common props
  const initialLang = await getLanguageFromHeaders();
  const initialCountry = await getCountryFromHeaders();
  const initialIp = await getClientIp();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": trackInfo?.title || decodedTitle,
    "byArtist": {
      "@type": "MusicGroup",
      "name": trackInfo?.artist || decodedArtist,
    },
    "url": `https://transfy-wine.vercel.app/track/${artist}/${title}`,
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
        <h1>{trackInfo?.title || decodedTitle} Lyrics - {trackInfo?.artist || decodedArtist}</h1>
        <p>Translated lyrics for {trackInfo?.title || decodedTitle} by {trackInfo?.artist || decodedArtist}</p>
        {trackInfo?.lyrics && <pre>{trackInfo.lyrics}</pre>}
      </div>

      <ClientHome
        initialLang={initialLang}
        initialCountry={initialCountry}
        initialIp={initialIp}
        isLyricPageInitial={true}
        // Pass the fetched track info to ClientHome
        initialTrack={{
          // Generate ID based on URL parameters to ensure it matches client-side URL parsing
          // This prevents "ID Mismatch" errors when API returns different artist name (e.g. BTS vs 방탄소년단)
          id: `static-${decodedArtist}-${decodedTitle}`.replace(/\s+/g, '-').toLowerCase(),
          title: trackInfo?.title || decodedTitle,
          artist: trackInfo?.artist || decodedArtist,
          albumArt: trackInfo?.albumArt || "",
          lyrics: trackInfo?.lyrics || "",
          syncedLyrics: trackInfo?.syncedLyrics || null
        }}
      />
    </>
  );
}
