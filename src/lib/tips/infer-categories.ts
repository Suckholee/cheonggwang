import type { TipTopic } from "@/lib/tips/prompt";
import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.7 (NEW C2 결의)
 *
 * TipTopic.category → QuoteCategory MAP.
 * tip post의 categories 필드 채우기에 사용 (community/tips 패널 + provider 카테고리 필터링).
 *
 * ⚠️ MIRROR of functions/src/tips/lib/infer-categories.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (inferCategoriesFromTopic 양 패키지).
 */
const TIP_TO_QUOTE_CATEGORY: Record<TipTopic["category"], QuoteCategory> = {
  bathroom: "regular",
  kitchen: "regular",
  aircon: "aircon",
  living: "regular",
  move: "move-in",
  general: "regular",
};

export function inferCategoriesFromTopic(topic: TipTopic): QuoteCategory[] {
  return [TIP_TO_QUOTE_CATEGORY[topic.category]];
}
