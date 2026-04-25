"use client";

import Link from "next/link";
import {
  UserPen,
  Inbox,
  Briefcase,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Props {
  requestBadgeCount: number;
}

interface Shortcut {
  href: string;
  label: string;
  Icon: LucideIcon;
  badge?: number;
}

export function ShortcutGrid({ requestBadgeCount }: Props) {
  const shortcuts: Shortcut[] = [
    { href: "/provider/profile", label: "프로필 편집", Icon: UserPen },
    {
      href: "/provider/requests",
      label: "받은 요청",
      Icon: Inbox,
      badge: requestBadgeCount,
    },
    { href: "/provider/works", label: "작업 관리", Icon: Briefcase },
    { href: "/provider/settings", label: "설정", Icon: Settings },
  ];

  return (
    <section aria-labelledby="shortcut-heading" className="mb-6">
      <h2
        id="shortcut-heading"
        className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        빠른 이동
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map(({ href, label, Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className="relative flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
          >
            <Icon className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            {badge && badge > 0 ? (
              <span
                aria-label={`${label} ${badge}건`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-medium text-white"
              >
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
