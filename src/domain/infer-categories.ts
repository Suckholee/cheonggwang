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
  // ─── move-in · 신축·새집·입주 ─────────────────────────────
  ["새집", "move-in"],
  ["신축", "move-in"],
  ["새아파트", "move-in"],
  ["새 아파트", "move-in"],
  ["입주", "move-in"],
  ["베이크아웃", "move-in"],
  ["새집증후군", "move-in"],
  ["new apartment", "move-in"],
  ["new home", "move-in"],
  ["move-in", "move-in"],

  // ─── office · 사무실·업무공간 ────────────────────────────
  ["사무실", "office"],
  ["사무", "office"],
  ["오피스", "office"],
  ["책상", "office"],
  ["회의실", "office"],
  ["파티션", "office"],
  ["탕비실", "office"],
  ["사내", "office"],
  ["office", "office"],
  ["cubicle", "office"],
  ["meeting room", "office"],
  ["desk", "office"],
  ["workplace", "office"],

  // ─── aircon · 에어컨·냉방 ────────────────────────────────
  ["에어컨", "aircon"],
  ["냉방기", "aircon"],
  ["실외기", "aircon"],
  ["실내기", "aircon"],
  ["에어컨 필터", "aircon"],
  ["냉방", "aircon"],
  ["air conditioner", "aircon"],
  ["aircon", "aircon"],
  ["ac unit", "aircon"],
  ["hvac", "aircon"],

  // ─── move-out · 이사 나감·짐·박스 ────────────────────────
  ["이사", "move-out"],
  ["이삿짐", "move-out"],
  ["짐", "move-out"],
  ["박스", "move-out"],
  ["포장", "move-out"],
  ["이삿날", "move-out"],
  ["moving", "move-out"],
  ["moving box", "move-out"],
  ["packing", "move-out"],

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

  // ─── regular · 일상 청소 공간 ────────────────────────────
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
