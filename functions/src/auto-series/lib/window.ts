import type { AutoPublishConfig, Partner } from "./types";

/**
 * v1.13 cycle #26 · §4.4 — window helpers functions 측 복제.
 *
 * ⚠️ MIRROR of src/lib/partner/auto-publish-window.ts — keep in sync
 */

export function toKST(d: Date): Date {
  const kstStr = d.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  return new Date(kstStr);
}

export function isInAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date,
): boolean {
  if (!cfg.enabled) return false;
  if (cfg.weekdays.length === 0) return false;
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return false;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  return minute >= cfg.startMinute && minute < cfg.endMinute;
}

function setKstClock(base: Date, minute: number): Date {
  const d = new Date(base);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

export function currentWindowStart(
  cfg: AutoPublishConfig,
  now: Date,
): Date | null {
  if (!cfg.enabled) return null;
  if (cfg.weekdays.length === 0) return null;
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return null;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
  return setKstClock(kst, cfg.startMinute);
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
