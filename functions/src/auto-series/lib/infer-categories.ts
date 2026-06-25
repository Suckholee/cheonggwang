/**
 * v1.13 cycle #26 · §4.3 (C4 결의) — inferCategories functions 측 minimal 복제.
 *
 * ⚠️ MIRROR of src/domain/infer-categories.ts — keep in sync
 *
 * 핵심 로직만 복제: visionTags → QuoteCategory[] 매핑.
 * 매칭 테이블은 Next.js src 측과 동기화 필요 (자주 변경되지 않음).
 */

type QuoteCategory =
  | "residential"
  | "regular"
  | "construction"
  | "exterior"
  | "sanitation"
  | "specialist"
  | "lodging"
  | "industrial"
  | "special"
  | "etc";

// MIRROR: src/domain/infer-categories.ts의 TAG_TO_CATEGORY 핵심 항목 (자주 매칭되는 keyword만)
const TAG_TO_CATEGORY: Array<[string, QuoteCategory]> = [
  ["aircon", "specialist"],
  ["에어컨", "specialist"],
  ["air conditioner", "specialist"],
  ["office", "regular"],
  ["사무실", "regular"],
  ["코워킹", "regular"],
  ["coworking", "regular"],
  ["입주", "residential"],
  ["이사", "residential"],
  ["move", "residential"],
  ["거실", "regular"],
  ["주방", "regular"],
  ["bathroom", "regular"],
  ["욕실", "regular"],
  ["clinic", "special"],
  ["병원", "special"],
  ["pet", "special"],
];

export function inferCategories(
  visionTags: readonly string[],
): QuoteCategory[] {
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

/**
 * partner.category 1차 + visionTags 2차 enrichment (cycle #19 패턴 그대로).
 */
export function inferCategoriesAuto(
  visionTags: string[],
  partnerCategory: string | null,
): string[] {
  const visionCats = inferCategories(visionTags);
  if (partnerCategory) {
    return [
      partnerCategory,
      ...visionCats.filter((c) => c !== partnerCategory),
    ];
  }
  return visionCats;
}
