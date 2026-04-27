import type { AutoSeriesAngle, PostFormat } from "./types";

/**
 * v1.14 cycle #27 — autoSeriesQueue Firestore validation 가드.
 *
 * ⚠️ MIRROR of src/domain/auto-series-angle.ts + src/domain/post-format.ts.
 */

const ANGLES: ReadonlyArray<AutoSeriesAngle> = [
  "usp",
  "menu",
  "review",
  "event",
  "story",
];
const FORMATS: ReadonlyArray<PostFormat> = ["blog", "card-news"];

export function isAutoSeriesAngle(v: unknown): v is AutoSeriesAngle {
  return typeof v === "string" && (ANGLES as readonly string[]).includes(v);
}

export function isPostFormat(v: unknown): v is PostFormat {
  return typeof v === "string" && (FORMATS as readonly string[]).includes(v);
}
