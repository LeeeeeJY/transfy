import { Metadata } from "next";
import { cache } from "react";
import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders, getClientIp } from "@/lib/server-utils";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { decodeTrackUrlParam } from "@/lib/utils";
import { searchTracksAction } from "@/app/actions/search";
import { getLyrics } from "@/lib/api";

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
    // Use Server Action for iTunes search to avoid CORS issues if this code is shared/moved
    // Though here in Server Component, direct axios is fine, but consistency is good.
    const [itunesTracks, lrcData] = await Promise.all([
      searchTracksAction(`${artist} ${title}`, lang), // Pass language
      getLyrics(artist, title)
    ]);

    // Find best match from iTunes
    const trackMetadata = itunesTracks.find(t =>
      t.artist.toLowerCase().includes(artist.toLowerCase()) ||
      t.title.toLowerCase().includes(title.toLowerCase())
    ) || itunesTracks[0];

    // If initial lyrics fetch failed, try again with iTunes metadata (which might have correct localized title)
    let finalLyrics = lrcData.plainLyrics;
    let finalSyncedLyrics = lrcData.syncedLyrics;

    if (!finalLyrics && trackMetadata) {
      // Retry using iTunes metadata (Artist Name, Track Name, Duration, Album)
      // This is crucial for tracks where user input language differs from lyrics DB language
      console.log(`Retry fetching lyrics with metadata: ${trackMetadata.artist} - ${trackMetadata.title}`);
      const retryLrcData = await getLyrics(
        trackMetadata.artist,
        trackMetadata.title,
        trackMetadata.duration,
        trackMetadata.album
      );
      finalLyrics = retryLrcData.plainLyrics;
      finalSyncedLyrics = retryLrcData.syncedLyrics;
    }

    if (!trackMetadata && !finalLyrics) {
      return null;
    }

    return {
      title: trackMetadata?.title || title,
      artist: trackMetadata?.artist || artist,
      albumArt: trackMetadata?.albumArt || "/file.svg", // Fallback image
      lyrics: finalLyrics || "Lyrics not found.",
      syncedLyrics: finalSyncedLyrics
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
