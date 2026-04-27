"use client";

import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { useUpdateSearchParam } from "@/lib/search/use-update-search-param";

interface Props {
  current: QuoteCategory | null;
}

export function CategoryFilter({ current }: Props) {
  const update = useUpdateSearchParam();
  const isActive = current !== null;
  
  return (
    <div className="relative shrink-0">
      <select
        aria-label="카테고리 필터"
        value={current ?? ""}
        onChange={(e) => update("cat", e.target.value || null)}
        className={`appearance-none rounded-[16px] border px-3 py-1.5 text-[13px] font-medium pr-7 outline-none transition-colors ${
          isActive
            ? "border-[#2563EB] bg-[#F0F4FF] text-[#2563EB] dark:border-[#5B8DF6] dark:bg-[#2563EB]/20 dark:text-[#5B8DF6]"
            : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        }`}
      >
        <option value="">카테고리 전체</option>
        {QUOTE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {QUOTE_CATEGORY_EMOJIS[c]} {QUOTE_CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className={`h-3 w-3 ${isActive ? 'text-[#2563EB]' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
