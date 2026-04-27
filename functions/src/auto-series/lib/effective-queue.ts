import type { Partner } from "./types";
import {
  AUTO_SERIES_ROTATION_POOL,
  type RotationSlot,
} from "./rotation";

/**
 * v1.14 cycle #27 partner-series-queue · §3.1 (R2 결의).
 *
 * Cron tick 시 사용할 effective queue 반환.
 *  - autoSeriesQueue 없거나 빈 효과 큐 → ROTATION_POOL fallback (R2)
 *  - 활성 항목(enabled=true)만 반환
 *
 * ⚠️ MIRROR of src/lib/auto-series/effective-queue.ts — keep in sync.
 * CI lint(scripts/check-queue-mirror.mjs)로 동기화 보장.
 */
export function effectiveQueue(partner: Partner): RotationSlot[] {
  const queue = partner.autoSeriesQueue;
  if (!queue || queue.length === 0) return AUTO_SERIES_ROTATION_POOL;
  const active = queue
    .filter((q) => q.enabled)
    .map((q) => ({ angle: q.angle, format: q.format }));
  if (active.length === 0) return AUTO_SERIES_ROTATION_POOL;
  return active;
}

/**
 * effectiveQueue 기반 다음 슬롯 선택. lastIndex는 effectiveQueue 안 인덱스 (R8).
 */
export function pickSlotFromEffective(
  effective: RotationSlot[],
  lastIndex: number,
): { nextIndex: number; slot: RotationSlot } {
  const len = effective.length;
  const nextIndex = (((lastIndex + 1) % len) + len) % len;
  return { nextIndex, slot: effective[nextIndex] };
}
