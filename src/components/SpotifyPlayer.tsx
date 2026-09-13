"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { externalTrackKey } from '@/lib/utils';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify: any;
  }
}

const SDK_SCRIPT_ID = "spotify-web-playback-sdk";

/**
 * 스포티파이 웹 플레이어(Web Playback SDK)를 이 브라우저의 재생 기기로 등록합니다.
 *
 * 이 컴포넌트는 루트 레이아웃에서 한 번만 마운트해야 합니다. 페이지마다 마운트하면
 * 화면을 이동할 때 컴포넌트가 사라지면서 기기 연결이 끊기고, 웹 플레이어로 듣고 있던
 * 음악이 멈춰 버립니다.
 */
export default function SpotifyPlayer() {
  const { data: session } = useSession();
  const { setDeviceId, setPlayback, setIsSdkReady, setPlayer } = usePlayerStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  /**
   * SDK가 토큰을 요청할 때마다 최신 값을 넘기기 위한 참조입니다.
   * 토큰이 갱신되어도 플레이어를 다시 만들지 않아도 됩니다.
   */
  const accessTokenRef = useRef<string | undefined>(undefined);

  // 아래 효과보다 먼저 선언해, 플레이어를 만들기 전에 최신 토큰이 담기도록 합니다.
  useEffect(() => {
    accessTokenRef.current = session?.accessToken as string | undefined;
  }, [session?.accessToken]);

  useEffect(() => {
    const accessToken = session?.accessToken as string | undefined;

    // 로그아웃되면 기기 연결을 정리합니다.
    if (!accessToken) {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setIsSdkReady(false);
        setPlayer(null);
      }
      return;
    }

    // 이미 연결되어 있으면 다시 만들지 않습니다.
    // 세션이 갱신될 때마다 새로 만들면 그때마다 재생이 끊깁니다.
    if (playerRef.current) return;

    let cancelled = false;

    const createPlayer = () => {
      if (cancelled || playerRef.current || !window.Spotify) return;

      const player = new window.Spotify.Player({
        name: 'Transfy Web Player',
        getOAuthToken: (cb: (token: string) => void) => {
          if (accessTokenRef.current) cb(accessTokenRef.current);
        },
        volume: 0.5,
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsSdkReady(true);
        setPlayer(player);
        // 여기서 재생을 이 기기로 옮기지 않습니다. 휴대폰이나 데스크톱 앱에서
        // 듣고 있는데 웹 페이지를 열었다는 이유만으로 재생을 빼앗으면 안 됩니다.
        // 웹에서 직접 재생을 시작할 때는 lib/spotify.ts의 play()가 필요한 경우에만
        // 이 기기로 전환합니다.
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
        if (!state) {
          // 재생이 다른 기기로 넘어가면 SDK는 상태를 알려 주지 않습니다.
          // 이 기기가 더 이상 재생 기기가 아니라고 표시해, 폴러가 실제 재생 중인
          // 기기의 상태를 따라가도록 합니다.
          const { deviceId, activeDeviceId } = usePlayerStore.getState();
          if (activeDeviceId && deviceId && activeDeviceId === deviceId) {
            usePlayerStore.setState({ activeDeviceId: null });
          }
          return;
        }

        const currentTrack = state.track_window.current_track;
        const playingKey = externalTrackKey('spotify', currentTrack.id);
        const pinnedTrackId = usePlayerStore.getState().pinnedTrackId;

        // 사용자가 직접 열어 둔 곡과 다른 곡이 재생되면 화면을 덮어쓰지 않습니다.
        if (pinnedTrackId && pinnedTrackId !== playingKey) return;

        setPlayback({
          isPlaying: !state.paused,
          trackId: playingKey,
          activeDeviceId: usePlayerStore.getState().deviceId,
          title: currentTrack.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          artist: currentTrack.artists.map((a: any) => a.name).join(', '),
          albumArt: currentTrack.album.images[0]?.url,
          duration: currentTrack.duration_ms / 1000,
          progressMs: state.position,
          progress: state.position / 1000,
          provider: 'spotify',
        });
      });

      player.connect();
    };

    if (window.Spotify) {
      createPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = createPlayer;
      if (!document.getElementById(SDK_SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SDK_SCRIPT_ID;
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      // 여기서 연결을 끊지 않습니다. 세션 갱신 같은 이유로 이 효과가 다시 실행될 때
      // 연결을 끊으면 재생이 멈춥니다. 실제 정리는 아래의 언마운트 전용 효과가 합니다.
      cancelled = true;
    };
  }, [session?.accessToken, setDeviceId, setPlayback, setIsSdkReady, setPlayer]);

  // 컴포넌트가 완전히 사라질 때만 기기 연결을 정리합니다.
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, []);

  // 진행 위치를 흘려보내는 타이머는 useSpotifyPoller가 담당합니다.
  // 여기에 같은 타이머를 두면 진행 위치가 두 배 속도로 흘러 가사 싱크가 어긋납니다.

  return null;
}
