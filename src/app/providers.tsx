"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { useSpotifyPoller } from "@/hooks/useSpotifyPoller";
import { useLocalizedTrackNames } from "@/hooks/useLocalizedTrackNames";

function GlobalHooks() {
  // 화면 어디에서나 하단 플레이어가 보이므로 두 훅 모두 여기서 한 번만 돕니다.
  useSpotifyPoller();
  useLocalizedTrackNames();
  return null;
}

/**
 * 세션은 서버에서 미리 읽어 레이아웃이 넘겨 줍니다.
 *
 * 이 값을 넘기지 않으면 첫 화면에서는 항상 로그아웃 상태로 그려졌다가, 브라우저가
 * 세션을 확인한 뒤에야 로그인 상태로 다시 그려집니다. 그래서 이미 로그인한
 * 사용자에게도 로그인 버튼과 로그인 안내 화면이 잠깐 스쳐 지나갔습니다.
 *
 * 로그아웃 상태는 undefined가 아니라 null로 넘어옵니다. SessionProvider는 값이
 * undefined일 때만 "아직 모른다"로 보고 확인 요청을 보내므로, null을 넘기면
 * 로그아웃 상태에서도 불필요한 요청 없이 첫 화면이 그대로 확정됩니다.
 */
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <GlobalHooks />
      {children}
    </SessionProvider>
  );
}
