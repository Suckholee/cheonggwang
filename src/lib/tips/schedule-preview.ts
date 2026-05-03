// NOT server-only — pure (R-L2)
import { toKstWallClock } from "@/lib/partner/auto-publish-window";
import { DEFAULT_SCHEDULE, type TipsAutoConfig } from "./tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.5 (S9 — `/admin/tips/schedule` 30일 미리보기)
 *
 * 향후 N일 (default 30) 발행 예정 미리보기.
 * gate (`shouldTickNow`)와 동일 의미 — daysOfWeek 미포함 요일은 willPublish=false.
 * UI는 server-render — 클라 JS 0줄 (캘린더 카드 그리드).
 *
 * Next.js 단독 (functions mirror 제외 — UI 전용).
 */

export interface PreviewDay {
  /** UTC instant of {date}T{hour}:30 KST */
  utc: Date;
  year: number;
  month: number; // 1-based
  date: number;
  /** 0..6 (Date.getDay 호환) */
  dayOfWeek: number;
  hour: number;
  minutes: 30;
  willPublish: boolean;
}

export function previewSchedule(
  config: TipsAutoConfig,
  now: Date,
  days = 30,
): PreviewDay[] {
  const sched = config.schedule ?? DEFAULT_SCHEDULE;
  const wall = toKstWallClock(now);
  const out: PreviewDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const candidate = new Date(
      Date.UTC(wall.year, wall.month, wall.date + i),
    );
    const cy = candidate.getUTCFullYear();
    const cm = candidate.getUTCMonth();
    const cd = candidate.getUTCDate();
    const dow = candidate.getUTCDay();
    const utc = new Date(Date.UTC(cy, cm, cd, sched.hour - 9, 30, 0, 0));
    out.push({
      utc,
      year: cy,
      month: cm + 1,
      date: cd,
      dayOfWeek: dow,
      hour: sched.hour,
      minutes: 30,
      willPublish: sched.daysOfWeek.includes(dow),
    });
  }
  return out;
}
