import { strict as assert } from "node:assert";
import { calculateNextTickTime } from "./next-tick-time";
import {
  DEFAULT_TIPS_AUTO_CONFIG,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.18 cycle #31 · §9.1 next-tick-time 5 cases (M8 결의 — design wins)
 * v1.19 cycle #32 · §9.1 — 5 갱신 (schedule 명시 매핑, R-L1) + 5 신규
 *   pnpm test:tips
 *
 * Host TZ 무관 검증 — Node UTC 환경에서도 동일 결과 (cycle #28 toKstWallClock 패턴).
 * KST 입력은 UTC-9로 환산 — 예: KST 14:15 = UTC 05:15 동일 날짜.
 *
 * R-L1 — cycle #31 5 cases는 schedule 인자를 명시 매핑해 expected 보존.
 */

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}

console.log("[next-tick-time.test]");

/** KST wall clock → real UTC Date helper. */
function kstToUtc(
  year: number,
  monthOneBased: number,
  date: number,
  hours: number,
  minutes: number,
): Date {
  return new Date(
    Date.UTC(year, monthOneBased - 1, date, hours - 9, minutes, 0, 0),
  );
}

function withSchedule(s: TipsScheduleConfig): TipsAutoConfig {
  return { ...DEFAULT_TIPS_AUTO_CONFIG, schedule: s };
}

const everyDay9: TipsScheduleConfig = {
  hour: 9,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
};

// ─────────── cycle #31 5 cases (schedule 명시 매핑, R-L1) ───────────

// 1) KST 08:00 + schedule 매일 09:30 → 오늘 09:30
test("KST 08:00 (매일 09:30) → 오늘 09:30", () => {
  const cfg = withSchedule(everyDay9);
  const now = kstToUtc(2026, 5, 4, 8, 0); // 5/4 월
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 5);
  assert.equal(r.date, 4);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// 2) KST 14:15 + schedule.hour=14 → 오늘 14:30
test("KST 14:15 (매일 14:30) → 오늘 14:30", () => {
  const cfg = withSchedule({ hour: 14, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
  const now = kstToUtc(2026, 5, 4, 14, 15);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 5);
  assert.equal(r.date, 4);
  assert.equal(r.hours, 14);
  assert.equal(r.minutes, 30);
});

// 3) KST 14:30 boundary + schedule.hour=15 → 오늘 15:30 (R-L1)
test("KST 14:30 boundary (매일 15:30) → 오늘 15:30", () => {
  const cfg = withSchedule({ hour: 15, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
  const now = kstToUtc(2026, 5, 4, 14, 30);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.hours, 15);
  assert.equal(r.minutes, 30);
  assert.equal(r.date, 4);
});

// 4) KST 17:31 + schedule 매일 09:30 → 다음 날 09:30
test("KST 17:31 (매일 09:30) → 다음 날 09:30", () => {
  const cfg = withSchedule(everyDay9);
  const now = kstToUtc(2026, 5, 4, 17, 31);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 5);
  assert.equal(r.date, 5);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// 5) KST 23:59 + schedule 매일 09:30 → 다음 날 09:30
test("KST 23:59 (매일 09:30) → 다음 날 09:30", () => {
  const cfg = withSchedule(everyDay9);
  const now = kstToUtc(2026, 5, 4, 23, 59);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 5);
  assert.equal(r.date, 5);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// ─────────── cycle #32 5 신규 cases ───────────

// 6) 월요일 10:00, schedule={hour:9, daysOfWeek:[1,3,5]} (월수금) → 다음 수요일 09:30
test("월 10:00 (월수금 09:30) → 다음 수요일 09:30", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1, 3, 5] });
  // 2026-05-04는 월요일 (검증: getUTCDay → 2026-05-04는 1)
  const now = kstToUtc(2026, 5, 4, 10, 0);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.dayOfWeek, 3); // 수요일
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
  assert.equal(r.date, 6);
});

// 7) 토요일 12:00, schedule 주말만(daysOfWeek=[0,6]) hour=9 → 일요일 09:30
test("토 12:00 (주말 09:30) → 일요일 09:30", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [0, 6] });
  // 2026-05-02는 토요일 (검증: 2026-05-02는 dow=6)
  const now = kstToUtc(2026, 5, 2, 12, 0);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.dayOfWeek, 0); // 일요일
  assert.equal(r.hours, 9);
  assert.equal(r.date, 3);
});

// 8) 화요일 09:00, schedule={hour:9, daysOfWeek:[2,4]} (화목) → 오늘 09:30
test("화 09:00 (화목 09:30) → 오늘 09:30", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [2, 4] });
  // 2026-05-05는 화요일
  const now = kstToUtc(2026, 5, 5, 9, 0);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.dayOfWeek, 2); // 화요일
  assert.equal(r.date, 5);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// 9) corrupt daysOfWeek=[] → DEFAULT_SCHEDULE fallback (매일 09:30)
test("daysOfWeek=[] corrupt → DEFAULT_SCHEDULE fallback", () => {
  const cfg = withSchedule({ hour: 14, daysOfWeek: [] });
  const now = kstToUtc(2026, 5, 4, 8, 0);
  const r = calculateNextTickTime(cfg, now);
  // DEFAULT_SCHEDULE 매일 09:30
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
  assert.equal(r.date, 4);
});

// 10) Host TZ 무관 — UTC 환경에서도 KST 결과 동일
test("Host TZ 무관 — UTC와 KST 동일 결과", () => {
  const cfg = withSchedule(everyDay9);
  const now = kstToUtc(2026, 5, 4, 8, 0);
  const r = calculateNextTickTime(cfg, now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 5);
  assert.equal(r.date, 4);
  assert.equal(r.hours, 9);
});

console.log("[next-tick-time.test] done");
