"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Clock3, Star } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import type { TopProviderCardDTO } from "@/types/client-dashboard";

interface Props {
  provider: TopProviderCardDTO;
  rank: number;
}

function initialGradientClass(name: string): string {
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

export function TopProviderCard({ provider, rank }: Props) {
  const {
    providerId,
    companyName,
    profileImage,
    rating,
    completedWorkCount,
    repeatRate,
  } = provider;

  const initial = companyName.charAt(0);
  const reviewLabel = rating != null ? rating.toFixed(1) : "신규";
  const repeatLabel =
    repeatRate != null ? `${Math.round(repeatRate * 100)}%` : "집계중";
  const workCountLabel =
    completedWorkCount != null ? `${completedWorkCount}건` : "집계중";

  return (
    <Link
      href={`/providers/${providerId}`}
      aria-label={`${rank}위 ${companyName}`}
      className="flex flex-col rounded-[24px] border border-[#dbe8fb] bg-white p-5 shadow-[0_12px_30px_rgba(43,102,246,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#bfd6fb] hover:shadow-[0_18px_38px_rgba(43,102,246,0.12)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-[11px] font-bold text-[#2B66F6]">
              TOP {rank}
            </span>
            {repeatRate != null && repeatRate >= 0.5 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eefbf4] px-2.5 py-1 text-[11px] font-semibold text-[#178a4d]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                재이용 높음
              </span>
            ) : null}
          </div>
          <h3 className="truncate text-[18px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {companyName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-zinc-500">
            <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
              <Star className="h-3.5 w-3.5 fill-[#f5a623] text-[#f5a623]" aria-hidden />
              {reviewLabel}
            </span>
            <span>완료 {workCountLabel}</span>
            <span>재이용 {repeatLabel}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#f7fbff] px-3 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-zinc-400">평점</p>
              <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {reviewLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f7fbff] px-3 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-zinc-400">작업</p>
              <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {workCountLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f7fbff] px-3 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-zinc-400">응답성</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <Clock3 className="h-3.5 w-3.5 text-[#2B66F6]" aria-hidden />
                {repeatLabel}
              </p>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2B66F6]">
            프로필 보기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </div>
        </div>

        <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-[20px] border border-[#dbe8fb] bg-[#f2f7ff]">
          {profileImage ? (
            <Image
              src={profileImage}
              alt={companyName}
              fill
              sizes="78px"
              unoptimized={shouldUnoptimizeImage(profileImage)}
              className="object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${initialGradientClass(
                companyName,
              )} text-2xl font-bold text-white shadow-inner`}
              aria-hidden
            >
              {initial}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
