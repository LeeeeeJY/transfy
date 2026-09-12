"use server";

import { unstable_cache } from "next/cache";
import { translate } from "google-translate-api-x";

/**
 * 번역 결과 캐시 수명(30일).
 * 기존에는 Supabase의 translation_cache 테이블이 이 역할을 맡았지만,
 * 지금은 Next.js 데이터 캐시(배포 환경에서는 Vercel Data Cache)에 저장합니다.
 * 덕분에 별도의 데이터베이스를 운영하지 않아도 모든 사용자가 같은 캐시를 공유합니다.
 */
const TRANSLATION_CACHE_SECONDS = 60 * 60 * 24 * 30;

/** 캐시 적중 여부를 판별하는 기준 시간(ms) */
const CACHE_HIT_THRESHOLD_MS = 1500;

/** 번역 API 자체가 실패했음을 알리는 오류 (캐시 계층 오류와 구분하기 위함) */
class TranslationFailedError extends Error {
  constructor(cause: unknown) {
    super("Translation request failed");
    this.name = "TranslationFailedError";
    this.cause = cause;
  }
}

interface TranslatedPayload {
  texts: string[];
  /** 실제로 번역을 수행한 시각. 캐시 적중 여부를 판별하는 데 씁니다. */
  at: number;
}

function normalizeTargetLang(targetLang: string): string {
  // 'zh'는 간체 중국어(zh-CN)로 매핑합니다.
  return targetLang === "zh" ? "zh-CN" : targetLang;
}

/**
 * 실제로 번역 API를 호출합니다.
 * 결과가 어긋나면 예외를 던져서, 잘못된 번역이 캐시에 남지 않게 합니다.
 */
async function translateOnce(texts: string[], lang: string): Promise<TranslatedPayload> {
  try {
    // 배열을 넘기면 결과도 같은 순서의 배열로 돌아옵니다.
    const result = await translate(texts, { to: lang });
    const translated = result.map((r) => r.text);

    if (
      translated.length !== texts.length ||
      translated.some((text) => typeof text !== "string")
    ) {
      throw new Error("Translation result length mismatch");
    }

    return { texts: translated, at: Date.now() };
  } catch (error) {
    throw new TranslationFailedError(error);
  }
}

/**
 * 번역 결과를 데이터 캐시에 저장합니다.
 * 인수 전체가 캐시 키에 포함되므로, 같은 가사와 같은 언어 조합은 한 번만 번역됩니다.
 */
const translateLinesCached = unstable_cache(translateOnce, ["translate-lines-v1"], {
  revalidate: TRANSLATION_CACHE_SECONDS,
});

export interface TranslateLinesResult {
  /** 번역된 문장 배열 (실패 시 원문 그대로) */
  texts: string[];
  /** 서버 캐시에서 바로 응답했는지 여부 */
  fromCache: boolean;
  /** 번역에 실패해 원문을 그대로 돌려준 경우 true */
  failed: boolean;
}

/** 가사 한 곡 분량을 번역합니다. 캐시 적중 여부까지 함께 반환합니다. */
export async function translateLines(
  texts: string[],
  targetLang: string = "ko"
): Promise<TranslateLinesResult> {
  if (texts.length === 0) {
    return { texts: [], fromCache: false, failed: false };
  }

  const lang = normalizeTargetLang(targetLang);

  try {
    const { texts: translated, at } = await translateLinesCached(texts, lang);
    return {
      texts: translated,
      fromCache: Date.now() - at > CACHE_HIT_THRESHOLD_MS,
      failed: false,
    };
  } catch (error) {
    if (error instanceof TranslationFailedError) {
      console.error("Translation Error:", error.cause);
      // 번역에 실패하면 원문을 그대로 보여줍니다.
      return { texts, fromCache: false, failed: true };
    }

    // 캐시 계층에서 문제가 생겨도 번역 기능 자체는 계속 동작해야 하므로,
    // 캐시를 건너뛰고 한 번 더 시도합니다.
    console.error("Translation cache unavailable, translating without cache:", error);
  }

  try {
    const { texts: translated } = await translateOnce(texts, lang);
    return { texts: translated, fromCache: false, failed: false };
  } catch (error) {
    console.error(
      "Translation Error:",
      error instanceof TranslationFailedError ? error.cause : error
    );
    return { texts, fromCache: false, failed: true };
  }
}

/** 기존 호출부 호환용 래퍼 */
export async function translateText(
  text: string | string[],
  targetLang: string = "ko"
): Promise<string[]> {
  const texts = Array.isArray(text) ? text : [text];
  const { texts: translated } = await translateLines(texts, targetLang);
  return translated;
}
