import React from 'react';
import Link from 'next/link';
import { getLanguageFromHeaders } from '@/lib/server-utils';

const PRIVACY_TEXT = {
  ko: {
    title: "개인정보처리방침",
    collectTitle: "1. 수집하는 정보",
    collectDesc: "Transfy를 사용할 때 다음과 같은 정보를 수집할 수 있습니다:",
    collectList: [
      "가사 동기화를 위한 음악 서비스 계정 정보 (Spotify)",
      "서비스 개선을 위한 사용 데이터 (예: 번역된 노래, 언어 설정)",
      "분석 및 보안을 위한 브라우저 및 기기 정보 (IP 주소, 사용자 에이전트)"
    ],
    useTitle: "2. 정보 사용 방법",
    useDesc: "수집한 정보는 다음과 같이 사용됩니다:",
    useList: [
      "서비스 제공 및 유지 관리",
      "현재 재생 중인 노래와 가사 동기화",
      "서비스 사용량 모니터링",
      "기술적 문제 감지, 예방 및 해결"
    ],
    back: "← 홈으로 돌아가기",
  },
  en: {
    title: "Privacy Policy",
    collectTitle: "1. Information We Collect",
    collectDesc: "When you use Transfy, we may collect the following information:",
    collectList: [
      "Music Service Account Information (Spotify) to sync lyrics.",
      "Usage Data (e.g., songs translated, language preferences) for service improvement.",
      "Browser and Device Information (IP address, User Agent) for analytics and security."
    ],
    useTitle: "2. How We Use Your Information",
    useDesc: "We use the information we collect to:",
    useList: [
      "Provide and maintain our Service.",
      "Sync lyrics with your current music playback.",
      "Monitor the usage of our Service.",
      "Detect, prevent and address technical issues."
    ],
    back: "← Back to Home",
  },
};

export default async function PrivacyPage() {
  const lang = await getLanguageFromHeaders();
  const t = PRIVACY_TEXT[lang === 'ko' ? 'ko' : 'en'];

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
          <h2 className="text-2xl font-semibold">{t.collectTitle}</h2>
          <p className="text-zinc-400">{t.collectDesc}</p>
          <ul className="list-disc list-inside text-zinc-400 ml-4">
            {t.collectList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t.useTitle}</h2>
          <p className="text-zinc-400">{t.useDesc}</p>
          <ul className="list-disc list-inside text-zinc-400 ml-4">
            {t.useList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <div className="pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:underline">{t.back}</Link>
        </div>
      </div>
    </div>
  );
}
