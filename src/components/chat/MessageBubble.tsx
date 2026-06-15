"use client";

import Link from "next/link";
import { CreditCard, Sparkles } from "lucide-react";
import { formatRelativeTime } from "@/lib/format/relative-time";
import type { MessageBubbleDTO } from "@/types/chat";

interface Props {
  message: MessageBubbleDTO;
  bookingStatus?: string | null;
  threadId?: string;
}

export function MessageBubble({ message, bookingStatus, threadId }: Props) {
  const { text, mine, createdAtMs, type, amount, bookingId } = message;

  // v1.3 #1 booking — 시스템 메시지: 중앙 정렬 · gray bg · icon prefix · avatar 없음
  if (type === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-xl bg-zinc-100 px-3 py-2 text-center text-xs whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <p>{text}</p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {formatRelativeTime(createdAtMs)}
          </p>
        </div>
      </div>
    );
  }

  // v2 payment — 결제 요청 버블
  if (type === "paymentRequest") {
    const isCompleted = bookingStatus === "completed";
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-3`}>
        <div className="w-[85%] max-w-[320px] rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-850">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3 w-3 animate-pulse" />
              안전 결제 요청
            </span>
            <span className="text-[10px] text-zinc-400">
              {formatRelativeTime(createdAtMs)}
            </span>
          </div>

          <h4 className="mt-3 text-lg font-black text-zinc-900 dark:text-zinc-50">
            {amount ? `${amount.toLocaleString()}원` : "결제 요청"}
          </h4>
          <p className="mt-1 text-xs text-zinc-650 leading-relaxed dark:text-zinc-400">
            청명님이 정기/비정기 청소 작업 완료 후 결제를 요청했습니다. 확인 후 에스크로 안전 결제를 완료해 주세요.
          </p>

          <div className="mt-4.5">
            {isCompleted ? (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-center text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                ✓ 결제 완료됨
              </div>
            ) : mine ? (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2.5 text-center text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                ⏳ 고객 결제 대기 중
              </div>
            ) : (
              <Link
                href={`/payment/checkout?bookingId=${bookingId}&threadId=${threadId}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] py-2.5 text-center text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                <CreditCard className="h-3.5 w-3.5" />
                결제하기
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          mine
            ? "bg-[#2563EB] text-white"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        }`}
      >
        <p>{text}</p>
        <p
          className={`mt-1 text-[10px] ${
            mine ? "text-blue-100" : "text-zinc-500"
          }`}
        >
          {formatRelativeTime(createdAtMs)}
        </p>
      </div>
    </div>
  );
}
