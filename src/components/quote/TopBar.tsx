import { Bell, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function TopBar({ regionLabel = "전국" }: { regionLabel?: string }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between py-2 px-1 bg-[#f5f6f8] dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <BrandLogo />
        <button
          type="button"
          disabled
          aria-label="지역 선택 (v1.1 예정)"
          className="flex items-center gap-1.5 text-[17px] font-bold text-zinc-900 disabled:cursor-default dark:text-zinc-50"
        >
          서울 강남구 역삼동
          <ChevronDown
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      </div>
      <button
        type="button"
        disabled
        aria-label="알림 (v2+ 예정)"
        className="relative rounded-full p-2 text-zinc-700 bg-white shadow-sm border border-zinc-200 disabled:cursor-default dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />
      </button>
    </header>
  );
}
