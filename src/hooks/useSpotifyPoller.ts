import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getCurrentlyPlaying } from "@/lib/spotify";
import { getSyncedLyrics, parseLrc } from "@/lib/lrclib";
import { translateText } from "@/app/actions/translate";
import { getCachedLyrics, saveCachedLyrics, logActivity } from "@/lib/cache";

export function useSpotifyPoller() {
  const { data: session } = useSession();
  const {
    setPlayback,
    setLyrics,
    setLoadingLyrics,
    updateProgress,
    trackId,
    targetLanguage,
  } = usePlayerStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Poll Spotify Playback State
  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchPlayback = async () => {
      const data = await getCurrentlyPlaying(session.accessToken as string);

      if (!data || !data.item) {
        setPlayback({ isPlaying: false });
        return;
      }

      setPlayback({
        isPlaying: data.is_playing,
        trackId: data.item.id,
        title: data.item.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        artist: data.item.artists.map((a: any) => a.name).join(", "),
        albumArt: data.item.album.images[0]?.url,
        duration: data.item.duration_ms,
        progressMs: data.progress_ms,
      });
    };

    fetchPlayback(); // Initial fetch
    pollIntervalRef.current = setInterval(fetchPlayback, 1000); // Poll every 1s

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, setPlayback]);

  // 2. Fetch Lyrics & Translate when track changes
  useEffect(() => {
    // Skip if no trackId or if it's a dummy track (Test Mode)
    if (!trackId || trackId.startsWith("dummy-")) return;

    // Skip if not logged in (Real Spotify data needs session usually, though LRCLIB doesn't)
    // But we want to avoid mixing logic.
    if (!session) return;

    const fetchLyricsAndTranslate = async () => {
      setLoadingLyrics(true);
      setLyrics([]); // Clear previous lyrics

      const store = usePlayerStore.getState();
      const { title, artist, duration: trackDuration } = store; // Use duration from store to avoid dependency loop with trackId if possible, but here we read fresh state

      // 1. Fetch LRC
      const lrcRaw = await getSyncedLyrics(title, artist, "", trackDuration);

      if (!lrcRaw) {
        setLyrics([]);
        setLoadingLyrics(false);
        return;
      }

      const parsedLyrics = parseLrc(lrcRaw);
      const linesWithId = parsedLyrics.map((line, idx) => ({
        ...line,
        id: `${trackId}-${idx}`, // Unique ID
      }));

      // 2. Translate if needed
      if (store.showTranslation) {
        const cachedData = await getCachedLyrics(trackId, store.targetLanguage);

        const ua =
          typeof window !== "undefined"
            ? window.navigator.userAgent || "unknown"
            : "unknown";
        const ref =
          typeof document !== "undefined"
            ? document.referrer || "unknown"
            : "unknown";
        const isMobile = /mobile|android|iphone|ipad/i.test(
          ua.toLowerCase()
        );
        const clientInfo = {
          user_agent: ua,
          referer: ref,
          device_type: isMobile ? "mobile" : "desktop",
          ip_address: store.clientIp, // Use IP from store
        };

        if (cachedData) {
          console.log("Using cached lyrics (Supabase Poller) for:", trackId);
          setLyrics(cachedData);

          // Log Activity (Cache Hit)
          await logActivity("translate_real", {
            user_email: session?.user?.email || "anonymous",
            track_name: title,
            artist,
            target_lang: store.targetLanguage,
            is_cached: true,
            country_code: store.countryCode,
            ...clientInfo,
          });
        } else {
          const textsToTranslate = linesWithId.map((l) => l.text);
          try {
            // Batch translate
            const translations = await translateText(
              textsToTranslate,
              store.targetLanguage
            );

            const finalLyrics = linesWithId.map((line, i) => ({
              ...line,
              translation: translations[i] || "",
            }));
            setLyrics(finalLyrics);

            // Save to Cache
            await saveCachedLyrics(trackId, store.targetLanguage, finalLyrics);

            // Log Activity (API Call)
            await logActivity("translate_real", {
              user_email: session?.user?.email || "anonymous",
              track_name: title,
              artist,
              target_lang: store.targetLanguage,
              is_cached: false,
              country_code: store.countryCode,
              ...clientInfo,
            });
          } catch (e) {
            console.error("Translation failed", e);
            setLyrics(linesWithId); // Fallback to original
          }
        }
      } else {
        setLyrics(linesWithId);
      }

      setLoadingLyrics(false);
    };

    fetchLyricsAndTranslate();
  }, [trackId, targetLanguage, setLyrics, setLoadingLyrics]); // Re-fetch if language changes? Maybe just re-translate. For simplicity, re-fetch logic covers it.

  // 3. Local Timer for Smooth Progress
  useEffect(() => {
    const store = usePlayerStore.getState();
    // Start interval only if playing
    // But we can't easily subscribe to store inside effect without triggering it on every update.
    // Instead, we just run the interval always and check inside.

    progressIntervalRef.current = setInterval(() => {
      // Increment progress locally
      const current = usePlayerStore.getState();
      if (current.isPlaying) {
        updateProgress(current.progressMs + 100);
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [updateProgress]); // Removed complex dependency
}
