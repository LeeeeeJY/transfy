"use client";

import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import AdSense from "@/components/AdSense";
import { useState, useEffect } from "react";

const UI_TEXT = {
  ko: {
    footerRights: "Transfy. All rights reserved.",
    footerTerms: "이용약관",
    footerPrivacy: "개인정보처리방침",
  },
  en: {
    footerRights: "Transfy. All rights reserved.",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
  },
  ja: {
    footerRights: "Transfy. All rights reserved.",
    footerTerms: "利用規約",
    footerPrivacy: "プライバシーポリシー",
  },
  zh: {
    footerRights: "Transfy. All rights reserved.",
    footerTerms: "服务条款",
    footerPrivacy: "隐私政策",
  },
};

export default function Footer() {
  const { uiLanguage } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLang = mounted ? (uiLanguage as keyof typeof UI_TEXT) || "en" : "en";
  const t = UI_TEXT[currentLang] || UI_TEXT.en;

  return (
    <footer className="w-full bg-black border-t border-zinc-800 flex flex-col items-center">
      {/* Footer Ad */}
      <div className="w-full flex justify-center py-4 bg-zinc-900/30">
        <div className="w-full max-w-[728px]">
           <AdSense className="w-full" style={{ minHeight: "90px", display: "block" }} format="auto" />
        </div>
      </div>

      {/* Copyright & Links - Removed extra padding/gap */}
      <div className="w-full max-w-7xl mx-auto py-4 px-6 flex flex-col md:flex-row justify-between items-center text-sm text-zinc-500 gap-2">
        <p>&copy; {new Date().getFullYear()} {t.footerRights}</p>
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
