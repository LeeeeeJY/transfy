import { cleanTitle, normalizeForMatch } from "./utils";

/** 매칭에 필요한 최소 정보 */
export interface MatchableTrack {
  title: string;
  artist: string;
}

/** 아티스트 문자열을 개별 아티스트 단위로 나눕니다. */
function splitArtists(artist: string): string[] {
  return artist
    .split(/,|&|feat\.?|ft\.?|with|\//i)
    .map((part) => normalizeForMatch(part))
    .filter(Boolean);
}

/**
 * 검색 결과가 요청한 곡과 같은 곡인지 점수로 판정합니다.
 * 일치하지 않으면 -1을 돌려주어 후보에서 제외합니다.
 *
 * 예전에는 제목이나 아티스트가 부분 문자열로만 겹쳐도 통과시키고 제목이 가장
 * 짧은 후보를 골랐기 때문에, "Love"를 요청하면 "Love Story"가 열리는 식으로
 * 전혀 다른 곡이 표시될 수 있었습니다.
 */
export function matchScore(
  candidate: MatchableTrack,
  wantedArtist: string,
  wantedTitle: string
): number {
  const candidateArtist = normalizeForMatch(candidate.artist);
  const candidateTitle = normalizeForMatch(candidate.title);
  const candidateTitleClean = normalizeForMatch(cleanTitle(candidate.title));
  const targetArtist = normalizeForMatch(wantedArtist);
  const targetTitle = normalizeForMatch(wantedTitle);
  const targetTitleClean = normalizeForMatch(cleanTitle(wantedTitle));

  // 1. 아티스트 판정: 전체가 같으면 2점, 참여 아티스트 중 하나가 같으면 1점
  let artistScore = 0;
  if (candidateArtist === targetArtist) {
    artistScore = 2;
  } else {
    const candidateArtists = splitArtists(candidate.artist);
    const targetArtists = splitArtists(wantedArtist);
    if (candidateArtists.some((name) => targetArtists.includes(name))) {
      artistScore = 1;
    }
  }
  if (artistScore === 0) return -1;

  // 2. 제목 판정: 완전히 같으면 3점, 부가 표기를 뗀 형태가 같으면 2점
  let titleScore = 0;
  if (candidateTitle === targetTitle) {
    titleScore = 3;
  } else if (
    candidateTitleClean === targetTitleClean ||
    candidateTitleClean === targetTitle ||
    candidateTitle === targetTitleClean
  ) {
    titleScore = 2;
  } else if (
    artistScore === 2 &&
    (candidateTitle.startsWith(`${targetTitle} `) ||
      targetTitle.startsWith(`${candidateTitle} `))
  ) {
    // 아티스트가 정확히 같을 때만, 한쪽 제목이 다른 쪽으로 시작하는 경우를 허용합니다.
    titleScore = 1;
  } else {
    return -1;
  }

  return artistScore + titleScore;
}

/**
 * 후보 중에서 요청한 곡과 가장 잘 맞는 하나를 고릅니다.
 * 확실한 후보가 없으면 null을 돌려주므로, 호출부는 다른 곡을 보여 주는 대신
 * URL에 담긴 제목과 아티스트를 그대로 쓸 수 있습니다.
 */
export function pickBestMatch<T extends MatchableTrack>(
  candidates: T[],
  artist: string,
  title: string
): T | null {
  const scored = candidates
    .map((track) => ({ track, score: matchScore(track, artist, title) }))
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) return null;

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 점수가 같으면 제목이 짧은 쪽(리믹스보다 원곡)을 고릅니다.
    return a.track.title.length - b.track.title.length;
  });

  return scored[0].track;
}
