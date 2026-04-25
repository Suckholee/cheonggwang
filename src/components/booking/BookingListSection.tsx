import { BookingCard } from "./BookingCard";
import type { BookingListItemDTO, DayBucket } from "@/types/booking";

const BUCKET_TITLES: Record<DayBucket, string> = {
  today: "오늘",
  tomorrow: "내일",
  thisWeek: "이번주",
  later: "앞으로",
  past: "지난 작업",
};

interface Props {
  bucket: DayBucket;
  items: BookingListItemDTO[];
}

export function BookingListSection({ bucket, items }: Props) {
  if (items.length === 0) return null;
  const titleId = `bookings-${bucket}-heading`;
  return (
    <section aria-labelledby={titleId} className="mb-6">
      <h2
        id={titleId}
        className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        {BUCKET_TITLES[bucket]}{" "}
        <span className="text-xs font-normal text-zinc-500">
          ({items.length})
        </span>
      </h2>
      <div role="list" className="space-y-2">
        {items.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </section>
  );
}
