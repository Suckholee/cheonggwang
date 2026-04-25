"use client";

import Link from "next/link";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { formatRelativeTime } from "@/lib/format/relative-time";
import type { QuoteRequestPreviewDTO } from "@/types/dashboard";

interface Props {
  request: QuoteRequestPreviewDTO;
}

export function RequestPreviewCard({ request }: Props) {
  return (
    <Link
      href={`/provider/requests/${request.id}/propose`}
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {QUOTE_CATEGORY_EMOJIS[request.category]}
        </span>
        <span className="text-sm font-semibold">
          {QUOTE_CATEGORY_LABELS[request.category]}
        </span>
      </div>
      <p className="mb-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
        {request.regionLabel}
        {request.sizeLabel && ` · ${request.sizeLabel}`}
      </p>
      {request.note && (
        <p className="mb-2 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">
          {request.note}
        </p>
      )}
      <p className="mt-auto text-[11px] text-zinc-400">
        {formatRelativeTime(request.createdAtMs)}
      </p>
    </Link>
  );
}
