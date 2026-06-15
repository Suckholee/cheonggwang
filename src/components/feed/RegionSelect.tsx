"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { REGION_PRESETS } from "@/domain/region-presets";
import { MapPin, ChevronDown, Search, X, Check } from "lucide-react";

export function RegionSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const currentParam = sp.get("region") ?? "";
  const initialSelected = currentParam ? currentParam.split(",") : [];
  
  const [localSelected, setLocalSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    setLocalSelected(currentParam ? currentParam.split(",") : []);
  }, [currentParam]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const actualPresets = REGION_PRESETS.filter((p) => p.value !== "");

  const filteredPresets = actualPresets.filter((p) =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let buttonLabel = "전국";
  if (localSelected.length === 1) {
    const preset = REGION_PRESETS.find((p) => p.value === localSelected[0]);
    if (preset) buttonLabel = preset.label;
  } else if (localSelected.length > 1) {
    const preset = REGION_PRESETS.find((p) => p.value === localSelected[0]);
    buttonLabel = preset ? `${preset.label} 외 ${localSelected.length - 1}곳` : `${localSelected.length}개 지역`;
  }

  function handleToggleRegion(value: string) {
    setLocalSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleReset() {
    setLocalSelected([]);
    setSearchQuery("");
  }

  function handleApply() {
    const params = new URLSearchParams(sp);
    if (localSelected.length > 0) {
      params.set("region", localSelected.join(","));
    } else {
      params.delete("region");
    }
    const qs = params.toString();
    const targetPath = pathname || "/discover";
    router.replace(qs ? `${targetPath}?${qs}` : targetPath);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setLocalSelected(initialSelected);
          setSearchQuery("");
        }}
        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <MapPin className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden />
        <span className="select-none">{buttonLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 z-50 w-72 rounded-[22px] border border-[#dbe8fb] bg-white p-4 shadow-[0_12px_36px_rgba(43,102,246,0.12)] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3 dark:border-zinc-900">
            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">지역 다중 선택</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="구/군 또는 시/도 검색..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#2563EB] focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-950 dark:text-zinc-200"
            />
          </div>

          {localSelected.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 max-h-20 overflow-y-auto no-scrollbar">
              {localSelected.map((val) => {
                const label = REGION_PRESETS.find((p) => p.value === val)?.label || "";
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50/70 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#2563EB] dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => handleToggleRegion(val)}
                      className="hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar text-xs">
            {filteredPresets.length === 0 ? (
              <p className="text-center py-6 text-zinc-400 font-medium">검색 결과가 없습니다.</p>
            ) : (
              filteredPresets.map((p) => {
                const checked = localSelected.includes(p.value);
                return (
                  <label
                    key={p.value}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer select-none font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleRegion(p.value)}
                        className="rounded border-zinc-300 text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span>{p.label}</span>
                    </div>
                    {checked && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-zinc-100 mt-3 pt-3 dark:border-zinc-900">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-xl border border-zinc-200 py-2 text-center text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-[1.5] rounded-xl bg-[#2563EB] py-2 text-center text-xs font-bold text-white hover:bg-[#1D4ED8]"
            >
              적용하기 {localSelected.length > 0 && `(${localSelected.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
