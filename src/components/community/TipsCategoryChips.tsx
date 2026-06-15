import Link from "next/link";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  QUOTE_CATEGORY_EMOJIS,
  type QuoteCategory,
} from "@/domain/quote-category";

interface Props {
  active: QuoteCategory | null;
}

export function TipsCategoryChips({ active }: Props) {
  const base = "/community/tips";
  const chipCls =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0";
  const activeCls =
    "border-[#2563EB] bg-[#edf4ff] text-[#2563EB] dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm scale-102";
  const idleCls =
    "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";

  return (
    <nav
      role="tablist"
      aria-label="청소 노하우 카테고리 필터"
      className="flex flex-row flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-none -mx-4 px-4"
    >
      <Link
        href={base}
        role="tab"
        aria-selected={active === null}
        className={`${chipCls} ${active === null ? activeCls : idleCls}`}
      >
        전체
      </Link>
      {QUOTE_CATEGORIES.map((cat) => {
        const isActive = active === cat;
        return (
          <Link
            key={cat}
            href={`${base}?cat=${cat}`}
            role="tab"
            aria-selected={isActive}
            className={`${chipCls} ${isActive ? activeCls : idleCls}`}
          >
            <span aria-hidden className="text-sm">{QUOTE_CATEGORY_EMOJIS[cat]}</span>
            <span>{QUOTE_CATEGORY_LABELS[cat]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
