/**
 * v1.7 partner-promo · P5.5 — 자동발행 윈도우 유틸 스모크 테스트.
 *
 * 프로젝트에 jest/vitest 미설치 — `pnpm tsx src/lib/partner/auto-publish-window.test.ts`로 직접 실행.
 * 실패 시 process.exit(1) — CI에 추가 가능.
 *
 * 케이스 (Design §5.3):
 *   1) disabled
 *   2) empty weekdays
 *   3) outside weekday
 *   4) inside window
 *   5) at start (>=)
 *   6) at end (<)
 *   7) just before end
 *   8) UTC vs KST
 *   9) KST midnight edge
 */

import {
  isInAutoPublishWindow,
  validateAutoPublishConfig,
  nextAutoPublishWindow,
} from "./auto-publish-window";
import type { AutoPublishConfig } from "@/types/partner";

let failures = 0;

function assert(name: string, cond: boolean, info?: unknown): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`, info ?? "");
    failures++;
  }
}

/** KST 벽시계 시각으로 Date 만들기 (Asia/Seoul = UTC+9, DST 없음). */
function kstDate(
  year: number,
  month: number, // 1..12
  day: number,
  hour: number,
  minute: number,
): Date {
  // ISO with +09:00 → 절대 시각 고정
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`;
  return new Date(iso);
}

const base: AutoPublishConfig = {
  enabled: true,
  weekdays: [1, 2, 3, 4, 5], // Mon..Fri
  startMinute: 9 * 60, // 09:00
  endMinute: 18 * 60, // 18:00
  timezone: "Asia/Seoul",
};

console.log("[isInAutoPublishWindow]");

// 1) disabled
assert(
  "disabled → false (월 12:00 KST)",
  !isInAutoPublishWindow(
    { ...base, enabled: false },
    kstDate(2026, 4, 27, 12, 0), // 2026-04-27 = 월
  ),
);

// 2) empty weekdays
assert(
  "empty weekdays → false",
  !isInAutoPublishWindow(
    { ...base, weekdays: [] },
    kstDate(2026, 4, 27, 12, 0),
  ),
);

// 3) outside weekday (일요일)
assert(
  "outside weekday (Sun) → false",
  !isInAutoPublishWindow(base, kstDate(2026, 4, 26, 12, 0)),
);

// 4) inside window (월 12:00)
assert(
  "inside window (Mon 12:00 KST) → true",
  isInAutoPublishWindow(base, kstDate(2026, 4, 27, 12, 0)),
);

// 5) at start (월 09:00)
assert(
  "at start (Mon 09:00 KST) → true",
  isInAutoPublishWindow(base, kstDate(2026, 4, 27, 9, 0)),
);

// 6) at end (월 18:00)
assert(
  "at end (Mon 18:00 KST) → false (exclusive)",
  !isInAutoPublishWindow(base, kstDate(2026, 4, 27, 18, 0)),
);

// 7) just before end (월 17:59)
assert(
  "just before end (Mon 17:59 KST) → true",
  isInAutoPublishWindow(base, kstDate(2026, 4, 27, 17, 59)),
);

// 8) UTC vs KST: UTC 03:00 → KST 12:00 (월)
assert(
  "UTC vs KST (UTC 2026-04-27 03:00 = KST 12:00) → true",
  isInAutoPublishWindow(
    base,
    new Date("2026-04-27T03:00:00Z"),
  ),
);

// 9) KST midnight edge: 00:00–23:59 윈도우, 월 00:00
assert(
  "KST midnight edge (Mon 00:00, window 00:00–23:59) → true",
  isInAutoPublishWindow(
    {
      ...base,
      startMinute: 0,
      endMinute: 23 * 60 + 59,
    },
    kstDate(2026, 4, 27, 0, 0),
  ),
);

// 추가: 토/일 비활성 확인
assert(
  "Sat (5/2) → false",
  !isInAutoPublishWindow(base, kstDate(2026, 5, 2, 12, 0)),
);

console.log("\n[validateAutoPublishConfig]");

assert(
  "valid config",
  validateAutoPublishConfig({
    enabled: true,
    weekdays: [1, 2, 3],
    startMinute: 540,
    endMinute: 1080,
    timezone: "Asia/Seoul",
  }).ok,
);

assert(
  "start >= end → invalid",
  !validateAutoPublishConfig({
    enabled: true,
    weekdays: [1],
    startMinute: 1080,
    endMinute: 540,
    timezone: "Asia/Seoul",
  }).ok,
);

assert(
  "enabled but empty weekdays → invalid",
  !validateAutoPublishConfig({
    enabled: true,
    weekdays: [],
    startMinute: 0,
    endMinute: 60,
    timezone: "Asia/Seoul",
  }).ok,
);

assert(
  "duplicate weekdays → invalid",
  !validateAutoPublishConfig({
    enabled: true,
    weekdays: [1, 1, 2],
    startMinute: 0,
    endMinute: 60,
    timezone: "Asia/Seoul",
  }).ok,
);

assert(
  "weekday out of range → invalid",
  !validateAutoPublishConfig({
    enabled: true,
    weekdays: [1, 7],
    startMinute: 0,
    endMinute: 60,
    timezone: "Asia/Seoul",
  }).ok,
);

console.log("\n[nextAutoPublishWindow]");

// 일요일 12:00 KST에 평일 09:00–18:00 → 다음 윈도우는 월요일 09:00
const nxSun = nextAutoPublishWindow(base, kstDate(2026, 4, 26, 12, 0));
assert(
  "Sun → next window starts (Mon)",
  nxSun.startsAt !== null && nxSun.endsAt !== null,
  nxSun,
);

// 비활성 → null
const nxOff = nextAutoPublishWindow(
  { ...base, enabled: false },
  kstDate(2026, 4, 26, 12, 0),
);
assert(
  "disabled → null",
  nxOff.startsAt === null && nxOff.endsAt === null,
);

console.log(
  failures === 0
    ? `\n✓ all tests passed`
    : `\n✗ ${failures} failure(s)`,
);
process.exit(failures === 0 ? 0 : 1);
