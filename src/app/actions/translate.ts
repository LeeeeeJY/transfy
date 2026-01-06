"use server";

import { translate } from "google-translate-api-x";

export async function translateText(
  text: string | string[],
  targetLang: string = "ko"
): Promise<string[]> {
  try {
    // Map 'zh' to 'zh-CN' for Simplified Chinese
    const lang = targetLang === "zh" ? "zh-CN" : targetLang;

    const result = await translate(text, { to: lang });

    if (Array.isArray(result)) {
      return result.map(r => r.text);
    }
    return [result.text];
  } catch (error) {
    console.error("Translation Error:", error);
    // Return original text if translation fails
    return Array.isArray(text) ? text : [text];
  }
}
