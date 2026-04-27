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

export default function PartnerHeaderNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex items-center gap-2 text-sm">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active
                ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
