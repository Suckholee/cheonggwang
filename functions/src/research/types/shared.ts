/**
 * Shared types duplicated from promo-page (src/types/page.ts).
 * Keep in sync manually until a workspace-level shared package is extracted.
 *
 * Source of truth: ../../../../src/types/page.ts
 */
export type Category = "restaurant" | "salon" | "cafe";

export type SectionType =
  | "hero"
  | "intro"
  | "highlights"
  | "hygiene"
  | "location"
  | "cta";

export const CATEGORIES: readonly Category[] = [
  "restaurant",
  "salon",
  "cafe",
] as const;

export const SECTION_TYPES: readonly SectionType[] = [
  "hero",
  "intro",
  "highlights",
  "hygiene",
  "location",
  "cta",
] as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: "음식점",
  salon: "미용실",
  cafe: "카페",
};

/**
 * §1.2 Hygiene 격리 규약 — keyword-tfidf 분석 프롬프트 등에서 이 어휘가
 * 일반 마케팅 결과에 포함되지 않도록 서버 측 재차 필터에 사용.
 */
export const HYGIENE_KEYWORDS: readonly string[] = [
  "청소",
  "청결",
  "위생",
  "방역",
  "살균",
  "세척",
  "소독",
] as const;

/**
 * 현재 promo-page의 업종별 템플릿 renderOrder (src/lib/templates/*.ts에서 공통).
 * 템플릿 diff 생성 시 비교 기준으로 사용. promo-page 쪽 변경 시 수동 동기화.
 */
export const CURRENT_RENDER_ORDER: readonly SectionType[] = [
  "hero",
  "intro",
  "highlights",
  "hygiene",
  "location",
  "cta",
] as const;
