import type { PostFormat } from "@/domain/post-format";
import type { AutoSeriesAngle } from "./auto-series-angle";

/**
 * v1.13 cycle #26 partner-auto-series · §2.3 — 라운드 로빈 슬롯 풀.
 *
 * 10 slot = 5 angle × 2 format. lastIndex가 -1에서 시작해 매 tick마다 +1 % 10.
 * angle/format이 매 윈도우마다 다양하게 변주되도록 의도된 정렬.
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

/**
 * 다음 슬롯 결정. lastIndex가 -1(초기) 또는 9(끝) → nextIndex=0.
 */
export function pickSlot(lastIndex: number): {
  nextIndex: number;
  slot: RotationSlot;
} {
  const nextIndex =
    ((lastIndex + 1) % AUTO_SERIES_ROTATION_POOL.length +
      AUTO_SERIES_ROTATION_POOL.length) %
    AUTO_SERIES_ROTATION_POOL.length;
  return { nextIndex, slot: AUTO_SERIES_ROTATION_POOL[nextIndex] };
}
