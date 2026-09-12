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
 * 괄호나 대시로 시작하는 부가 표기를 떼어 낸 제목을 돌려줍니다.
 * "Dynamite (Acoustic Version)" → "dynamite"
 */
function baseTitle(title: string): string {
  const cut = title.split(/[([]| - /)[0];
  return normalizeForMatch(cut);
}

/**
 * 부가 표기만 다른 같은 곡인지 판정합니다.
 *
 * 한쪽이 부가 표기를 전혀 갖고 있지 않을 때만 인정합니다. 그래서
 * "Dynamite (Acoustic)"과 "Dynamite"는 같은 곡으로 보지만,
 * "Song (Part 1)"과 "Song (Part 2)"처럼 양쪽 모두 표기가 붙어 서로 다른 곡일 수
 * 있는 경우는 인정하지 않습니다.
 *
 * 제목의 앞부분만 겹치는지 보는 방식(예: "Love"와 "Love Song")은 쓰지 않습니다.
 * 그렇게 하면 이름이 비슷한 다른 곡이 열리는, 지금 고치려는 그 문제가 남습니다.
 */
function sameBaseTitle(candidateTitle: string, wantedTitle: string): boolean {
  const candidateBase = baseTitle(candidateTitle);
  const wantedBase = baseTitle(wantedTitle);

  if (!candidateBase || candidateBase !== wantedBase) return false;

  const candidateHasNoSuffix = candidateBase === normalizeForMatch(candidateTitle);
  const wantedHasNoSuffix = wantedBase === normalizeForMatch(wantedTitle);

  return candidateHasNoSuffix || wantedHasNoSuffix;
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
  } else if (sameBaseTitle(candidate.title, wantedTitle)) {
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
