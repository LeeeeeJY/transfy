/**
 * 서비스 대표 주소.
 *
 * 배포 도메인이 바뀌면 코드를 고치는 대신 환경변수 `NEXT_PUBLIC_URL`만
 * 새 주소로 설정하세요. 메타데이터, 구조화 데이터, 사이트맵, robots.txt가
 * 모두 이 값을 사용합니다.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_URL || "https://transfy-lyrics.vercel.app"
).replace(/\/+$/, "");

/** 경로를 붙여 절대 주소를 만듭니다. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
