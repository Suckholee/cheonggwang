"use client";

import { useUpdateSearchParam } from "@/lib/search/use-update-search-param";

interface Props {
  on: boolean;
}

export function InsuredToggle({ on }: Props) {
  const update = useUpdateSearchParam();
  return (
    <button
      type="button"
      onClick={() => update("insured", on ? null : "1")}
      className={`shrink-0 rounded-[16px] px-3 py-1.5 text-[13px] font-medium border transition-colors ${
        on 
          ? "border-[#2B66F6] bg-[#F0F4FF] text-[#2B66F6] dark:border-[#5B8DF6] dark:bg-[#2B66F6]/20 dark:text-[#5B8DF6]" 
          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      🛡 배상보험
    </button>
  );
}
