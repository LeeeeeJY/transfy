/**
 * 스포티파이 Web API 헬퍼.
 *
 * 이 서비스는 재생을 제어하지 않고, 지금 무엇을 재생 중인지만 읽어 가사를
 * 맞춰 보여 줍니다. 재생 제어 API는 프리미엄 계정과 활성 기기를 요구하고
 * 모바일 브라우저에서는 신뢰할 수 없어 제거했습니다. 반면 재생 상태 조회는
 * 무료 계정에서도 동작합니다.
 */
export async function getCurrentlyPlaying(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 204는 재생 중인 곡이 없다는 뜻이고, 401은 토큰이 만료된 것입니다.
  // 두 경우를 구분해 두지 않으면 "재생 없음"과 "인증 실패"를 알 수 없습니다.
  if (res.status === 401) {
    console.warn("Spotify: 액세스 토큰이 만료되었습니다. 다시 로그인해야 합니다.");
    return null;
  }

  if (res.status === 204 || !res.ok) {
    return null;
  }

  return res.json();
}
