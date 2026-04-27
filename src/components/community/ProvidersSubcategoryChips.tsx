import Link from "next/link";
import { PROVIDERS_SUBCATEGORIES } from "@/lib/feed/panel-config";
import type { ProviderStoryCategory } from "@/types/post";

interface Props {
  active: ProviderStoryCategory | null;
}

/**
 * v1.6 (post-merge) · providers 패널 상단 chip 필터.
 * 전체(null) + 4개 서브 카테고리 · URL `?cat=field|howto|gear|life` 로 상태 보존.
 */
export function ProvidersSubcategoryChips({ active }: Props) {
  const base = "/community/providers";
  const chipCls =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
  const activeCls =
    "border-[#2563EB] bg-[#edf4ff] text-[#2563EB] dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200";
  const idleCls =
    "border-[#dbe8fb] bg-white text-zinc-600 hover:border-[#bfd6fb] hover:text-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

  return (
    <nav
      role="tablist"
      aria-label="청명 스토리 서브 카테고리"
      className="flex flex-wrap gap-2"
    >
      <Link
        href={base}
        role="tab"
        aria-selected={active === null}
        className={`${chipCls} ${active === null ? activeCls : idleCls}`}
      >
        전체
      </Link>
      {PROVIDERS_SUBCATEGORIES.map((sub) => {
        const isActive = active === sub.slug;
        return (
          <Link
            key={sub.slug}
            href={`${base}?cat=${sub.slug}`}
            role="tab"
            aria-selected={isActive}
            title={sub.description}
            className={`${chipCls} ${isActive ? activeCls : idleCls}`}
          >
            <span aria-hidden>{sub.emoji}</span>
            <span>{sub.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
