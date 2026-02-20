"use server";

import axios from 'axios';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // in seconds
  uri: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  genres: string;
  uri: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  image: string;
  uri: string;
}

export interface Playlist {
  id: string;
  name: string;
  owner: string;
  image: string;
  uri: string;
}

interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  uri: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtist[];
  uri: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: { display_name: string };
  images: SpotifyImage[];
  uri: string;
}

interface SpotifySavedAlbum {
  album: SpotifyAlbum;
}

interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string;
}

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
}

interface ItunesRssItem {
  id: string;
  name: string;
  artistName: string;
  artworkUrl100: string;
}

export async function searchTracksAction(term: string, lang: string = 'en', limit: number = 10, offset: number = 0): Promise<Track[]> {
  if (!term || !term.trim()) return [];
  
  const session = await getServerSession(authOptions);
  
  // 1. If Logged In: Use Spotify Search
  if (session?.accessToken) {
      try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        params: {
          q: term,
          type: 'track',
          limit: limit,
          offset: offset,
          // market: 'from_token' // Remove market parameter to avoid 400 error
        },
      });

      return response.data.tracks.items.map((item: SpotifyTrack) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((a) => a.name).join(', '),
        album: item.album.name,
        albumArt: item.album.images[0]?.url || '',
        duration: item.duration_ms / 1000,
        uri: item.uri
      }));
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error('Spotify Search Error, falling back to iTunes:', err.message);
      if (axios.isAxiosError(err) && err.response) {
        console.error('Spotify Error Response:', JSON.stringify(err.response.data));
      }
      // Fallback to iTunes if Spotify fails
    }
  }

  // 2. If Not Logged In OR Spotify Failed: Use iTunes Search
  return searchTracksItunes(term, lang, limit, offset);
}

// Fallback iTunes Search API
async function searchTracksItunes(term: string, lang: string, limit: number, offset: number): Promise<Track[]> {
  const langMap: Record<string, string> = {
    'ko': 'ko_kr',
    'ja': 'ja_jp',
    'zh': 'zh_cn',
    'en': 'en_us',
  };
  const apiLang = langMap[lang] || 'en_us';

  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term,
        media: 'music',
        entity: 'song',
        limit: limit + offset, // iTunes doesn't support offset directly, so we fetch more and slice
        lang: apiLang,
        country: apiLang === 'ko_kr' ? 'KR' : 'US',
      },
    });

    return response.data.results.slice(offset).map((item: ItunesTrack) => ({
      id: String(item.trackId), // iTunes ID is number, convert to string
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      albumArt: item.artworkUrl100.replace('100x100', '600x600'),
      duration: item.trackTimeMillis / 1000,
      uri: '' // No Spotify URI for iTunes tracks
    }));
  } catch (error) {
    console.error('iTunes Search Error:', error);
    return [];
  }
}

export async function getUserTopItemsAction(type: 'artists' | 'tracks', time_range: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'): Promise<Artist[] | Track[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/me/top/${type}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: {
          limit: 20,
          time_range: time_range
        }
      });

      if (type === 'artists') {
        return response.data.items.map((item: SpotifyArtist) => ({
          id: item.id,
          name: item.name,
          image: item.images?.[0]?.url || '',
          genres: (item.genres || []).slice(0, 2).join(', '),
          uri: item.uri
        }));
      } else {
        // tracks
        return response.data.items.map((item: SpotifyTrack) => ({
          id: item.id,
          title: item.name,
          artist: item.artists.map((a) => a.name).join(', '),
          album: item.album.name,
          albumArt: item.album.images[0]?.url || '',
          duration: item.duration_ms / 1000,
          uri: item.uri
        }));
      }
    } catch (error) {
      console.error(`Spotify Top ${type} Error:`, error);
      return [];
    }
  }
  return [];
}

export async function getTopChartsAction(lang: string = 'en', limit: number = 10, offset: number = 0): Promise<Track[]> {
  const session = await getServerSession(authOptions);

  // 1. If Logged In: Use User's Top Tracks (Personalized)
  if (session?.accessToken) {
    try {
      console.log(`Fetching User's Top Tracks`);
      const response = await axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: {
          limit: limit,
          offset: offset,
          time_range: 'short_term' // Last 4 weeks
        }
      });

      return response.data.items.map((item: SpotifyTrack) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((a) => a.name).join(', '),
        album: item.album.name,
        albumArt: item.album.images[0]?.url || '',
        duration: item.duration_ms / 1000,
        uri: item.uri
      }));
    } catch (error) {
      console.error('Spotify Top Tracks Error:', error);
      // Fallback to iTunes if Spotify fails
    }
  } else {
    console.log("No session found for Top Charts, falling back to iTunes.");
  }

  // 2. If Not Logged In (or Spotify failed): Use iTunes Top 100 (RSS Feed)
  const storefrontMap: Record<string, string> = {
    'ko': 'kr',
    'ja': 'jp',
    'zh': 'cn',
    'en': 'us',
  };
  const storefront = storefrontMap[lang] || 'us';

  try {
    console.log(`Fetching iTunes Top 100 for ${storefront}`);
    // iTunes RSS feed doesn't support limit/offset in the URL same way, it returns fixed list.
    // We fetch 100 and slice manually.
    const response = await axios.get(`https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/100/songs.json`);
    const results = response.data.feed.results;

    // Slice results based on limit and offset
    const slicedResults = results.slice(offset, offset + limit);

    return slicedResults.map((item: ItunesRssItem) => ({
      id: item.id,
      title: item.name,
      artist: item.artistName,
      album: item.name, // RSS feed often lacks album name, fallback to song name
      albumArt: item.artworkUrl100.replace('100x100', '600x600'),
      duration: 0, // RSS feed doesn't provide duration
      uri: ''
    }));
  } catch (error) {
    console.error('iTunes RSS Error:', error);
    return [];
  }
}

export async function getUserSavedAlbumsAction(): Promise<Album[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/albums', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { limit: 10 }
      });

      return response.data.items.map((item: SpotifySavedAlbum) => ({
        id: item.album.id,
        name: item.album.name,
        artist: item.album.artists.map((a) => a.name).join(', '),
        image: item.album.images[0]?.url || '',
        uri: item.album.uri
      }));
    } catch (error) {
      console.error('Spotify Saved Albums Error:', error);
      return [];
    }
  }
  return [];
}

export async function getUserPlaylistsAction(): Promise<Playlist[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { limit: 10 }
      });

      return response.data.items.map((item: SpotifyPlaylist) => ({
        id: item.id,
        name: item.name,
        owner: item.owner.display_name,
        image: item.images?.[0]?.url || '',
        uri: item.uri
      }));
    } catch (error) {
      console.error('Spotify Playlists Error:', error);
      return [];
    }
  }
  return [];
}

export async function getRecentlyPlayedAction(): Promise<Track[]> {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return [];
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      params: {
        limit: 20
      }
    });

    return response.data.items.map((item: SpotifyPlayHistory) => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(', '),
      album: item.track.album.name,
      albumArt: item.track.album.images[0]?.url || '',
      duration: item.track.duration_ms / 1000,
      uri: item.track.uri
    }));
  } catch (error) {
    console.error('Spotify Recently Played Error:', error);
    return [];
  }
}
