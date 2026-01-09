import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useRouter, usePathname } from "next/navigation";

export function useAppleMusic() {
  const { setPlayback, updateProgress } = usePlayerStore();
  const router = useRouter();
  const pathname = usePathname();
  const configuredRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setupListenersRef = useRef<(musicKit: any) => void>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setupListenersRef.current = (musicKit: any) => {
      const updateState = () => {
        const item = musicKit.player.nowPlayingItem;
        const isPlaying = musicKit.player.isPlaying;

        if (!item) {
          // If stopped or no item, clear playback state ONLY if we are the active provider
          const current = usePlayerStore.getState();
          if (current.provider === "apple" || current.provider === "none") {
            setPlayback({
              isPlaying: false,
              title: "",
              artist: "",
              albumArt: "",
              trackId: null,
              duration: 0,
              progressMs: 0,
              provider: "apple",
            });
          }
          return;
        }

        // Convert duration
        // item.playbackDuration is usually in milliseconds in recent MusicKit, but sometimes seconds.
        // We'll assume milliseconds if > 10000, else seconds * 1000.
        // Actually MusicKit JS v3 `playbackDuration` is in milliseconds.
        const duration = item.playbackDuration || 0;

        const trackId = item.id;

        setPlayback({
          isPlaying,
          trackId,
          title: item.title,
          artist: item.artistName,
          albumArt: item.artwork?.url
            ?.replace("{w}", "300")
            .replace("{h}", "300"),
          duration,
          progressMs: musicKit.player.currentPlaybackTime * 1000,
          provider: "apple",
        });
      };

      musicKit.addEventListener("mediaItemDidChange", updateState);
      musicKit.addEventListener("playbackStateDidChange", updateState);

      // Sync progress periodically
      musicKit.addEventListener("playbackTimeDidChange", () => {
        if (musicKit.player.nowPlayingItem) {
          updateProgress(musicKit.player.currentPlaybackTime * 1000);
        }
      });

      // Initial check
      if (musicKit.player.nowPlayingItem) {
        updateState();
      }
    };
  }, [pathname, router, setPlayback, updateProgress]); // Add dependencies used inside setupListeners

  useEffect(() => {
    const initMusicKit = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mk = (window as any).MusicKit;
      if (!mk) return;

      if (!configuredRef.current) {
        try {
          const token = process.env.NEXT_PUBLIC_APPLE_DEVELOPER_TOKEN;
          if (token) {
            await mk.configure({
              developerToken: token,
              app: {
                name: "Transfy",
                build: "1.0.0",
              },
            });
            configuredRef.current = true;
          }
        } catch (_err) {
          // console.warn("MusicKit configure error:", err);
          if (mk.getInstance()) {
            configuredRef.current = true;
          }
        }
      }

      const musicKit = mk.getInstance();
      if (musicKit && setupListenersRef.current) {
        setupListenersRef.current(musicKit);
      }
    };

    const checkInterval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).MusicKit) {
        clearInterval(checkInterval);
        initMusicKit();
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);
}
