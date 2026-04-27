import Link from "next/link";
import { RegionSelect } from "./RegionSelect";
import { CategoryTabs } from "./CategoryTabs";
import { SearchInput } from "./SearchInput";

/**
 * Sticky top feed controls.
 * authSlot은 Server Component(auth 체크 결과)가 Client에 주입되는 슬롯.
 * 이 컴포넌트 자체는 Server Component이지만 자식들(RegionSelect/CategoryTabs/SearchInput)은 Client.
 */
interface Props {
  authSlot: React.ReactNode;
}

export function FeedControls({ authSlot }: Props) {
  return (
    <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="shrink-0 flex flex-col items-center gap-[3px] hover:opacity-80 pt-1"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#2563EB]">
            <svg
              className="h-[20px] w-[20px] text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3V21M3 12H21"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="square"
              />
              <rect x="10.5" y="10.5" width="3" height="3" fill="#2563EB" />
              <path
                d="M16 5H19V8M8 19H5V16"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-[10px] font-extrabold tracking-tighter text-[#2563EB] leading-none">
            청광
          </span>
        </Link>
        <SearchInput />
        <div className="shrink-0 pt-1">{authSlot}</div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:px-6 mt-1 no-scrollbar">
        <RegionSelect />
        <CategoryTabs />
      </div>
    </div>
  );
}
