import {
  isQuoteCategory,
  type QuoteCategory,
} from "@/domain/quote-category";
import type { SearchFilters } from "@/types/search";

/**
 * v1.2 #2 provider-search — URL 쿼리 파라미터 → SearchFilters (pure).
 * Invalid 값은 default/null 처리.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchFilters {
  const catRaw = typeof raw.cat === "string" ? raw.cat : null;
  const category: QuoteCategory | null =
    catRaw && isQuoteCategory(catRaw) ? (catRaw as QuoteCategory) : null;

  const city = typeof raw.city === "string" ? raw.city : null;
  const district = typeof raw.district === "string" ? raw.district : null;
  const region = city && district ? { city, district } : null;

  const insuredOnly = raw.insured === "1";
  const minRating = raw.minRating === "4" ? 4.0 : null;

  const sort: SearchFilters["sort"] =
    raw.sort === "rating" ? "rating" : "repeatRate";

  return { category, region, insuredOnly, minRating, sort };
}
