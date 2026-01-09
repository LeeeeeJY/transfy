import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getSyncedLyrics, parseLrc } from "@/lib/lrclib";
import { translateText } from "@/app/actions/translate";
import { getCachedLyrics, saveCachedLyrics, logActivity } from "@/lib/cache";

export function useLyricsFetcher() {
  const { data: session } = useSession();
  const {
    trackId,
    title,
    artist,
    duration,
    targetLanguage,
    showTranslation,
    clientIp,
    countryCode,
    setLyrics,
    setLoadingLyrics,
  } = usePlayerStore();

  useEffect(() => {
    // Skip if no trackId or if it's a dummy track (Test Mode - though we are removing Test Mode, we might keep check for safety)
    if (!trackId || trackId.startsWith("dummy-")) return;

    // We don't strictly need session for lyrics (LRCLIB is public), 
    // but we use it for logging if available.

    const fetchLyricsAndTranslate = async () => {
      setLoadingLyrics(true);
      setLyrics([]); // Clear previous lyrics

      // 1. Fetch LRC
      const lrcRaw = await getSyncedLyrics(title, artist, "", duration);

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
      if (showTranslation) {
        const cachedData = await getCachedLyrics(trackId, targetLanguage);

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
          ip_address: clientIp,
        };

        if (cachedData) {
          console.log("Using cached lyrics for:", trackId);
          setLyrics(cachedData);

          // Log Activity (Cache Hit)
          await logActivity("translate_real", {
            user_email: session?.user?.email || "anonymous",
            track_name: title,
            artist,
            target_lang: targetLanguage,
            is_cached: true,
            country_code: countryCode,
            ...clientInfo,
          });
        } else {
          const textsToTranslate = linesWithId.map((l) => l.text);
          try {
            // Batch translate
            const translations = await translateText(
              textsToTranslate,
              targetLanguage
            );

            const finalLyrics = linesWithId.map((line, i) => ({
              ...line,
              translation: translations[i] || "",
            }));
            setLyrics(finalLyrics);

            // Save to Cache
            await saveCachedLyrics(trackId, targetLanguage, finalLyrics);

            // Log Activity (API Call)
            await logActivity("translate_real", {
              user_email: session?.user?.email || "anonymous",
              track_name: title,
              artist,
              target_lang: targetLanguage,
              is_cached: false,
              country_code: countryCode,
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
  }, [
    trackId, 
    // We intentionally exclude title/artist/duration to avoid re-fetching if they change slightly during same trackId
    // But usually trackId changes with them.
    targetLanguage, 
    showTranslation, 
    setLyrics, 
    setLoadingLyrics,
    session, // for logging
    clientIp,
    countryCode,
    // dependencies for effect function
    title,
    artist,
    duration
  ]);
}
