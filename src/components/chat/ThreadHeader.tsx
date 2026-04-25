import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookingBadge } from "@/components/booking/BookingBadge";
import type { ThreadRole } from "@/types/chat";

interface Props {
  counterpartName: string;
  role: ThreadRole;
  quoteAmount: number | null;
  /** v1.3 booking · 있을 때 quoteAmount 대체 · BookingBadge 렌더 */
  bookingScheduledAtMs?: number | null;
}

function formatMan(won: number): string {
  return `${Math.round(won / 10000)}만원`;
}

export function ThreadHeader({
  counterpartName,
  role,
  quoteAmount,
  bookingScheduledAtMs,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/chat"
        aria-label="채팅 목록으로"
        className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{counterpartName}</p>
        <p className="text-[11px] text-zinc-500">
          {role === "client" ? "청명" : "의뢰인"}
        </p>
      </div>
      {bookingScheduledAtMs != null ? (
        <BookingBadge scheduledAtMs={bookingScheduledAtMs} />
      ) : quoteAmount != null ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          견적 {formatMan(quoteAmount)}
        </span>
      ) : null}
    </header>
  );
}
