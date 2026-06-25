import type { TipTopic } from "./tips-generator";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.7 functions side mirror (NEW C2 결의).
 *
 * QuoteCategory MAP — Next.js domain/quote-category.ts와 동일 enum.
 * functions package는 src/ import path 미사용 → 로컬 type 인라인.
 *
 * ⚠️ MIRROR of src/lib/tips/infer-categories.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (inferCategoriesFromTopic 양 패키지).
 */
export type QuoteCategory =
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

const TIP_TO_QUOTE_CATEGORY: Record<TipTopic["category"], QuoteCategory> = {
  bathroom: "regular",
  kitchen: "regular",
  aircon: "specialist",
  living: "regular",
  move: "residential",
  general: "regular",
};

export function inferCategoriesFromTopic(topic: TipTopic): QuoteCategory[] {
  return [TIP_TO_QUOTE_CATEGORY[topic.category]];
}
