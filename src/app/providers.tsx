"use client";

import { SessionProvider } from "next-auth/react";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";

function GlobalHooks() {
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
