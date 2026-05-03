import { strict as assert } from "node:assert";
import { previewSchedule } from "./schedule-preview";
import {
  DEFAULT_TIPS_AUTO_CONFIG,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.19 cycle #32 §9.1 schedule-preview 6 cases (M8 결의 패턴 재사용).
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

console.log("[schedule-preview.test]");

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

// 1) 매일 09:30 → 30일 모두 willPublish=true
test("매일 09:30 → 30일 모두 ✓", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
  const now = kstToUtc(2026, 5, 4, 0, 0);
  const preview = previewSchedule(cfg, now, 30);
  assert.equal(preview.length, 30);
  assert.equal(
    preview.filter((p) => p.willPublish).length,
    30,
  );
  assert.equal(preview[0].hour, 9);
  assert.equal(preview[0].minutes, 30);
});

// 2) 평일만 [1..5] → 30일 중 willPublish=true 개수 = 그 기간 평일 수
test("평일 09:30 → willPublish=평일 수", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [1, 2, 3, 4, 5] });
  const now = kstToUtc(2026, 5, 4, 0, 0); // 월요일 시작
  const preview = previewSchedule(cfg, now, 30);
  const passes = preview.filter((p) => p.willPublish);
  // 월~5/4 부터 30일 = 5/4 ~ 6/2. 4주 + 2일 = 28 + 2 = 30일.
  // 4주 평일 5*4=20 + 6/1 월(1) + 6/2 화(1) = 22.
  assert.equal(passes.length, 22);
  // 모두 dayOfWeek가 1..5 안
  for (const p of passes) {
    assert.ok(p.dayOfWeek >= 1 && p.dayOfWeek <= 5);
  }
});

// 3) 주말만 [0,6] → 토일만
test("주말 09:30 → 30일 중 토·일만 ✓", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [0, 6] });
  const now = kstToUtc(2026, 5, 4, 0, 0); // 월
  const preview = previewSchedule(cfg, now, 30);
  const passes = preview.filter((p) => p.willPublish);
  // 30일 중 토·일은 4주 8일 + 추가 0~2일. 5/4(월) 시작 → 5/9(토)~5/10(일), ..., 5/30(토)~5/31(일), 6/1(월)~6/2(화).
  // 토일만: 5/9, 5/10, 5/16, 5/17, 5/23, 5/24, 5/30, 5/31 = 8일
  assert.equal(passes.length, 8);
  for (const p of passes) {
    assert.ok(p.dayOfWeek === 0 || p.dayOfWeek === 6);
  }
});

// 4) 월 경계 — 4/30 → 5/1 정확
test("월 경계 4/30 → 5/1 정확", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
  const now = kstToUtc(2026, 4, 30, 0, 0);
  const preview = previewSchedule(cfg, now, 30);
  // 첫 번째 = 4/30, 두 번째 = 5/1
  assert.equal(preview[0].month, 4);
  assert.equal(preview[0].date, 30);
  assert.equal(preview[1].month, 5);
  assert.equal(preview[1].date, 1);
});

// 5) now=4월 마지막날 23:50 (KST) → preview[0]는 5/1 (다음 달 첫 날부터 시작 X — 같은 KST date에서 시작)
//   주의: previewSchedule은 "오늘부터" days 일이라 23:50 KST의 wall date = 4/30 → preview[0] = 4/30
test("KST 23:50 4/30 → preview[0]=4/30 (오늘부터)", () => {
  const cfg = withSchedule({ hour: 9, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
  const now = kstToUtc(2026, 4, 30, 23, 50);
  const preview = previewSchedule(cfg, now, 30);
  // KST 4/30 23:50의 wall date = 4/30
  assert.equal(preview[0].month, 4);
  assert.equal(preview[0].date, 30);
  // 두 번째 = 5/1
  assert.equal(preview[1].month, 5);
  assert.equal(preview[1].date, 1);
});

// 6) config.schedule undefined → DEFAULT_SCHEDULE fallback (매일 09:30)
test("schedule undefined → DEFAULT_SCHEDULE fallback", () => {
  const cfg: TipsAutoConfig = {
    enabled: true,
    updatedAt: new Date(0),
    updatedBy: "admin",
    // @ts-expect-error — defensive case
    schedule: undefined,
  };
  const now = kstToUtc(2026, 5, 4, 0, 0);
  const preview = previewSchedule(cfg, now, 30);
  assert.equal(preview.length, 30);
  assert.equal(preview.filter((p) => p.willPublish).length, 30);
  assert.equal(preview[0].hour, 9);
});

console.log("[schedule-preview.test] done");
