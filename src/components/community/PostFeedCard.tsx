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
      className="flex items-start justify-between gap-4 py-4 px-1 transition-all duration-200 hover:bg-[#f4f8ff]/40 active:scale-[0.99] dark:hover:bg-zinc-900/20"
    >
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-450">
          <span className="rounded-[6px] bg-[#edf4ff] px-1.5 py-0.5 font-bold text-[#2563EB] dark:bg-zinc-800/80 dark:text-zinc-350 shrink-0">
            {QUOTE_CATEGORY_EMOJIS[category]} {QUOTE_CATEGORY_LABELS[category]}
          </span>
          <span className="truncate max-w-[120px] font-semibold text-zinc-600 dark:text-zinc-405">{companyName}</span>
          {isSample && <SampleBadge />}
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="shrink-0">{formatRelativeTime(createdAtMs)}</span>
        </div>
        
        <h2 className="line-clamp-2 text-[15px] font-black leading-snug tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>
        
        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-zinc-550 dark:text-zinc-400">
          {summary80}
        </p>
      </div>

      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-[#dbe8fb]/50 bg-[#eef5ff] dark:border-zinc-850 dark:bg-zinc-900 shadow-[0_4px_12px_rgba(43,102,246,0.03)]">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="80px"
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
            <span className="text-2xl">
              {QUOTE_CATEGORY_EMOJIS[category]}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
