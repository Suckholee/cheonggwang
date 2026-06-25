"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Building2,
  CalendarDays,
  Hammer,
  Shield,
  Sparkles,
  Factory,
  type LucideIcon,
} from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
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
  residential: {
    Icon: Home,
    tile: "bg-blue-50/90 border-blue-200/50 dark:bg-blue-950/40 dark:border-blue-900/50",
    icon: "text-blue-600 dark:text-blue-450",
  },
  regular: {
    Icon: CalendarDays,
    tile: "bg-amber-50/90 border-amber-200/50 dark:bg-amber-950/40 dark:border-amber-900/50",
    icon: "text-amber-600 dark:text-amber-400",
  },
  construction: {
    Icon: Hammer,
    tile: "bg-orange-50/90 border-orange-200/50 dark:bg-orange-950/40 dark:border-orange-900/50",
    icon: "text-orange-600 dark:text-orange-400",
  },
  exterior: {
    Icon: Building2,
    tile: "bg-indigo-50/90 border-indigo-200/50 dark:bg-indigo-950/40 dark:border-indigo-900/50",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  sanitation: {
    Icon: Shield,
    tile: "bg-emerald-50/90 border-emerald-200/50 dark:bg-emerald-950/40 dark:border-emerald-900/50",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  specialist: {
    Icon: Sparkles,
    tile: "bg-rose-50/90 border-rose-200/50 dark:bg-rose-950/40 dark:border-rose-900/50",
    icon: "text-rose-600 dark:text-rose-455",
  },
  lodging: {
    Icon: Home,
    tile: "bg-violet-50/90 border-violet-200/50 dark:bg-violet-950/40 dark:border-violet-900/50",
    icon: "text-violet-600 dark:text-violet-400",
  },
  industrial: {
    Icon: Factory,
    tile: "bg-teal-50/90 border-teal-200/50 dark:bg-teal-950/40 dark:border-teal-900/50",
    icon: "text-teal-600 dark:text-teal-400",
  },
  special: {
    Icon: Sparkles,
    tile: "bg-purple-50/90 border-purple-200/50 dark:bg-purple-950/40 dark:border-purple-900/50",
    icon: "text-purple-600 dark:text-purple-400",
  },
  etc: {
    Icon: Building2,
    tile: "bg-zinc-100/90 border-zinc-200/50 dark:bg-zinc-800/40 dark:border-zinc-700/50",
    icon: "text-zinc-600 dark:text-zinc-300",
  },
};

const CATEGORY_IMAGES: Record<QuoteCategory, string> = {
  residential: "/images/cat_move_in.png",
  regular: "/images/cat_regular.png",
  construction: "/images/cat_special.png",
  exterior: "/images/cat_office.png",
  sanitation: "/images/cat_special.png",
  specialist: "/images/cat_aircon.png",
  lodging: "/images/cat_move_in.png",
  industrial: "/images/cat_office.png",
  special: "/images/cat_special.png",
  etc: "/images/cat_office.png",
};

function CategoryCard({ category }: { category: QuoteCategory }) {
  const { Icon, tile, icon } = CATEGORY_STYLE[category];
  const imageSrc = CATEGORY_IMAGES[category];

  return (
    <Link
      href={`/quote/new?category=${category}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/50 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.02)] transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:border-[#2563EB]/40 hover:shadow-[0_12px_32px_rgba(43,102,246,0.12)] active:scale-[0.98] dark:border-zinc-800/60 dark:bg-zinc-950 dark:hover:border-[#5B8DF6]/40"
    >
      {/* Category Image Cover */}
      <div className="relative h-24 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={imageSrc}
          alt={QUOTE_CATEGORY_LABELS[category]}
          fill
          unoptimized={shouldUnoptimizeImage(imageSrc)}
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Floating Mini Icon Badge */}
        <div
          className={`absolute left-3 bottom-3 flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-white/70 shadow-xs backdrop-blur-xs ${tile}`}
        >
          <Icon className={`h-4.5 w-4.5 ${icon}`} strokeWidth={2.5} aria-hidden />
        </div>
      </div>

      {/* Category Text Description */}
      <div className="flex flex-col gap-0.5 p-3.5">
        <span className="text-[14px] font-bold text-zinc-900 group-hover:text-[#2563EB] transition-colors dark:text-zinc-50 dark:group-hover:text-[#5B8DF6]">
          {QUOTE_CATEGORY_LABELS[category]}
        </span>
        <span className="text-[11px] font-medium leading-relaxed text-zinc-400 dark:text-zinc-500">
          {QUOTE_CATEGORY_SUBTITLES[category]}
        </span>
      </div>
    </Link>
  );
}

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-5">
      {QUOTE_CATEGORIES.map((c) => (
        <CategoryCard key={c} category={c} />
      ))}
    </div>
  );
}
export { CategoryGrid };
