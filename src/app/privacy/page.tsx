import React from 'react';
import Link from 'next/link';
import { getLanguageFromHeaders } from '@/lib/server-utils';
import { CONTACT_EMAIL } from '@/lib/site';

interface PolicySection {
  title: string;
  body: string;
  /** 본문 뒤에 목록으로 덧붙일 항목 */
  list?: string[];
  /** 목록 뒤에 이어 붙일 설명 */
  note?: string;
}

interface PrivacyCopy {
  title: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
  contactTitle: string;
  contactDesc: string;
  back: string;
}

const PRIVACY_TEXT: Record<'ko' | 'en', PrivacyCopy> = {
  ko: {
    title: "개인정보처리방침",
    updated: "최종 수정일: 2026년 9월 13일",
    intro:
      "Transfy는 이용자를 식별할 수 있는 정보를 서버에 쌓아 두지 않습니다. 회원 정보나 접속 기록을 담는 데이터베이스를 아예 운영하지 않기 때문입니다. 아래에서 어떤 정보를 무엇에 쓰고, 어디로 보내며, 얼마나 보관하는지 설명합니다.",
    sections: [
      {
        title: "1. 스포티파이 계정 연동",
        body: "스포티파이 계정으로 로그인하시면 다음 정보를 읽어 화면에 보여 줍니다. 읽어 온 정보는 화면을 그리는 데에만 쓰고 서버에 저장하지 않습니다.",
        list: [
          "지금 재생 중인 곡과 재생 위치 (가사를 맞추어 보여 주기 위해 필요합니다)",
          "최근에 들은 곡, 자주 듣는 곡과 아티스트, 내 플레이리스트 목록 (홈 화면의 목록에 씁니다)",
        ],
        note:
          "로그인할 때 발급받은 접근 토큰과 스포티파이가 알려 주는 기본 프로필(표시 이름, 이메일 주소, 프로필 사진 주소)은 암호화된 세션 쿠키에 담겨 이용자의 브라우저에만 보관됩니다. 프로필 정보는 화면에 보여 주거나 따로 활용하지 않습니다. 로그아웃하시면 이 쿠키가 지워지며, 스포티파이 계정 설정의 앱 관리 화면에서 Transfy의 접근 권한을 언제든지 회수하실 수 있습니다.",
      },
      {
        title: "2. 외부 서비스로 전달되는 정보",
        body: "가사와 번역을 가져오려면 아래와 같이 외부 서비스에 요청을 보내야 합니다. 요청은 모두 Transfy 서버에서 보내며, 이용자를 식별할 수 있는 정보는 함께 보내지 않습니다.",
        list: [
          "LRCLIB: 가사를 찾기 위해 곡 제목, 아티스트, 앨범, 재생 시간을 보냅니다.",
          "구글 번역: 번역을 위해 가사 원문과 번역할 언어를 보냅니다.",
          "스포티파이, 아이튠즈: 곡을 검색하고 발매 당시의 표기를 확인하기 위해 검색어와 곡 정보를 보냅니다.",
        ],
        note:
          "전달된 정보를 각 서비스가 어떻게 처리하는지는 해당 서비스의 방침을 따릅니다.",
      },
      {
        title: "3. 서버에 잠시 보관하는 정보",
        body: "같은 곡을 반복해서 조회하고 번역하지 않도록, 가사 원문은 7일, 번역 결과는 30일 동안 서버 캐시에 보관합니다. 캐시에는 곡 정보와 가사, 번역문만 들어가고 누가 조회했는지는 남지 않으며, 정해진 기간이 지나면 자동으로 지워집니다.",
      },
      {
        title: "4. 방문 통계",
        body: "서비스가 어떻게 쓰이는지 파악하기 위해 Vercel Web Analytics로 방문 통계를 집계합니다. 쿠키를 사용하지 않고 IP 주소도 저장하지 않으며, 화면 이동 외에 다음과 같은 익명 통계를 함께 봅니다.",
        list: [
          "가사 화면을 어디에서 열었는지(검색, 인기 차트, 하단 바 등)와 화면 언어",
          "가사를 찾았는지 여부, 번역 언어, 번역을 캐시에서 바로 가져왔는지 여부",
          "검색 결과가 있었는지 여부",
        ],
        note: "어느 항목에도 개인을 알아볼 수 있는 값은 들어가지 않습니다.",
      },
      {
        title: "5. 방침의 변경",
        body: "처리 방침이 바뀌면 바뀐 내용과 최종 수정일을 이 화면에 함께 반영합니다.",
      },
    ],
    contactTitle: "6. 문의와 오류 제보",
    contactDesc:
      "개인정보 처리에 관해 궁금한 점이 있으시거나, 서비스를 이용하시다가 이상한 점을 발견하셨다면 아래 주소로 알려 주세요. 보내 주신 내용은 확인 후 처리하며, 문의에 답변하는 목적 외에는 사용하지 않습니다.",
    back: "← 홈으로 돌아가기",
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: September 13, 2026",
    intro:
      "Transfy keeps no information on its servers that could identify you, because it runs no database of accounts or access logs at all. The sections below explain what each piece of information is used for, where it is sent, and how long it is kept.",
    sections: [
      {
        title: "1. Signing In with Spotify",
        body: "When you sign in with your Spotify account, Transfy reads the following and shows it on screen. What it reads is used only to render the page and is never stored on a server.",
        list: [
          "The track you are playing and its playback position, which is what lyrics are synced against.",
          "Your recently played tracks, top tracks and artists, and your playlists, which fill the lists on the home screen.",
        ],
        note:
          "The access token issued at sign-in, together with the basic profile Spotify returns (display name, email address, profile image URL), is held in an encrypted session cookie in your browser only. The profile details are neither displayed nor used for anything else. Signing out clears the cookie, and you can revoke Transfy's access at any time from the apps section of your Spotify account settings.",
      },
      {
        title: "2. What Is Sent to Other Services",
        body: "Fetching lyrics and translations requires requests to the services below. Every request is made from the Transfy server and carries nothing that identifies you.",
        list: [
          "LRCLIB: the track title, artist, album, and duration, so the matching lyrics can be found.",
          "Google Translate: the original lyrics and the target language, so they can be translated.",
          "Spotify and iTunes: your search terms and track details, to look up songs and their original release titles.",
        ],
        note: "How each service handles what it receives is governed by that service's own policy.",
      },
      {
        title: "3. What Is Cached on the Server",
        body: "So the same song is not fetched and translated over and over, original lyrics are cached for 7 days and translations for 30 days. A cache entry holds only track details, lyrics, and translated text, never who requested it, and it is discarded automatically once that period passes.",
      },
      {
        title: "4. Visit Statistics",
        body: "To understand how the service is used, Transfy collects visit statistics through Vercel Web Analytics. It sets no cookies and stores no IP addresses. Alongside page views, the following anonymous events are recorded:",
        list: [
          "Where a lyrics page was opened from (search, charts, the bottom bar) and the interface language.",
          "Whether lyrics were found, the translation language, and whether a translation came straight from the cache.",
          "Whether a search returned any results.",
        ],
        note: "None of these events carry any value that could identify an individual.",
      },
      {
        title: "5. Changes to This Policy",
        body: "When this policy changes, the new text and the date above are updated on this page.",
      },
    ],
    contactTitle: "6. Contact and Bug Reports",
    contactDesc:
      "If you have any question about how your data is handled, or if you notice anything odd while using Transfy, please let us know at the address below. We use what you send only to answer your message.",
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

        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">{t.title}</h1>
          <p className="text-sm text-zinc-500">{t.updated}</p>
        </div>

        <p className="text-zinc-400">{t.intro}</p>

        {t.sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <h2 className="text-2xl font-semibold">{section.title}</h2>
            <p className="text-zinc-400">{section.body}</p>
            {section.list && (
              <ul className="list-disc space-y-1.5 pl-5 text-zinc-400 marker:text-zinc-600">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.note && <p className="text-zinc-400">{section.note}</p>}
          </section>
        ))}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t.contactTitle}</h2>
          <p className="text-zinc-400">{t.contactDesc}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block text-blue-400 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <div className="pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:underline">{t.back}</Link>
        </div>
      </div>
    </div>
  );
}
