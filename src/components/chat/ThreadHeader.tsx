import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/70 bg-[#f4f9ff]/90 px-4 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <Link
        href="/chat"
        aria-label="채팅 목록으로"
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
      >
        <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">{counterpartName}</p>
        <p className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wide leading-none mt-0.5">
          {role === "client" ? "파트너 청명" : "의뢰인 고객"}
        </p>
      </div>
      {bookingScheduledAtMs != null ? (
        <BookingBadge scheduledAtMs={bookingScheduledAtMs} />
      ) : quoteAmount != null ? (
        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
          견적 {formatMan(quoteAmount)}
        </span>
      ) : null}
    </header>
  );
}
