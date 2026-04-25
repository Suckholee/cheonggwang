import type { Category } from "../types/shared";
import type { NormalizedSource, RawSource } from "../types/source";
import { cleanAndMask } from "./html-cleaner";

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  restaurant: [
    "맛집",
    "식당",
    "레스토랑",
    "분식",
    "한식",
    "양식",
    "일식",
    "중식",
    "고기",
    "점심",
    "저녁",
    "브런치",
    "술집",
  ],
  salon: [
    "미용실",
    "헤어",
    "컷",
    "펌",
    "염색",
    "디자이너",
    "모발",
    "살롱",
    "스타일링",
    "두피",
  ],
  cafe: [
    "카페",
    "커피",
    "디저트",
    "원두",
    "라떼",
    "로스터리",
    "에스프레소",
    "아메리카노",
    "브런치카페",
  ],
};

const CONFIDENCE_RULE_HIT = 0.75;
const CONFIDENCE_RULE_WEAK = 0.4;

export interface ClassificationResult {
  category: Category | null;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * 키워드 규칙 기반 분류. 수집 쿼리의 업종과 결과의 본문 업종이 다를 때
 * (예: "동네 맛집" 쿼리에 카페 글 포함) 드롭하기 위해 사용한다.
 *
 * 2회 이상 매치 → 높은 신뢰도, 1회 → 약한 신뢰도, 0 → null.
 *
 * @remarks step 8에서 Gemini 1-shot fallback을 추가해 규칙이 약할 때 LLM 판정을 합친다.
 */
export function classifyByRule(source: RawSource): ClassificationResult {
  const text = cleanAndMask(`${source.title} ${source.snippet}`);
  const scores: Array<{ category: Category; count: number; matched: string[] }> = [];

  for (const [category, kws] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [Category, string[]]
  >) {
    const matched = kws.filter((k) => text.includes(k));
    scores.push({ category, count: matched.length, matched });
  }

  scores.sort((a, b) => b.count - a.count);
  const top = scores[0];
  const second = scores[1];

  if (top.count === 0) {
    return { category: null, confidence: 0, matchedKeywords: [] };
  }

  const gap = top.count - (second?.count ?? 0);
  const confidence =
    top.count >= 2 && gap >= 1 ? CONFIDENCE_RULE_HIT : CONFIDENCE_RULE_WEAK;

  return {
    category: top.category,
    confidence,
    matchedKeywords: top.matched,
  };
}

export function toNormalizedSource(
  raw: RawSource,
  result: ClassificationResult
): NormalizedSource | null {
  if (!result.category) return null;
  return {
    ...raw,
    detectedCategory: result.category,
    confidence: result.confidence,
  };
}

/**
 * 수집 대상 카테고리와 분류 결과가 다르면 드롭 (false 반환).
 * confidence 0.5 미만은 드롭.
 */
export function passesCategoryFilter(
  result: ClassificationResult,
  targetCategory: Category,
  minConfidence = 0.5
): boolean {
  if (!result.category) return false;
  if (result.confidence < minConfidence) return false;
  return result.category === targetCategory;
}
