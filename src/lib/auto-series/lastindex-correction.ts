import type { QueueItem } from "@/types/auto-series";

/**
 * v1.14 cycle #27 partner-series-queue · §3.4 (C4·H1·R8 결의).
 *
 * remove/toggle/reorder 후 effectiveQueue 안 active item 위치를 보존하도록
 * lastIndex 보정. 순수 함수 — 단위 테스트로 모든 edge case 검증 (Test Plan §9.5).
 *
 * R8 invariant: lastIndex는 effectiveQueue(enabled=true 항목 array) 안 인덱스.
 *
 * 알고리즘:
 *   1. prevEffective = prevQueue.filter(enabled)
 *   2. activeId = prevEffective[prevLastIndex]?.id  — 마지막으로 발행한 active item ID
 *   3. nextEffective = nextQueue.filter(enabled)
 *   4. newLastIndex = nextEffective.findIndex(q => q.id === activeId)
 *   5. 못 찾으면 -1 (다음 tick에 nextEffective[0]부터)
 */

export interface CorrectionInput {
  prevQueue: QueueItem[];
  nextQueue: QueueItem[];
  prevLastIndex: number;
}

export function correctLastIndex(input: CorrectionInput): number {
  const { prevQueue, nextQueue, prevLastIndex } = input;
  const prevEffective = prevQueue.filter((q) => q.enabled);
  const nextEffective = nextQueue.filter((q) => q.enabled);

  // prev invalid → reset
  if (prevLastIndex < 0 || prevLastIndex >= prevEffective.length) {
    return -1;
  }

  const activeId = prevEffective[prevLastIndex]?.id;
  if (!activeId) return -1;

  const newPos = nextEffective.findIndex((q) => q.id === activeId);
  return newPos >= 0 ? newPos : -1;
}
