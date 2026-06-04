import Image from "next/image";
import Link from "next/link";
import type { Page } from "@/types/page";
import { CATEGORY_LABELS } from "@/domain/constants";

interface Props {
  post: Page;
}

export function PostCard({ post }: Props) {
  const photo = post.photos[0];
  const hasCover =
    !!photo?.url &&
    photo.path !== "placeholder" &&
    !photo.url.startsWith("about:");
  const title = post.sections.hero.title || post.businessName;
  const subtitle = post.sections.hero.subtitle ?? "";
  const topTags = post.tags.slice(0, 3);
  const href = post.slug ? `/p/${post.slug}` : "#";

  return (
    <Link
      href={href}
      className="group block w-[220px] flex-shrink-0 scroll-snap-align-start"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {hasCover ? (
          <Image
            src={photo.url}
            alt={title}
            fill
            sizes="220px"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-700 dark:to-zinc-900" />
        )}
        <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-zinc-700 shadow-sm backdrop-blur-sm dark:bg-zinc-950/80 dark:text-zinc-300">
          {(CATEGORY_LABELS as Record<string, string>)[post.category] || post.category}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      )}
      {topTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {topTags.map((t) => (
            <span
              key={t}
              className="text-[10px] text-zinc-400 dark:text-zinc-500"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
