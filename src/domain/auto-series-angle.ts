/**
 * v1.13 cycle #26 partner-auto-series · §2.1 — 자동 시리즈 angle.
 *
 * 5개 angle: 강점·메뉴·후기·이벤트·매장 이야기.
 * 각 angle은 ROTATION_POOL에서 blog/card-news 두 format으로 변주됨 (총 10 slot).
 */

export type AutoSeriesAngle = "usp" | "menu" | "review" | "event" | "story";

export const AUTO_SERIES_ANGLES: AutoSeriesAngle[] = [
  "usp",
  "menu",
  "review",
  "event",
  "story",
];

export const ANGLE_LABELS: Record<AutoSeriesAngle, string> = {
  usp: "강점·차별점",
  menu: "메뉴·가격",
  review: "고객 후기",
  event: "이벤트·할인",
  story: "매장 이야기",
};

export const ANGLE_EMOJI: Record<AutoSeriesAngle, string> = {
  usp: "✨",
  menu: "🍽️",
  review: "💬",
  event: "🎉",
  story: "📖",
};

export function isAutoSeriesAngle(v: unknown): v is AutoSeriesAngle {
  return (
    v === "usp" ||
    v === "menu" ||
    v === "review" ||
    v === "event" ||
    v === "story"
  );
}
