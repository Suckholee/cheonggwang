"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  PlusCircle,
  FileText,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * v1.9 partner-application — admin 전용 하단 액션 바.
 * 운영자가 자주 쓰는 단축 5개. 대기 신청 카운트는 server 슬롯에서 prop으로 주입.
 */

interface Tab {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** active 매칭 우선순위 (큰 값 우선) — /admin/partners/new vs /admin/partners 분리용 */
  priority: number;
  match: (pathname: string) => boolean;
  /** 빨간 점 표시 여부 (예: 대기 신청 > 0) */
  alert?: boolean;
}

interface Props {
  pendingApplicantsCount: number;
}

export default function AdminBottomBar({ pendingApplicantsCount }: Props) {
  const pathname = usePathname() ?? "/admin";

  const tabs: Tab[] = [
    {
      href: "/admin",
      label: "홈",
      Icon: LayoutDashboard,
      priority: 1,
      match: (p) => p === "/admin",
    },
    {
      href: "/admin/partners",
      label: "대기 신청",
      Icon: Inbox,
      priority: 2,
      match: (p) =>
        p === "/admin/partners" || p.startsWith("/admin/partners/applicants"),
      alert: pendingApplicantsCount > 0,
    },
    {
      href: "/admin/partners/new",
      label: "새 발급",
      Icon: PlusCircle,
      priority: 3,
      match: (p) => p.startsWith("/admin/partners/new"),
    },
    {
      href: "/admin/posts",
      label: "게시글",
      Icon: FileText,
      priority: 2,
      match: (p) => p.startsWith("/admin/posts"),
    },
    {
      href: "/admin/providers",
      label: "청명",
      Icon: BadgeCheck,
      priority: 2,
      match: (p) => p.startsWith("/admin/providers"),
    },
  ];

  // 가장 우선순위 높은 매칭 1개만 active
  const activeTab = tabs
    .filter((t) => t.match(pathname))
    .sort((a, b) => b.priority - a.priority)[0];

  return (
    <nav
      aria-label="운영 콘솔 하단 단축"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-zinc-100 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-[var(--bottom-nav-height)] justify-between px-2">
        {tabs.map((tab) => {
          const active = activeTab?.href === tab.href;
          const showBadge = tab.alert === true;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              aria-label={
                showBadge
                  ? `${tab.label} (${pendingApplicantsCount}건 대기)`
                  : tab.label
              }
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold transition-colors w-full ${
                active
                  ? "text-[#2B66F6] dark:text-[#5B8DF6]"
                  : "text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <span className="relative">
                <tab.Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                {showBadge && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950"
                  >
                    {pendingApplicantsCount > 99 ? "99+" : pendingApplicantsCount}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
