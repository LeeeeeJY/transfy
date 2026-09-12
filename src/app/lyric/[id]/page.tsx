import { Metadata } from "next";
import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders } from "@/lib/server-utils";
import { POPULAR_SONGS } from "@/data/dummySongs";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getTrackDetails(id: string) {
  // 1. Check Dummy Data first
  const dummySong = POPULAR_SONGS.find(s => s.id === id);
  if (dummySong) {
    return {
      name: dummySong.title,
      artistName: dummySong.artist,
      artwork: { url: dummySong.albumArt.replace("https://", "https://") } // Dummy logic
    };
  }

  // 2. Fallback to Apple Music API (Removed)
  // const token = process.env.NEXT_PUBLIC_APPLE_DEVELOPER_TOKEN;
  // if (!token) return null;

  return null;

  /*
  try {
    const response = await axios.get(
      `https://api.music.apple.com/v1/catalog/us/songs/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data?.data?.[0]?.attributes;
  } catch (error) {
    console.error("Error fetching track details for SEO:", error);
    return null;
  }
  */
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // If accessing base path or invalid ID, return default
  if (!id || id === "home") {
    return {
      title: "Transfy - Real-time Lyrics Translator",
      description:
        "Real-time lyrics translation service for Spotify.",
    };
  }

  const track = await getTrackDetails(id);
  const dummySong = POPULAR_SONGS.find(s => s.id === id);

  if (track) {
    const description = dummySong?.lyrics
      ? `${track.name} by ${track.artistName} - Full lyrics with real-time translation. ${dummySong.lyrics.substring(0, 150)}...`
      : `Complete lyrics and translation for ${track.name} by ${track.artistName}. Real-time synchronized lyrics translation in Korean, English, Japanese, and Chinese.`;

    return {
      title: `${track.name} - ${track.artistName} | Transfy`,
      description,
      keywords: [
        `${track.name} lyrics`,
        `${track.artistName} lyrics`,
        `${track.name} translation`,
        `${track.name} 가사`,
        `${track.artistName} 가사`,
        "lyrics translation",
        "real-time lyrics",
      ],
      openGraph: {
        title: `${track.name} - ${track.artistName} Lyrics Translation`,
        description: `Real-time lyrics translation for ${track.name} by ${track.artistName}`,
        images: [
          {
            url: track.artwork?.url
              ?.replace("{w}", "1200")
              .replace("{h}", "630"),
            width: 1200,
            height: 630,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${track.name} - ${track.artistName} Lyrics`,
        description: `Complete lyrics and translation for ${track.name}`,
      },
    };
  }

  return {
    title: "Song Lyrics | Transfy",
    description: "Real-time lyrics translation for Spotify.",
  };
}

export default async function LyricPage({ params }: Props) {
  const { id } = await params;

  // Reuse ClientHome layout but with initial track ID context if needed.
  // Actually, ClientHome contains the entire layout (Ads, PlayerControls).
  // We should render ClientHome here to keep the layout consistent.
  // But ClientHome expects initialLang, etc. We need to fetch them or pass defaults.

  // Let's pass the props required by ClientHome.
  // In a real app, these come from headers/middleware.
  const initialLang = await getLanguageFromHeaders();
  const isDummyTrack = id.startsWith("dummy-");

  const track = await getTrackDetails(id);
  const dummySong = POPULAR_SONGS.find(s => s.id === id);

  // Generate structured data for SEO
  const structuredData = track ? {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": track.name,
    "byArtist": {
      "@type": "MusicGroup",
      "name": track.artistName,
    },
    "image": track.artwork?.url,
    "description": `Lyrics and translation for ${track.name} by ${track.artistName}`,
    "inLanguage": ["ko", "en", "ja", "zh"],
    "url": `https://transfy-wine.vercel.app/lyric/${id}`,
  } : (dummySong ? {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": dummySong.title,
    "byArtist": {
      "@type": "MusicGroup",
      "name": dummySong.artist,
    },
    "image": dummySong.albumArt,
    "description": `Lyrics and translation for ${dummySong.title} by ${dummySong.artist}`,
    "inLanguage": ["ko", "en", "ja", "zh"],
    "url": `https://transfy-wine.vercel.app/lyric/${id}`,
  } : null);

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
      {/* Server-side rendered content for SEO - ensures content is always visible */}
      {dummySong && (
        <div className="sr-only">
          <h1>{dummySong.title} - {dummySong.artist}</h1>
          <p>Complete lyrics and translation for {dummySong.title} by {dummySong.artist}</p>
          {dummySong.lyrics && <div>{dummySong.lyrics}</div>}
        </div>
      )}
      <ClientHome
        initialLang={initialLang}
        isLyricPageInitial={true}
        isDummyTrack={isDummyTrack}
      />
    </>
  );
}
