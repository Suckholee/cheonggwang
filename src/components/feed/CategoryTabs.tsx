"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check } from "lucide-react";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  { value: "restaurant", label: "음식점" },
  { value: "salon", label: "미용실" },
  { value: "cafe", label: "카페" },
];

export function CategoryTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const currentParam = sp.get("category") ?? "";
  const selectedCategories = currentParam ? currentParam.split(",") : [];

  function handleToggle(value: string) {
    const params = new URLSearchParams(sp);

    if (value === "all") {
      params.delete("category");
    } else {
      let nextSelected: string[];
      if (selectedCategories.includes(value)) {
        nextSelected = selectedCategories.filter((v) => v !== value);
      } else {
        nextSelected = [...selectedCategories, value];
      }

      if (nextSelected.length > 0) {
        params.set("category", nextSelected.join(","));
      } else {
        params.delete("category");
      }
    }

    const qs = params.toString();
    const targetPath = pathname || "/discover";
    router.replace(qs ? `${targetPath}?${qs}` : targetPath, { scroll: false });
  }

  const isAllActive = selectedCategories.length === 0;

  return (
    <nav
      aria-label="업종 필터"
      className="flex items-center gap-1.5 overflow-x-auto select-none"
    >
      {CATEGORIES.map((c) => {
        const active = c.value === "all" ? isAllActive : selectedCategories.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => handleToggle(c.value)}
            className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 border ${
              active
                ? "bg-[#2563EB] border-[#2563EB] text-white shadow-xs dark:bg-blue-600 dark:border-blue-600"
                : "bg-zinc-100/80 border-transparent text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {active && c.value !== "all" && <Check className="h-3 w-3 shrink-0" />}
            {c.label}
          </button>
        );
      })}
    </nav>
  );
}
