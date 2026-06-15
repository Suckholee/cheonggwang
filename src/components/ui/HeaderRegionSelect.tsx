"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { REGION_PRESETS } from "@/domain/region-presets";
import { MapPin } from "lucide-react";

export function HeaderRegionSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("region") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(sp);
    if (e.target.value) {
      params.set("region", e.target.value);
    } else {
      params.delete("region");
    }
    const qs = params.toString();
    router.replace(qs ? `/discover?${qs}` : "/discover");
  }

  const activePreset = REGION_PRESETS.find((p) => p.value === current);
  const currentLabel = activePreset ? activePreset.label : "서울 성동구";

  return (
    <div className="relative flex items-center gap-1.5 rounded-full border border-[#d8e6ff] bg-white pl-2.5 pr-7 py-1.5 text-zinc-700 shadow-sm transition-colors hover:bg-[#f7fbff] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer">
      <MapPin className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden />
      <select
        value={current}
        onChange={handleChange}
        aria-label="지역 선택"
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
      >
        {REGION_PRESETS.map((p) => (
          <option key={p.label} value={p.value}>
            {p.label === "전국" ? "전국 (지역 선택)" : p.label}
          </option>
        ))}
      </select>
      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 select-none">
        {currentLabel}
      </span>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg
          className="h-3 w-3 text-zinc-400"
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
