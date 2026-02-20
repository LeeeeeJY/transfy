"use client";

import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const UI_TEXT = {
  ko: {
    footerTerms: "이용약관",
    footerPrivacy: "개인정보처리방침",
    disclaimer: "이 프로젝트는 교육 목적으로 제작된 비상업적 개인 프로젝트입니다. 가사 데이터는 LRCLIB에서 제공받으며, 모든 저작권은 원작자에게 있습니다.",
  },
  en: {
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    disclaimer: "This is a non-commercial personal project for educational purposes only. Lyrics data provided by LRCLIB. All rights belong to their respective owners.",
  },
  ja: {
    footerTerms: "利用規約",
    footerPrivacy: "プライバシーポリシー",
    disclaimer: "このプロジェクトは教育目的で作成された非営利の個人プロジェクトです。歌詞データはLRCLIBから提供されており、すべての著作権は原作者に帰属します。",
  },
  zh: {
    footerTerms: "服务条款",
    footerPrivacy: "隐私政策",
    disclaimer: "本项目仅供教育目的使用的非商业个人项目。歌词数据由LRCLIB提供，所有权利属于原作者。",
  },
};

export default function Footer() {
  const { data: session } = useSession();
  const { uiLanguage } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLang = mounted ? (uiLanguage as keyof typeof UI_TEXT) || "en" : "en";
  const t = UI_TEXT[currentLang] || UI_TEXT.en;

  // If logged in, hide the footer to prevent "double footer" look with the player bar
  // The player bar acts as the primary bottom element for logged-in users
  if (session) {
    return null;
  }

  return (
    <footer className="w-full bg-black border-t border-zinc-800 flex flex-col items-center">
      {/* Disclaimer */}
      <div className="w-full max-w-7xl mx-auto pt-6 px-6 text-center">
        <p className="text-xs text-zinc-600 max-w-2xl mx-auto">
          {t.disclaimer}
        </p>
      </div>

      {/* Copyright & Links - Removed extra padding/gap */}
      <div className="w-full max-w-7xl mx-auto py-4 px-6 flex flex-col md:flex-row justify-between items-center text-sm text-zinc-500 gap-2">
        <p>&copy; {new Date().getFullYear()} Transfy. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-white transition-colors">
            {t.footerTerms}
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            {t.footerPrivacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
