import { Suspense } from 'react';
import { getLanguageFromHeaders } from "@/lib/server-utils";
import SearchClient from "@/components/SearchClient";

export async function generateMetadata() {
  const lang = await getLanguageFromHeaders();
  
  const titleMap: Record<string, string> = {
    ko: "실시간 가사 검색",
    en: "Real-time Lyrics Search",
    ja: "リアルタイム歌詞検索",
    zh: "实时歌词搜索"
  };

  const title = titleMap[lang] || titleMap.en;

  return {
    title: `${title} | Transfy`,
    description: "Search for your favorite songs and get real-time translated lyrics.",
  };
}

export default async function SearchPage() {
  const lang = await getLanguageFromHeaders();
  const isKo = lang === "ko";

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8 mt-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">
            {isKo ? "가사를 검색해보세요" : 
             lang === "ja" ? "歌詞を検索" :
             lang === "zh" ? "搜索歌词" :
             "Search for Lyrics"}
          </h1>
          <p className="text-white/60">
            {isKo 
              ? "전 세계 모든 노래의 가사를 찾아 번역해드립니다." 
              : lang === "ja"
              ? "世界中の曲の歌詞を検索して翻訳します。"
              : lang === "zh"
              ? "查找并翻译全球歌曲的歌词。"
              : "Find lyrics and translations for songs worldwide."}
          </p>
        </div>

        {/* Client Component for Search Logic */}
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SearchClient initialLang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
