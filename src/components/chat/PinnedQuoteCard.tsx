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
    <aside className="border-b border-zinc-200 bg-indigo-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-indigo-950/20">
      <div className="flex items-start gap-2">
        <FileText
          className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span aria-hidden>{QUOTE_CATEGORY_EMOJIS[summary.category]}</span>
            <span>{QUOTE_CATEGORY_LABELS[summary.category]}</span>
            {summary.sizeLabel && (
              <span className="text-zinc-500">· {summary.sizeLabel}</span>
            )}
          </p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {formatMan(summary.totalAmount)}{" "}
            <span className="text-[11px] font-normal text-zinc-500">
              · {formatSchedule(summary.scheduledAtMs)}
            </span>
          </p>
        </div>
        <Link
          href={href}
          className="shrink-0 self-center text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {linkLabel}
        </Link>
      </div>
    </aside>
  );
}
