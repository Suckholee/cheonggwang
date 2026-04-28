"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * v1.13 cycle #26 hotfix — partner/layout 헤더 nav active 상태 표시.
 *
 * 기존 layout이 server component라 active 분기가 없었음. client로 분리해서
 * usePathname 기반 active styling 적용.
 */

interface Tab {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}

const TABS: Tab[] = [
  {
    href: "/partner/posts",
    label: "내 글",
    match: (p) =>
      p === "/partner/posts" ||
      (p.startsWith("/partner/posts/") && !p.startsWith("/partner/posts/new")),
  },
  {
    href: "/partner/posts/new",
    label: "+ 새 초고",
    match: (p) => p.startsWith("/partner/posts/new"),
  },
  {
    href: "/partner/series",
    label: "✨ 시리즈",
    match: (p) => p.startsWith("/partner/series"),
  },
  {
    href: "/partner/profile",
    label: "매장 정보",
    match: (p) => p.startsWith("/partner/profile"),
  },
  {
    href: "/partner/settings",
    label: "설정",
    match: (p) => p.startsWith("/partner/settings"),
  },
];

interface Props {
  /**
   * v1.16 cycle #29 partner-editorial-oversight (A2):
   * AI 자동 생성 draft 검토 대기 건수. > 0 시 "내 글" 탭에 빨간 배지 표시.
   */
  draftCount?: number;
}

export default function PartnerHeaderNav({ draftCount = 0 }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const showBadge =
          tab.href === "/partner/posts" && draftCount > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-[12px] sm:text-[13px] font-bold tracking-tight transition-all duration-200 ${
              active
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
            }`}
          >
            {tab.label}
            {showBadge && (
              <span
                aria-label={`AI 자동 draft 검토 대기 ${draftCount}건`}
                className="ml-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white"
              >
                {draftCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
