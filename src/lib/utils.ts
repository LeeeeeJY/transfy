export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // 공백을 -로 치환
    .replace(/[^\w\-]+/g, '') // 알파벳, 숫자, - 외의 문자 제거 (한글은 보존해야 할 수도 있으나 URL 인코딩 고려하여 일단 영어 기준)
    .replace(/\-\-+/g, '-');  // 반복되는 - 제거
}

/** 트랙 ID를 조회할 외부 서비스 */
export type TrackSource = "spotify" | "itunes";

/** 상세 페이지에서 곡을 정확히 다시 찾기 위한 식별 정보 */
export interface TrackUrlRef {
  id?: string | null;
  source?: TrackSource | null;
}

/**
 * 스포티파이/아이튠즈 트랙 ID로 스토어에서 쓰는 고유 키를 만듭니다.
 * 폴러와 상세 페이지가 같은 형식을 써야 서로의 곡 정보를 덮어쓰지 않습니다.
 */
export function externalTrackKey(source: TrackSource, id: string): string {
  return `${source}-${id}`;
}

/** ID를 모르는 곡(직접 접속, 사이트맵 유입 등)에 쓰는 키 */
export function staticTrackKey(artist: string, title: string): string {
  return `static-${artist}-${title}`.replace(/\s+/g, "-").toLowerCase();
}

/** externalTrackKey로 만든 키를 다시 서비스와 ID로 분해합니다. */
export function parseTrackKey(key: string | null): TrackUrlRef | null {
  if (!key) return null;

  for (const source of ["spotify", "itunes"] as TrackSource[]) {
    const prefix = `${source}-`;
    if (key.startsWith(prefix)) {
      const id = key.slice(prefix.length);
      return id ? { id, source } : null;
    }
  }

  return null;
}

// 한글 등 다국어 지원을 위해 encodeURIComponent 사용이 더 안전할 수 있음
// 여기서는 간단히 URL 인코딩을 사용하는 버전을 추천합니다.
export function encodeTrackUrl(
  artist: string,
  title: string,
  ref?: TrackUrlRef
): string {
  // 공백만 -로 바꾸고 나머지는 그대로 인코딩 (한글 지원). 빈 값은 세그먼트 깨짐/404 방지용 폴백.
  const a = (artist ?? "").trim().replace(/\s+/g, "-") || "Unknown";
  const t = (title ?? "").trim().replace(/\s+/g, "-") || "Unknown";
  const safeArtist = encodeURIComponent(a);
  const safeTitle = encodeURIComponent(t);
  const path = `/track/${safeArtist}/${safeTitle}`;

  // 검색 결과나 차트에서 선택한 곡은 ID를 함께 넘깁니다. 상세 페이지가 제목으로
  // 다시 검색하지 않고 그 ID로 곡을 조회하므로, 다른 곡이 열리지 않습니다.
  if (ref?.id && ref?.source) {
    const params = new URLSearchParams({ id: ref.id, src: ref.source });
    return `${path}?${params.toString()}`;
  }

  return path;
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

/**
 * 제목과 아티스트 이름을 비교하기 위해 표기 차이를 지웁니다.
 *
 * URL 슬러그를 만들 때 하이픈이 공백으로 바뀌는 문제("Spider-Man" → "Spider Man"),
 * 괄호와 문장 부호, 라틴 문자의 악센트 차이를 모두 흡수하므로,
 * 같은 곡이 다른 표기로 적혀 있어도 동일하게 판정됩니다.
 */
export function normalizeForMatch(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // 라틴 문자의 결합 악센트 제거
    .normalize("NFC") // 한글 음절은 다시 결합
    .replace(/&/g, " and ")
    .replace(/[-_/\\|~–—,.;:!?"'`´’“”()[\]{}*+=@#$%^]+/g, " ")
    .replace(/\s+/g, " ")
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
