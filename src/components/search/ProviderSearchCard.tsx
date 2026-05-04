"use client";

import Link from "next/link";
import Image from "next/image";
import { Shield, Clock, ArrowRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { ProviderSearchCardDTO } from "@/types/search";

interface Props {
  provider: ProviderSearchCardDTO;
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

function formatInsuranceAmount(won: number | null): string | null {
  if (won == null) return null;
  if (won >= 1e8) return `${Math.round(won / 1e8)}억`;
  return `${Math.round(won / 1e4)}만`;
}

export function ProviderSearchCard({ provider }: Props) {
  const {
    providerId,
    companyName,
    profileImage,
    rating,
    reviewCount,
    repeatRate,
    categories,
    categoriesOverflow,
    regionLabel,
    insured,
    insuranceAmount,
    responseTimeMinutes,
  } = provider;

  const insuranceLabel = insured ? formatInsuranceAmount(insuranceAmount) : null;
  const ariaLabel = `${companyName} · ${rating != null ? `평점 ${rating.toFixed(1)}` : "신규"}${repeatRate != null ? ` · 재계약 ${Math.round(repeatRate * 100)}%` : ""}`;

  return (
    <Link
      href={`/providers/${providerId}`}
      aria-label={ariaLabel}
      role="listitem"
      className="flex gap-3 rounded-[24px] border border-[#dbe8fb] bg-white p-4 shadow-[0_10px_26px_rgba(43,102,246,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#bfd6fb] hover:shadow-[0_16px_34px_rgba(43,102,246,0.10)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[20px] border border-[#dbe8fb] bg-[#eef5ff]">
        {profileImage ? (
          <Image
            src={profileImage}
            alt={companyName}
            fill
            sizes="80px"
            unoptimized={shouldUnoptimizeImage(profileImage)}
            className="object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${initialGradient(
              companyName,
            )} text-2xl font-bold text-white`}
            aria-hidden
          >
            {companyName.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[15px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {companyName}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
          {rating != null ? (
            <span>
              ⭐ {rating.toFixed(1)}{" "}
              <span className="text-zinc-400">({reviewCount ?? 0})</span>
            </span>
          ) : (
            <span className="text-indigo-600 dark:text-indigo-400">신규 청명</span>
          )}
          {repeatRate != null && (
            <span className="text-emerald-600 dark:text-emerald-400">
              재계약 {Math.round(repeatRate * 100)}%
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
          {insuranceLabel && (
            <span className="inline-flex items-center gap-0.5">
              <Shield className="h-3 w-3" aria-hidden /> 배상 {insuranceLabel}
            </span>
          )}
          {responseTimeMinutes != null && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden /> 평균 {responseTimeMinutes}분
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-1 text-[11px]">
          {categories.map((c) => (
            <span
              key={c}
              aria-label={QUOTE_CATEGORY_LABELS[c]}
              className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[#2563EB] dark:bg-zinc-800 dark:text-zinc-300"
            >
              {QUOTE_CATEGORY_EMOJIS[c]}
            </span>
          ))}
          {categoriesOverflow > 0 && (
            <span className="text-zinc-500">+{categoriesOverflow}</span>
          )}
        </p>
        <p className="truncate text-[11px] text-zinc-500">{regionLabel}</p>
      </div>
    </Link>
  );
}
