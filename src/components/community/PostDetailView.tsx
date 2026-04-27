import Image from "next/image";
import { PostBodyRenderer } from "@/components/post/PostBodyRenderer";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import type { Post } from "@/types/post";

interface Props {
  post: Post;
}

/**
 * v1.12 cycle #25 (H2 결의): 본문 div를 PostBodyRenderer로 교체.
 * 헤더·커버·summary·JSON-LD·prose-promo는 보존. partner-promo + format='card-news'면
 * 자동으로 슬라이드 뷰어로 렌더링됨. 그 외는 cycle #19 BlogRenderer로 동일 동작.
 */
export function PostDetailView({ post }: Props) {
  const category = post.categories[0];
  const categoryLabel = category ? QUOTE_CATEGORY_LABELS[category] : "";
  const categoryEmoji = category ? QUOTE_CATEGORY_EMOJIS[category] : "";

  return (
    <article className="space-y-4">
      {post.coverImageUrl && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={post.coverImageUrl}
            alt={post.coverImageAlt ?? post.title}
            fill
            sizes="(max-width: 640px) 100vw, 768px"
            unoptimized={shouldUnoptimizeImage(post.coverImageUrl)}
            className="object-cover"
            priority
          />
        </div>
      )}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
            {categoryEmoji} {categoryLabel}
          </span>
          <span>{formatRelativeTime(post.createdAt.getTime())}</span>
        </div>
        <h1 className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
          {post.title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {post.summary80}
        </p>
      </header>
      <PostBodyRenderer post={post} />
    </article>
  );
}
