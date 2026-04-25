"use client";

import { useUpdateSearchParam } from "@/lib/search/use-update-search-param";
import type { SearchFilters } from "@/types/search";

interface Props {
  current: SearchFilters["sort"];
}

export function SortDropdown({ current }: Props) {
  const update = useUpdateSearchParam();
  return (
    <div className="relative shrink-0">
      <select
        aria-label="정렬 기준"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          update("sort", v === "repeatRate" ? null : v);
        }}
        className="appearance-none rounded-[16px] border px-3 py-1.5 text-[13px] font-bold text-zinc-900 pr-6 outline-none transition-colors border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="repeatRate">재계약률순</option>
        <option value="rating">평점순</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="h-3 w-3 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
