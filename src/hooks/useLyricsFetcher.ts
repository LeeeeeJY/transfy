import { useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { parseLrc } from "@/lib/lrclib";
import { getSyncedLyricsAction } from "@/app/actions/lyrics";
import { translateLines } from "@/app/actions/translate";
import { trackLyricsResult, trackTranslate } from "@/lib/analytics";

export function useLyricsFetcher() {
  const {
    trackId,
    title,
    artist,
    duration,
    targetLanguage,
    showTranslation,
    setLyrics,
    setLoadingLyrics,
    setOriginalLyrics,
    setIsTranslating,
    lyricsRetryTrigger,
  } = usePlayerStore();

  useEffect(() => {
    if (!trackId || trackId.startsWith("dummy-") || !title || !artist) return;

    // 곡이나 언어가 바뀌면 앞선 요청의 결과를 버립니다.
    let cancelled = false;

    const fetchAndProcessLyrics = async () => {
      // 1. 지금 곡의 원문 가사를 이미 가지고 있는지 확인합니다.
      const currentOriginals = usePlayerStore.getState().originalLyrics;
      const hasLyricsForCurrentTrack =
        currentOriginals.length > 0 && currentOriginals[0].id?.startsWith(trackId);

      let lyricsToProcess = currentOriginals;

      if (!hasLyricsForCurrentTrack) {
        setLoadingLyrics(true);
        setLyrics([]);
        setOriginalLyrics([]);

        const lrcRaw = await getSyncedLyricsAction(title, artist, "", duration);
        if (cancelled) return;

        if (!lrcRaw) {
          setLyrics([]);
          setOriginalLyrics([]);
          setLoadingLyrics(false);
          trackLyricsResult(false, targetLanguage);
          return;
        }

        // trackId를 접두사로 붙여 두면, 같은 곡에서 LRCLIB를 다시 호출하지 않습니다.
        lyricsToProcess = parseLrc(lrcRaw).map((line, idx) => ({
          ...line,
          id: `${trackId}-${idx}`,
        }));

        setOriginalLyrics(lyricsToProcess);
        trackLyricsResult(true, targetLanguage);
      }

      // 2. 번역이 꺼져 있거나 가사가 없으면 원문만 표시합니다.
      if (!showTranslation || lyricsToProcess.length === 0) {
        setLyrics(lyricsToProcess);
        setLoadingLyrics(false);
        return;
      }

      // 3. 번역을 기다리는 동안 원문을 먼저 보여 주고, 번역은 서버 액션에서
      //    처리합니다. 번역 결과는 서버 데이터 캐시에 저장됩니다.
      setLyrics(lyricsToProcess);
      setLoadingLyrics(false);
      setIsTranslating(true);

      const { texts, fromCache, failed } = await translateLines(
        lyricsToProcess.map((line) => line.text),
        targetLanguage
      );

      if (cancelled) return;

      if (!failed) {
        setLyrics(
          lyricsToProcess.map((line, i) => ({
            ...line,
            translation: texts[i] || "",
          }))
        );
        trackTranslate(targetLanguage, fromCache);
      }

      setIsTranslating(false);
    };

    fetchAndProcessLyrics();

    return () => {
      cancelled = true;
      // 이 정리 함수는 다음 요청이 시작되기 전에 동기적으로 실행되므로,
      // 번역 표시 상태를 여기서 내려 두어야 화면에 남지 않습니다.
      setIsTranslating(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    trackId,
    title,
    artist,
    duration,
    targetLanguage,
    showTranslation,
    lyricsRetryTrigger, // "가사 다시 불러오기" 클릭 시 재요청
  ]);
}
