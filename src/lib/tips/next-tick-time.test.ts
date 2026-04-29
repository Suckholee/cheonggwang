import { strict as assert } from "node:assert";
import { calculateNextTickTime } from "./next-tick-time";

/**
 * v1.18 cycle #31 · §9.1 next-tick-time 5 cases (M8 결의 — design wins)
 *   pnpm test:tips
 *
 * Host TZ 무관 검증 — Node UTC 환경에서도 동일 결과 (cycle #28 toKstWallClock 패턴).
 * KST 입력은 UTC-9로 환산 — 예: KST 14:15 = UTC 05:15 동일 날짜.
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

// 1) KST 08:00 → 오늘 09:30
test("KST 08:00 → 오늘 09:30", () => {
  const now = kstToUtc(2026, 4, 29, 8, 0);
  const r = calculateNextTickTime(now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 4);
  assert.equal(r.date, 29);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// 2) KST 14:15 → 오늘 14:30
test("KST 14:15 → 오늘 14:30", () => {
  const now = kstToUtc(2026, 4, 29, 14, 15);
  const r = calculateNextTickTime(now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 4);
  assert.equal(r.date, 29);
  assert.equal(r.hours, 14);
  assert.equal(r.minutes, 30);
});

// 3) KST 14:30 boundary → 다음 슬롯 (오늘 15:30)
test("KST 14:30 boundary → 오늘 15:30", () => {
  const now = kstToUtc(2026, 4, 29, 14, 30);
  const r = calculateNextTickTime(now);
  assert.equal(r.hours, 15);
  assert.equal(r.minutes, 30);
  assert.equal(r.date, 29);
});

// 4) KST 17:31 (마지막 발화 직후) → 다음 날 09:30
test("KST 17:31 → 다음 날 09:30", () => {
  const now = kstToUtc(2026, 4, 29, 17, 31);
  const r = calculateNextTickTime(now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 4);
  assert.equal(r.date, 30);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

// 5) KST 23:59 (자정 직전) → 다음 날 09:30
test("KST 23:59 → 다음 날 09:30", () => {
  const now = kstToUtc(2026, 4, 29, 23, 59);
  const r = calculateNextTickTime(now);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 4);
  assert.equal(r.date, 30);
  assert.equal(r.hours, 9);
  assert.equal(r.minutes, 30);
});

console.log("[next-tick-time.test] done");
