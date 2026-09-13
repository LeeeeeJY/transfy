import { useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getLocalizedTrackNamesAction } from "@/app/actions/localize";
import { parseTrackKey } from "@/lib/utils";

/**
 * 표시 언어를 정합니다.
 *
 * 스토어의 값은 홈과 가사 화면에서 채워지므로, 검색 화면처럼 아직 값이 없는
 * 곳에서는 브라우저 설정을 대신 씁니다.
 */
function resolveUiLanguage(uiLanguage: string | null): string {
  if (uiLanguage) return uiLanguage;
  if (typeof navigator === "undefined") return "en";

  const primary = (navigator.language || "").toLowerCase();
  if (primary.startsWith("ko")) return "ko";
  if (primary.startsWith("ja")) return "ja";
  if (primary.startsWith("zh")) return "zh";
  return "en";
}

/**
 * 지금 화면에 떠 있는 곡의 이름을 발매 지역 표기로 바꿔 둡니다.
 *
 * 스포티파이는 국내 발매곡도 로마자 표기로 돌려주므로("IU", "BTS"), 아이튠즈
 * 한국 스토어프론트에서 발매 당시의 이름을 가져와 보여 줍니다. 조회에 쓰는
 * 원래 표기는 그대로 두고 표시용 이름만 따로 채웁니다.
 */
export function useLocalizedTrackNames() {
  const trackId = usePlayerStore((s) => s.trackId);
  const title = usePlayerStore((s) => s.title);
  const artist = usePlayerStore((s) => s.artist);
  const uiLanguage = usePlayerStore((s) => s.uiLanguage);

  useEffect(() => {
    if (!trackId || !title || !artist) return;
    if (trackId.startsWith("dummy-")) return;

    let cancelled = false;
    const ref = parseTrackKey(trackId);
    // 아이튠즈에서 온 곡은 트랙 ID를 알고 있으므로 검색 단계를 건너뜁니다.
    const itunesId = ref?.source === "itunes" ? ref.id ?? "" : "";

    getLocalizedTrackNamesAction(title, artist, resolveUiLanguage(uiLanguage), itunesId)
      .then((names) => {
        if (cancelled || !names) return;
        // 조회하는 사이에 곡이 바뀌었다면 앞 곡의 이름을 붙이지 않습니다.
        if (usePlayerStore.getState().trackId !== trackId) return;
        usePlayerStore.getState().setLocalizedNames(names);
      })
      .catch(() => {
        // 이름 조회는 부가 기능이므로 실패해도 원래 표기로 계속 보여 줍니다.
      });

    return () => {
      cancelled = true;
    };
  }, [trackId, title, artist, uiLanguage]);
}
