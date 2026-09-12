import axios from "axios";

/**
 * 앱 자체 토큰(Client Credentials)을 발급받습니다.
 *
 * 로그인하지 않은 방문자나 공유 링크로 들어온 방문자도 트랙 ID로 곡을 정확히
 * 조회할 수 있도록, 사용자 토큰이 없을 때 이 토큰을 사용합니다.
 * 서버에서만 호출해야 합니다.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const TOKEN_REQUEST_TIMEOUT_MS = 8000;
/** 만료 직전 토큰을 쓰지 않도록 두는 여유 시간 */
const TOKEN_SAFETY_MARGIN_MS = 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) {
    return cachedToken.value;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: TOKEN_REQUEST_TIMEOUT_MS,
      }
    );

    const token: string | undefined = response.data?.access_token;
    const expiresIn: number = response.data?.expires_in ?? 3600;

    if (!token) return null;

    cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  } catch (error) {
    console.warn("Spotify app token error:", (error as Error)?.message || error);
    return null;
  }
}
