// NOT server-only — tsx test 가능 (cycle #31 C5 패턴 재사용, R-L2)
import {
  DEFAULT_SCHEDULE,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.3 (S2)
 *
 * Pure gate. config.schedule 누락 시 DEFAULT_SCHEDULE fallback (R12).
 * NEW-H6 :30 invariant 강제 — minutes !== 30이면 false (cron `30 * * * *`만 통과).
 *
 * runner.ts에서 매 tick 1회 호출. preview helper와 동일 진실 단일화 — 캘린더 미리보기와
 * 실 발행이 항상 일치.
 *
 * ⚠️ MIRROR with functions/src/tips/lib/schedule-gate.ts.
 *    CI lint: scripts/check-queue-mirror.mjs (shouldTickNow + minutes !== 30 양 패키지).
 */
export interface KstNowParts {
  hours: number;
  minutes: number;
  /** 0..6 (Date.getDay 호환) */
  dayOfWeek: number;
}

export function shouldTickNow(
  config: TipsAutoConfig,
  kstNow: KstNowParts,
): boolean {
  const sched: TipsScheduleConfig = config.schedule ?? DEFAULT_SCHEDULE;
  if (kstNow.minutes !== 30) return false; // NEW-H6 :30 invariant
  if (kstNow.hours !== sched.hour) return false;
  if (!sched.daysOfWeek.includes(kstNow.dayOfWeek)) return false;
  return true;
}
