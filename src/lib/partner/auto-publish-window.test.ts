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
  nextNAutoPublishWindows,
  currentWindowStart,
  recentlyPublishedInWindow,
  toKstWallClock,
} from "./auto-publish-window";
import type { AutoPublishConfig, Partner } from "@/types/partner";

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

// === v1.15 cycle #28 partner-aeo-boost — toKstWallClock + window 마이그레이션 (C1 + H7) ===
console.log("\n[v1.15 cycle #28 — toKstWallClock + setKstClock 산술]");

// W1) toKstWallClock — KST 08:08 4/28 wall clock 정확 추출
{
  const realUtc = new Date("2026-04-27T23:08:13Z"); // = KST 08:08:13 4/28
  const wall = toKstWallClock(realUtc);
  assert(
    "W1: toKstWallClock(real UTC 23:08 4/27) → KST 08:08 4/28",
    wall.year === 2026 &&
      wall.month === 3 && // April (0-based)
      wall.date === 28 &&
      wall.day === 2 && // Tue
      wall.hours === 8 &&
      wall.minutes === 8,
    wall,
  );
}

// W2) recentlyPublishedInWindow — 핵심 회복 시나리오
// 사용자 실제 케이스: lastTickAt = real UTC 23:08 4/27 (= KST 08:08 4/28)
// now = KST 09:00 4/28 (= real UTC 00:00 4/28). startMinute=360 (KST 06:00).
// winStart KST = 06:00 4/28 = real UTC 21:00 4/27.
// expect: lastTick (UTC 23:08 4/27) >= winStart (UTC 21:00 4/27) → TRUE → skip
{
  const partner = {
    autoPublish: {
      ...base,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startMinute: 6 * 60,
      endMinute: 18 * 60,
    },
    autoSeries: { lastTickAt: new Date("2026-04-27T23:08:13Z") },
  } as unknown as Partner;
  const now = new Date("2026-04-28T00:00:00Z"); // KST 09:00 4/28
  const r = recentlyPublishedInWindow(partner, now);
  assert("W2: recentlyPublishedInWindow 정상 동작 (한 윈도우 1회 제한 회복)", r === true, {
    winStart: currentWindowStart(partner.autoPublish, now),
    lastTickAt: partner.autoSeries?.lastTickAt,
  });
}

// W3) recentlyPublishedInWindow — lastTick null
{
  const partner = {
    autoPublish: { ...base, weekdays: [0, 1, 2, 3, 4, 5, 6] },
    autoSeries: { lastTickAt: null },
  } as unknown as Partner;
  const r = recentlyPublishedInWindow(partner, kstDate(2026, 4, 28, 9, 0));
  assert("W3: lastTickAt=null → false", r === false);
}

// W4) currentWindowStart — KST host에서 정상 (cycle #19 이전 가능했음)
// + UTC host 시뮬레이션도 같은 결과 (산술 일관성)
{
  const cfg = {
    ...base,
    weekdays: [2], // Tuesday only
    startMinute: 6 * 60, // 06:00
    endMinute: 18 * 60, // 18:00
  };
  const now = kstDate(2026, 4, 28, 8, 8); // Tue 08:08 KST
  const winStart = currentWindowStart(cfg, now);
  // expect: KST 06:00 4/28 = real UTC 21:00 4/27
  const expected = new Date("2026-04-27T21:00:00Z");
  assert(
    "W4: currentWindowStart KST 06:00 = real UTC 21:00 prev day",
    winStart?.getTime() === expected.getTime(),
    { winStart, expected },
  );
}

// W5) nextAutoPublishWindow — today active + within window
{
  const cfg = {
    ...base,
    weekdays: [2, 4, 5, 6], // Tue Thu Fri Sat
    startMinute: 6 * 60,
    endMinute: 18 * 60,
  };
  const now = kstDate(2026, 4, 28, 8, 8); // Tue 08:08
  const r = nextAutoPublishWindow(cfg, now);
  // expect: today 06:00 KST = real UTC 21:00 4/27
  const expectedStart = new Date("2026-04-27T21:00:00Z");
  assert(
    "W5: nextAutoPublishWindow today active → today 06:00 KST",
    r.startsAt?.getTime() === expectedStart.getTime(),
    r,
  );
}

