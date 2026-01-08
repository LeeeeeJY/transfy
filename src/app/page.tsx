import ClientHome from "@/components/ClientHome";
import { getLanguageFromHeaders, getCountryFromHeaders } from "@/lib/server-utils";

export default async function Home() {
  // Detect language & country on server side
  const lang = await getLanguageFromHeaders();
  const country = await getCountryFromHeaders();

  return <ClientHome initialLang={lang} initialCountry={country} />;
}
