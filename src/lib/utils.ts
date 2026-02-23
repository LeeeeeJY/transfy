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
  // 공백만 -로 바꾸고 나머지는 그대로 인코딩 (한글 지원). 빈 값은 세그먼트 깨짐/404 방지용 폴백.
  const a = (artist ?? "").trim().replace(/\s+/g, "-") || "Unknown";
  const t = (title ?? "").trim().replace(/\s+/g, "-") || "Unknown";
  const safeArtist = encodeURIComponent(a);
  const safeTitle = encodeURIComponent(t);
  return `/track/${safeArtist}/${safeTitle}`;
}

export function decodeTrackUrlParam(param: string): string {
  // -를 공백으로 되돌리고 디코딩
  return decodeURIComponent(param).replace(/-/g, ' ');
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[\(\[](?:feat|ft|prod|with|remix|mix|ver|edit|deluxe|ost|original|remaster).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(?:remaster|remix|live).*$/gi, '')
    .trim();
}

export function parseLrc(lrc: string): { time: number; text: string }[] {
  const lines = lrc.split('\n');
  const result = [];
  
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
      const text = match[4].trim();
      
      if (text) {
        result.push({ time, text });
      }
    }
  }
  
  return result;
}
