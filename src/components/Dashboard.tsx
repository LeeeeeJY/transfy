"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { play } from "@/lib/spotify";
import { encodeTrackUrl } from "@/lib/utils";
import { usePlayerStore } from "@/store/usePlayerStore";
import {
  User,
  Play,
  Loader2,
  History,
  TrendingUp,
  ListMusic,
} from "lucide-react";
import {
  getRecentlyPlayedAction,
  getUserTopItemsAction,
  getUserPlaylistsAction,
  Track,
  Artist,
  Playlist,
} from "@/app/actions/search";

const DASHBOARD_UI_TEXT = {
  ko: {
    recentlyPlayed: "최근 재생한 곡",
    topChartsSpotify: "내 취향 저격",
    topArtists: "가장 많이 들은 아티스트",
    savedAlbums: "저장한 앨범",
    playlists: "내 플레이리스트",
  },
  en: {
    recentlyPlayed: "Recently Played",
    topChartsSpotify: "Your Top Tracks",
    topArtists: "Your Top Artists",
    savedAlbums: "Saved Albums",
    playlists: "Your Playlists",
  },
  ja: {
    recentlyPlayed: "最近再生した曲",
    topChartsSpotify: "あなたのトップトラック",
    topArtists: "あなたのトップアーティスト",
    savedAlbums: "保存したアルバム",
    playlists: "あなたのプレイリスト",
  },
  zh: {
    recentlyPlayed: "最近播放的歌曲",
    topChartsSpotify: "您的热门歌曲",
    topArtists: "您的热门艺术家",
    savedAlbums: "保存的专辑",
    playlists: "您的播放列表",
  },
} as const;

interface DashboardProps {
  initialUiLanguage?: string;
}

export default function Dashboard({
  initialUiLanguage = "en",
}: DashboardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const deviceId = usePlayerStore((s) => s.deviceId);

  // Get UI text based on language
  const t =
    DASHBOARD_UI_TEXT[initialUiLanguage as keyof typeof DASHBOARD_UI_TEXT] ||
    DASHBOARD_UI_TEXT.en;

  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (session?.accessToken) {
          // Fetch User Specific Data
          const [recent, artists, tracks, userPlaylists] = await Promise.all([
            getRecentlyPlayedAction(),
            getUserTopItemsAction("artists", "medium_term"),
            getUserTopItemsAction("tracks", "medium_term"),
            getUserPlaylistsAction(),
          ]);

          setRecentTracks(recent);
          setTopArtists(artists as Artist[]);
          setTopTracks(tracks as Track[]);
          setPlaylists(userPlaylists);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, initialUiLanguage]);

  const handlePlayContext = async (uri: string) => {
    if (session?.accessToken) {
      await play(session.accessToken as string, uri, deviceId);
    } else {
      alert("Please login to play music.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12 space-y-12 animate-in fade-in duration-500">
      {/* 1. Recently Played (Only if logged in) */}
      {session && recentTracks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800 mb-6">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">{t.recentlyPlayed}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentTracks.slice(0, 5).map((track, i) => (
              <div
                key={`${track.id}-${i}`}
                onClick={() =>
                  router.push(
                    // 최근 재생 목록은 스포티파이에서 받아오므로 트랙 ID를 함께 넘깁니다.
                    encodeTrackUrl(track.artist, track.title, {
                      id: track.id,
                      source: "spotify",
                    })
                  )
                }
                className="group bg-zinc-900/50 hover:bg-zinc-800 rounded-lg p-4 transition-all border border-white/5 hover:border-white/10 cursor-pointer"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-md shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={track.albumArt}
                    alt={track.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                </div>
                <h3 className="font-semibold text-white truncate">
                  {track.title}
                </h3>
                <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Top Tracks (Only if logged in) */}
      {session && topTracks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800 mb-6">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold">{t.topChartsSpotify}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {topTracks.slice(0, 5).map((track) => (
              <div
                key={track.id}
                onClick={() => handlePlayContext(track.uri)}
                className="group bg-zinc-900/50 hover:bg-zinc-800 rounded-lg p-4 transition-all border border-white/5 hover:border-white/10 cursor-pointer"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-md shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={track.albumArt}
                    alt={track.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                </div>
                <h3 className="font-semibold text-white truncate">
                  {track.title}
                </h3>
                <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Top Artists (Only if logged in) */}
      {session && topArtists.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800 mb-6">
            <User className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold">{t.topArtists}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {topArtists.slice(0, 5).map((artist) => (
              <div
                key={artist.id}
                onClick={() => handlePlayContext(artist.uri)}
                className="group bg-zinc-900/50 hover:bg-zinc-800 rounded-lg p-4 transition-all border border-white/5 hover:border-white/10 cursor-pointer"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-full shadow-lg mx-auto w-32 h-32">
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-10 h-10 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                </div>
                <h3 className="font-semibold text-white truncate text-center">
                  {artist.name}
                </h3>
                <p className="text-sm text-zinc-400 truncate text-center">
                  {artist.genres}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Playlists (Only if logged in) */}
      {session && playlists.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-white/80 pb-2 border-b border-zinc-800 mb-6">
            <ListMusic className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold">{t.playlists}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.slice(0, 5).map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handlePlayContext(playlist.uri)}
                className="group bg-zinc-900/50 hover:bg-zinc-800 rounded-lg p-4 transition-all border border-white/5 hover:border-white/10 cursor-pointer"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-md shadow-lg">
                  {playlist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playlist.image}
                      alt={playlist.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <ListMusic className="w-10 h-10 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                </div>
                <h3 className="font-semibold text-white truncate">
                  {playlist.name}
                </h3>
                <p className="text-sm text-zinc-400 truncate">
                  By {playlist.owner}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
