"use client";

import { SessionProvider } from "next-auth/react";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";
import { useLocalizedTrackNames } from "@/hooks/useLocalizedTrackNames";

function GlobalHooks() {
  // 화면 어디에서나 하단 플레이어가 보이므로 두 훅 모두 여기서 한 번만 돕니다.
  useSpotifyPoller();
  useLocalizedTrackNames();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalHooks />
      {children}
    </SessionProvider>
  );
}
