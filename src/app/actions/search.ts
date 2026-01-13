"use server";

import axios from 'axios';

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // in seconds
}

export async function searchTracksAction(term: string, lang: string = 'en'): Promise<Track[]> {
  if (!term) return [];
  
  // Map UI language to iTunes API lang parameter
  // iTunes uses ISO 2 letter language codes (e.g. en_us, ja_jp, ko_kr)
  const langMap: Record<string, string> = {
    'ko': 'ko_kr',
    'ja': 'ja_jp',
    'zh': 'zh_cn', // or zh_tw based on preference
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
        lang: apiLang, // Add language parameter
        country: apiLang === 'ko_kr' ? 'KR' : 'US', // Optional: prioritize country store
      },
    });

    return response.data.results.map((item: any) => ({
      id: item.trackId,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      albumArt: item.artworkUrl100.replace('100x100', '600x600'), // Get higher resolution
      duration: item.trackTimeMillis / 1000,
    }));
  } catch (error) {
    console.error('iTunes Search Error:', error);
    return [];
  }
}

export async function getTopChartsAction(lang: string = 'en'): Promise<Track[]> {
  // Map UI language to Apple Music Storefront
  const storefrontMap: Record<string, string> = {
    'ko': 'kr',
    'ja': 'jp',
    'zh': 'cn', // Apple Music China
    'en': 'us',
  };

  const storefront = storefrontMap[lang] || 'us';

  try {
    const response = await axios.get(`https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/20/songs.json`);
    
    // The RSS feed structure is slightly different from Search API
    const results = response.data.feed.results;

    return results.map((item: any) => ({
      id: item.id, // RSS feed uses 'id' string, but we can treat it as number if it's numeric or string. Search API returns number.
      title: item.name,
      artist: item.artistName,
      album: item.name, // RSS feed doesn't always have album name separately, using song name as fallback or checking if collectionName exists
      albumArt: item.artworkUrl100.replace('100x100', '600x600'),
      duration: 0, // RSS feed doesn't provide duration
    }));
  } catch (error) {
    console.error('Apple Music RSS Error:', error);
    return [];
  }
}
