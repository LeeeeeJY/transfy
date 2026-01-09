import { Metadata } from "next";
import axios from "axios";
import ClientHome from "@/components/ClientHome";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getTrackDetails(id: string) {
  const token = process.env.NEXT_PUBLIC_APPLE_DEVELOPER_TOKEN;
  if (!token) return null;

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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // If accessing base path or invalid ID, return default
  if (!id || id === "home") {
    return {
      title: "Transfy - Real-time Lyrics Translator",
      description:
        "Real-time lyrics translation service for Spotify and Apple Music.",
    };
  }

  const track = await getTrackDetails(id);

  if (track) {
    return {
      title: `${track.name} - ${track.artistName} | Transfy`,
      description: `Lyrics and translation for ${track.name} by ${track.artistName}.`,
      openGraph: {
        title: `${track.name} - ${track.artistName} Lyrics Translation`,
        description: `Real-time lyrics translation for ${track.name}`,
        images: [
          {
            url: track.artwork?.url
              ?.replace("{w}", "1200")
              .replace("{h}", "630"),
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  }

  return {
    title: "Song Lyrics | Transfy",
    description: "Real-time lyrics translation for Spotify and Apple Music.",
  };
}

export default async function LyricPage({ params }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = await params;

  // Reuse ClientHome layout but with initial track ID context if needed.
  // Actually, ClientHome contains the entire layout (Ads, PlayerControls).
  // We should render ClientHome here to keep the layout consistent.
  // But ClientHome expects initialLang, etc. We need to fetch them or pass defaults.

  // For simplicity, we'll re-use the layout structure if we want persistence.
  // However, next.js app router encourages layout.tsx for persistence.
  // ClientHome currently IS the page content.

  // Let's pass the props required by ClientHome.
  // In a real app, these come from headers/middleware.
  const initialLang = "ko"; // Default or detect from headers
  const initialCountry = "KR";
  const initialIp = "127.0.0.1";
  const isDummyTrack = id.startsWith("dummy-");

  return (
    <ClientHome
      initialLang={initialLang}
      initialCountry={initialCountry}
      initialIp={initialIp}
      isLyricPageInitial={true}
      isDummyTrack={isDummyTrack}
    />
  );
}
