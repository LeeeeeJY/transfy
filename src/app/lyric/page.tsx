import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders, getClientIp } from "@/lib/server-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Song Lyrics | Transfy",
  description: "Real-time lyrics translation for Spotify and Apple Music.",
};

export default async function LyricRootPage() {
  const lang = await getLanguageFromHeaders();
  const country = await getCountryFromHeaders();
  const ip = await getClientIp();

  return (
    <ClientHome
      initialLang={lang}
      initialCountry={country}
      initialIp={ip}
      isLyricPageInitial={true}
    />
  );
}
