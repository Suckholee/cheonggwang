import type { Provider } from "@/types/provider";
import type { PriceSummary } from "@/types/client-dashboard";
import {
  QUOTE_CATEGORIES,
  type QuoteCategory,
} from "@/domain/quote-category";

/**
 * v1.1b #5 client-dashboard — 카테고리별 평균가 집계 (순수 함수).
 *
 * v2+ analytics-batch로 교체 시 이 함수는 제거되고
 * `dashboardSnapshots/{weekKey}` 문서가 동일 shape 반환 → UI 불변.
 */
export function computeAveragePrices(
  providers: Provider[],
): Record<QuoteCategory, PriceSummary> {
  const byCategory = new Map<QuoteCategory, number[]>();
  for (const p of providers) {
    for (const entry of p.priceBook ?? []) {
      if (!byCategory.has(entry.category)) {
        byCategory.set(entry.category, []);
      }
      byCategory.get(entry.category)!.push(entry.basePrice);
    }
  }

  const result = {} as Record<QuoteCategory, PriceSummary>;
  for (const cat of QUOTE_CATEGORIES) {
    const prices = byCategory.get(cat) ?? [];
    if (prices.length === 0) {
      result[cat] = {
        category: cat,
        sampleCount: 0,
        min: null,
        avg: null,
        max: null,
      };
    } else {
      const sum = prices.reduce((a, b) => a + b, 0);
      result[cat] = {
        category: cat,
        sampleCount: prices.length,
        min: Math.min(...prices),
        avg: Math.round(sum / prices.length),
        max: Math.max(...prices),
      };
    }
  }
  return result;
}
