"use client";

import Link from "next/link";

interface Props {
  activeTab: "active" | "completed";
  activeCount: number;
  completedCount: number;
}

export function TabBar({ activeTab, activeCount, completedCount }: Props) {
  return (
    <nav className="flex gap-4 border-b border-zinc-100 dark:border-zinc-800 px-1 mt-2">
      <TabLink
        href="/received?tab=active"
        active={activeTab === "active"}
        label="진행중"
        count={activeCount}
      />
      <TabLink
        href="/received?tab=completed"
        active={activeTab === "completed"}
        label="완료"
        count={completedCount}
      />
    </nav>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 py-3 text-[15px] transition-colors ${
        active
          ? "border-zinc-900 font-bold text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
          : "border-transparent font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
      }`}
    >
      {label}{" "}
      <span
        className={`ml-0.5 ${
          active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
