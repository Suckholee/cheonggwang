"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Calculator } from "lucide-react";
import { updateFieldEstimate } from "@/app/actions/quote-response-actions";

interface Props {
  quoteId: string;
  baseAmount: number;
  open: boolean;
  onClose: () => void;
}

const REASON_MAX = 500;

export function FieldEstimateModal({ quoteId, baseAmount, open, onClose }: Props) {
  const [additionalAmount, setAdditionalAmount] = useState<number>(0);
  const [additionalReason, setAdditionalReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (additionalReason.trim().length === 0) {
      setError("추가 비용이 발생하는 상세 사유를 입력해 주세요");
      return;
    }

    startTransition(async () => {
      const result = await updateFieldEstimate({
        quoteId,
        additionalAmount,
        additionalReason: additionalReason.trim(),
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  const finalAmount = baseAmount + additionalAmount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-estimate-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-950 sm:rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="field-estimate-modal-title"
            className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-50"
          >
            <Calculator className="h-4.5 w-4.5 text-[#2563EB]" aria-hidden /> 2차 현장 추가금 등록
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              견적 금액 비교
            </span>
            <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 dark:bg-zinc-900 text-xs">
              <div className="flex justify-between items-center text-zinc-650 dark:text-zinc-400">
                <span>1차 기본 견적금</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{baseAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-zinc-650 dark:text-zinc-400">
                <span>현장 실측 추가금</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+ {additionalAmount.toLocaleString()}원</span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex justify-between items-center dark:border-zinc-800 text-sm">
                <span className="font-bold text-zinc-850 dark:text-zinc-100">최종 2차 예상금</span>
                <span className="font-black text-blue-600 dark:text-blue-400">{finalAmount.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="additionalAmount"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              추가 금액 (원)
            </label>
            <input
              id="additionalAmount"
              type="number"
              inputMode="numeric"
              min={0}
              value={additionalAmount || ""}
              onChange={(e) => {
                const val = e.target.value;
                setAdditionalAmount(val === "" ? 0 : Math.max(0, parseInt(val, 10)));
              }}
              required
              placeholder="예: 50000"
              className="w-full rounded-xl border border-zinc-250 bg-white px-3.5 py-2.5 text-sm font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <div>
            <label
              htmlFor="additionalReason"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              추가 사유
            </label>
            <textarea
              id="additionalReason"
              rows={3}
              value={additionalReason}
              maxLength={REASON_MAX}
              onChange={(e) => setAdditionalReason(e.target.value)}
              placeholder="예: 현장 실측 결과 복층 구조 계단 청소 및 베란다 창틀 곰팡이 오염이 심해 추가 작업이 필요합니다."
              required
              className="w-full resize-none rounded-xl border border-zinc-250 bg-white px-3.5 py-2.5 text-sm font-bold text-zinc-800 outline-none transition-all placeholder-zinc-350 focus:border-[#2563EB] focus:ring-1 focus:ring-blue-100/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <p className="mt-1 text-right text-[10px] text-zinc-400 font-medium">
              {additionalReason.length} / {REASON_MAX}
            </p>
          </div>

          <p className="rounded-xl bg-[#EFF6FF] px-3.5 py-2.5 text-[10.5px] leading-relaxed font-semibold text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
            ℹ️ 등록하시면 고객에게 2차 최종 현장 견적 정보가 전송되며, 고객의 최종 수락 후 예약이 최종 확정됩니다.
          </p>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#3B82F6] to-[#2563EB] px-4 py-3 text-sm font-bold text-white hover:from-[#4F8FF7] hover:to-[#2A6DF0] active:scale-[0.98] disabled:opacity-50 transition-all shadow-md cursor-pointer border-b-4 border-[#1D4ED8]"
          >
            {isPending ? "발행 중..." : "최종 현장 견적서 발행"}
          </button>
        </form>
      </div>
    </div>
  );
}
