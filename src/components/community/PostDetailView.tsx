import Image from "next/image";
import { renderMarkdown } from "@/lib/markdown";
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

export function PostDetailView({ post }: Props) {
  const html = renderMarkdown(post.bodyMarkdown);
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
      <div
        className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
        // eslint-disable-next-line react/no-danger -- sanitize-html로 안전화
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
