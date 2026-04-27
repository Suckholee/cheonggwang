"use client";

import { useState, useTransition } from "react";
import {
  removeQueueItem,
  reorderQueue,
  toggleQueueItem,
} from "@/app/actions/partner-auto-series-actions";
import { ANGLE_EMOJI, ANGLE_LABELS } from "@/domain/auto-series-angle";
import {
  POST_FORMAT_EMOJI,
  POST_FORMAT_LABELS,
} from "@/domain/post-format";
import type { QueueItem } from "@/types/auto-series";

/**
 * v1.14 cycle #27 partner-series-queue · §6.2 (S8).
 *
 * 사장님이 큐를 직접 편집하는 클라이언트 컴포넌트.
 *  - 토글(일시정지/재개)
 *  - 삭제
 *  - 순서 변경: HTML5 drag-and-drop + ▲▼ 버튼 fallback (모바일 친화)
 *
 * 모든 변경은 server action 경유 (Admin SDK + atomic transaction).
 * 낙관적 UI — 실패 시 사용자 알림 + 새로고침 힌트.
 */

interface Props {
  initialQueue: QueueItem[];
}

export default function PartnerSeriesQueueEditor({ initialQueue }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, nextEnabled: boolean) {
    const prev = queue;
    setQueue(
      queue.map((q) => (q.id === id ? { ...q, enabled: nextEnabled } : q)),
    );
    setError(null);
    startTransition(async () => {
      const res = await toggleQueueItem({ id, enabled: nextEnabled });
      if (!res.ok) {
        setQueue(prev);
        setError(res.message ?? "변경 실패");
      }
    });
  }

  function handleRemove(id: string) {
    if (!confirm("이 항목을 큐에서 삭제할까요?")) return;
    const prev = queue;
    setQueue(queue.filter((q) => q.id !== id));
    setError(null);
    startTransition(async () => {
      const res = await removeQueueItem({ id });
      if (!res.ok) {
        setQueue(prev);
        setError(res.message ?? "삭제 실패");
      }
    });
  }

  function commitOrder(next: QueueItem[]) {
    const prev = queue;
    setQueue(next);
    setError(null);
    startTransition(async () => {
      const res = await reorderQueue({
        orderedIds: next.map((q) => q.id),
      });
      if (!res.ok) {
        setQueue(prev);
        setError(res.message ?? "순서 변경 실패");
      }
    });
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const next = [...queue];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    commitOrder(next);
  }

  function moveDown(idx: number) {
    if (idx >= queue.length - 1) return;
    const next = [...queue];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    commitOrder(next);
  }

  function onDragStart(e: React.DragEvent<HTMLLIElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(
    e: React.DragEvent<HTMLLIElement>,
    targetId: string,
  ) {
    e.preventDefault();
    const draggedId = draggingId ?? e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    if (!draggedId || draggedId === targetId) return;

    const fromIdx = queue.findIndex((q) => q.id === draggedId);
    const toIdx = queue.findIndex((q) => q.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const next = [...queue];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    commitOrder(next);
  }

  if (queue.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        큐가 비어 있어요. 시스템 기본 순서(USP→메뉴→후기→이벤트→스토리)로 발행됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </p>
      )}
      <ul className="space-y-1.5">
        {queue.map((q, idx) => {
          const isDragging = draggingId === q.id;
          const dim = !q.enabled;
          return (
            <li
              key={q.id}
              draggable
              onDragStart={(e) => onDragStart(e, q.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, q.id)}
              onDragEnd={() => setDraggingId(null)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-opacity ${
                isDragging
                  ? "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              } ${dim ? "opacity-50" : ""}`}
            >
              <span
                className="cursor-move select-none text-zinc-400"
                aria-hidden
                title="드래그하여 순서 변경"
              >
                ⋮⋮
              </span>
              <span className="flex-1">
                <span className="mr-1">{ANGLE_EMOJI[q.angle]}</span>
                {ANGLE_LABELS[q.angle]}
                <span className="mx-1 text-zinc-400">·</span>
                <span>{POST_FORMAT_EMOJI[q.format]}</span>{" "}
                {POST_FORMAT_LABELS[q.format]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0 || isPending}
                  className="rounded p-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  aria-label="위로"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === queue.length - 1 || isPending}
                  className="rounded p-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  aria-label="아래로"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(q.id, !q.enabled)}
                  disabled={isPending}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    q.enabled
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {q.enabled ? "활성" : "일시정지"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(q.id)}
                  disabled={isPending}
                  className="rounded p-1 text-xs text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
