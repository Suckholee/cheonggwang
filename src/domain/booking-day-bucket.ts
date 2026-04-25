import type { DayBucket } from "@/types/booking";

/**
 * v1.3 #1 booking — KST 기준 day bucket 분류 (pure).
 * 5 buckets: today/tomorrow/thisWeek(2~7일)/later(7일 초과)/past.
 */
export function computeDayBucket(
  scheduledAtMs: number,
  now: number = Date.now(),
): DayBucket {
  const kstNow = new Date(now + 9 * 3600 * 1000);
  const startOfTodayKst =
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
    ) - 9 * 3600 * 1000;
  const startOfTomorrow = startOfTodayKst + 24 * 3600 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 3600 * 1000;
  const startOfNextWeek = startOfTodayKst + 7 * 24 * 3600 * 1000;

  if (scheduledAtMs < startOfTodayKst) return "past";
  if (scheduledAtMs < startOfTomorrow) return "today";
  if (scheduledAtMs < startOfDayAfter) return "tomorrow";
  if (scheduledAtMs < startOfNextWeek) return "thisWeek";
  return "later";
}

/** "4/22(월) 14:00" KST (pure) */
export function formatScheduledLabel(ms: number): string {
  const kst = new Date(ms + 9 * 3600 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${m}/${d}(${dow}) ${h}:${min}`;
}
