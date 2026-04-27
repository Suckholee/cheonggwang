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
      className="mb-8 flex p-1.5 bg-[#F3F4F6] rounded-2xl"
    >
      {TABS.map((tab) => {
        const active = currentTab === tab.key;
        return (
          <Link
            key={tab.key}
            role="tab"
            aria-selected={active}
            href={`/provider/profile?tab=${tab.key}`}
            className={`relative flex-1 px-3 py-2.5 text-center text-[14px] font-bold rounded-xl transition-all duration-200 ${
              active
                ? "bg-white text-[#2563EB] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
