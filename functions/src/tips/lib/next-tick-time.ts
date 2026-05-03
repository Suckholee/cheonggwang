import { toKstWallClock } from "../../auto-series/lib/window";
import {
  DEFAULT_SCHEDULE,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.4 (functions side mirror, NEW).
 *
 * cron `30 * * * *` Asia/Seoul + Firestore schedule(hour, daysOfWeek) 패턴.
 * Host TZ 무관 (cycle #28 toKstWallClock 패턴).
 *
 * ⚠️ MIRROR with src/lib/tips/next-tick-time.ts.
 *    R-H3 — functions 측 toKstWallClock import는 `../../auto-series/lib/window` (Next.js의
 *    `auto-publish-window.ts`와 다른 파일명).
 *    H3 결의 — @/ alias 없음 → 상대 import.
 *
 * runner는 본 helper 직접 호출 X (현재). 단 OQ8 결의에 따라 일관성 유지 + 향후 metric/log
 * 용도 확장 대비.
 *
 * formatScheduleSummary는 Next.js 단독 (UI 전용 — functions mirror 제외).
 */

export interface NextTickResult {
  utc: Date;
  year: number;
  /** 1-based for display */
  month: number;
  date: number;
  hours: number;
  /** 항상 30 (NEW-H6 :30 invariant) */
  minutes: number;
  /** 0..6 (Date.getDay 호환) */
  dayOfWeek: number;
}

export function calculateNextTickTime(
  config: TipsAutoConfig,
  now: Date = new Date(),
): NextTickResult {
  const sched = config.schedule ?? DEFAULT_SCHEDULE;
  const wall = toKstWallClock(now);
  const todayDow = new Date(
    Date.UTC(wall.year, wall.month, wall.date),
  ).getUTCDay();

  const beforeTodayTick =
    sched.daysOfWeek.includes(todayDow) &&
    (wall.hours < sched.hour ||
      (wall.hours === sched.hour && wall.minutes < 30));

  let offset = 0;
  if (!beforeTodayTick) {
    offset = 1;
    while (offset <= 7) {
      const candidate = new Date(
        Date.UTC(wall.year, wall.month, wall.date + offset),
      );
      const dow = candidate.getUTCDay();
      if (sched.daysOfWeek.includes(dow)) break;
      offset += 1;
    }
    if (offset > 7) {
      // daysOfWeek=[] 같은 corrupt case → DEFAULT_SCHEDULE fallback
      return calculateNextTickTime(
        { ...config, schedule: DEFAULT_SCHEDULE },
        now,
      );
    }
  }

  const candidate = new Date(
    Date.UTC(wall.year, wall.month, wall.date + offset),
  );
  const cy = candidate.getUTCFullYear();
  const cm = candidate.getUTCMonth();
  const cd = candidate.getUTCDate();
  const dow = candidate.getUTCDay();

  // KST {sched.hour}:30 → UTC ({sched.hour - 9}):30 (KST = UTC+9)
  const utc = new Date(Date.UTC(cy, cm, cd, sched.hour - 9, 30, 0, 0));

  return {
    utc,
    year: cy,
    month: cm + 1,
    date: cd,
    hours: sched.hour,
    minutes: 30,
    dayOfWeek: dow,
  };
}

export function formatNextTickKst(r: NextTickResult): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${r.year}-${pad2(r.month)}-${pad2(r.date)} ${pad2(r.hours)}:${pad2(r.minutes)} KST`;
}

/** TipsScheduleConfig export 재노출 (mirror lint regex 매칭용 — 향후 metric 사용 시 활용) */
export type { TipsScheduleConfig };
