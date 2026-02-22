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
    originalLyrics,
    setOriginalLyrics,
  } = usePlayerStore();

  useEffect(() => {
    if (!trackId || trackId.startsWith("dummy-") || !title || !artist) return;

    const fetchAndProcessLyrics = async () => {
      // 1. Check if we need to fetch new lyrics
      // We check if we have original lyrics for THIS track
      const hasLyricsForCurrentTrack = originalLyrics.length > 0 && originalLyrics[0].id?.startsWith(trackId);
      
      let lyricsToProcess = originalLyrics;

      if (!hasLyricsForCurrentTrack) {
        setLoadingLyrics(true);
        setLyrics([]); // Clear display while loading
        // Don't clear originalLyrics yet, we might reuse them if fetch fails? No, clear them.
        setOriginalLyrics([]); 
        
        // Try to fetch
        const lrcRaw = await getSyncedLyrics(title, artist, "", duration);
        
        if (!lrcRaw) {
          setLyrics([]);
          setOriginalLyrics([]);
          setLoadingLyrics(false);
          return;
        }

        const parsedLyrics = parseLrc(lrcRaw);
        lyricsToProcess = parsedLyrics.map((line, idx) => ({
          ...line,
          id: `${trackId}-${idx}`,
        }));
        
        setOriginalLyrics(lyricsToProcess);
      } else {
        // Use existing lyrics
        lyricsToProcess = originalLyrics;
      }

      // 2. Process Lyrics (Translate or Pass-through)
      if (!showTranslation) {
        setLyrics(lyricsToProcess);
        setLoadingLyrics(false);
        return;
      }

      // Translation Logic
      const cachedData = await getCachedLyrics(trackId, targetLanguage);
      
      const ua = typeof window !== "undefined" ? window.navigator.userAgent || "unknown" : "unknown";
      const ref = typeof document !== "undefined" ? document.referrer || "unknown" : "unknown";
      const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase());
      const clientInfo = {
        user_agent: ua,
        referer: ref,
        device_type: isMobile ? "mobile" : "desktop",
        ip_address: clientIp,
      };

      if (cachedData) {
        console.log("Using cached lyrics for:", trackId);
        setLyrics(cachedData);
        
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
        const textsToTranslate = lyricsToProcess.map((l) => l.text);
        try {
          const translations = await translateText(textsToTranslate, targetLanguage);
          const finalLyrics = lyricsToProcess.map((line, i) => ({
            ...line,
            translation: translations[i] || "",
          }));
          
          setLyrics(finalLyrics);
          await saveCachedLyrics(trackId, targetLanguage, finalLyrics);

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
          setLyrics(lyricsToProcess);
        }
      }
      setLoadingLyrics(false);
    };

    fetchAndProcessLyrics();
  }, [
    trackId, 
    title, 
    artist, 
    duration, 
    targetLanguage, 
    showTranslation, 
    // We include dependencies that should trigger re-processing
    // Note: originalLyrics is NOT in dependency array to avoid loops when we update it.
    // We rely on trackId change to trigger fetch, and local variable lyricsToProcess to carry data.
    // However, if showTranslation changes, we need access to latest originalLyrics.
    // Since usePlayerStore hook runs on every store update, the 'originalLyrics' variable in scope 
    // will be fresh when this effect runs due to showTranslation change.
  ]);

}
