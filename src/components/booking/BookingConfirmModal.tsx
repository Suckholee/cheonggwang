"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { X, CalendarCheck } from "lucide-react";
import { confirmBooking } from "@/app/actions/booking-actions";

interface Props {
  threadId: string;
  open: boolean;
  onClose: () => void;
}

function defaultLocalDatetime(): string {
  const now = new Date(Date.now() + 60 * 60 * 1000); // +1h 후 default
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(Math.ceil(now.getMinutes() / 10) * 10 % 60);
  return `${y}-${m}-${d}T${h}:${min}`;
}

const MEMO_MAX = 200;

export function BookingConfirmModal({ threadId, open, onClose }: Props) {
  const [scheduledLocal, setScheduledLocal] = useState(defaultLocalDatetime());
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!scheduledLocal) {
      setError("일정을 선택해 주세요");
      return;
    }
    const scheduledAtISO = new Date(scheduledLocal).toISOString();
    startTransition(async () => {
      const result = await confirmBooking({
        threadId,
        scheduledAt: scheduledAtISO,
        memo: memo.trim() ? memo.trim() : null,
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  const minDatetime = defaultLocalDatetime();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-950 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="booking-modal-title"
            className="flex items-center gap-2 text-base font-bold"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden /> 일정 확정하기
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="scheduledAt"
              className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              방문 일시
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledLocal}
              min={minDatetime}
              onChange={(e) => setScheduledLocal(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label
              htmlFor="memo"
              className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              메모 <span className="text-zinc-500">(선택 · {MEMO_MAX}자)</span>
            </label>
            <textarea
              id="memo"
              rows={3}
              value={memo}
              maxLength={MEMO_MAX}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="엘리베이터 이용 가능 · 주차 가능 등"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="mt-1 text-right text-[11px] text-zinc-400">
              {memo.length} / {MEMO_MAX}
            </p>
          </div>

          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            확정하면 고객에게 알림이 갑니다. 변경은 현재 지원되지 않아요.
          </p>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "확정 중..." : "일정 확정"}
          </button>
        </form>
      </div>
    </div>
  );
}
