"use client";

import Link from "next/link";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import type { ThreadRowDTO } from "@/types/chat";
import { formatRelativeTime } from "@/lib/format/relative-time";

interface Props {
  thread: ThreadRowDTO;
  category?: string;
  status?: string;
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

function getStatusLabel(reqStatus: string): { label: string; cls: string } {
  switch (reqStatus) {
    case "submitted":
      return {
        label: "새 견적",
        cls: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30",
      };
    case "quoted":
      return {
        label: "조율중",
        cls: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30",
      };
    case "booked":
      return {
        label: "예약확정",
        cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30",
      };
    case "completed":
      return {
        label: "완료",
        cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-700/30",
      };
    case "cancelled":
      return {
        label: "취소",
        cls: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30",
      };
    default:
      return {
        label: "새 견적",
        cls: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30",
      };
  }
}

export function ThreadRow({ thread, category, status }: Props) {
  const {
    id,
    counterpartName,
    lastMessagePreview,
    lastMessageAtMs,
    unreadCount,
  } = thread;

  const statusInfo = getStatusLabel(status || "submitted");
  const catLabel = category ? QUOTE_CATEGORY_LABELS[category as QuoteCategory] : "청소 상담";
  const catEmoji = category ? QUOTE_CATEGORY_EMOJIS[category as QuoteCategory] : "🧹";

  return (
    <Link
      href={`/chat/${id}`}
      role="listitem"
      aria-label={`${counterpartName} · ${catLabel}${unreadCount > 0 ? ` · 미읽음 ${unreadCount}건` : ""}`}
      className="flex items-center gap-3.5 rounded-2xl border border-zinc-200 border-b-[3px] border-b-zinc-250 bg-white p-4.5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] transition-all duration-200 hover:border-zinc-300 hover:scale-[1.005] active:scale-[0.99] active:translate-y-[1px] active:border-b dark:border-zinc-850 dark:border-b-zinc-950 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${initialGradient(
          counterpartName,
        )} text-[15px] font-bold text-white shadow-sm`}
        aria-hidden
      >
        {counterpartName.charAt(0)}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[14.5px] font-black text-zinc-950 dark:text-zinc-50 leading-none">
            {counterpartName}
          </p>
          <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">•</span>
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">
            {catEmoji} {catLabel}
          </p>
        </div>
        
        <p className="truncate text-xs text-zinc-600 mt-1.5 dark:text-zinc-400">
          {lastMessagePreview ?? "대화를 시작해 보세요"}
        </p>
        
        {lastMessageAtMs != null && (
          <p className="text-[10px] text-zinc-400 mt-1.5">
            {formatRelativeTime(lastMessageAtMs)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2.5 shrink-0">
        <span className={`rounded-[6px] px-2 py-0.5 text-[10.5px] font-black tracking-tight ${statusInfo.cls}`}>
          {statusInfo.label}
        </span>
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount}건 미읽음`}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[10px] font-bold text-white shadow-sm"
          >
            {unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}
