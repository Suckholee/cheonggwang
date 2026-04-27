import type { AutoSeriesAngle, PostFormat } from "./types";

/**
 * v1.13 cycle #26 · §2.3 — ROTATION_POOL functions 측 복제.
 *
 * ⚠️ MIRROR of src/domain/auto-series-rotation-pool.ts — keep in sync
 */

export interface RotationSlot {
  angle: AutoSeriesAngle;
  format: PostFormat;
}

export const AUTO_SERIES_ROTATION_POOL: RotationSlot[] = [
  { angle: "usp", format: "blog" },
  { angle: "menu", format: "card-news" },
  { angle: "review", format: "blog" },
  { angle: "event", format: "card-news" },
  { angle: "story", format: "blog" },
  { angle: "usp", format: "card-news" },
  { angle: "menu", format: "blog" },
  { angle: "review", format: "card-news" },
  { angle: "event", format: "blog" },
  { angle: "story", format: "card-news" },
];

export function pickSlot(lastIndex: number): {
  nextIndex: number;
  slot: RotationSlot;
} {
  const len = AUTO_SERIES_ROTATION_POOL.length;
  const nextIndex = (((lastIndex + 1) % len) + len) % len;
  return { nextIndex, slot: AUTO_SERIES_ROTATION_POOL[nextIndex] };
}
