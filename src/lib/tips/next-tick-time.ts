import { toKstWallClock } from "@/lib/partner/auto-publish-window";
import {
  DEFAULT_SCHEDULE,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.4 (S7) — original `30 9-17 * * *` 가정
 * v1.19 cycle #32 tips-schedule-editor · §3.4 — config-driven 시그니처 변경
 *
 * cron `30 * * * *` Asia/Seoul + Firestore schedule(hour, daysOfWeek) 패턴.
 * Host TZ 무관 (cycle #28 toKstWallClock 패턴 재사용).
 *
 * H4 결의 — `nextAutoPublishWindow`은 weekday-window 의도 (partner 자동 발행),
 *           본 helper는 cron `:30 hourly` + Firestore daysOfWeek 의도 (tips). 의도 분리.
 *
 * ⚠️ MIRROR with functions/src/tips/lib/next-tick-time.ts (cycle #32 NEW mirror).
 *    R-H3 — functions 측 toKstWallClock import는 `../auto-series/lib/window` (Next.js의
 *    `auto-publish-window.ts`와 다른 파일명).
 *
 * NOT server-only (R-L2) — tsx test 가능.
 */

export interface NextTickResult {
  /** Real UTC Date — UI에서 toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) 사용 */
  utc: Date;
  /** KST display fields (1-based month) */
  year: number;
  month: number;
  date: number;
  hours: number;
  /** 항상 30 (NEW-H6 :30 invariant) */
  minutes: number;
  /** 0..6 (Date.getDay 호환) */
  dayOfWeek: number;
}

/**
 * config.schedule 기준 다음 발화 KST 시각.
 *  - schedule 없으면 DEFAULT_SCHEDULE (R12 graceful fallback)
 *  - daysOfWeek는 0..6 (Date.getDay) — sorted, unique 가정
 *  - 알고리즘:
 *      1) 오늘 KST가 daysOfWeek ∈ 이고 (hour < sched.hour OR hour == sched.hour && minutes < 30)
 *         → 오늘 sched.hour:30
 *      2) else: 1..7일 앞에서 첫 매칭 day의 sched.hour:30
 *      3) 7일 안에 매칭 없으면 (corrupt daysOfWeek=[]) → DEFAULT_SCHEDULE로 재귀
 */
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
      // daysOfWeek=[] 같은 corrupt case — 7일 wraparound 실패 → DEFAULT_SCHEDULE fallback
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
    month: cm + 1, // 1-based for display
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

/**
 * cycle #32 — `/admin/tips`의 ScheduleInfo 카드 + audit 표 표시용 한국어 요약.
 *  - 매일: "매일 14:30 KST"
 *  - 평일(1..5): "평일 14:30 KST"
 *  - 주말(0,6): "주말 14:30 KST"
 *  - else: "월·수·금 14:30 KST"
 *
 * Next.js 단독 (functions mirror 제외 — UI 전용).
 */
export function formatScheduleSummary(s: TipsScheduleConfig): string {
  const dowKo = ["일", "월", "화", "수", "목", "금", "토"];
  const days = [...new Set(s.daysOfWeek)].sort((a, b) => a - b);
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const time = `${pad2(s.hour)}:30 KST`;
  if (days.length === 7) return `매일 ${time}`;
  if (days.length === 5 && days.join(",") === "1,2,3,4,5")
    return `평일 ${time}`;
  if (days.length === 2 && days.join(",") === "0,6") return `주말 ${time}`;
  return `${days.map((d) => dowKo[d]).join("·")} ${time}`;
}
