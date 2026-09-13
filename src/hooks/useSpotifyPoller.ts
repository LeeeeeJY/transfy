import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getCurrentlyPlaying } from "@/lib/spotify";
import { externalTrackKey, normalizeForMatch } from "@/lib/utils";

/** 재생 상태 조회 주기 */
const POLL_INTERVAL_MS = 3000;
/** 진행 위치를 부드럽게 이어 주는 로컬 타이머 주기 */
const PROGRESS_TICK_MS = 100;

/**
 * 지금 재생 중인 곡이, 사용자가 직접 열어 둔(고정한) 곡과 같은 곡인지 판단합니다.
 *
 * 검색 결과에서 곡을 눌러 들어온 페이지는 그 곡의 가사를 보여 주어야 하므로,
 * 페이지를 연 직후에 남아 있던 예전 재생 상태로 화면을 덮어쓰지 않아야 합니다.
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
  const { setPlayback, updateProgress } = usePlayerStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 고정된 곡을 기다리는 동안 마지막으로 관찰한 재생 곡.
   * 페이지를 연 직후 한 번 관찰되는 '다른 곡'은 예전 재생 상태로 보고 무시하지만,
   * 그 뒤에 재생 곡이 바뀌면 사용자가 스포티파이에서 곡을 넘긴 것이므로 따라갑니다.
   */
  const holdRef = useRef<{ pinnedTrackId: string; lastSeenKey: string | null } | null>(
    null
  );

  // 1. Poll Spotify Playback State
  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchPlayback = async () => {
      const requestedAt = Date.now();
      const data = await getCurrentlyPlaying(session.accessToken as string);
      const current = usePlayerStore.getState();

      if (!data || !data.item) {
        // 사용자가 선택해 둔 곡이 있으면 그 곡 정보를 그대로 유지합니다.
        if (current.pinnedTrackId) return;
        // Only clear if we were previously using Spotify or no provider
        if (current.provider === "spotify" || current.provider === "none") {
          setPlayback({ isPlaying: false, provider: "spotify" });
        }
        return;
      }

      const playingKey = externalTrackKey("spotify", data.item.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const playingArtists: string[] = data.item.artists.map((a: any) => a.name);

      if (current.pinnedTrackId) {
        if (holdRef.current?.pinnedTrackId !== current.pinnedTrackId) {
          holdRef.current = { pinnedTrackId: current.pinnedTrackId, lastSeenKey: null };
        }

        const pinnedTrackStarted = isSamePinnedTrack(
          playingKey,
          data.item.name,
          playingArtists,
          current.pinnedTrackId,
          current.title,
          current.artist
        );

        // 페이지를 연 뒤 재생 곡이 바뀌었다면, 사용자가 직접 곡을 넘긴 것입니다.
        const trackChangedSinceHold =
          holdRef.current.lastSeenKey !== null &&
          holdRef.current.lastSeenKey !== playingKey;

        if (!pinnedTrackStarted && !trackChangedSinceHold) {
          // 아직은 페이지를 열기 전부터 재생 중이던 곡입니다. 화면을 덮어쓰지 않습니다.
          holdRef.current.lastSeenKey = playingKey;
          return;
        }

        // 고정한 곡이 재생되기 시작했거나 사용자가 곡을 바꿨습니다.
        // 이제부터는 실제 재생 상태를 그대로 따라갑니다.
        holdRef.current = null;
        usePlayerStore.setState({ pinnedTrackId: null });
      }

      // 응답이 도착하기까지 걸린 시간만큼 실제 재생은 더 진행되어 있습니다.
      // 이를 보정하지 않으면 폴링할 때마다 가사가 뒤로 밀려 싱크가 어긋납니다.
      // 스포티파이가 위치를 측정한 시점을 왕복 시간의 중간으로 보고 절반을 더합니다.
      const roundTripMs = Date.now() - requestedAt;
      const measuredProgressMs = data.is_playing
        ? data.progress_ms + Math.min(roundTripMs / 2, 1000)
        : data.progress_ms;

      setPlayback({
        isPlaying: data.is_playing,
        trackId: playingKey,
        title: data.item.name,
        artist: playingArtists.join(", "),
        albumArt: data.item.album.images[0]?.url,
        duration: data.item.duration_ms / 1000, // Convert to seconds for store consistency
        // 재생은 스포티파이 앱에서 이루어지므로, 서버가 알려 준 위치가 정확합니다.
        progressMs: measuredProgressMs,
        progress: measuredProgressMs / 1000,
        provider: "spotify",
        isPlayerVisible: true, // Always show player when data is available
      });
    };

    fetchPlayback(); // Initial fetch

    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fetchPlayback, POLL_INTERVAL_MS);
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
  }, [session, setPlayback]);

  // 2. 폴링 사이의 진행 위치를 로컬에서 이어 줍니다.
  useEffect(() => {
    // 흐른 시간을 실제로 재서 더합니다. 고정값(+100ms)을 더하면 탭이 백그라운드로
    // 내려가 타이머가 느려질 때 진행 위치가 뒤처져 가사 싱크가 어긋납니다.
    let lastTick = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;

      const current = usePlayerStore.getState();
      if (current.isPlaying && current.provider === "spotify") {
        updateProgress(current.progressMs + elapsed);
      }
    }, PROGRESS_TICK_MS);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [updateProgress]);
}
