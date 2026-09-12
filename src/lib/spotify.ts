// Simple Spotify Web API helper using the user's access token
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

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

/** 기기 목록 조회 (재생 전 활성 기기 확인용) */
export async function getDevices(accessToken: string): Promise<SpotifyDevice[]> {
  const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.devices ?? [];
}

// Play a specific context (album, playlist, artist) or track, or resume if no URI provided.
// deviceId: 404 시 이 기기로 전환 후 재시도 (웹 플레이어 device_id 권장)
export async function play(
  accessToken: string,
  uri?: string,
  deviceId?: string | null
): Promise<boolean> {
  const doPlay = async (): Promise<boolean> => {
    const body = uri
      ? uri.startsWith("spotify:track:")
        ? { uris: [uri] }
        : { context_uri: uri }
      : undefined;

    const res = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 404) return false;
    if (!res.ok) {
      console.error("Spotify Play error:", res.status, await res.text());
      return false;
    }
    return true;
  };

  try {
    if (await doPlay()) return true;

    // 404 → 활성 기기 없음. 기기 목록에서 웹 플레이어(Transfy)만 찾아 전환 후 재시도
    const devices = await getDevices(accessToken);
    const targetId =
      (deviceId && devices.some((d) => d.id === deviceId) ? deviceId : null) ??
      devices.find((d) => d.name === "Transfy Web Player")?.id;
    if (targetId) {
      await transferPlayback(accessToken, targetId);
      await new Promise((r) => setTimeout(r, 400));
      if (await doPlay()) return true;
    }
    return false;
  } catch (error) {
    console.error("Error playing context:", error);
    return false;
  }
}

/** 재생 제어 요청을 보내고 성공 여부를 돌려줍니다. */
async function sendPlayerCommand(
  accessToken: string,
  path: string,
  method: "PUT" | "POST",
  label: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/player/${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) return true;

    // 401: 토큰 만료 / 403: 프리미엄 아님 또는 권한 없음 / 404: 활성 기기 없음
    console.warn(`Spotify ${label} failed:`, res.status);
    return false;
  } catch (error) {
    console.error(`Error ${label}:`, error);
    return false;
  }
}

export async function pause(accessToken: string): Promise<boolean> {
  return sendPlayerCommand(accessToken, "pause", "PUT", "pause");
}

export async function next(accessToken: string): Promise<boolean> {
  return sendPlayerCommand(accessToken, "next", "POST", "next");
}

export async function previous(accessToken: string): Promise<boolean> {
  return sendPlayerCommand(accessToken, "previous", "POST", "previous");
}

export async function transferPlayback(
  accessToken: string,
  deviceId: string,
  options?: { play?: boolean }
) {
  try {
    const res = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: options?.play ?? false,
      }),
    });
    if (!res.ok) {
      console.warn("Transfer playback failed:", res.status);
    }
  } catch (error) {
    console.error("Error transferring playback:", error);
  }
}
