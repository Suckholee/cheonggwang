"use client";

import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { BookingListItemDTO } from "@/types/booking";

interface Props {
  booking: BookingListItemDTO;
}

function formatMan(won: number): string {
  return `${Math.round(won / 10000)}만원`;
}

export function BookingCard({ booking }: Props) {
  const {
    threadId,
    counterpartName,
    category,
    regionLabel,
    scheduledLabel,
    totalAmount,
    memo,
  } = booking;

  return (
    <Link
      href={`/chat/${threadId}`}
      role="listitem"
      aria-label={`${counterpartName} · ${scheduledLabel} · ${QUOTE_CATEGORY_LABELS[category]}`}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">
          <span aria-hidden>{QUOTE_CATEGORY_EMOJIS[category]}</span>{" "}
          {QUOTE_CATEGORY_LABELS[category]}
        </p>
        <span className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {scheduledLabel}
        </span>
      </div>
      <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <MapPin className="h-3 w-3" aria-hidden />
        {counterpartName} 고객 · {regionLabel}
      </p>
      {memo && (
        <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">
          {memo}
        </p>
      )}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {formatMan(totalAmount)}
        </span>
        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
          <MessageCircle className="h-3 w-3" aria-hidden /> 채팅
        </span>
      </div>
    </Link>
  );
}
