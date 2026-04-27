"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  { value: "restaurant", label: "음식점" },
  { value: "salon", label: "미용실" },
  { value: "cafe", label: "카페" },
];

export function CategoryTabs() {
  const sp = useSearchParams();
  const current = sp.get("category") ?? "all";

  function hrefFor(value: string): string {
    const params = new URLSearchParams(sp);
    if (value === "all") params.delete("category");
    else params.set("category", value);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <nav
      aria-label="업종 필터"
      className="flex items-center gap-1 overflow-x-auto"
    >
      {CATEGORIES.map((c) => {
        const active = current === c.value;
        return (
          <Link
            key={c.value}
            href={hrefFor(c.value)}
            scroll={false}
            className={`rounded-[12px] px-3.5 py-1.5 text-[14px] font-bold whitespace-nowrap transition-colors ${
              active
                ? "bg-[#2563EB] text-white dark:bg-[#5B8DF6]"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
