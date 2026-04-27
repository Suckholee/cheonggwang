"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  PlusCircle,
  FileText,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * v1.9 partner-application + v1.11 partner-rag-system — admin 하단 6탭.
 * v1.11 cycle #24: 'RAG' 6번째 탭 추가. 폰트 9px / 아이콘 16px / 한글 2-3자 라벨.
 */

interface Tab {
  href: string;
  label: string;
  Icon: LucideIcon;
  priority: number;
  match: (pathname: string) => boolean;
  /** 빨간 카운트 (없으면 표시 안 함) */
  badge?: number;
}

interface Props {
  pendingApplicantsCount: number;
  pendingRagReviewCount: number;
}

export default function AdminBottomBar({
  pendingApplicantsCount,
  pendingRagReviewCount,
}: Props) {
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
      label: "신청",
      Icon: Inbox,
      priority: 2,
      match: (p) =>
        p === "/admin/partners" || p.startsWith("/admin/partners/applicants"),
      badge: pendingApplicantsCount > 0 ? pendingApplicantsCount : undefined,
    },
    {
      href: "/admin/partners/new",
      label: "발급",
      Icon: PlusCircle,
      priority: 3,
      match: (p) => p.startsWith("/admin/partners/new"),
    },
    {
      href: "/admin/rag-review",
      label: "RAG",
      Icon: ShieldCheck,
      priority: 2,
      match: (p) =>
        p.startsWith("/admin/rag-review") ||
        p.startsWith("/admin/content-templates") ||
        p.startsWith("/admin/auto-series"),
      badge: pendingRagReviewCount > 0 ? pendingRagReviewCount : undefined,
    },
    {
      href: "/admin/posts",
      label: "글",
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

  const activeTab = tabs
    .filter((t) => t.match(pathname))
    .sort((a, b) => b.priority - a.priority)[0];

  return (
    <nav
      aria-label="운영 콘솔 하단 단축"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-zinc-100 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-[var(--bottom-nav-height)] justify-between px-1">
        {tabs.map((tab) => {
          const active = activeTab?.href === tab.href;
          const showBadge = tab.badge !== undefined;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              aria-label={
                showBadge ? `${tab.label} (${tab.badge}건)` : tab.label
              }
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-bold transition-colors w-full ${
                active
                  ? "text-[#2563EB] dark:text-[#5B8DF6]"
                  : "text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <span className="relative">
                <tab.Icon
                  className="h-4 w-4"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                {showBadge && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-950"
                  >
                    {tab.badge! > 99 ? "99+" : tab.badge}
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
