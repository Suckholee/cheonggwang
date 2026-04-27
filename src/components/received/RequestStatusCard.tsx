import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { QuoteStepper } from "./QuoteStepper";
import type { QuoteRequest } from "@/types/quote-request";

interface Props {
  request: QuoteRequest;
  priceRange: { min: number; max: number; count: number } | null;
}

function formatRequestedAt(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diff < day) {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const h = String(kst.getUTCHours()).padStart(2, "0");
    const m = String(kst.getUTCMinutes()).padStart(2, "0");
    return `오늘 ${h}:${m} 요청`;
  }
  if (diff < 2 * day) {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const h = String(kst.getUTCHours()).padStart(2, "0");
    const m = String(kst.getUTCMinutes()).padStart(2, "0");
    return `어제 ${h}:${m} 요청`;
  }
  const days = Math.floor(diff / day);
  return `${days}일 전 요청`;
}

function formatWon(value: number): string {
  const man = Math.round(value / 10000);
  return `${man}`;
}

export function RequestStatusCard({ request, priceRange }: Props) {
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const categoryLabel = QUOTE_CATEGORY_LABELS[request.category];
  const sizeLabel = request.size
    ? `${request.size}평${request.roomType ? ` · ${request.roomType}` : ""}`
    : request.roomType ?? "";

  return (
    <Link
      href={`/received/${request.id}`}
      className="group flex flex-col gap-5 rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div>
        <h3 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-50">
          {categoryLabel} {sizeLabel}
        </h3>
        <p className="mt-1 text-[13px] font-medium text-zinc-400">
          {formatRequestedAt(request.createdAt)}
        </p>
      </div>

      <div className="py-2">
        <QuoteStepper status={request.status} />
      </div>

      <div className="flex items-center justify-between border-t border-zinc-50 pt-4 dark:border-zinc-800">
        {priceRange ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-[12px] font-medium text-zinc-400">
              {priceRange.count}개 청명 · 가격 범위
            </p>
            <p className="text-[20px] font-bold text-zinc-900 dark:text-zinc-50 leading-none">
              {formatWon(priceRange.min)}~{formatWon(priceRange.max)}
              <span className="ml-[2px] text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
                만원
              </span>
            </p>
          </div>
        ) : (
          <p className="text-[14px] text-zinc-400 font-medium">청명 응답 대기 중</p>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-[#2563EB] px-[18px] py-[10px] text-[14px] font-bold text-white shadow-sm transition-colors group-hover:bg-blue-700">
          비교하기
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
