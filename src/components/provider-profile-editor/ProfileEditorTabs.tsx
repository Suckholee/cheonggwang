"use client";

import Link from "next/link";

export type EditorTabKey = "basic" | "price" | "portfolio" | "promo";

const TABS: ReadonlyArray<{ key: EditorTabKey; label: string }> = [
  { key: "basic", label: "기본정보" },
  { key: "price", label: "서비스 단가" },
  { key: "portfolio", label: "포트폴리오" },
  { key: "promo", label: "홍보" },
];

interface Props {
  currentTab: EditorTabKey;
}

export function ProfileEditorTabs({ currentTab }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="프로필 편집 탭"
      className="mb-8 flex border-b border-zinc-200 dark:border-zinc-800"
    >
      {TABS.map((tab) => {
        const active = currentTab === tab.key;
        return (
          <Link
            key={tab.key}
            role="tab"
            aria-selected={active}
            href={`/provider/profile?tab=${tab.key}`}
            className={`relative flex-1 px-4 py-3.5 text-center text-[15px] transition-colors ${
              active
                ? "font-bold text-[#2B66F6] dark:text-[#5B8DF6]"
                : "font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {tab.label}
            {active && (
              <div className="absolute bottom-0 left-0 h-[3px] w-full bg-[#2B66F6] rounded-t-sm dark:bg-[#5B8DF6]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
