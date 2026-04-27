"use client";

import Link from "next/link";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { PriceSummary } from "@/types/client-dashboard";

interface Props {
  summary: PriceSummary;
}

function formatMan(price: number): string {
  const man = Math.round(price / 10000);
  return `${man}만원`;
}

export function AveragePriceCard({ summary }: Props) {
  const { category, sampleCount, min, avg, max } = summary;
  const label = QUOTE_CATEGORY_LABELS[category];
  const emoji = QUOTE_CATEGORY_EMOJIS[category];

  const priceLabel =
    min != null && max != null
      ? min === max
        ? formatMan(min)
        : `${formatMan(min)} ~ ${formatMan(max)}`
      : "—";
  const avgLabel = avg != null ? `평균 ${formatMan(avg)}` : " ";

  return (
    <Link
      href={`/quote/new?cat=${category}`}
      aria-label={`${label} 평균 ${avg != null ? formatMan(avg) : "—"} · 견적 요청`}
      className="flex w-44 shrink-0 snap-start flex-col rounded-[22px] border border-[#dbe8fb] bg-white p-4 shadow-[0_10px_24px_rgba(43,102,246,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#bfd6fb] hover:shadow-[0_16px_34px_rgba(43,102,246,0.10)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef5ff] text-base"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {label}
          </span>
          <span className="block text-[11px] text-zinc-400">
            {sampleCount}개 청명 기준
          </span>
        </div>
      </div>
      <p className="text-[18px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
        {priceLabel}
      </p>
      <p className="mt-1 text-[12px] text-zinc-500">{avgLabel}</p>
      <div className="mt-auto pt-4 text-[11px]">
        <span className="inline-flex items-center rounded-full bg-[#f4f8ff] px-2.5 py-1 font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          참고 시세
        </span>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-zinc-400">바로 견적 시작</span>
          <span className="font-semibold text-[#2563EB] dark:text-indigo-400">
          견적 →
          </span>
        </div>
      </div>
    </Link>
  );
}
