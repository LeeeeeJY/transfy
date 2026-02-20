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

export async function searchTracksAction(term: string, lang: string = 'en'): Promise<Track[]> {
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
          limit: 20,
          // market: 'from_token' // Remove market parameter to avoid 400 error
        },
      });

      return response.data.tracks.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((a: any) => a.name).join(', '),
        album: item.album.name,
        albumArt: item.album.images[0]?.url || '',
        duration: item.duration_ms / 1000,
        uri: item.uri
      }));
    } catch (error: any) {
      console.error('Spotify Search Error, falling back to iTunes:', error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Spotify Error Response:', JSON.stringify(error.response.data));
      }
      // Fallback to iTunes if Spotify fails
    }
  }

  // 2. If Not Logged In OR Spotify Failed: Use iTunes Search
  return searchTracksItunes(term, lang);
}

// Fallback iTunes Search API
async function searchTracksItunes(term: string, lang: string): Promise<Track[]> {
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
        limit: 20,
        lang: apiLang,
        country: apiLang === 'ko_kr' ? 'KR' : 'US',
      },
    });

    return response.data.results.map((item: any) => ({
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

export async function getTopArtistsAction(): Promise<any[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/me/top/artists`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: {
          limit: 20,
          time_range: 'short_term'
        }
      });

      return response.data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.images[0]?.url || '',
        genres: (item.genres || []).slice(0, 2).join(', '),
        uri: item.uri
      }));
    } catch (error) {
      console.error('Spotify Top Artists Error:', error);
      return [];
    }
  }
  return [];
}

export async function getTopChartsAction(lang: string = 'en'): Promise<Track[]> {
  const session = await getServerSession(authOptions);

  // 1. If Logged In: Use User's Top Tracks (Personalized)
  if (session?.accessToken) {
    try {
      console.log(`Fetching User's Top Tracks`);
      const response = await axios.get(`https://api.spotify.com/v1/me/top/tracks`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: {
          limit: 50,
          time_range: 'short_term' // Last 4 weeks
        }
      });

      return response.data.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((a: any) => a.name).join(', '),
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
    const response = await axios.get(`https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/100/songs.json`);
    const results = response.data.feed.results;

    return results.map((item: any) => ({
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

export async function getUserSavedAlbumsAction(): Promise<any[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/albums', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { limit: 10 }
      });

      return response.data.items.map((item: any) => ({
        id: item.album.id,
        name: item.album.name,
        artist: item.album.artists.map((a: any) => a.name).join(', '),
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

export async function getUserPlaylistsAction(): Promise<any[]> {
  const session = await getServerSession(authOptions);

  if (session?.accessToken) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { limit: 10 }
      });

      return response.data.items.map((item: any) => ({
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

    return response.data.items.map((item: any) => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(', '),
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
