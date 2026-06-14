"use client";

import { useState, useEffect, useTransition } from "react";
import { Star, X } from "lucide-react";
import { createReview } from "@/app/actions/review-actions";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  onSubmitSuccess: () => void;
}

export function ReviewCreateModal({
  open,
  onClose,
  bookingId,
  onSubmitSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRating(5);
      setHoverRating(null);
      setText("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedText = text.trim();
    if (trimmedText.length < 5) {
      setError("후기는 최소 5자 이상 작성해 주세요");
      return;
    }
    if (trimmedText.length > 500) {
      setError("후기는 500자 이하로 작성해 주세요");
      return;
    }

    startTransition(async () => {
      const result = await createReview({
        bookingId,
        rating,
        text: trimmedText,
      });
      if (result.ok) {
        onSubmitSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-950 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="review-modal-title"
            className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-50"
          >
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-hidden /> 후기 작성하기
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center justify-center py-2">
            <span className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              만족스러운 청소였나요? 평점을 남겨주세요
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((index) => {
                const isFilled = index <= activeRating;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRating(index)}
                    onMouseEnter={() => setHoverRating(index)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="group relative p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-all ${
                        isFilled
                          ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                          : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="reviewText"
              className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              상세 후기 <span className="text-zinc-400">(최소 5자 · 최대 500자)</span>
            </label>
            <textarea
              id="reviewText"
              rows={4}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder="제공받은 청소 서비스의 솔직한 후기를 공유해 주세요. 다른 고객들에게 큰 도움이 됩니다."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-indigo-400"
            />
            <p className="mt-1 text-right text-[11px] text-zinc-400">{text.length} / 500</p>
          </div>

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
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {isPending ? "등록 중..." : "후기 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
