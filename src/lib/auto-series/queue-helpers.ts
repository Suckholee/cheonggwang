import {
  AUTO_SERIES_ANGLES,
  type AutoSeriesAngle,
} from "@/domain/auto-series-angle";
import { POST_FORMATS, type PostFormat } from "@/domain/post-format";
import type { QueueItem } from "@/types/auto-series";

/**
 * v1.14 cycle #27 partner-series-queue · §3.7 (M5 결의).
 *
 * AddDialog에 표시할 미사용 (angle × format) 조합.
 * 순서: angle outer × format inner — 예측 가능한 UX.
 */
export function availableSlots(
  currentQueue: QueueItem[],
): Array<{ angle: AutoSeriesAngle; format: PostFormat }> {
  const used = new Set(
    currentQueue.map((q) => `${q.angle}:${q.format}`),
  );
  const result: Array<{ angle: AutoSeriesAngle; format: PostFormat }> = [];
  for (const angle of AUTO_SERIES_ANGLES) {
    for (const format of POST_FORMATS) {
      if (!used.has(`${angle}:${format}`)) {
        result.push({ angle, format });
      }
    }
  }
  return result;
}
