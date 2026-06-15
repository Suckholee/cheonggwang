"use client";

import Link from "next/link";
import type { TabDefinition } from "./tab-definitions";

interface Props {
  tab: TabDefinition;
  active: boolean;
  /** 해당 탭의 unread 배지 count (v1.2 chat feature에서 실 데이터 연결) */
  badgeCount?: number;
}

export function TabItem({ tab, active, badgeCount = 0 }: Props) {
  const { Icon, label, href } = tab;
  const showBadge = tab.badgeKey === "chat-unread" && badgeCount > 0;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold transition-colors w-full ${
        active
          ? "text-[#2563EB] dark:text-[#5B8DF6]"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      <span className="relative">
        <Icon
          className="h-5 w-5"
          strokeWidth={active ? 2.5 : 2}
          fill={active ? "currentColor" : "none"}
          aria-hidden
        />
        {showBadge && (
          <span
            aria-label={`${badgeCount}개 읽지 않음`}
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950"
          />
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
