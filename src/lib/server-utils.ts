import { headers } from "next/headers";

export async function getLanguageFromHeaders(): Promise<"ko" | "en" | "ja" | "zh"> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");

  if (!acceptLanguage) return "ko"; // Default fallback

  // Parse first language from Accept-Language header (e.g., "en-US,en;q=0.9,ko;q=0.8")
  const primaryLang = acceptLanguage.split(",")[0].trim().toLowerCase();

  if (primaryLang.startsWith("ko")) return "ko";
  if (primaryLang.startsWith("ja")) return "ja";
  if (primaryLang.startsWith("zh")) return "zh";
  if (primaryLang.startsWith("en")) return "en";

  return "en"; // Default for other languages
}

export async function getCountryFromHeaders(): Promise<string> {
  const headersList = await headers();
  // Vercel provided header
  const country = headersList.get("x-vercel-ip-country");
  return country || "Unknown";
}
