export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // 공백을 -로 치환
    .replace(/[^\w\-]+/g, '') // 알파벳, 숫자, - 외의 문자 제거 (한글은 보존해야 할 수도 있으나 URL 인코딩 고려하여 일단 영어 기준)
    .replace(/\-\-+/g, '-');  // 반복되는 - 제거
}

// 한글 등 다국어 지원을 위해 encodeURIComponent 사용이 더 안전할 수 있음
// 여기서는 간단히 URL 인코딩을 사용하는 버전을 추천합니다.
export function encodeTrackUrl(artist: string, title: string): string {
  // 공백만 -로 바꾸고 나머지는 그대로 인코딩 (한글 지원)
  const safeArtist = encodeURIComponent(artist.trim().replace(/\s+/g, '-'));
  const safeTitle = encodeURIComponent(title.trim().replace(/\s+/g, '-'));
  return `/track/${safeArtist}/${safeTitle}`;
}

export function decodeTrackUrlParam(param: string): string {
  // -를 공백으로 되돌리고 디코딩
  return decodeURIComponent(param).replace(/-/g, ' ');
}
