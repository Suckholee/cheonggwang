import type { Partner } from "@/types/partner";
import {
  AUTO_SERIES_ROTATION_POOL,
  type RotationSlot,
} from "@/domain/auto-series-rotation-pool";

/**
 * v1.14 cycle #27 partner-series-queue · §3.1 (R2 결의).
 *
 * Cron tick 시 사용할 effective queue 반환.
 *  - autoSeriesQueue 없거나 빈 효과 큐 → ROTATION_POOL fallback (R2)
 *  - 활성 항목(enabled=true)만 반환 (cron skip 처리)
 *
 * 동기화: functions/src/auto-series/lib/effective-queue.ts와 동일 로직.
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
