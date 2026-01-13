import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders, getClientIp } from "@/lib/server-utils";
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
  // Detect language, country, and IP on server side
  const lang = await getLanguageFromHeaders();
  const country = await getCountryFromHeaders();
  const ip = await getClientIp();

  return (
    <ClientHome
      initialLang={lang}
      initialCountry={country}
      initialIp={ip}
      isLyricPageInitial={false}
    />
  );
}
