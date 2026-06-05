import Link from "next/link";
import {
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
} from "@/domain/quote-category";
import { formatRelativeTime } from "@/lib/format/relative-time";
import type { QuoteRequestPreviewDTO } from "@/types/dashboard";
import {
  Home,
  Building2,
  Wind,
  Truck,
  Sparkles,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

interface Props {
  request: QuoteRequestPreviewDTO;
}

const CATEGORY_STYLE: Record<
  QuoteCategory,
  { Icon: LucideIcon; bg: string; text: string }
> = {
  "move-in": {
    Icon: Home,
    bg: "bg-blue-50/70 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
  },
  office: {
    Icon: Building2,
    bg: "bg-emerald-50/70 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  aircon: {
    Icon: Wind,
    bg: "bg-sky-50/70 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
  },
  "move-out": {
    Icon: Truck,
    bg: "bg-violet-50/70 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
  },
  special: {
    Icon: Sparkles,
    bg: "bg-rose-50/70 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  regular: {
    Icon: CalendarDays,
    bg: "bg-amber-50/70 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
};

export function RequestPreviewCard({ request }: Props) {
  const style =
    CATEGORY_STYLE[request.category as QuoteCategory] ||
    CATEGORY_STYLE["move-in"];
  const Icon = style.Icon;

  return (
    <Link
      href={`/provider/requests/${request.id}/propose`}
      className="flex flex-col rounded-[24px] border border-zinc-200 border-b-4 border-b-zinc-300 bg-white p-4.5 transition-all duration-200 hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.98] active:translate-y-[2px] shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bg} ${style.text}`}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">
              {QUOTE_CATEGORY_LABELS[request.category]}
            </span>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">
              신규 견적 요청 도착
            </p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400">
          대기중
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-400">📍</span>
          {request.regionLabel}
        </p>
        {request.sizeLabel && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-400">📐</span>
            {request.sizeLabel}
          </p>
        )}
        {request.note && (
          <p className="line-clamp-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850 mt-1">
            {request.note}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
        <span>청광 실시간 매칭</span>
        <span>{formatRelativeTime(request.createdAtMs)}</span>
      </div>
    </Link>
  );
}
