"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FORM_REGION_OPTIONS } from "@/domain/region-presets";

interface Props {
  current: { city: string; district: string } | null;
}

export function RegionFilter({ current }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const currentValue = current ? `${current.city}|${current.district}` : "";

  function onChange(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value) {
      next.delete("city");
      next.delete("district");
    } else {
      const found = FORM_REGION_OPTIONS.find((o) => o.value === value);
      if (found) {
        next.set("city", found.region.city);
        next.set("district", found.region.district);
      }
    }
    const qs = next.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  }

  return (
    <div className="relative shrink-0">
      <select
        aria-label="지역 필터"
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-[16px] border px-3 py-1.5 text-[13px] font-medium pr-7 outline-none transition-colors ${
          currentValue
            ? "border-[#2563EB] bg-[#F0F4FF] text-[#2563EB] dark:border-[#5B8DF6] dark:bg-[#2563EB]/20 dark:text-[#5B8DF6]"
            : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        }`}
      >
        <option value="">지역 전체</option>
        {FORM_REGION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className={`h-3 w-3 ${currentValue ? 'text-[#2563EB]' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
