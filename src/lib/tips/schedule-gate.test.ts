import { strict as assert } from "node:assert";
import { shouldTickNow } from "./schedule-gate";
import {
  DEFAULT_TIPS_AUTO_CONFIG,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.19 cycle #32 §9.1 schedule-gate 8 cases (M8 결의 패턴 재사용).
 *   pnpm test:tips
 *
 * R-L2 — schedule-gate.ts는 NOT server-only이므로 tsx test 가능.
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

console.log("[schedule-gate.test]");

function withSchedule(s: TipsScheduleConfig): TipsAutoConfig {
  return { ...DEFAULT_TIPS_AUTO_CONFIG, schedule: s };
}

// 1) hours=9, minutes=30, dow=1 (월), schedule={hour:9, daysOfWeek:[1]} → true
test("hour·dow·:30 모두 일치 → true", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1] });
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 30, dayOfWeek: 1 }),
    true,
  );
});

// 2) hours=9, minutes=30, dow=2 (화), daysOfWeek=[1] → false (DOW 미포함)
test("DOW 미포함 → false", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1] });
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 30, dayOfWeek: 2 }),
    false,
  );
});

// 3) hours=10, minutes=30, dow=1, schedule.hour=9 → false
test("hour 불일치 → false", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1] });
  assert.equal(
    shouldTickNow(cfg, { hours: 10, minutes: 30, dayOfWeek: 1 }),
    false,
  );
});

// 4) hours=9, minutes=0 → false (NEW-H6 :30 invariant)
test("minutes !== 30 → false (NEW-H6)", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1] });
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 0, dayOfWeek: 1 }),
    false,
  );
});

// 5) hours=9, minutes=45 → false (off-tick)
test("minutes=45 off-tick → false", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1] });
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 45, dayOfWeek: 1 }),
    false,
  );
});

// 6) config.schedule = undefined → DEFAULT_SCHEDULE 적용 (매일 09:30)
test("schedule undefined → DEFAULT_SCHEDULE fallback", () => {
  const cfg: TipsAutoConfig = {
    enabled: true,
    updatedAt: new Date(0),
    updatedBy: "admin",
    // @ts-expect-error — defensive case (런타임 corrupt 시나리오)
    schedule: undefined,
  };
  // 매일 09:30 KST → 모든 dow에서 hours=9 minutes=30 통과
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 30, dayOfWeek: 0 }),
    true,
  );
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 30, dayOfWeek: 6 }),
    true,
  );
  assert.equal(
    shouldTickNow(cfg, { hours: 10, minutes: 30, dayOfWeek: 0 }),
    false,
  );
});

// 7) daysOfWeek=[] 직접 주입 → 항상 false (defensive — 정상 경로는 zod 거부)
test("daysOfWeek=[] defensive → false", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [] });
  assert.equal(
    shouldTickNow(cfg, { hours: 9, minutes: 30, dayOfWeek: 1 }),
    false,
  );
});

// 8) schedule.hour=14, daysOfWeek=[0,6] (주말) — 평일 dow=3 14:30 → false
test("주말 schedule + 평일 dow → false", () => {
  const cfg = withSchedule({ hour: 14, daysOfWeek: [0, 6] });
  assert.equal(
    shouldTickNow(cfg, { hours: 14, minutes: 30, dayOfWeek: 3 }),
    false,
  );
  // 토요일은 통과
  assert.equal(
    shouldTickNow(cfg, { hours: 14, minutes: 30, dayOfWeek: 6 }),
    true,
  );
});

console.log("[schedule-gate.test] done");
