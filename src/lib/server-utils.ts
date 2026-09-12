import { headers } from "next/headers";

export async function getLanguageFromHeaders(): Promise<"ko" | "en" | "ja" | "zh"> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");

  if (!acceptLanguage) return "ko"; // Default fallback to Korean

  const primaryLang = acceptLanguage.split(",")[0].trim().toLowerCase();

  if (primaryLang.startsWith("ko")) return "ko";
  if (primaryLang.startsWith("ja")) return "ja";
  if (primaryLang.startsWith("zh")) return "zh";
  if (primaryLang.startsWith("en")) return "en";

  return "en"; // Default for other languages
}
