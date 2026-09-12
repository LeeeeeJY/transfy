import { track } from "@vercel/analytics";

/**
 * Vercel Web Analytics 커스텀 이벤트 래퍼.
 *
 * 제거된 Supabase `activity_logs` 테이블의 역할을 대신합니다.
 * IP 주소나 이메일 같은 개인정보는 전송하지 않고, 집계에 필요한
 * 저(低)카디널리티 속성만 담습니다.
 */

type TrackSource = "search" | "charts" | "player" | "direct";

/** 곡 상세(가사) 페이지 진입 */
export function trackLyricsOpen(source: TrackSource, lang: string) {
  track("lyrics_open", { source, lang });
}

/** 가사 조회 결과 (가사를 찾았는지 여부) */
export function trackLyricsResult(found: boolean, lang: string) {
  track("lyrics_result", { found, lang });
}

/** 번역 수행 (cached=true 이면 서버 캐시에서 즉시 응답) */
export function trackTranslate(lang: string, cached: boolean) {
  track("translate", { lang, cached });
}

/** 검색 실행 */
export function trackSearch(lang: string, hasResults: boolean) {
  track("search", { lang, has_results: hasResults });
}
