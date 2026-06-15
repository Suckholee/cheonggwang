import Link from "next/link";
import { FileText } from "lucide-react";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import type { ThreadRole } from "@/types/chat";

export interface QuoteSummaryForThread {
  quoteId: string;
  requestId: string;
  category: QuoteCategory;
  sizeLabel: string | null;
  totalAmount: number;
  scheduledAtMs: number | null;
}

interface Props {
  summary: QuoteSummaryForThread;
  role: ThreadRole;
}

function formatMan(won: number): string {
  return `${Math.round(won / 10000)}만원`;
}

function formatSchedule(ms: number | null): string {
  if (ms == null) return "일정 협의";
  const d = new Date(ms);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  return `${m}/${day}(${dow})`;
}

export function PinnedQuoteCard({ summary, role }: Props) {
  const href =
    role === "client"
      ? `/received/${summary.requestId}`
      : `/provider/requests/${summary.requestId}/propose`;
  const linkLabel = role === "client" ? "견적 상세 →" : "내 견적 보기 →";

  return (
    <aside className="border-b border-zinc-200 bg-[#f4f9ff]/50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">
            <span aria-hidden>{QUOTE_CATEGORY_EMOJIS[summary.category]}</span>
            <span>{QUOTE_CATEGORY_LABELS[summary.category]}</span>
            {summary.sizeLabel && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>{summary.sizeLabel}</span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2 leading-none">
            <span className="text-[15px] font-black text-zinc-950 dark:text-zinc-50">
              {formatMan(summary.totalAmount)}
            </span>
            <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-550">
              {formatSchedule(summary.scheduledAtMs)}
            </span>
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 shadow-sm hover:border-zinc-300 hover:text-zinc-950 transition-all active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          {linkLabel}
        </Link>
      </div>
    </aside>
  );
}
