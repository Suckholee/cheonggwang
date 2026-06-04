"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ChangeEvent } from "react";
import { REGION_PRESETS } from "@/domain/region-presets";

export function RegionSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const current = sp.get("region") ?? "";

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(sp);
    if (e.target.value) params.set("region", e.target.value);
    else params.delete("region");
    const qs = params.toString();
    const targetPath = pathname || "/discover";
    router.replace(qs ? `${targetPath}?${qs}` : targetPath);
  }

  return (
    <div className="relative shrink-0">
      <select
        value={current}
        onChange={handleChange}
        aria-label="지역 선택"
        className="appearance-none font-bold rounded-[12px] border border-zinc-200 bg-white shadow-sm pl-3.5 pr-8 py-1.5 text-[14px] text-zinc-800 outline-none hover:bg-zinc-50 focus:border-[#2563EB] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {REGION_PRESETS.map((p) => (
          <option key={p.label} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg
          className="h-3.5 w-3.5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
