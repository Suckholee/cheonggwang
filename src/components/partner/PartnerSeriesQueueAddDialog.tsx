"use client";

import { useState, useTransition } from "react";
import { addQueueItem } from "@/app/actions/partner-auto-series-actions";
import { ANGLE_EMOJI, ANGLE_LABELS } from "@/domain/auto-series-angle";
import {
  POST_FORMAT_EMOJI,
  POST_FORMAT_LABELS,
} from "@/domain/post-format";
import { availableSlots } from "@/lib/auto-series/queue-helpers";
import type { QueueItem } from "@/types/auto-series";

/**
 * v1.14 cycle #27 partner-series-queue · §6.3 (S9).
 *
 * 큐에 (angle × format) 조합 추가하는 다이얼로그(인라인 expand).
 *  - 미사용 조합만 표시 (queue-helpers.availableSlots).
 *  - 빈 큐 → 첫 추가 안내 + 시스템 기본 안내.
 *  - 추가는 enabled=true로 큐 끝에 append.
 */

interface Props {
  currentQueue: QueueItem[];
  /** MAX 도달 → 비활성화 */
  maxReached: boolean;
}

export default function PartnerSeriesQueueAddDialog({
  currentQueue,
  maxReached,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slots = availableSlots(currentQueue);

  function handleAdd(angle: QueueItem["angle"], format: QueueItem["format"]) {
    setError(null);
    startTransition(async () => {
      const res = await addQueueItem({ angle, format });
      if (!res.ok) {
        setError(res.message ?? "추가 실패");
      } else {
        setOpen(false);
      }
    });
  }

  if (maxReached) {
    return (
      <p className="text-xs text-zinc-500">
        큐 최대 30개에 도달했어요. 일부 항목을 삭제한 후 추가하세요.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        가능한 모든 조합(5×2=10)이 큐에 추가되었어요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
      >
        {open ? "닫기" : `+ 항목 추가 (${slots.length}개 가능)`}
      </button>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </p>
      )}

      {open && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="mb-2 text-xs text-zinc-500">
            추가할 angle × format 조합을 선택하세요.
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {slots.map(({ angle, format }) => (
              <li key={`${angle}:${format}`}>
                <button
                  type="button"
                  onClick={() => handleAdd(angle, format)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/40"
                >
                  <span className="mr-1">{ANGLE_EMOJI[angle]}</span>
                  {ANGLE_LABELS[angle]}
                  <span className="mx-1 text-zinc-400">·</span>
                  <span>{POST_FORMAT_EMOJI[format]}</span>{" "}
                  {POST_FORMAT_LABELS[format]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
