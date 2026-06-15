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

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "move-in": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=120&h=120&q=80",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=120&h=120&q=80",
  aircon: "https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=120&h=120&q=80",
  "move-out": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&h=120&q=80",
  special: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=120&h=120&q=80",
  regular: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=120&h=120&q=80",
};

function getCategoryBadgeClass(cat: string): string {
  switch (cat) {
    case "regular":
      return "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400";
    case "move-in":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "office":
      return "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400";
    case "aircon":
      return "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400";
    case "move-out":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400";
    case "special":
      return "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400";
    default:
      return "bg-[#edf4ff] text-[#2563EB] dark:bg-zinc-800 dark:text-zinc-300";
  }
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
  const displayImage = coverImageUrl || CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.regular;

  return (
    <Link
      href={href}
      role="listitem"
      aria-label={title}
      className="flex items-start justify-between gap-4 py-[22px] px-1 transition-all duration-200 hover:bg-[#f4f8ff]/40 active:scale-[0.99] dark:hover:bg-zinc-900/20"
    >
      <div className="flex flex-1 flex-col min-w-0">
        {/* 1순위: 제목 */}
        <h2 className="line-clamp-2 text-[15.5px] font-black leading-snug tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>
        
        {/* 2순위: 본문 요약 */}
        <p className="line-clamp-1 text-[12.5px] leading-relaxed text-zinc-550 dark:text-zinc-400 mt-2">
          {summary80}
        </p>

        {/* 3순위: 카테고리 / 작성자 / 날짜 */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-450 mt-3">
          <span className={`rounded-[4px] px-1.5 py-0.5 font-bold shrink-0 ${getCategoryBadgeClass(category)}`}>
            {QUOTE_CATEGORY_EMOJIS[category]} {QUOTE_CATEGORY_LABELS[category]}
          </span>
          <span className="truncate max-w-[120px] font-semibold text-zinc-600 dark:text-zinc-405">{companyName}</span>
          {isSample && <SampleBadge />}
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="shrink-0">{formatRelativeTime(createdAtMs)}</span>
        </div>
      </div>

      {/* 4순위: 썸네일 */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[16px] border border-[#dbe8fb]/50 bg-[#eef5ff] dark:border-zinc-850 dark:bg-zinc-900 shadow-[0_4px_12px_rgba(43,102,246,0.03)]">
        <Image
          src={displayImage}
          alt={title}
          fill
          sizes="96px"
          unoptimized={shouldUnoptimizeImage(displayImage)}
          className="object-cover"
        />
      </div>
    </Link>
  );
}
