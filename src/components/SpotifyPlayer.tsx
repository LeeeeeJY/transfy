"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/store/usePlayerStore';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

export default function SpotifyPlayer() {
  const { data: session } = useSession();
  const { 
    setDeviceId, 
    setPlayback, 
    updateProgress, 
  } = usePlayerStore();
  
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!session?.accessToken) return;

    if (!window.Spotify) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Transfy Web Player',
        getOAuthToken: (cb: (token: string) => void) => { 
          cb(session.accessToken as string); 
        },
        volume: 0.5
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        const currentTrack = state.track_window.current_track;
        
        setPlayback({
          isPlaying: !state.paused,
          trackId: currentTrack.id,
          title: currentTrack.name,
          artist: currentTrack.artists.map((a: any) => a.name).join(', '),
          albumArt: currentTrack.album.images[0]?.url,
          duration: currentTrack.duration_ms / 1000,
          progressMs: state.position,
          progress: state.position / 1000,
          provider: 'spotify'
        });
        
        // Update progress immediately
        updateProgress(state.position);
      });

      player.connect();
    };
    
    return () => {
        if (playerRef.current) {
            playerRef.current.disconnect();
        }
    };
  }, [session, setDeviceId, setPlayback, updateProgress]);

  // Local progress incrementor
  useEffect(() => {
    const timer = setInterval(() => {
      const state = usePlayerStore.getState();
      if (state.isPlaying && state.provider === 'spotify') {
        updateProgress(state.progressMs + 100);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [updateProgress]);

  return null;
}
