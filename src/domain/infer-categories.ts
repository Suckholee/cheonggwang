import type { QuoteCategory } from "./quote-category";

/**
 * v1.6 community-feed-3panel · H6 — Vision 태그 → QuoteCategory 매핑.
 *
 * partner-promo AI 생성 파이프라인의 `inferCategories(visionTags)`가 사용.
 * Gemini Vision이 돌려주는 키워드(한국어/영어 혼합)를 sub-string으로 매칭해
 * 0~N개의 QuoteCategory를 반환.
 *
 * 설계 원칙:
 *   - 매칭 없으면 빈 배열 (non-cleaning 사진 허용 — 예: 음식·풍경 사진)
 *   - 중복 제거
 *   - 대소문자 무시 + 한국어 공백/어미 허용 (contains 매칭)
 *   - v1은 수작업 큐레이션 테이블. v2는 임베딩 유사도 기반으로 교체 여지.
 *
 * 확장 방법:
 *   - 새 키워드 발견 시 `TAG_TO_CATEGORY` 테이블에 추가.
 *   - 매칭 로그는 Phase 4 `story-generator.ts`에서 집계 예정.
 */

/** 키워드(정규화된 lowercase) → QuoteCategory */
const TAG_TO_CATEGORY: ReadonlyArray<readonly [string, QuoteCategory]> = [
  // ─── residential · 신축·새집·입주·이사 ─────────────────────────────
  ["새집", "residential"],
  ["신축", "residential"],
  ["새아파트", "residential"],
  ["새 아파트", "residential"],
  ["입주", "residential"],
  ["베이크아웃", "residential"],
  ["새집증후군", "residential"],
  ["new apartment", "residential"],
  ["new home", "residential"],
  ["move-in", "residential"],
  ["이사", "residential"],
  ["이삿짐", "residential"],
  ["짐", "residential"],
  ["박스", "residential"],
  ["포장", "residential"],
  ["이삿날", "residential"],
  ["moving", "residential"],
  ["moving box", "residential"],
  ["packing", "residential"],

  // ─── regular · 사무실·업무공간·일상청소 ────────────────────────────
  ["사무실", "regular"],
  ["사무", "regular"],
  ["오피스", "regular"],
  ["책상", "regular"],
  ["회의실", "regular"],
  ["파티션", "regular"],
  ["탕비실", "regular"],
  ["사내", "regular"],
  ["office", "regular"],
  ["cubicle", "regular"],
  ["meeting room", "regular"],
  ["desk", "regular"],
  ["workplace", "regular"],
  ["거실", "regular"],
  ["주방", "regular"],
  ["부엌", "regular"],
  ["욕실", "regular"],
  ["화장실", "regular"],
  ["방", "regular"],
  ["침실", "regular"],
  ["싱크대", "regular"],
  ["식탁", "regular"],
  ["바닥", "regular"],
  ["창문", "regular"],
  ["베란다", "regular"],
  ["현관", "regular"],
  ["living room", "regular"],
  ["kitchen", "regular"],
  ["bathroom", "regular"],
  ["bedroom", "regular"],
  ["sink", "regular"],
  ["floor", "regular"],
  ["window", "regular"],

  // ─── specialist · 에어컨·가전 ────────────────────────────────
  ["에어컨", "specialist"],
  ["냉방기", "specialist"],
  ["실외기", "specialist"],
  ["실내기", "specialist"],
  ["에어컨 필터", "specialist"],
  ["냉방", "specialist"],
  ["air conditioner", "specialist"],
  ["aircon", "specialist"],
  ["ac unit", "specialist"],
  ["hvac", "specialist"],

  // ─── special · 특수(곰팡이·해충·유품·화재) ───────────────
  ["곰팡이", "special"],
  ["해충", "special"],
  ["벌레", "special"],
  ["바퀴벌레", "special"],
  ["기름때", "special"],
  ["화재", "special"],
  ["그을음", "special"],
  ["유품", "special"],
  ["고독사", "special"],
  ["mold", "special"],
  ["mildew", "special"],
  ["pest", "special"],
  ["cockroach", "special"],
  ["grease stain", "special"],
  ["fire damage", "special"],
];

/**
 * Vision 태그 배열에서 QuoteCategory 목록 추론.
 *  - 대소문자 무시
 *  - 부분 문자열 매칭 (예: "거실 소파" → regular)
 *  - 중복 제거
 *  - 매칭 없음 → 빈 배열
 */
export function inferCategories(visionTags: readonly string[]): QuoteCategory[] {
  if (visionTags.length === 0) return [];
  const matches = new Set<QuoteCategory>();
  for (const tag of visionTags) {
    const needle = tag.toLowerCase().trim();
    if (!needle) continue;
    for (const [keyword, category] of TAG_TO_CATEGORY) {
      if (needle.includes(keyword)) {
        matches.add(category);
      }
    }
  }
  return Array.from(matches);
}

/** 테스트/디버그용 — 현재 매핑 테이블 크기 */
export function inferCategoriesTableSize(): number {
  return TAG_TO_CATEGORY.length;
}
