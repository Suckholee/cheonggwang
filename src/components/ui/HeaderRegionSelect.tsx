"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { REGION_PRESETS } from "@/domain/region-presets";
import { MapPin, ChevronDown } from "lucide-react";

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
  const currentLabel = activePreset ? activePreset.label : "전국";

  return (
    <div className="relative flex items-center gap-1 rounded-full bg-zinc-100/80 px-2.5 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-200/60 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer">
      <MapPin className="h-3.5 w-3.5 text-[#2563EB] shrink-0" aria-hidden />
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
      <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
    </div>
  );
}
