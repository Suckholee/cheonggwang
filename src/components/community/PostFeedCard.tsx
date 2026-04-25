"use client";

import Link from "next/link";
import Image from "next/image";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import { SampleBadge } from "@/components/ui/SampleBadge";
import type { PostFeedCardDTO } from "@/types/post";

interface Props {
  post: PostFeedCardDTO;
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

export function PostFeedCard({ post }: Props) {
  const {
    id,
    slug,
    title,
    summary80,
    coverImageUrl,
    companyName,
    category,
    createdAtMs,
    isSample,
  } = post;
  // v1.6: slug가 있으면 canonical URL로 직접, 없으면 [postId] shim (301 redirect) 경유.
  const href = slug ? `/community/p/${slug}` : `/community/${id}`;

  return (
    <Link
      href={href}
      role="listitem"
      aria-label={title}
      className="flex flex-col overflow-hidden rounded-[24px] border border-[#dbe8fb] bg-white shadow-[0_10px_26px_rgba(43,102,246,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#bfd6fb] hover:shadow-[0_16px_34px_rgba(43,102,246,0.10)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="relative aspect-[16/10] w-full bg-[#eef5ff] dark:bg-zinc-900">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            unoptimized={shouldUnoptimizeImage(coverImageUrl)}
            className="object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${initialGradient(
              companyName,
            )}`}
            aria-hidden
          >
            <span className="text-5xl">
              {QUOTE_CATEGORY_EMOJIS[category]}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="truncate text-[15px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </p>
        <p className="line-clamp-2 text-[12px] leading-5 text-zinc-600 dark:text-zinc-400">
          {summary80}
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate font-medium">{companyName}</span>
            {isSample && <SampleBadge />}
          </span>
          <span className="shrink-0">{formatRelativeTime(createdAtMs)}</span>
        </div>
        <span className="self-start rounded-full bg-[#edf4ff] px-2.5 py-1 text-[10px] font-semibold text-[#2B66F6] dark:bg-zinc-800 dark:text-zinc-300">
          {QUOTE_CATEGORY_EMOJIS[category]}{" "}
          {QUOTE_CATEGORY_LABELS[category]}
        </span>
      </div>
    </Link>
  );
}
