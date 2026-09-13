import React from 'react';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';

export interface PolicySection {
  title: string;
  body: string;
  /** 본문 뒤에 목록으로 덧붙일 항목 */
  list?: string[];
  /** 목록 뒤에 이어 붙일 설명 */
  note?: string;
}

export interface PolicyCopy {
  title: string;
  /** 최종 수정일 안내 */
  updated: string;
  intro: string;
  sections: PolicySection[];
  contactTitle: string;
  contactDesc: string;
  back: string;
}

/**
 * 이용약관과 개인정보처리방침이 쓰는 공통 본문 틀입니다.
 *
 * 두 화면은 문구만 다르고 구성이 같으므로, 틀을 한곳에 두어 한쪽만 모양이
 * 달라지는 일이 없게 합니다. 각 화면은 언어별 문구만 넘겨 주면 됩니다.
 */
export default function PolicyDocument({ copy }: { copy: PolicyCopy }) {
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
          <h1 className="text-4xl font-bold">{copy.title}</h1>
          <p className="text-sm text-zinc-500">{copy.updated}</p>
        </div>

        <p className="text-zinc-400">{copy.intro}</p>

        {copy.sections.map((section) => (
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
          <h2 className="text-2xl font-semibold">{copy.contactTitle}</h2>
          <p className="text-zinc-400">{copy.contactDesc}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block text-blue-400 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <div className="pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:underline">{copy.back}</Link>
        </div>
      </div>
    </div>
  );
}
