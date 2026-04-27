import Image from "next/image";
import Link from "next/link";
import { extractExcerpt } from "@/lib/post/extract-excerpt";
import { postFormatFallback } from "@/lib/post/post-format-fallback";
import { POST_FORMAT_EMOJI, POST_FORMAT_LABELS } from "@/domain/post-format";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import type { Post, PublishStatus } from "@/types/post";

/**
 * v1.12 cycle #25 partner-content-formats · §5.1.
 *
 * 파트너 콘솔 카드 그리드 1개. cover · format 배지 · scenarios 배지 · summary · status · 작성일.
 */

interface Props {
  post: Post;
  /** partner.profile?.photoUrls?.[0] — post.coverImageUrl 누락 시 fallback */
  fallbackCover: string | null;
  /** resolveCardHref 결과 (R5: 항상 /community/p/{slug}) */
  href: string;
}

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "초고",
  published: "발행됨",
  withdrawn: "철회됨",
};

const STATUS_EMOJI: Record<PublishStatus, string> = {
  draft: "📝",
  published: "✅",
  withdrawn: "🚫",
};

function formatDateKST(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PartnerPostCard({ post, fallbackCover, href }: Props) {
  const format = postFormatFallback(post);
  const cover = post.coverImageUrl || fallbackCover;
  const excerpt =
    post.summary80 && post.summary80.trim().length > 0
      ? post.summary80
      : extractExcerpt(post.bodyMarkdown, 100);
  const scenarios = post.templateScenarios?.slice(0, 2) ?? [];

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {cover ? (
          <Image
            src={cover}
            alt={post.coverImageAlt ?? post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={shouldUnoptimizeImage(cover)}
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            {POST_FORMAT_EMOJI[format]}
          </div>
        )}
        {post.isAutoSeries ? (
          <span className="absolute right-2 top-2 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            🤖 자동
          </span>
        ) : null}
      </div>

      {/* meta */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* format + scenarios 배지 */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {POST_FORMAT_EMOJI[format]} {POST_FORMAT_LABELS[format]}
          </span>
          {scenarios.map((s) => (
            <span
              key={s}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              #{s}
            </span>
          ))}
        </div>

        {/* title */}
        <h3 className="line-clamp-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">
          {post.title || "(제목 없음)"}
        </h3>

        {/* excerpt */}
        <p className="line-clamp-2 flex-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
          {excerpt}
        </p>

        {/* status + date */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-500 dark:border-zinc-800">
          <span>
            {STATUS_EMOJI[post.publishStatus]} {STATUS_LABEL[post.publishStatus]}
          </span>
          <span>
            {formatDateKST(post.publishedAt ?? post.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
