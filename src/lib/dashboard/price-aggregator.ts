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
const MOCK_FALLBACK: Record<QuoteCategory, PriceSummary> = {
  residential: { category: "residential", sampleCount: 5, min: 250000, avg: 350000, max: 450000 },
  regular: { category: "regular", sampleCount: 3, min: 240000, avg: 280000, max: 320000 },
  construction: { category: "construction", sampleCount: 4, min: 350000, avg: 480000, max: 600000 },
  exterior: { category: "exterior", sampleCount: 2, min: 150000, avg: 250000, max: 350000 },
  sanitation: { category: "sanitation", sampleCount: 3, min: 80000, avg: 120000, max: 180000 },
  specialist: { category: "specialist", sampleCount: 6, min: 90000, avg: 120000, max: 150000 },
  lodging: { category: "lodging", sampleCount: 2, min: 120000, avg: 180000, max: 280000 },
  industrial: { category: "industrial", sampleCount: 2, min: 800000, avg: 1200000, max: 1800000 },
  special: { category: "special", sampleCount: 1, min: 180000, avg: 180000, max: 180000 },
  etc: { category: "etc", sampleCount: 2, min: 300000, avg: 550000, max: 800000 },
};

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
      result[cat] = MOCK_FALLBACK[cat];
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
