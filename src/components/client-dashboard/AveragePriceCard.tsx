"use client";

import Link from "next/link";
import Image from "next/image";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import type { PriceSummary } from "@/types/client-dashboard";

const CATEGORY_IMAGES: Record<QuoteCategory, string> = {
  "move-in": "/images/cat_move_in.png",
  office: "/images/cat_office.png",
  aircon: "/images/cat_aircon.png",
  "move-out": "/images/cat_move_out.png",
  special: "/images/cat_special.png",
  regular: "/images/cat_regular.png",
};

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
  const imageSrc = CATEGORY_IMAGES[category];

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
      className="group flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-[#dbe8fb] bg-white shadow-[0_10px_24px_rgba(43,102,246,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#bfd6fb] hover:shadow-[0_16px_34px_rgba(43,102,246,0.10)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      {/* Category Image Cover */}
      <div className="relative h-20 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 pointer-events-none">
        <Image
          src={imageSrc}
          alt={label}
          fill
          unoptimized={shouldUnoptimizeImage(imageSrc)}
          sizes="176px"
          draggable={false}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Floating Mini Emoji Badge */}
        <div className="absolute left-2.5 bottom-2.5 flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-white/60 bg-white/80 shadow-xs backdrop-blur-xs text-sm dark:border-zinc-800/60 dark:bg-zinc-950/80">
          {emoji}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-3.5 pt-3">
        <div className="mb-2 min-w-0">
          <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-[#2563EB] dark:group-hover:text-indigo-400 transition-colors">
            {label}
          </span>
          <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            {sampleCount}개 청명 기준
          </span>
        </div>

        <p className="text-[18px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {priceLabel}
        </p>
        <p className="mt-0.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">{avgLabel}</p>

        <div className="mt-auto pt-3 text-[11px]">
          <span className="inline-flex items-center rounded-full bg-[#f4f8ff] px-2 py-0.5 font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            참고 시세
          </span>
          <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800/50">
            <span className="text-zinc-400">바로 견적 시작</span>
            <span className="font-semibold text-[#2563EB] dark:text-indigo-400">
              견적 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

