import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getCurrentlyPlaying } from "@/lib/spotify";

export function useSpotifyPoller() {
  const { data: session } = useSession();
  const {
    setPlayback,
    updateProgress,
  } = usePlayerStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Poll Spotify Playback State
  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchPlayback = async () => {
      const data = await getCurrentlyPlaying(session.accessToken as string);

      if (!data || !data.item) {
        const current = usePlayerStore.getState();
        // Only clear if we were previously using Spotify or no provider
        if (current.provider === 'spotify' || current.provider === 'none') {
            setPlayback({ isPlaying: false, provider: 'spotify' });
        }
        return;
      }

      // Check if local SDK is active (playing) to avoid conflict
      const current = usePlayerStore.getState();
      const isLocalSdkPlaying = current.provider === 'spotify' && current.isPlaying && current.deviceId && data.device.id === current.deviceId;

      setPlayback({
        isPlaying: data.is_playing,
        trackId: data.item.id,
        title: data.item.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist: data.item.artists.map((a: any) => a.name).join(", "),
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
    pollIntervalRef.current = setInterval(fetchPlayback, 1000); // Poll every 1s

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, setPlayback]);

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

