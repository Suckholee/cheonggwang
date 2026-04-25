import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import { hasAnyFilter, type SearchFilters } from "@/types/search";

interface Props {
  filters: SearchFilters;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4ff] px-2.5 py-1 text-[11px] font-semibold text-[#2B66F6] dark:bg-indigo-950/40 dark:text-indigo-300">
      {children}
    </span>
  );
}

export function ActiveFiltersSummary({ filters }: Props) {
  if (!hasAnyFilter(filters)) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {filters.category && (
        <Badge>카테고리 · {QUOTE_CATEGORY_LABELS[filters.category]}</Badge>
      )}
      {filters.region && (
        <Badge>
          지역 · {filters.region.city} {filters.region.district}
        </Badge>
      )}
      {filters.insuredOnly && <Badge>🛡 배상보험</Badge>}
      {filters.minRating !== null && (
        <Badge>⭐ {filters.minRating.toFixed(1)}+</Badge>
      )}
    </div>
  );
}
