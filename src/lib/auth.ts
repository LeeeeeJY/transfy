import { NextAuthOptions, TokenSet, User } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

/**
 * 로그인할 때 요청하는 스포티파이 접근 권한.
 *
 * 동의 화면에는 여기 적은 권한이 그대로 나열되므로, 화면에서 실제로 읽는 정보에
 * 필요한 것만 남깁니다. 쓰지 않는 권한을 남겨 두면 하지도 않는 일을 요구하는
 * 셈이고, 토큰이 새어 나갔을 때 할 수 있는 일도 그만큼 넓어집니다.
 * 권한을 추가하기 전에 그것을 쓰는 코드가 있는지 먼저 확인하세요.
 *
 * 재생 제어(user-modify-playback-state)와 웹 플레이어(streaming) 권한은 해당
 * 기능을 걷어내면서 함께 제거했습니다. 이 서비스는 재생을 제어하지 않습니다.
 * 프로필 권한(user-read-email, user-read-private)도 화면에서 프로필을 쓰지
 * 않으므로 요청하지 않습니다.
 */
const SCOPES = [
  "user-read-currently-playing", // 재생 중인 곡: 가사를 맞추어 보여 주는 데 씁니다
  "user-read-recently-played", // 홈 화면의 최근 들은 곡
  "user-top-read", // 홈 화면의 자주 듣는 곡과 아티스트
  "playlist-read-private", // 홈 화면의 내 플레이리스트
  "playlist-read-collaborative", // 공동 편집 플레이리스트도 목록에 나오게 합니다
].join(" ");

interface ExtendedToken extends TokenSet {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken: string;
  user?: User;
  error?: string;
}

/** 만료 직전 토큰으로 요청하지 않도록 미리 갱신하는 여유 시간 */
const REFRESH_MARGIN_MS = 60 * 1000;

/**
 * 저장된 만료 시각이 이 이상 남아 있으면 잘못 계산된 값으로 봅니다.
 * 스포티파이 액세스 토큰의 수명은 1시간이므로, 하루를 넘길 수 없습니다.
 * 예전 버전이 만료 시각을 수십 년 뒤로 저장해 둔 세션도 이 검사로 걸러
 * 다음 요청에서 정상적으로 갱신됩니다.
 */
const MAX_PLAUSIBLE_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * 계정 정보에서 액세스 토큰의 만료 시각(ms)을 구합니다.
 *
 * `expires_at`은 만료 시각(유닉스 초)이고 `expires_in`은 남은 시간(초)입니다.
 * 둘을 혼동해 현재 시각에 `expires_at`을 더하면 만료 시각이 수십 년 뒤로
 * 계산되어 토큰이 영원히 갱신되지 않습니다.
 */
function resolveAccessTokenExpiry(account: {
  expires_at?: number | null;
  expires_in?: number | null;
}): number {
  if (typeof account.expires_at === "number") {
    return account.expires_at * 1000;
  }
  if (typeof account.expires_in === "number") {
    return Date.now() + account.expires_in * 1000;
  }
  // 값을 받지 못한 경우 스포티파이 기본 수명(1시간)으로 둡니다.
  return Date.now() + 60 * 60 * 1000;
}

/** 저장된 만료 시각을 믿을 수 있는지 확인합니다. */
function hasUsableExpiry(token: ExtendedToken): boolean {
  const expires = token.accessTokenExpires;
  return (
    typeof expires === "number" &&
    Number.isFinite(expires) &&
    expires - Date.now() < MAX_PLAUSIBLE_LIFETIME_MS
  );
}

async function refreshAccessToken(
  token: ExtendedToken,
): Promise<ExtendedToken> {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token
    };
  } catch (error) {
    console.error("RefreshAccessTokenError", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: { scope: SCOPES, show_dialog: "true" },
      },
      token: {
        async request(context) {
          const { provider, params, checks, client } = context;

          let retries = 0;
          const maxRetries = 3;

          while (true) {
            try {
              const tokens = await client.oauthCallback(
                provider.callbackUrl,
                params,
                checks,
              );
              return { tokens };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
              console.log(
                `Token exchange attempt ${retries + 1} failed:`,
                error.message,
              );

              if (retries >= maxRetries) throw error;

              // Exponential backoff: 1s, 2s, 4s
              const delay = 1000 * Math.pow(2, retries);
              await new Promise((resolve) => setTimeout(resolve, delay));
              retries++;
            }
          }
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: resolveAccessTokenExpiry(account),
          refreshToken: account.refresh_token,
          user,
        } as ExtendedToken;
      }

      // 만료 시각이 정상이고 아직 여유가 남아 있으면 기존 토큰을 그대로 씁니다.
      const extendedToken = token as ExtendedToken;
      if (
        hasUsableExpiry(extendedToken) &&
        Date.now() < extendedToken.accessTokenExpires - REFRESH_MARGIN_MS
      ) {
        return token;
      }

      // 만료되었거나 만료 시각을 믿을 수 없으면 갱신합니다.
      if (extendedToken.refreshToken) {
        return refreshAccessToken(extendedToken);
      }

      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.user = token.user;
      // 갱신 실패 시 만료된 토큰 사용 방지 (401 방지)
      session.accessToken = token.error ? null : token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/", // Custom sign-in page (we'll use the main page)
  },
  debug: process.env.NODE_ENV === "development",
};
