"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/format/relative-time";
import type { ThreadRowDTO } from "@/types/chat";

interface Props {
  thread: ThreadRowDTO;
}

function initialGradient(name: string): string {
  const palette = [
    "from-indigo-400 to-purple-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-pink-400 to-rose-500",
    "from-sky-400 to-cyan-500",
  ];
  const idx = (name.charCodeAt(0) ?? 0) % palette.length;
  return palette[idx];
}

export function ThreadRow({ thread }: Props) {
  const {
    id,
    counterpartName,
    lastMessagePreview,
    lastMessageAtMs,
    unreadCount,
    isNew,
  } = thread;

  return (
    <Link
      href={`/chat/${id}`}
      role="listitem"
      aria-label={`${counterpartName}${unreadCount > 0 ? ` · 미읽음 ${unreadCount}건` : ""}`}
      className="flex items-center gap-3 rounded-2xl border border-zinc-200 border-b-4 border-b-zinc-300 bg-white p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.98] active:translate-y-[2px] active:border-b-2 dark:border-zinc-800 dark:border-b-zinc-950 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${initialGradient(
          counterpartName,
        )} text-sm font-bold text-white`}
        aria-hidden
      >
        {counterpartName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{counterpartName}</p>
          {lastMessageAtMs != null ? (
            <span className="shrink-0 text-[11px] text-zinc-400">
              {formatRelativeTime(lastMessageAtMs)}
            </span>
          ) : isNew ? (
            <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              새 견적
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {lastMessagePreview ?? "대화를 시작해 보세요"}
        </p>
      </div>
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount}건 미읽음`}
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-medium text-white"
        >
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
