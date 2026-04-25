import { Star } from "lucide-react";
import type { ReviewView } from "@/types/review";
import { EmptySection } from "./EmptySection";

interface Props {
  reviews: ReviewView[];
  totalCount?: number | null;
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 7 * day) return "이번 주";
  if (diff < 14 * day) return "지난 주";
  const days = Math.floor(diff / day);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

function ReviewCard({ review }: { review: ReviewView }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {review.clientMask}
          </p>
          <div className="mt-0.5 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < review.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-300 dark:text-zinc-700"
                }`}
                aria-hidden
              />
            ))}
          </div>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {formatRelativeDate(review.createdAt)}
        </span>
      </header>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {review.text}
      </p>
    </article>
  );
}

export function ReviewList({ reviews, totalCount }: Props) {
  const count = totalCount ?? reviews.length;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold">리뷰 {count > 0 ? count : ""}</h2>
      {reviews.length === 0 ? (
        <EmptySection icon="💬" title="리뷰" />
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
