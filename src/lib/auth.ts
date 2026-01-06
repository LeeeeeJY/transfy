import { NextAuthOptions, TokenSet } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-read-currently-playing",
].join(" ");

interface ExtendedToken extends TokenSet {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken: string;
  user?: any;
  error?: string;
}

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
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
        params: { scope: SCOPES },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_at as number) * 1000,
          refreshToken: account.refresh_token,
          user,
        } as ExtendedToken;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token as ExtendedToken).accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      // Only refresh for Spotify provider
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (account?.provider === 'spotify' || !(token as any).user) {
        if ((token as ExtendedToken).refreshToken) {
          return refreshAccessToken(token as ExtendedToken);
        }
      }

      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/", // Custom sign-in page (we'll use the main page)
  },
  debug: process.env.NODE_ENV === "development",
};
