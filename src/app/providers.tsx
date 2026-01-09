"use client";

import { SessionProvider } from "next-auth/react";
import { useAppleMusic } from "@/hooks/useAppleMusic";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";

function GlobalHooks() {
  useAppleMusic();
  useSpotifyPoller();
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
