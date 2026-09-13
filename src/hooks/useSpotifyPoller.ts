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
 * 폴링 결과가 지금 보고 있는 위치보다 이만큼 뒤라면, 실제로 되감긴 것이 아니라
 * 응답 지연이나 스포티파이 쪽 측정 오차로 봅니다. 이 범위를 넘어서면 사용자가
 * 직접 구간을 이동한 것으로 보고 그대로 반영합니다.
 */
const BACKWARD_TOLERANCE_MS = 2500;

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
   * 폴링으로 확인한 진행 위치와 그것을 확인한 시각입니다.
   *
   * 로컬 타이머가 스토어 값에 흐른 시간을 더해 나가는 방식이면, 이 훅이 실수로
   * 두 곳에서 실행될 때 진행 위치가 두 배로 빨라집니다. 기준점에서 매번 다시
   * 계산하면 몇 번을 실행하든 같은 값이 나옵니다.
   */
  const progressAnchorRef = useRef<{
    trackKey: string;
    progressMs: number;
    at: number;
  } | null>(null);

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

      // 진행 위치는 뒤로 가지 않게 합니다.
      //
      // 폴링 응답은 몇백 밀리초 전의 값이라, 로컬 타이머가 앞서 있는 것이 정상입니다.
      // 이를 그대로 덮어쓰면 3초마다 위치가 조금씩 되돌아가고, 그 순간이 가사 줄
      // 경계와 겹치면 활성 줄이 앞뒤로 오가며 화면이 위아래로 튑니다.
      const isSameTrack = current.trackId === playingKey;
      const keepLocalProgress =
        isSameTrack &&
        data.is_playing &&
        current.progressMs > measuredProgressMs &&
        current.progressMs - measuredProgressMs < BACKWARD_TOLERANCE_MS;
      const nextProgressMs = keepLocalProgress ? current.progressMs : measuredProgressMs;

      // 다음 폴링까지 진행 위치를 계산할 기준점을 갱신합니다.
      progressAnchorRef.current = {
        trackKey: playingKey,
        progressMs: nextProgressMs,
        at: Date.now(),
      };

      setPlayback({
        isPlaying: data.is_playing,
        trackId: playingKey,
        title: data.item.name,
        artist: playingArtists.join(", "),
        albumArt: data.item.album.images[0]?.url,
        duration: data.item.duration_ms / 1000, // Convert to seconds for store consistency
        progressMs: nextProgressMs,
        progress: nextProgressMs / 1000,
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
    progressIntervalRef.current = setInterval(() => {
      const anchor = progressAnchorRef.current;
      if (!anchor) return;

      const current = usePlayerStore.getState();
      if (!current.isPlaying || current.provider !== "spotify") return;
      // 곡이 바뀌었는데 아직 새 기준점을 받지 못했다면 계산하지 않습니다.
      if (current.trackId !== anchor.trackKey) return;

      // 기준점에서 흐른 시간을 매번 다시 재므로, 탭이 백그라운드로 내려가
      // 타이머가 느려져도 진행 위치가 뒤처지지 않습니다.
      updateProgress(anchor.progressMs + (Date.now() - anchor.at));
    }, PROGRESS_TICK_MS);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [updateProgress]);
}
