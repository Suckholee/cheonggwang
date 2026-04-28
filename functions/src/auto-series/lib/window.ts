import type { AutoPublishConfig, Partner } from "./types";

/**
 * v1.15 cycle #28 partner-aeo-boost · §3.7 (C1+H7 결의).
 * Cloud Functions 측 window helpers — host TZ 무관 (R10).
 *
 * ⚠️ MIRROR of src/lib/partner/auto-publish-window.ts — keep in sync.
 * CI lint(scripts/check-queue-mirror.mjs)로 동기화 보장.
 */

export interface KstWallClock {
  year: number;
  month: number; // 0-based (Date.UTC 호환)
  date: number; // 1-based
  day: number; // 0=Sun..6=Sat
  hours: number;
  minutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function toKstWallClock(d: Date): KstWallClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10) - 1,
    date: parseInt(get("day"), 10),
    day: WEEKDAY_MAP[get("weekday")] ?? 0,
    hours: parseInt(get("hour"), 10) % 24,
    minutes: parseInt(get("minute"), 10),
  };
}

function setKstClock(wall: KstWallClock, minute: number): Date {
  const h = Math.floor(minute / 60);
  const mi = minute % 60;
  return new Date(Date.UTC(wall.year, wall.month, wall.date, h - 9, mi, 0, 0));
}

export function isInAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date,
): boolean {
  if (!cfg.enabled) return false;
  if (cfg.weekdays.length === 0) return false;
  const wall = toKstWallClock(now);
  if (!cfg.weekdays.includes(wall.day)) return false;
  const minute = wall.hours * 60 + wall.minutes;
  return minute >= cfg.startMinute && minute < cfg.endMinute;
}

export function currentWindowStart(
  cfg: AutoPublishConfig,
  now: Date,
): Date | null {
  if (!cfg.enabled) return null;
  if (cfg.weekdays.length === 0) return null;
  const wall = toKstWallClock(now);
  if (!cfg.weekdays.includes(wall.day)) return null;
  const minute = wall.hours * 60 + wall.minutes;
  if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
  return setKstClock(wall, cfg.startMinute);
}

/**
 * 호출 invariant: 반드시 isInAutoPublishWindow가 true일 때만 호출.
 */
export function recentlyPublishedInWindow(
  partner: Partner,
  now: Date,
): boolean {
  const lastTick = partner.autoSeries?.lastTickAt;
  if (!lastTick) return false;
  const winStart = currentWindowStart(partner.autoPublish, now);
  if (!winStart) return false;
  return lastTick.getTime() >= winStart.getTime();
}
