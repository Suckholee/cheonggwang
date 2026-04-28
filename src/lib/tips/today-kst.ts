import { toKstWallClock } from "@/lib/partner/auto-publish-window";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.6 (NEW C1·M1·M9 결의)
 *
 * KST 자정·시즌·월초 산술 — host TZ 무관 (cycle #28 toKstWallClock 패턴 재사용).
 * Node 22 UTC + macOS KST 모두 동일 결과.
 *
 * ⚠️ MIRROR of functions/src/tips/lib/today-kst.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (today-kst 양 패키지 동일 export).
 */

export type TipSeason = "spring" | "summer" | "fall" | "winter";

/**
 * 주어진 시각이 속한 KST 자정 (real UTC Date) 반환.
 * 일일 1건 제한 query에 사용 (runner.ts).
 */
export function getTodayKstStart(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  // 오늘(KST) 자정 = real UTC of (year, month, date, 0시 KST = -9시 UTC).
  return new Date(Date.UTC(wall.year, wall.month, wall.date, -9, 0, 0, 0));
}

/**
 * 현재 KST 시즌. 기상학적 분류 (3-5 봄, 6-8 여름, 9-11 가을, 12-2 겨울).
 * topic-pool.ts 시즌 필터에 사용.
 */
export function currentKstSeason(now: Date = new Date()): TipSeason {
  const wall = toKstWallClock(now);
  const m = wall.month + 1; // 1-based
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

/**
 * KST 기준 이번 달 1일 자정 (real UTC Date) 반환.
 * tip-repository.getTipMonthlyStats() count 쿼리에 사용.
 */
export function firstDayOfMonthKst(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  return new Date(Date.UTC(wall.year, wall.month, 1, -9, 0, 0, 0));
}
