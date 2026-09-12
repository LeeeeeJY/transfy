import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getCurrentlyPlaying } from "@/lib/spotify";
import { externalTrackKey, normalizeForMatch } from "@/lib/utils";

/**
 * 지금 재생 중인 곡이, 사용자가 직접 열어 둔(고정한) 곡과 같은 곡인지 판단합니다.
 *
 * 검색 결과에서 곡을 눌러 들어온 페이지는 그 곡의 가사를 보여 주어야 하므로,
 * 실제로 다른 곡이 재생 중이라면 화면의 곡 정보를 덮어쓰지 않아야 합니다.
 */
function isSamePinnedTrack(
  playingKey: string,
  playingTitle: string,
  playingArtists: string[],
  pinnedKey: string,
  pinnedTitle: string,
  pinnedArtist: string
): boolean {
  if (pinnedKey === playingKey) return true;

  // 트랙 ID 없이 열린 페이지(직접 접속, 검색 엔진 유입)는 제목과 아티스트로 비교합니다.
  if (!pinnedTitle || normalizeForMatch(playingTitle) !== normalizeForMatch(pinnedTitle)) {
    return false;
  }

  const normalizedPinnedArtist = normalizeForMatch(pinnedArtist);
  if (!normalizedPinnedArtist) return false;

  return playingArtists.some((name) => {
    const normalized = normalizeForMatch(name);
    return (
      normalized.length > 0 &&
      (normalized === normalizedPinnedArtist ||
        normalizedPinnedArtist.includes(normalized))
    );
  });
}

export function useSpotifyPoller() {
  const { data: session } = useSession();
  const {
    setPlayback,
    updateProgress,
    isSdkReady,
  } = usePlayerStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Poll Spotify Playback State
  useEffect(() => {
    if (!session?.accessToken) return;

    // If SDK is active, we rely on SDK events instead of polling
    if (isSdkReady) return;

    const fetchPlayback = async () => {
      const data = await getCurrentlyPlaying(session.accessToken as string);

      if (!data || !data.item) {
        const current = usePlayerStore.getState();
        // 사용자가 선택해 둔 곡이 있으면 그 곡 정보를 그대로 유지합니다.
        if (current.pinnedTrackId) return;
        // Only clear if we were previously using Spotify or no provider
        if (current.provider === 'spotify' || current.provider === 'none') {
            setPlayback({ isPlaying: false, provider: 'spotify' });
        }
        return;
      }

      // Check if local SDK is active (playing) to avoid conflict
      const current = usePlayerStore.getState();
      const isLocalSdkPlaying = current.provider === 'spotify' && current.isPlaying && current.deviceId && data.device?.id === current.deviceId;

      const playingKey = externalTrackKey('spotify', data.item.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const playingArtists: string[] = data.item.artists.map((a: any) => a.name);

      // 고정된 곡과 다른 곡이 재생 중이면 화면을 갱신하지 않습니다.
      if (
        current.pinnedTrackId &&
        !isSamePinnedTrack(
          playingKey,
          data.item.name,
          playingArtists,
          current.pinnedTrackId,
          current.title,
          current.artist
        )
      ) {
        return;
      }

      setPlayback({
        isPlaying: data.is_playing,
        trackId: playingKey,
        // 고정된 곡이 실제로 재생 중이면, 고정 키도 실제 트랙 키로 맞춰 둡니다.
        ...(current.pinnedTrackId ? { pinnedTrackId: playingKey } : {}),
        title: data.item.name,
        artist: playingArtists.join(", "),
        albumArt: data.item.album.images[0]?.url,
        duration: data.item.duration_ms / 1000, // Convert to seconds for store consistency
        // Only update progress from poller if not playing locally (to avoid stutter)
        // Or if the difference is significant (e.g. seek)
        progressMs: isLocalSdkPlaying ? current.progressMs : data.progress_ms,
        progress: isLocalSdkPlaying ? current.progress : data.progress_ms / 1000,
        provider: 'spotify',
        isPlayerVisible: true, // Always show player when data is available
      });
    };

    fetchPlayback(); // Initial fetch

    // Smart Polling Strategy
    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fetchPlayback, 3000); // Poll every 3s (slower to avoid 429)
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };

    // Handle visibility change to stop polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchPlayback(); // Fetch immediately on resume
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, setPlayback, isSdkReady]);


  // 2. Local Timer for Smooth Progress
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      // Increment progress locally
      const current = usePlayerStore.getState();
      if (current.isPlaying && current.provider === 'spotify') {
        updateProgress(current.progressMs + 100);
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [updateProgress]);
}
