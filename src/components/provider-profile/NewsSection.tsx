import Link from "next/link";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { shouldUnoptimizeImage } from "@/lib/image/should-unoptimize";
import {
  QUOTE_CATEGORY_EMOJIS,
} from "@/domain/quote-category";
import type { Post } from "@/types/post";

interface Props {
  posts: Post[];
}

export function NewsSection({ posts }: Props) {
  if (posts.length === 0) return null;
  return (
    <section
      aria-labelledby="news-heading"
      className="mb-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="news-heading"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50"
        >
          새소식
        </h2>
        <Link
          href="/community"
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          전체 보기 →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {posts.map((p) => {
          const category = p.categories[0];
          return (
            <Link
              key={p.id}
              href={`/community/${p.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
            >
              <div className="relative aspect-[16/10] w-full bg-zinc-100 dark:bg-zinc-900">
                {p.coverImageUrl ? (
                  <Image
                    src={p.coverImageUrl}
                    alt={p.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 240px"
                    unoptimized={shouldUnoptimizeImage(p.coverImageUrl)}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500">
                    <span className="text-3xl">
                      {category ? QUOTE_CATEGORY_EMOJIS[category] : "📝"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {p.title}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {formatRelativeTime(p.createdAt.getTime())}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