// W6) nextAutoPublishWindow — today past endMinute → next active day
{
  const cfg = {
    ...base,
    weekdays: [2, 4, 5, 6],
    startMinute: 6 * 60,
    endMinute: 18 * 60,
  };
  const now = kstDate(2026, 4, 28, 19, 0); // Tue 19:00 (window 종료 후)
  const r = nextAutoPublishWindow(cfg, now);
  // expect: 다음 active = Thu 4/30 06:00 KST = real UTC 21:00 4/29
  const expectedStart = new Date("2026-04-29T21:00:00Z");
  assert(
    "W6: nextAutoPublishWindow today past end → 다음 active day 06:00",
    r.startsAt?.getTime() === expectedStart.getTime(),
    r,
  );
}

// W7) nextNAutoPublishWindows — 5 entries, weekdays=[2,4,5,6]
{
  const cfg = {
    ...base,
    weekdays: [2, 4, 5, 6], // Tue Thu Fri Sat
    startMinute: 6 * 60,
    endMinute: 18 * 60,
  };
  const now = kstDate(2026, 4, 28, 8, 8); // Tue 08:08
  const r = nextNAutoPublishWindows(cfg, now, 5);
  assert("W7a: 5 entries 반환", r.length === 5, r.length);
  // expected dates (KST): 4/28 (Tue), 4/30 (Thu), 5/1 (Fri), 5/2 (Sat), 5/5 (Tue)
  // 모두 06:00 KST = real UTC 21:00 prev day
  const expectedDates = [
    new Date("2026-04-27T21:00:00Z"), // Tue 4/28 KST
    new Date("2026-04-29T21:00:00Z"), // Thu 4/30
    new Date("2026-04-30T21:00:00Z"), // Fri 5/1
    new Date("2026-05-01T21:00:00Z"), // Sat 5/2
    new Date("2026-05-04T21:00:00Z"), // Tue 5/5
  ];
  for (let i = 0; i < 5; i++) {
    assert(
      `W7b[${i}]: ${["Tue 4/28", "Thu 4/30", "Fri 5/1", "Sat 5/2", "Tue 5/5"][i]} 06:00 KST`,
      r[i]?.startsAt.getTime() === expectedDates[i].getTime(),
      { actual: r[i]?.startsAt, expected: expectedDates[i] },
    );
  }
}

// W8) setKstClock host TZ 무관 — Intl.DateTimeFormat 기반 (회귀 보호)
// 핵심: hour - 9 산술이 음수일 때 Date.UTC가 전날로 정규화
{
  const realUtc = new Date("2026-04-28T00:00:00Z"); // KST 09:00 4/28
  const wall = toKstWallClock(realUtc);
  // setKstClock(wall, 60) — KST 01:00 = real UTC 16:00 prev day
  // 우회: nextAutoPublishWindow를 사용해 검증 (setKstClock은 내부 함수)
  const cfg = { ...base, weekdays: [2], startMinute: 60, endMinute: 120 }; // Tue 01:00-02:00
  const r = nextAutoPublishWindow(cfg, realUtc);
  // KST 09:00 Tue 4/28 → window 01-02는 이미 종료 → next Tue 5/5
  const expectedStart = new Date("2026-05-04T16:00:00Z"); // KST 01:00 5/5 = UTC 16:00 5/4
  assert(
    "W8: setKstClock 음수 hour 정규화 (KST 01:00 → UTC 16:00 prev day)",
    r.startsAt?.getTime() === expectedStart.getTime(),
    { wall, actual: r.startsAt, expected: expectedStart },
  );
}

console.log(
  failures === 0
    ? `\n✓ all tests passed`
    : `\n✗ ${failures} failure(s)`,
);
process.exit(failures === 0 ? 0 : 1);
