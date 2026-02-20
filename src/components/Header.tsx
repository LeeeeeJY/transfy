"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useState, useEffect } from "react";

const UI_TEXT = {
  ko: {
    home: "홈",
    search: "검색",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    login: "로그인",
    logout: "로그아웃",
    servicePreparing: "서비스 준비 중입니다.",
  },
  en: {
    home: "Home",
    search: "Search",
    terms: "Terms",
    privacy: "Privacy",
    login: "Login",
    logout: "Logout",
    servicePreparing: "Service is preparing.",
  },
  ja: {
    home: "ホーム",
    search: "検索",
    terms: "利用規約",
    privacy: "プライバシー",
    login: "ログイン",
    logout: "ログアウト",
    servicePreparing: "サービス準備中です。",
  },
  zh: {
    home: "首页",
    search: "搜索",
    terms: "服务条款",
    privacy: "隐私政策",
    login: "登录",
    logout: "登出",
    servicePreparing: "服务准备中。",
  },
};

interface HeaderProps {
  initialLang?: string;
}

export default function Header({ initialLang = "en" }: HeaderProps) {
  const { data: session } = useSession();
  const { uiLanguage } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  
  // Use initialLang for first render to match server, then switch to store value if available
  // If store value is not set (e.g. first load), use initialLang
  const currentLang = mounted ? (uiLanguage as keyof typeof UI_TEXT) || initialLang : initialLang;
  const t = UI_TEXT[currentLang as keyof typeof UI_TEXT] || UI_TEXT.en;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Transfy Logo"
              className="w-7 h-7 rounded-full"
            />
            <span className="font-bold text-lg text-white">Transfy</span>
          </Link>
          <nav className="flex gap-4 items-center">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
              {t.home}
            </Link>
            <Link href="/search" className="text-sm text-zinc-400 hover:text-white transition-colors">
              {t.search}
            </Link>
            
            {/* Login/Logout Button */}
            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            ) : (
              <button
                onClick={() => signIn("spotify")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg transition-colors font-medium cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.login}</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
