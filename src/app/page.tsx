import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders, getClientIp } from "@/lib/server-utils";

export default async function Home() {
  // Detect language, country, and IP on server side
  const lang = await getLanguageFromHeaders();
  const country = await getCountryFromHeaders();
  const ip = await getClientIp();

  return <ClientHome initialLang={lang} initialCountry={country} initialIp={ip} />;
}
