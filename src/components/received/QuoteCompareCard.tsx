"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Check, Clock } from "lucide-react";
import { acceptQuote } from "@/app/actions/quote-response-actions";
import { buildThreadId } from "@/domain/chat-schemas";
import { BookingBadge } from "@/components/booking/BookingBadge";
import type { Quote } from "@/types/quote";
import type { Provider } from "@/types/provider";
import type { QuoteStatus } from "@/domain/quote-status";
import { canAcceptQuote } from "@/domain/quote-status";

interface Props {
  quote: Quote;
  provider: Provider | null;
  requestStatus: QuoteStatus;
  /** v1.3 booking · 확정된 일정 ms (있을 때만 배지 표시) */
  bookingScheduledAtMs?: number | null;
}

function formatWon(value: number): string {
  return `${Math.round(value / 10000)}만원`;
}

function formatScheduled(date: Date | null): string {
  if (!date) return "협의";
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${m}/${d}(${dow}) ${h}:${min}`;
}

export function QuoteCompareCard({
  quote,
  provider,
  requestStatus,
  bookingScheduledAtMs,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const isAccepted = quote.status === "accepted";
  const canAccept = quote.status === "sent" && canAcceptQuote(requestStatus);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptQuote({ quoteId: quote.id });
      if (result.ok) {
        showToast(`${result.data.companyName} 견적 수락 · 협의 시작`);
        router.refresh();
      } else {
        showToast(result.message);
      }
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center justify-between gap-3">
        {provider ? (
          <Link
            href={`/providers/${quote.providerId}`}
            className="flex items-center gap-2 text-base font-bold text-zinc-900 hover:underline dark:text-zinc-50"
          >
            {provider.companyName} →
          </Link>
        ) : (
          <span className="text-base font-bold text-zinc-500">알 수 없음</span>
        )}
        {quote.insured && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Shield className="h-3 w-3" aria-hidden />
            배상보험
          </span>
        )}
      </header>

      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {formatWon(quote.totalAmount)}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {formatScheduled(quote.scheduledAt)}
          {quote.estimatedWorkHours
            ? ` · 약 ${quote.estimatedWorkHours}시간`
            : ""}
        </span>
      </div>

      {quote.items.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
          {quote.items.map((item, i) => (
            <li
              key={`${item.label}_${i}`}
              className="flex items-start justify-between gap-2"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                · {item.label}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {item.price.toLocaleString()}원
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="flex flex-col gap-2 pt-1">
        {bookingScheduledAtMs != null && (
          <div className="flex justify-start">
            <BookingBadge scheduledAtMs={bookingScheduledAtMs} size="md" />
          </div>
        )}
        {isAccepted ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Check className="h-4 w-4" aria-hidden />
            수락됨
          </div>
        ) : canAccept ? (
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "수락 중..." : "수락하기"}
          </button>
        ) : (
          <div className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm text-zinc-500 dark:border-zinc-800">
            수락할 수 없는 상태
          </div>
        )}
        <Link
          href={`/chat/${buildThreadId(quote.requestId, quote.providerId)}`}
          className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          💬 문의하기
        </Link>
      </footer>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-20 mx-auto w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      )}
    </article>
  );
}
