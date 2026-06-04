import { toKstWallClock } from "./auto-publish-window";

export type TipSeason = "spring" | "summer" | "fall" | "winter";

export function getTodayKstStart(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  return new Date(Date.UTC(wall.year, wall.month, wall.date, -9, 0, 0, 0));
}

export function currentKstSeason(now: Date = new Date()): TipSeason {
  const wall = toKstWallClock(now);
  const m = wall.month + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

export function firstDayOfMonthKst(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  return new Date(Date.UTC(wall.year, wall.month, 1, -9, 0, 0, 0));
}
