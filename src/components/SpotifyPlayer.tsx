"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { transferPlayback } from '@/lib/spotify';
import { externalTrackKey } from '@/lib/utils';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify: any;
  }
}

export default function SpotifyPlayer() {
  const { data: session } = useSession();
  const { 
    setDeviceId, 
    setPlayback, 
    updateProgress,
    setIsSdkReady,
    setPlayer
  } = usePlayerStore();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        setIsSdkReady(true);
        setPlayer(player);
        // Auto-transfer playback to this device
        transferPlayback(session.accessToken as string, device_id);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsSdkReady(false);
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error('Authentication Error:', message);
          setIsSdkReady(false);
      });

      player.addListener('account_error', ({ message }: { message: string }) => {
          console.error('Account Error:', message);
          setIsSdkReady(false);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
          console.error('Initialization Error:', message);
          setIsSdkReady(false);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        const currentTrack = state.track_window.current_track;
        const playingKey = externalTrackKey('spotify', currentTrack.id);
        const pinnedTrackId = usePlayerStore.getState().pinnedTrackId;

        // 사용자가 직접 열어 둔 곡과 다른 곡이 재생되면 화면을 덮어쓰지 않습니다.
        if (pinnedTrackId && pinnedTrackId !== playingKey) return;

        setPlayback({
          isPlaying: !state.paused,
          trackId: playingKey,
          title: currentTrack.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            setIsSdkReady(false);
            setPlayer(null);
        }
    };
  }, [session, setDeviceId, setPlayback, updateProgress, setIsSdkReady, setPlayer]);

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
