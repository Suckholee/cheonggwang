import Link from "next/link";
import { RegionSelect } from "./RegionSelect";
import { CategoryTabs } from "./CategoryTabs";
import { SearchInput } from "./SearchInput";
import { ProfileMenuButton } from "@/components/ui/ProfileMenuButton";

/**
 * Sticky top feed controls on the discover/search page.
 * Restructured into a clean 2-tier filter layout with fade-out scrolling category list.
 */
export function FeedControls() {
  return (
    <div className="sticky top-0 z-20 border-b border-[#e5eaf1] bg-white/95 backdrop-blur px-4 py-2.5 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] shadow-sm">
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-widest text-[#2563EB] leading-none font-mono">
              CHEONGGWANG
            </span>
            <span className="text-[8px] font-bold text-zinc-500 tracking-[0.25em] leading-none mt-0.5">
              청광
            </span>
          </div>
        </Link>
        <SearchInput />
        <ProfileMenuButton />
      </div>

      {/* 2단 구조 필터 영역 */}
      <div className="mt-3 flex flex-col gap-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-900">
        {/* 1단: 지역 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 select-none">
            지역:
          </span>
          <RegionSelect />
        </div>
        {/* 2단: 업종 탭 (끝부분 페이드 처리가 가미된 가로 스크롤) */}
        <div className="relative flex items-center">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 select-none shrink-0 mr-2">
            업종:
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar pr-8">
              <CategoryTabs />
            </div>
            {/* 오른쪽 끝 페이드 아웃 효과 */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
