import { toKstWallClock } from "@/lib/partner/auto-publish-window";

/**
 * v1.18 cycle #31 tips-admin-config · §3.4 (S7)
 *
 * cron `30 9-17 * * *` Asia/Seoul 패턴에 대해 다음 발화 KST 시각 계산.
 * Host TZ 무관 (cycle #28 toKstWallClock 패턴 재사용).
 *
 * H4 결의 — `nextAutoPublishWindow`은 weekday-window 의도 (partner 자동 발행),
 *           본 helper는 cron `:30 hourly` 의도 (tips). 의도 분리.
 */

export interface NextTickResult {
  /** Real UTC Date — UI에서 toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) 사용 */
  utc: Date;
  /** KST display fields (1-based month) */
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
}

/**
 * 다음 tipsTick 발화 KST 시각.
 *
 * 규칙 (cron `30 9-17 * * *` Asia/Seoul):
 *   - hours < 9 → 오늘 09:30
 *   - hours < 17 && minutes < 30 → 오늘 HH:30
 *   - hours < 17 && minutes >= 30 → 오늘 (HH+1):30
 *   - hours == 17 && minutes < 30 → 오늘 17:30
 *   - else → 다음 날 09:30
 */
export function calculateNextTickTime(now: Date = new Date()): NextTickResult {
  const wall = toKstWallClock(now);
  const { year, month: m0, date, hours, minutes } = wall;

  let nextH: number;
  let nextDate = date;
  let nextMonth = m0;
  let nextYear = year;

  if (hours < 9) {
    nextH = 9;
  } else if (hours < 17) {
    if (minutes < 30) {
      nextH = hours;
    } else {
      nextH = hours + 1;
    }
  } else if (hours === 17 && minutes < 30) {
    nextH = 17;
  } else {
    // 17:30 이후 → 다음 날 09:30
    nextH = 9;
    const tmp = new Date(Date.UTC(year, m0, date + 1));
    nextYear = tmp.getUTCFullYear();
    nextMonth = tmp.getUTCMonth();
    nextDate = tmp.getUTCDate();
  }

  // KST (nextYear, nextMonth, nextDate, nextH, 30) → real UTC Date
  const utc = new Date(
    Date.UTC(nextYear, nextMonth, nextDate, nextH - 9, 30, 0, 0),
  );

  return {
    utc,
    year: nextYear,
    month: nextMonth + 1, // 1-based for display
    date: nextDate,
    hours: nextH,
    minutes: 30,
  };
}

export function formatNextTickKst(r: NextTickResult): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${r.year}-${pad2(r.month)}-${pad2(r.date)} ${pad2(r.hours)}:${pad2(r.minutes)} KST`;
}
