"use client";

import { CategoryFilter } from "./CategoryFilter";
import { RegionFilter } from "./RegionFilter";
import { InsuredToggle } from "./InsuredToggle";
import { MinRatingToggle } from "./MinRatingToggle";
import { SortDropdown } from "./SortDropdown";
import { ResetFiltersButton } from "./ResetFiltersButton";
import { hasAnyFilter, type SearchFilters } from "@/types/search";

interface Props {
  filters: SearchFilters;
}

export function FilterBar({ filters }: Props) {
  const anyActive = hasAnyFilter(filters);
  return (
    <div
      role="search"
      aria-label="청명 필터"
      className="sticky top-0 z-10 mb-3 rounded-[24px] border border-[#dbe8fb] bg-white/92 px-4 py-4 shadow-[0_10px_28px_rgba(43,102,246,0.06)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/92"
    >
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2B66F6]/70">
          Filter & Sort
        </p>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          원하는 조건을 조합해 신뢰도 높은 청명을 빠르게 좁혀보세요.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <SortDropdown current={filters.sort} />
          <div className="mx-1 h-4 w-[1px] shrink-0 bg-[#dbe8fb] dark:bg-zinc-800" />
        </div>
        <CategoryFilter current={filters.category} />
        <RegionFilter current={filters.region} />
        <InsuredToggle on={filters.insuredOnly} />
        <MinRatingToggle on={filters.minRating !== null} />
        {anyActive && <ResetFiltersButton />}
      </div>
    </div>
  );
}
