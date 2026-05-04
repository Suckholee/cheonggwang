"use client";

import Link from "next/link";
import {
  Home,
  Building2,
  Wind,
  Truck,
  Sparkles,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_SUBTITLES,
  type QuoteCategory,
} from "@/domain/quote-category";

const CATEGORY_STYLE: Record<
  QuoteCategory,
  { Icon: LucideIcon; tile: string; icon: string }
> = {
  "move-in": {
    Icon: Home,
    tile: "bg-blue-50 dark:bg-blue-950/30",
    icon: "text-blue-600 dark:text-blue-400",
  },
  office: {
    Icon: Building2,
    tile: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  aircon: {
    Icon: Wind,
    tile: "bg-sky-50 dark:bg-sky-950/30",
    icon: "text-sky-600 dark:text-sky-400",
  },
  "move-out": {
    Icon: Truck,
    tile: "bg-violet-50 dark:bg-violet-950/30",
    icon: "text-violet-600 dark:text-violet-400",
  },
  special: {
    Icon: Sparkles,
    tile: "bg-rose-50 dark:bg-rose-950/30",
    icon: "text-rose-600 dark:text-rose-400",
  },
  regular: {
    Icon: CalendarDays,
    tile: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600 dark:text-amber-400",
  },
};

function CategoryCard({ category }: { category: QuoteCategory }) {
  const { Icon, tile, icon } = CATEGORY_STYLE[category];
  return (
    <Link
      href={`/quote/new?category=${category}`}
      className="group flex flex-col items-start gap-3 rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div
        className={`flex h-[42px] w-[42px] items-center justify-center rounded-[14px] ${tile}`}
      >
        <Icon className={`h-6 w-6 ${icon}`} strokeWidth={2} aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5 mt-1">
        <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50">
          {QUOTE_CATEGORY_LABELS[category]}
        </span>
        <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
          {QUOTE_CATEGORY_SUBTITLES[category]}
        </span>
      </div>
    </Link>
  );
}

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3">
      {QUOTE_CATEGORIES.map((c) => (
        <CategoryCard key={c} category={c} />
      ))}
    </div>
  );
}
