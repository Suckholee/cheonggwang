import type { TimeContext } from "./rails";

const HOUR_TO_CONTEXT = new Map<number, TimeContext>([
  [6, "morning"],
  [7, "morning"],
  [8, "morning"],
  [9, "morning"],
  [10, "morning"],
  [11, "lunch"],
  [12, "lunch"],
  [13, "lunch"],
  [14, "afternoon"],
  [15, "afternoon"],
  [16, "afternoon"],
  [17, "afternoon"],
  [18, "evening"],
  [19, "evening"],
  [20, "evening"],
  [21, "evening"],
  [22, "latenight"],
  [23, "latenight"],
  [0, "latenight"],
  [1, "latenight"],
  [2, "latenight"],
  [3, "latenight"],
  [4, "latenight"],
  [5, "latenight"],
]);

/**
 * 서버 렌더링 전용 — 서버는 UTC 시각을 KST로 환산해 사용.
 * (Vercel/Firebase Functions는 UTC 타임존)
 *
 * I1: 클라이언트 로컬 시각과 불일치 가능성 있으나, feedService의
 * cacheLife('minutes')로 최대 60초 stale 수용 — 구현 시점 결정.
 */
export function currentTimeContext(now: Date = new Date()): TimeContext {
  const kstHour = (now.getUTCHours() + 9) % 24;
  return HOUR_TO_CONTEXT.get(kstHour) ?? "afternoon";
}

/**
 * 클라이언트 전용 — 브라우저 로컬 시각 기준.
 * 사용자가 다른 타임존에 있어도 본인 기준 "오후"가 보임.
 */
export function currentTimeContextFromLocal(
  now: Date = new Date()
): TimeContext {
  return HOUR_TO_CONTEXT.get(now.getHours()) ?? "afternoon";
}
