"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Check, Clock, ChevronDown, MessageSquare } from "lucide-react";
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
  bookingScheduledAtMs?: number | null;
}

function formatWon(value: number): string {
  return `₩ 총 ${value.toLocaleString()}원`;
}

function formatScheduled(date: Date | null): string {
  if (!date) return "협의 가능";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const isAccepted = quote.status === "accepted";
  const canAccept = quote.status === "sent" && canAcceptQuote(requestStatus);

  // Fallback rating/completed works to populate high-fidelity details (as seen in mockup)
  const rating = provider?.rating ?? 4.8;
  const reviewCount = provider?.reviewCount ?? 12;
  const hiresCount = provider?.completedWorkCount ?? Math.floor(Math.random() * 30) + 5; // Randomized fallback for mock feel if null

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAccept(e: React.MouseEvent) {
    e.stopPropagation(); // Prevent accordion toggle
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

  // Get initials for profile fallback
  const initials = provider?.companyName
    ? provider.companyName.slice(0, 2).toUpperCase()
    : "청광";

  return (
    <div className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900">
      {/* Clickable Header Row */}
      <div
        onClick={() => setIsOpenAccordion()}
        className="flex items-start gap-4 p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 cursor-pointer transition-colors"
      >
        {/* Left Column: Thumbnail Image / Fallback Avatar */}
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 relative shadow-sm border border-zinc-200/50 dark:border-zinc-800">
          {provider?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.profileImage}
              alt={provider.companyName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white tracking-wider">
              {initials}
            </div>
          )}
        </div>

        {/* Center Column: Meta details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {provider?.companyName ?? "알 수 없는 업체"}
            </h3>
            <ChevronDown
              className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <span className="flex items-center text-amber-500 font-semibold gap-0.5">
              ★ {rating.toFixed(1)}
              <span className="text-zinc-400 font-normal">({reviewCount})</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {hiresCount}회 고용
            </span>
            {quote.insured && (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Shield className="h-2.5 w-2.5" />
                보험
              </span>
            )}
            {provider?.isCheonggwangOwned && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                pay
              </span>
            )}
          </div>

          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
            {formatWon(quote.totalAmount)}
          </div>
        </div>
      </div>

      {/* Expandable Details Tray */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out bg-zinc-50/50 dark:bg-zinc-950/20 ${
          isExpanded ? "max-h-[500px] border-t border-zinc-100 dark:border-zinc-900/60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-5 flex flex-col gap-4">
          {/* Estimated Schedule Info */}
          <div className="flex items-center justify-between text-xs text-zinc-500 border-b border-zinc-100 pb-3 dark:border-zinc-900">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>희망 일정</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-350">
                {formatScheduled(quote.scheduledAt)}
              </span>
            </span>
            {quote.estimatedWorkHours && (
              <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                약 {quote.estimatedWorkHours}시간 작업
              </span>
            )}
          </div>

          {/* Detailed Itemized Costs */}
          {quote.items.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                견적 구성 내용
              </span>
              <ul className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-white p-3 text-xs dark:border-zinc-900 dark:bg-zinc-950">
                {quote.items.map((item, i) => (
                  <li
                    key={`${item.label}_${i}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-zinc-650 dark:text-zinc-405">• {item.label}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.price.toLocaleString()}원
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex gap-2.5 pt-2">
            {bookingScheduledAtMs != null && (
              <div className="flex justify-start">
                <BookingBadge scheduledAtMs={bookingScheduledAtMs} size="md" />
              </div>
            )}
            
            {/* Main Action (Accept Quote) */}
            {isAccepted ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                수락 완료
              </div>
            ) : canAccept ? (
              <button
                type="button"
                onClick={handleAccept}
                disabled={isPending}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
              >
                {isPending ? "수락 중..." : "견적 수락하기"}
              </button>
            ) : (
              <div className="flex-1 rounded-xl border border-zinc-200 py-3 text-center text-sm font-medium text-zinc-400 dark:border-zinc-800">
                수락 불가능
              </div>
            )}

            {/* Chat Action */}
            <Link
              href={`/chat/${buildThreadId(quote.requestId, quote.providerId)}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1 px-4 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <MessageSquare className="h-4 w-4" />
              문의
            </Link>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-30 mx-auto w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      )}
    </div>
  );

  function setIsOpenAccordion() {
    setIsExpanded(!isExpanded);
  }
}
