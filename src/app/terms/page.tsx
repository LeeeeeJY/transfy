import React from 'react';
import Link from 'next/link';
import { getLanguageFromHeaders } from '@/lib/server-utils';

const TERMS_TEXT = {
  ko: {
    title: "이용약관",
    introTitle: "1. 소개",
    introDesc: "Transfy에 오신 것을 환영합니다. 본 웹사이트에 접속함으로써 귀하는 본 이용약관, 모든 적용 가능한 법률 및 규정을 준수할 것에 동의하며, 적용 가능한 현지 법률을 준수할 책임이 있음에 동의합니다.",
    licenseTitle: "2. 사용 라이선스",
    licenseDesc: "개인적, 비상업적 일시적 열람만을 목적으로 Transfy의 자료(정보 또는 소프트웨어) 사본 1부를 일시적으로 다운로드할 수 있는 권한이 부여됩니다.",
    disclaimerTitle: "3. 면책 조항",
    disclaimerDesc: "Transfy 웹사이트의 자료는 '있는 그대로' 제공됩니다. Transfy는 명시적이든 묵시적이든 어떠한 보증도 하지 않으며, 이에 따라 상품성, 특정 목적에의 적합성, 지식재산권 비침해 또는 기타 권리 침해에 대한 묵시적 보증 또는 조건을 포함하되 이에 국한되지 않는 모든 다른 보증을 부인하고 무효화합니다.",
    back: "← 홈으로 돌아가기",
  },
  en: {
    title: "Terms of Service",
    introTitle: "1. Introduction",
    introDesc: "Welcome to Transfy. By accessing our website, you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.",
    licenseTitle: "2. Use License",
    licenseDesc: "Permission is granted to temporarily use Transfy for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.",
    disclaimerTitle: "3. Disclaimer",
    disclaimerDesc: "The materials on Transfy's website are provided on an 'as is' basis. Transfy makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
    back: "← Back to Home",
  },
  // Add other languages as needed (fallback to en)
};

export default async function TermsPage() {
  const lang = await getLanguageFromHeaders();
  const t = TERMS_TEXT[lang === 'ko' ? 'ko' : 'en'];

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-center mb-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Transfy Logo" className="w-16 h-16 rounded-2xl shadow-lg" />
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8 text-center">{t.title}</h1>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t.introTitle}</h2>
          <p className="text-zinc-400">{t.introDesc}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t.licenseTitle}</h2>
          <p className="text-zinc-400">{t.licenseDesc}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t.disclaimerTitle}</h2>
          <p className="text-zinc-400">{t.disclaimerDesc}</p>
        </section>

        <div className="pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:underline">{t.back}</Link>
        </div>
      </div>
    </div>
  );
}
