import { headers } from "next/headers";

/** 화면에 쓰는 언어 코드 */
export type UiLanguage = "ko" | "en" | "ja" | "zh";

export async function getLanguageFromHeaders(): Promise<UiLanguage> {
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
