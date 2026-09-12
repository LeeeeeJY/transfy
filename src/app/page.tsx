import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders } from "@/lib/server-utils";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguageFromHeaders();

  const titleMap: Record<string, string> = {
    ko: "실시간 가사 번역",
    en: "Real-time Lyrics Translator",
    ja: "リアルタイム歌詞翻訳",
    zh: "实时歌词翻译"
  };

  const title = titleMap[lang] || titleMap.en;

  return {
    title: `${title} | Transfy`,
  };
}

export default async function Home() {
  // Detect language on server side
  const lang = await getLanguageFromHeaders();

  return <ClientHome initialLang={lang} isLyricPageInitial={false} />;
}
