import Link from "next/link";
import { Star } from "lucide-react";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { QuoteStepper } from "./QuoteStepper";
import type { QuoteRequest } from "@/types/quote-request";
import type { Quote } from "@/types/quote";
import type { Provider } from "@/types/provider";

interface Props {
  request: QuoteRequest;
  winner: Quote | null;
  winnerProvider: Provider | null;
}

function formatCompletedAt(date: Date): string {
  const diffDays = Math.floor(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "오늘 완료";
  if (diffDays === 1) return "어제 완료";
  return `${diffDays}일 전 완료`;
}

function formatWon(value: number): string {
  const man = Math.round(value / 10000);
  return `${man}`;
}

export function CompletedCard({ request, winner, winnerProvider }: Props) {
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const categoryLabel = QUOTE_CATEGORY_LABELS[request.category];

  return (
    <Link
      href={`/received/${request.id}`}
      className="flex flex-col gap-5 rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-50">
            {categoryLabel}{" "}
            {request.size ? `${request.size}평` : ""}
          </h3>
          <p className="mt-1 text-[13px] font-medium text-zinc-400">
            {formatCompletedAt(request.createdAt)}
          </p>
        </div>
        {winnerProvider && (
          <span className="rounded-full border border-[#23C16B] text-[#23C16B] px-2.5 py-0.5 text-[12px] font-semibold dark:border-[#23C16B]/50">
            {winnerProvider.companyName}
          </span>
        )}
      </div>

      <div className="py-2">
        <QuoteStepper status={request.status} />
      </div>

      <div className="flex items-center justify-between border-t border-zinc-50 pt-4 dark:border-zinc-800">
        {winner ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-[12px] font-medium text-zinc-400">1개 청명 · 확정 금액</p>
            <p className="text-[20px] font-bold text-zinc-900 dark:text-zinc-50 leading-none">
              {formatWon(winner.totalAmount)}
              <span className="ml-[2px] text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
                만원
              </span>
            </p>
          </div>
        ) : (
          <div className="text-[14px] text-zinc-400 font-medium">-</div>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-[14px] py-[8px] text-[13px] font-bold text-[#23C16B] dark:bg-[#1A3A27]">
          <Star className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          평점 완료
        </span>
      </div>
    </Link>
  );
}
