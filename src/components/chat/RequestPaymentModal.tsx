"use client";

import { useState, useEffect, useTransition } from "react";
import { CreditCard, X } from "lucide-react";
import { requestPayment } from "@/app/actions/payment-actions";

interface RequestPaymentModalProps {
  open: boolean;
  onClose: () => void;
  threadId: string;
  bookingId: string;
  amount: number;
}

export function RequestPaymentModal({
  open,
  onClose,
  threadId,
  bookingId,
  amount,
}: RequestPaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await requestPayment({
        threadId,
        bookingId,
        amount,
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-950 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="payment-modal-title"
            className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-50"
          >
            <CreditCard className="h-4 w-4 text-indigo-600" aria-hidden /> 결제 요청하기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">결제 요청 금액</span>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
              {amount.toLocaleString()}원
            </div>
          </div>

          <p className="text-xs text-zinc-650 leading-relaxed dark:text-zinc-400">
            고객님에게 결제를 요청하시겠습니까? 요청하면 고객님과의 채팅방에 결제 카드가 표시되며, 고객님이 즉시 결제를 진행할 수 있습니다.
          </p>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-95 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {isPending ? "요청 중..." : "결제 요청"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
