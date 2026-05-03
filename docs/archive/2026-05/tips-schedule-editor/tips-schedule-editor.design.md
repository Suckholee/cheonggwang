# tips-schedule-editor · Design v0.2 (cycle #32 v1.19)

> Source plan: `docs/01-plan/features/tips-schedule-editor.plan.md`
> Generated: 2026-05-03 (v0.1 → v0.2 same day)
> v0.1 → v0.2: design-validator agent reality-check 결과 15 issue 모두 §14 결의 매트릭스에 매핑 (Critical 2 / High 5 / Medium 5 / Low 3)
> Streak target: **12번째 consecutive single-pass ≥ 90% Match Rate**
> Approach A — Wide cron `30 * * * *` + Firestore `shouldTickNow` gate.
> Predecessor 보호: cycle #30 generator·prompt·topic-pool·stock-images 등 + cycle #31 dynamic-topic-pool·tips-config-repository (7 method)·admin UI 본체 0줄 변경 (gate hook 1지점만 surgical, R-H5).

---

## §1. Overview

### 1.1 Background

cycle #31 (2026-04-29) tips-admin-config 배포로 admin이 ON/OFF·Topic CRUD·History를 자율 운영. 단 발행 타이밍은 여전히 코드 hardcoded:

- `functions/src/tips/index.ts:26` — `schedule: "30 9-17 * * *"` (KST 09:30~17:30 hourly 9-tick)
- `src/lib/tips/next-tick-time.ts:34-65` — 9·17·:30 magic number 하드코딩
- `src/app/admin/tips/page.tsx:117-141` — cron 문자열 read-only 표시 (`30 9-17 * * *`)

cycle #31 보고서 §2.6에서 "schedule editor Approach A (1,500 LOC)" 후속 cycle 명시 → 본 cycle.

### 1.2 Surgical Philosophy (12-streak 도전)

- **R15 cycle #19 partner-promo-generator 0줄 변경 12번째**
- **R1 cycle #26 auto-series runner 0줄 변경 14번째**
- **NEW-C5 cycle #31 — `nanoid16()` 로컬 복제 0줄 변경** (auto-series runner 무수정 streak 보호) [R-M1 결의]
- **cycle #30 immutability 12번째**: tips-generator/prompt/topic-pool/stock-images/today-kst/infer-categories/hygiene-guard/tip-repository 0줄. `import { pickNextTopic }`(line 4) + `void pickNextTopic`(line 54) marker 라인 0줄 [R-M2 결의]
- **cycle #31 immutability 1번째 (NEW)**:
  - `dynamic-topic-pool.ts` (양 패키지) 0줄
  - `tips-config-repository.ts` 7 메서드 본문 0줄 (setEnabled / listTopics / getTopic / addTopic / updateTopic / setTopicActive / listHistory). `getConfig`은 **1 surgical patch — schedule 4번째 return field 추가** (R-H5 결의 — 0줄 주장 정정)
  - `admin-tips-config-actions.ts`의 4 actions(toggleAutoEnabled / addTopic / updateTopic / setTopicActive) 본문 0줄. `updateTipsSchedule`만 추가
  - AdminTipsAutoConfigToggle / AdminTipsHistoryTable / AdminTipsTopicForm 컴포넌트 0줄
  - `/admin/tips/topics/*` 3 페이지 0줄
- **변경 surgical 대상**:
  - `functions/src/tips/runner.ts` — **PATCH 0a (schedule gate) 삽입** + import 2개 추가. **cycle #31 PATCH 1을 두 부분으로 split** — `readTipsAutoConfig(db)` fetch는 라인 60 그대로 보존, `enabled` 체크 부분(라인 61-65)은 PATCH 0a 뒤로 이동 [R-M5 결의]. cycle #30/#31 **6 patch (PATCH 1·2·3·4·4b·5) 의미 보존** [R-C1 결의]. 결과: 7 patch 구조 (PATCH 0a + 6 보존)
  - `functions/src/tips/index.ts` — cron 1줄 + 주석
  - `src/lib/tips/tips-config.ts` (mirror 양쪽) — `schedule` 필드 + zod + Status literal 추가
  - `src/lib/tips/next-tick-time.ts` — 시그니처 변경 (config 인자 추가)
  - `src/lib/firebase/tips-config-repository.ts` — `getConfig` 1 surgical patch + `setSchedule` 추가
  - `src/app/actions/admin-tips-config-actions.ts` — `updateTipsSchedule` 추가
  - `src/app/admin/tips/page.tsx` — `ScheduleInfo` 컴포넌트 1개만 surgical edit (다른 5 child 0줄)
- back-compat fallback 강제 — Firestore `schedule` 필드 미존재 시 `DEFAULT_SCHEDULE` 매일 09:30 (R12 cycle #29 패턴)
- Option A 코드 복제 7번째 cycle — `tips-config.ts` (확장) + `schedule-gate.ts` (NEW) + `next-tick-time.ts` (NEW functions mirror) 양 패키지 + `tips-history.ts` Status literal 7개 양 패키지

### 1.3 Approach A 재확인

Plan §2 결정 그대로:
- cron `30 * * * *` deploy 1회 변경. `:30` minutes는 NEW-H6 invariant 영구 보존(autoSeriesTick :00와 영구 offset).
- runner는 매 tick fetch한 config로 `shouldTickNow(config, kstNow)` 게이트 통과 시에만 publish 흐름 진행.
- HH 자유, MM=:30 고정.

### 1.4 v0.1 → v0.2 변경 요약

design-validator agent reality-check 결과:
- **2 Critical**: patch count 표기(5→6), naming asymmetry(`readTipsAutoConfig` vs `tipsConfigRepository.getConfig`)
- **5 High**: mirror count(15→16), import 보존 명시, functions side `window.ts` (not `auto-publish-window.ts`), runner sig 0줄, getConfig 1 surgical
- **5 Medium**: nanoid16 보존, void marker 보존, mirror title 갱신, audit Event 위치, PATCH 1 split
- **3 Low**: test 케이스 schedule 매핑, server-only 헤더, Plan-Design count log

모두 §14 결의 매트릭스에 1:1 매핑. **§3·§4·§5·§7 본문에 직접 반영.**

---

## §2. Goals / Non-goals

### 2.1 Goals

| ID | Goal |
|----|------|
| G1 | Admin이 `/admin/tips/schedule`에서 hour(0-23) + daysOfWeek(0-6) mask 편집 — 변경 즉시 다음 tick 반영 |
| G2 | `/admin/tips`의 "다음 발행 예정"이 admin schedule 기준으로 동적 계산 (`calculateNextTickTime(config, now)`) |
| G3 | `/admin/tips/schedule`에서 향후 30일 발행 예정 캘린더 미리보기 (gate 적용 결과) |
| G4 | Schedule 변경 audit log 최근 20건 표시 (`tipsScheduleAudit` collection) |
| G5 | Firestore `schedule` 필드 미존재 시 0 regression — `DEFAULT_SCHEDULE = {hour: 9, daysOfWeek: [0..6]}` 매일 09:30 KST 발행 |
| G6 | NEW-H6 :30 cron offset 영구 보존 — `shouldTickNow`가 `minutes !== 30`이면 false 강제 |
| G7 | cycle #30 9 파일 + cycle #31 14 파일 invariant 12번째·1번째 무수정 (gate 1지점 + Status literal 1개 + getConfig schedule 필드 1줄만 예외) |
| G8 | `pnpm lint:mirror` 16 → 18 [R-H1 정정] — `tips-config.ts` `TipsScheduleConfig` literal mirror, `schedule-gate.ts` mirror, `next-tick-time.ts` mirror, `TipsTickStatus` 7 literal mirror |

### 2.2 Non-goals

- **Deferred to cycle #33+**: 한국 공휴일 자동 skip, Manual trigger UI 라벨, HH:MM 분 단위 자유, 1일 다회 발행, schedule preset, audit log TTL/retention, topic CRUD audit log
- **Permanent**: 분 단위 cron(`*/N`) (NEW-H6 보존), Cloud Scheduler runtime API(외부 GCP IAM 부담), end-user timezone(KST 고정 cycle #31 OQ8)

---

## §3. Architecture

### 3.1 Firestore Schema

#### 3.1.1 `system/tipsAutoConfig` 확장 — C4 cycle #31 결의 재사용

```ts
// src/lib/tips/tips-config.ts (NOT server-only — pure types + zod, cycle #31 C5 보존)
// R-M4 결의 — TipsScheduleAuditEvent도 본 파일에 정의 (별도 audit 모듈에 두지 X)
export interface TipsScheduleConfig {
  hour: number;                  // 0..23
  daysOfWeek: number[];          // ⊂ {0,1,2,3,4,5,6}, sorted, unique
}

export interface TipsAutoConfig {
  enabled: boolean;
  updatedAt: Date;
  updatedBy: "admin";
  schedule: TipsScheduleConfig;  // NEW (cycle #32). C4 결의 — Date 타입 X (number만)
}

export const DEFAULT_SCHEDULE: TipsScheduleConfig = {
  hour: 9,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],   // 매일 09:30 KST (R12 fallback)
};

export const DEFAULT_TIPS_AUTO_CONFIG: TipsAutoConfig = {
  enabled: true,
  updatedAt: new Date(0),
  updatedBy: "admin",
  schedule: DEFAULT_SCHEDULE,
};

export const tipsScheduleSchema = z.object({
  hour: z.number().int().min(0).max(23),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "최소 1개 요일 선택")
    .max(7),
});

// R-M4 결의 — audit event도 본 파일에 (Next.js 단독, functions mirror 불필요)
export interface TipsScheduleAuditEvent {
  id: string;
  at: Date;
  kind: "schedule-update";
  before: TipsScheduleConfig | null;
  after: TipsScheduleConfig;
  by: "admin";
}
```

**Default fallback (R12)**: doc 미존재 또는 `schedule` 필드 미존재 시 `DEFAULT_SCHEDULE` 적용.

> **C4 cycle #31 결의 재사용** — Firestore 측은 number 그대로(Timestamp 변환 불필요).

#### 3.1.2 `tipsScheduleAudit/{auditId}` (NEW collection) — R-M4 결의

audit event interface는 §3.1.1 `tips-config.ts`에 함께 정의. functions 측 mirror 불필요(Next.js read-only). **Index — H2 cycle #31 결의 재사용**: `at DESC` 단일 필드 → Firestore 자동 생성.

### 3.2 Functions runner 변경 (`functions/src/tips/runner.ts`) — H1 결의

**H1 결의 재사용 — 기존 cycle #30/#31 imports (line 1-15) 보존. 신규 import 2개 추가**:

```ts
// === 기존 cycle #30/#31 imports 보존 (line 1-15) — 0줄 변경 ===
//   특히 line 4 `import { pickNextTopic }`, line 15 `appendTipsHistory` 모두 보존 [R-H2·R-M2]
// + 신규 import (cycle #32) ===
import { shouldTickNow } from "./lib/schedule-gate";
import { toKstWallClock } from "../auto-series/lib/window";  // [R-H3] functions 측 파일명은 window.ts (Next.js의 auto-publish-window.ts와 다름)

// line 42-50 nanoid16() 0줄 변경 [R-M1] — auto-series runner 무수정 streak 보호
// line 54 `void pickNextTopic;` 0줄 변경 [R-M2] — cycle #30 immutability marker
```

**runTipsTick 본문 — PATCH 0a 1 surgical insert + cycle #31 PATCH 1 split [R-M5]**:

cycle #31 PATCH 1은 `(a) config fetch + (b) enabled 체크` 두 부분이었습니다. cycle #32에서는:
- (a) `readTipsAutoConfig(db)` fetch는 라인 60 그대로 보존
- (a)와 (b) 사이에 PATCH 0a (schedule gate) 삽입
- (b) `enabled` 체크는 schedule gate 뒤로 이동 (의미 보존, 위치만 이동)

이로써 cycle #30/#31 6 patch (PATCH 1·2·3·4·4b·5) 의미 그대로 + cycle #32 PATCH 0a 추가 = **7 patch 구조** [R-C1].

```ts
export async function runTipsTick(now: Date): Promise<void> {  // [R-H4] 시그니처 0줄 변경 — cycle #28 R10 패턴
  const db = getFirestore();

  // [cycle #31 PATCH 1a — config fetch] 보존 (위치 변경 X)
  const config = await readTipsAutoConfig(db);

  // [cycle #32 PATCH 0a] schedule gate — NEW (G1·G6, OQ11·C-G1 결의 — schedule이 enabled보다 먼저)
  // wide cron(30 * * * *)이 하루 24회 발화하므로 hour/dow/minutes 미통과시 skip-out-of-schedule.
  // dayOfWeek는 KST wall date를 UTC 재구성 후 getUTCDay (host TZ 무관, cycle #28 패턴).
  const wall = toKstWallClock(now);
  const kstNow = {
    hours: wall.hours,
    minutes: wall.minutes,
    dayOfWeek: new Date(
      Date.UTC(wall.year, wall.month, wall.date),
    ).getUTCDay(),
  };
  if (!shouldTickNow(config, kstNow)) {
    await appendTipsHistory(db, { status: "skip-out-of-schedule" });
    console.log(
      `[tips] out-of-schedule h=${kstNow.hours} m=${kstNow.minutes} dow=${kstNow.dayOfWeek}`,
    );
    return;
  }

  // [cycle #31 PATCH 1b — enabled 체크] 위치 이동 (의미 보존, R-M5)
  if (!config.enabled) {
    await appendTipsHistory(db, { status: "skip-disabled" });
    console.log("[tips] disabled by admin — skip");
    return;
  }

  // [cycle #30 R16 + cycle #31 PATCH 2] today 1건 제한 — 이하 cycle #30/#31 그대로 0줄 변경
  // - PATCH 2: skip-already-today history append
  // - PATCH 3: dynamic pool fetchActiveTopicPool + pickNextTopicFromPool + skip-no-topic history
  // - PATCH 4: compose-fail history
  // - PATCH 4b: hygiene-fail history
  // - PATCH 5: published-draft history
  // (대략 line 67-169 cycle #31 그대로 보존)
}
```

**Key 결정**:
- **OQ11/C-G1**: schedule gate가 enabled 게이트보다 **먼저** — schedule out → "skip-out-of-schedule", schedule in & disabled → "skip-disabled". 의미 분리.
- **OQ12/C-G2**: `dayOfWeek` 계산은 KST wall date를 UTC로 재구성 → `getUTCDay()` (host TZ 무관, cycle #28 패턴).
- **R-M5**: cycle #31 PATCH 1을 `1a (fetch) / 1b (enabled check)`로 split — fetch는 라인 60 그대로, enabled는 schedule gate 뒤. **6 patch 의미 보존** (의미 분리는 단지 split이지 추가/제거 아님).

### 3.3 schedule-gate helper — C-G3 결의 (mirror NEW)

**Next.js side** (`src/lib/tips/schedule-gate.ts`):

```ts
// NOT server-only — tsx test 가능 (cycle #31 C5 패턴 재사용) [R-L2]
import {
  DEFAULT_SCHEDULE,
  type TipsAutoConfig,
  type TipsScheduleConfig,
} from "./tips-config";

/**
 * v1.19 cycle #32 tips-schedule-editor · §3.3
 *
 * Pure gate. config.schedule 누락 시 DEFAULT_SCHEDULE fallback (R12).
 * NEW-H6 :30 invariant 강제 — minutes !== 30이면 false (cron `30 * * * *`만 통과).
 *
 * ⚠️ MIRROR with functions/src/tips/lib/schedule-gate.ts.
 *    CI lint: scripts/check-queue-mirror.mjs (shouldTickNow + minutes !== 30 양 패키지).
 */
export interface KstNowParts {
  hours: number;
  minutes: number;
  dayOfWeek: number; // 0..6 (Date.getDay)
}

export function shouldTickNow(
  config: TipsAutoConfig,
  kstNow: KstNowParts,
): boolean {
  const sched: TipsScheduleConfig = config.schedule ?? DEFAULT_SCHEDULE;
  if (kstNow.minutes !== 30) return false;          // NEW-H6 :30 invariant
  if (kstNow.hours !== sched.hour) return false;
  if (!sched.daysOfWeek.includes(kstNow.dayOfWeek)) return false;
  return true;
}
```

**Functions side mirror** — `functions/src/tips/lib/schedule-gate.ts`: 동일 로직, 단 import는 `./tips-config` 상대(H3 cycle #31 결의 재사용 — functions 패키지에 `@/` alias 없음).

### 3.4 next-tick-time.ts — config-driven 변환 (M3 mirror NEW)

**시그니처 변경**: `calculateNextTickTime(now?: Date)` → `calculateNextTickTime(config: TipsAutoConfig, now?: Date)`. 9·17 magic number 제거.

```ts
// src/lib/tips/next-tick-time.ts (수정 — NOT server-only [R-L2])
import { toKstWallClock } from "@/lib/partner/auto-publish-window";    // Next.js 측 alias 사용
import { DEFAULT_SCHEDULE, type TipsAutoConfig, type TipsScheduleConfig } from "./tips-config";

export interface NextTickResult {
  utc: Date;
  year: number;
  month: number;     // 1-based for display
  date: number;
  hours: number;
  minutes: number;   // 항상 30 (NEW-H6)
  dayOfWeek: number; // 0..6
}

/**
 * config.schedule 기준 다음 발화 KST 시각.
 *  - schedule 없으면 DEFAULT_SCHEDULE 사용 (R12 graceful)
 *  - daysOfWeek는 0..6 (Date.getDay) — sorted
 *  - 알고리즘:
 *      - 오늘 KST hour < sched.hour && DOW(today) ∈ daysOfWeek → 오늘 sched.hour:30
 *      - else: 1..7일 앞에서 첫 매칭 day의 sched.hour:30
 *  - 7일 안에 반드시 매칭 (zod min(1) 강제). 없으면 DEFAULT_SCHEDULE fallback
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

  // 오늘 발화 가능 여부
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
      // daysOfWeek=[] 같은 corrupt case — 7일 wraparound 실패. DEFAULT_SCHEDULE fallback
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

  // KST {sched.hour}:30 → UTC ({sched.hour - 9}):30 (KST = UTC+9, fix offset)
  const utc = new Date(Date.UTC(cy, cm, cd, sched.hour - 9, 30, 0, 0));

  return {
    utc,
    year: cy,
    month: cm + 1,
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

// cycle #32 §3.9 — `/admin/tips`의 ScheduleInfo 카드용 한국어 요약 (Next.js 단독)
export function formatScheduleSummary(s: TipsScheduleConfig): string {
  const dowKo = ["일", "월", "화", "수", "목", "금", "토"];
  const days = [...new Set(s.daysOfWeek)].sort((a, b) => a - b);
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const time = `${pad2(s.hour)}:30 KST`;
  if (days.length === 7) return `매일 ${time}`;
  if (days.length === 5 && days.join(",") === "1,2,3,4,5") return `평일 ${time}`;
  if (days.length === 2 && days.join(",") === "0,6") return `주말 ${time}`;
  return `${days.map((d) => dowKo[d]).join("·")} ${time}`;
}
```

**Functions side mirror** — `functions/src/tips/lib/next-tick-time.ts` (NEW). 단 `toKstWallClock`은 functions 측 `../auto-series/lib/window` 상대 import (R-H3 — functions 측 파일명은 `window.ts`). `formatScheduleSummary`는 Next.js 단독(functions mirror 제외 — UI 전용).

> **OQ8 결의** — runner는 next-tick-time 직접 호출 X. 단 mirror는 일관성과 향후 사용(예: functions에서 다음 tick 시각을 metric으로 emit) 위해 유지. `pnpm lint:mirror`가 `calculateNextTickTime` export 양쪽 검증.

### 3.5 schedule-preview helper — N1 (Next.js only)

```ts
// src/lib/tips/schedule-preview.ts (NEW — NOT server-only [R-L2], pure)
import { type TipsAutoConfig, DEFAULT_SCHEDULE } from "./tips-config";
import { toKstWallClock } from "@/lib/partner/auto-publish-window";

export interface PreviewDay {
  /** UTC instant of {date}T{hour}:30 KST */
  utc: Date;
  year: number;
  month: number;     // 1-based
  date: number;
  dayOfWeek: number; // 0..6
  hour: number;
  minutes: 30;
  willPublish: boolean;
}

/**
 * 향후 N일 (default 30) 발행 예정 미리보기.
 * gate와 동일 의미 — daysOfWeek 미포함 요일은 willPublish=false.
 * UI는 server-render — 클라 JS 0줄 (캘린더 카드 그리드).
 */
export function previewSchedule(
  config: TipsAutoConfig,
  now: Date,
  days = 30,
): PreviewDay[] {
  const sched = config.schedule ?? DEFAULT_SCHEDULE;
  const wall = toKstWallClock(now);
  const out: PreviewDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const candidate = new Date(
      Date.UTC(wall.year, wall.month, wall.date + i),
    );
    const cy = candidate.getUTCFullYear();
    const cm = candidate.getUTCMonth();
    const cd = candidate.getUTCDate();
    const dow = candidate.getUTCDay();
    const utc = new Date(Date.UTC(cy, cm, cd, sched.hour - 9, 30, 0, 0));
    out.push({
      utc,
      year: cy,
      month: cm + 1,
      date: cd,
      dayOfWeek: dow,
      hour: sched.hour,
      minutes: 30,
      willPublish: sched.daysOfWeek.includes(dow),
    });
  }
  return out;
}
```

### 3.6 tipsConfigRepository 확장 — `setSchedule` (cycle #31 7 method 0줄 + getConfig 1 surgical) [R-C2·R-H5]

```ts
// src/lib/firebase/tips-config-repository.ts (확장)
// cycle #31 7 메서드 (setEnabled/listTopics/getTopic/addTopic/updateTopic/setTopicActive/listHistory) 본문 0줄 변경.
// getConfig만 1 surgical patch — 4번째 return field (schedule) 추가 [R-H5 결의].

export const tipsConfigRepository = {
  // ... (cycle #31 그대로 — setEnabled/listTopics/getTopic/addTopic/updateTopic/setTopicActive/listHistory)

  async getConfig(): Promise<TipsAutoConfig> {
    const snap = await SYS_DOC().get();
    if (!snap.exists) {
      return { ...DEFAULT_TIPS_AUTO_CONFIG };       // R12 fallback (cycle #31 그대로 — 단 DEFAULT_TIPS_AUTO_CONFIG에 schedule 추가됨으로 자동 반영)
    }
    const d = snap.data()!;
    return {
      enabled: d.enabled !== false,
      updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),
      updatedBy: "admin",
      // NEW (cycle #32, R-H5) — schedule 필드 R12 sub-fallback. 1 surgical patch.
      schedule: parseScheduleOrDefault(d.schedule),
    };
  },

  // NEW (cycle #32)
  async setSchedule(schedule: TipsScheduleConfig): Promise<void> {
    await SYS_DOC().set(
      {
        schedule: {
          hour: schedule.hour,
          daysOfWeek: [...new Set(schedule.daysOfWeek)].sort((a, b) => a - b), // OQ2 server sort + dedup
        },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "admin",
      },
      { merge: true },
    );
  },
};

function parseScheduleOrDefault(raw: unknown): TipsScheduleConfig {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (
      typeof r.hour === "number" &&
      Number.isInteger(r.hour) &&
      r.hour >= 0 &&
      r.hour <= 23 &&
      Array.isArray(r.daysOfWeek) &&
      r.daysOfWeek.every(
        (n: unknown) =>
          typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 6,
      ) &&
      r.daysOfWeek.length > 0
    ) {
      return {
        hour: r.hour,
        daysOfWeek: [...new Set(r.daysOfWeek as number[])].sort(
          (a, b) => a - b,
        ),
      };
    }
  }
  return { ...DEFAULT_SCHEDULE };                    // R12 sub-fallback
}
```

> **C-G4 결의** — `parseScheduleOrDefault` 가드 — corrupt 값(예: hour=25, daysOfWeek=[7,99])이라도 graceful fallback.
> **R-C2 명명 invariant** — Next.js은 `tipsConfigRepository.getConfig()` (repo method, 인자 없음). functions은 `readTipsAutoConfig(db)` (free function, db 인자). 두 패키지 명명 비대칭이지만 cycle #31 패턴 그대로 보존.

### 3.7 tipsScheduleAuditRepository (NEW) — N2

```ts
// src/lib/firebase/tips-schedule-audit-repository.ts (NEW — server-only)
import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  TipsScheduleAuditEvent,
  TipsScheduleConfig,
} from "@/lib/tips/tips-config";   // R-M4 — audit Event는 tips-config.ts에 정의

const AUDIT = () => adminDb.collection("tipsScheduleAudit");

export const tipsScheduleAuditRepository = {
  async record(
    before: TipsScheduleConfig | null,
    after: TipsScheduleConfig,
  ): Promise<void> {
    await AUDIT().add({
      kind: "schedule-update",
      before: before ? { ...before } : null,
      after: { ...after },
      by: "admin",
      at: FieldValue.serverTimestamp(),
    });
  },

  async list(limit = 20): Promise<TipsScheduleAuditEvent[]> {
    const snap = await AUDIT().orderBy("at", "desc").limit(limit).get();
    return snap.docs.map((s) => {
      const d = s.data();
      return {
        id: s.id,
        at: (d.at as Timestamp)?.toDate?.() ?? new Date(0),
        kind: "schedule-update",
        before: (d.before as TipsScheduleConfig | null) ?? null,
        after: d.after as TipsScheduleConfig,
        by: "admin",
      };
    });
  },
};
```

### 3.8 Server action — `updateTipsSchedule` (확장)

```ts
// src/app/actions/admin-tips-config-actions.ts (확장 — 기존 4 actions 0줄 변경)
import { tipsScheduleSchema } from "@/lib/tips/tips-config";
import { tipsScheduleAuditRepository } from "@/lib/firebase/tips-schedule-audit-repository";

export async function updateTipsSchedule(formData: FormData): Promise<void> {
  await requireAdminApi();

  // daysOfWeek는 checkbox group → formData.getAll("daysOfWeek")
  const daysRaw = formData.getAll("daysOfWeek").map((v) => Number(v));
  const hourRaw = Number(formData.get("hour"));

  let parsed;
  try {
    parsed = tipsScheduleSchema.parse({
      hour: hourRaw,
      daysOfWeek: daysRaw,
    });
  } catch (e) {
    console.warn("[admin-tips-config] updateTipsSchedule validation failed", e);
    redirect("/admin/tips/schedule?error=validation");
  }

  // OQ5 결의 — before/after audit (첫 변경 시 before=null)
  const current = await tipsConfigRepository.getConfig();
  const before =
    current.updatedAt.getTime() === 0  // M6 cycle #31 결의 — fallback 검출
      ? null
      : current.schedule;

  await tipsConfigRepository.setSchedule(parsed);
  await tipsScheduleAuditRepository.record(before, parsed);

  // OQ6 결의 — both paths (cycle #31 L8 패턴)
  revalidatePath("/admin/tips");
  revalidatePath("/admin/tips/schedule");
  redirect("/admin/tips/schedule?updated=1");
}
```

> **M10 cycle #31 결의 재사용** — zod throw → redirect ?error=validation.
> **OQ10**: bind 패턴 미사용 — single-form, 인자 없음. cycle #31 `addTopic` 패턴 일치(M3).

### 3.9 admin UI — `/admin/tips/schedule/page.tsx` (NEW) + `_components/schedule-form.tsx`

```
[헤더] [← 청소 노하우 관리]
+ [Suspense → FlashBanner]          ← updated=1 / error=validation (M4 connection())
+ [Suspense → CurrentScheduleCard]  ← M4 connection() — config + formatScheduleSummary
+ [ScheduleForm]                    ← Server Component → client form (initial config)
   - hour: <select name="hour" 0..23>
   - daysOfWeek: <input type="checkbox" name="daysOfWeek" value=0..6> ×7
   - submit → updateTipsSchedule (plain server action — bind 불필요 OQ10)
+ [Suspense → SchedulePreview30]    ← M4 connection() (uncached new Date)
   - 30일 grid: ✓/✗ + 한글 day label + KST hour:30
+ [Suspense → ScheduleAuditList]    ← M9 try/catch + getAdminDataErrorMessage (cycle #31 패턴)
   - 최근 20건: at·before·after summary (formatScheduleSummary 재사용)
```

`/admin/tips/page.tsx` ScheduleInfo 컴포넌트 1 surgical edit (다른 5 child 0줄 변경):

**Before (cycle #31, line 117-141)**:
```tsx
async function ScheduleInfo() {
  await connection();
  const next = calculateNextTickTime();          // 인자 없음
  return (
    <div ...>
      cron <code>30 9-17 * * *</code> Asia/Seoul · 변경은 dev 요청
      ...
    </div>
  );
}
```

**After (cycle #32)**:
```tsx
async function ScheduleInfo() {
  await connection();
  const config = await tipsConfigRepository.getConfig();  // R12 fallback OK (R-C2 — repo method)
  const next = calculateNextTickTime(config);             // config-driven (R-H5)
  return (
    <div ...>
      <Link href="/admin/tips/schedule">현재 스케줄</Link>
      <span>{formatScheduleSummary(config.schedule)}</span>
      <div>다음 발행 예정 {formatNextTickKst(next)}</div>
    </div>
  );
}
```

다른 ScheduleInfo 외 5 child(`AutoConfigSection` / `StatCards` / `AdminTipsHistoryTable` / `DraftList` / TopicsLink) 0줄 변경 [G7 cycle #31 immutability].

### 3.10 functions/src/tips/index.ts cron 1줄 변경

```ts
// Before (line 26)
schedule: "30 9-17 * * *",

// After (cycle #32 §3.10)
// NEW-H6 cycle #32 — wide cron (24/일 발화). 실제 발행은 runner의 shouldTickNow gate가 결정.
//   :30 minutes는 NEW-H6 invariant (autoSeriesTick :00 vs tipsTick :30 영구 offset).
schedule: "30 * * * *",
```

주석에서 cycle #32 설명 갱신 (line 9-13).

### 3.11 Critical invariants — G7 강화

- **R15 cycle #19 generator 12번째 무수정** — `partner-promo-generator.ts` 0줄
- **R1 auto-series runner 14번째 무수정** — `functions/src/auto-series/runner.ts` 0줄
- **NEW-C5 (cycle #31)** — `nanoid16()` 로컬 복제 0줄 변경 [R-M1] — auto-series runner 무수정 streak 보호
- **NEW-R23 (cycle #31)** — runTipsTick 모든 종료 path가 tipsHistory append. cycle #32에서 7번째 status `skip-out-of-schedule` 추가
- **NEW-R24 (cycle #31)** — dynamic topic pool fallback 보존
- **NEW-H6 (cycle #30)** — :30 cron offset. cron 문자열은 변경되지만 :30 invariant는 영구. `shouldTickNow`가 `minutes !== 30`이면 false 강제(런타임 강제).
- **R12 (cycle #29) back-compat fallback** — Firestore `schedule` 필드 미존재 → DEFAULT_SCHEDULE
- **runner sig invariant [R-H4]** — `runTipsTick(now: Date)` 시그니처 0줄 변경 — cycle #28 R10 패턴
- **cycle #30 immutability** — 9 파일 0줄. 추가로 runner.ts 라인 4 `import { pickNextTopic }` + 라인 54 `void pickNextTopic;` marker [R-M2] 0줄
- **cycle #31 immutability**:
  - dynamic-topic-pool.ts (양 패키지) 0줄
  - tips-config-repository.ts: setEnabled/listTopics/getTopic/addTopic/updateTopic/setTopicActive/listHistory **7 메서드 본문 0줄**. getConfig만 **1 surgical patch — 4번째 return field schedule 추가** [R-H5]
  - admin-tips-config-actions.ts: 4 actions(toggleAutoEnabled/addTopic/updateTopic/setTopicActive) 본문 0줄. updateTipsSchedule만 신규 추가
  - AdminTipsAutoConfigToggle, AdminTipsHistoryTable, AdminTipsTopicForm 0줄
  - /admin/tips/topics, /new, /[topicId] 3 페이지 0줄
- **cycle #31 PATCH split [R-M5]** — cycle #31 PATCH 1을 1a (config fetch line 60) + 1b (enabled check) 두 부분으로 split. 1a는 line 60 그대로 보존, 1b는 schedule gate 뒤로 이동. 의미 보존(추가/제거 X). cycle #30/#31 6 patch (PATCH 1·2·3·4·4b·5) 의미 그대로 + cycle #32 PATCH 0a 추가 = 7 patch 구조 [R-C1]
- **Option A 코드 복제 7번째 cycle** — 양 패키지 mirror 4종 (tips-config 확장 / schedule-gate NEW / next-tick-time NEW mirror / tips-history Status literal)

---

## §4. Component / Module Inventory

### 4.1 신규 파일 (9)

| # | 파일 | 역할 | LOC |
|---|------|------|----:|
| 1 | `src/lib/tips/schedule-gate.ts` | `shouldTickNow(config, kstNow)` pure (NOT server-only) | 60 |
| 2 | `src/lib/tips/schedule-preview.ts` | `previewSchedule(config, now, days)` pure (NOT server-only) | 90 |
| 3 | `src/lib/tips/schedule-gate.test.ts` | 8 cases (hour/dow/minutes/fallback/corrupt) | 130 |
| 4 | `src/lib/tips/schedule-preview.test.ts` | 6 cases (30일 분포·월경계·empty days) | 110 |
| 5 | `src/lib/firebase/tips-schedule-audit-repository.ts` | record + list (Admin SDK) | 80 |
| 6 | `src/app/admin/tips/schedule/page.tsx` | Server Component — 4 Suspense child | 230 |
| 7 | `src/app/admin/tips/schedule/_components/schedule-form.tsx` | client form (hour select + DOW checkbox) | 110 |
| 8 | `functions/src/tips/lib/schedule-gate.ts` (mirror) | functions side `shouldTickNow` | 60 |
| 9 | `functions/src/tips/lib/next-tick-time.ts` (mirror NEW) | functions side `calculateNextTickTime` + `formatNextTickKst` (formatScheduleSummary 제외) | 130 |

**소계 신규**: ~1,000 LOC.

### 4.2 수정 파일 (10)

| 파일 | 변경 |
|------|------|
| `src/lib/tips/tips-config.ts` | `TipsScheduleConfig` interface + `tipsScheduleSchema` zod + `DEFAULT_SCHEDULE` + `DEFAULT_TIPS_AUTO_CONFIG.schedule` 추가, `TipsTickStatus`에 `"skip-out-of-schedule"` 추가, **`TipsScheduleAuditEvent` interface 추가** [R-M4 — 별도 파일 X, tips-config 단일 위치] |
| `functions/src/tips/lib/tips-config.ts` (mirror) | 위와 동일 (양 패키지 sync). 단 `TipsScheduleAuditEvent`는 mirror 제외 (Next.js 단독, R-M4) |
| `src/lib/tips/next-tick-time.ts` | 시그니처 변경 — `calculateNextTickTime(config, now)`, `formatScheduleSummary(schedule)` 추가, 9·17 magic number 제거 |
| `src/lib/tips/next-tick-time.test.ts` | **케이스 1~5에 명시적 schedule 인자 매핑 [R-L1]** + 신규 5 cases (DOW skip, 7일 wraparound, weekend-only, every-other-day, fallback) |
| `src/lib/firebase/tips-config-repository.ts` | `setSchedule` 추가 + `getConfig` 1 surgical patch (schedule 4번째 field) + `parseScheduleOrDefault` helper [R-H5]. 다른 7 메서드 본문 0줄 |
| `src/app/actions/admin-tips-config-actions.ts` | `updateTipsSchedule` action 추가 (기존 4 actions 0줄) |
| `src/app/admin/tips/page.tsx` | `ScheduleInfo` 컴포넌트 1개만 surgical edit — config-driven `next` + `Link to /admin/tips/schedule` (다른 5 Suspense child 0줄) |
| `functions/src/tips/runner.ts` | **PATCH 0a 1 surgical insert + cycle #31 PATCH 1 1a/1b split [R-M5]** + import 2개 추가. line 1-15 imports / line 42-50 nanoid16 / line 54 `void pickNextTopic` 0줄 [R-M1·R-M2]. cycle #30/#31 6 patch (PATCH 1·2·3·4·4b·5) 의미 보존 [R-C1] |
| `functions/src/tips/index.ts` | cron 1줄 + 주석 갱신 |
| `functions/src/tips/lib/tips-history.ts` (mirror) | `TipsTickStatus`에 `"skip-out-of-schedule"` 추가 |
| `firestore.rules` | `tipsScheduleAudit/{auditId}` `read/write: if false` 블록 추가 (M7 cycle #31 패턴) |
| `scripts/check-queue-mirror.mjs` | **16 → 18 [R-H1]** (`schedule-gate` + `next-tick-time` mirror, `TipsTickStatus` 7 literal title 갱신 [R-M3]) |
| `package.json` | `test:tips` script에 schedule-gate.test + schedule-preview.test 추가 |

**소계 수정**: ~250 LOC.

**총합**: ~1,250 LOC (Plan §12 추정 ~1,200 LOC 일치).

### 4.3 CI lint 확장 (16 → 18) [R-H1·R-M3]

기존 16 (cycle #31 끝) + 신규 2 + 기존 2개 갱신:

```js
// NEW cycle #32 #17
{
  title: "schedule-gate shouldTickNow 양 패키지 (cycle #32)",
  files: [
    "src/lib/tips/schedule-gate.ts",
    "functions/src/tips/lib/schedule-gate.ts",
  ],
  test: (src) => /shouldTickNow/.test(src) && /minutes !== 30/.test(src),
},
// NEW cycle #32 #18
{
  title: "next-tick-time calculateNextTickTime 양 패키지 (cycle #32 NEW mirror)",
  files: [
    "src/lib/tips/next-tick-time.ts",
    "functions/src/tips/lib/next-tick-time.ts",
  ],
  test: (src) => /calculateNextTickTime/.test(src),
},
```

**기존 #14 갱신** (`tips-config TipsAutoConfig 양 패키지 (NEW cycle #31)`):
- Title 그대로 + test 본문에 `TipsScheduleConfig` literal 추가 검증

**기존 #16 갱신** (`TipsTickStatus 6 literal 양 패키지 (C3 — drift 방지)`) [R-M3]:
- **Title**: "TipsTickStatus 6 literal" → "**TipsTickStatus 7 literal**"
- test 본문 `skip-out-of-schedule` literal 추가 검증

```js
{
  title: "TipsTickStatus 7 literal 양 패키지 (C3 — drift 방지, cycle #32)",
  files: [
    "src/lib/tips/tips-config.ts",
    "functions/src/tips/lib/tips-history.ts",
  ],
  test: (src) =>
    /published-draft/.test(src) &&
    /skip-disabled/.test(src) &&
    /skip-already-today/.test(src) &&
    /skip-no-topic/.test(src) &&
    /compose-fail/.test(src) &&
    /hygiene-fail/.test(src) &&
    /skip-out-of-schedule/.test(src),  // NEW cycle #32
},
```

### 4.4 Test runner 확장 — M8 결의 재사용

```json
"scripts": {
  ...
  "test:tips":
    "npx tsx src/lib/llm/tips-generator.test.ts && \
     npx tsx src/lib/tips/topic-pool.test.ts && \
     npx tsx src/lib/tips/next-tick-time.test.ts && \
     npx tsx src/lib/tips/schedule-gate.test.ts && \
     npx tsx src/lib/tips/schedule-preview.test.ts"
}
```

총 cycle #30(8) + cycle #31(5 갱신) + cycle #32(8 + 6 = 14 신규) = 27 cases.

### 4.5 환경 변수
변경 없음.

---

## §5. API Contracts

### 5.1 Firestore admin SDK (functions runner) — R-C2 명명 invariant

```ts
// functions 측 — free function (db 인자 받음)
async function readTipsAutoConfig(db: Firestore): Promise<TipsAutoConfig>
// cycle #31 그대로. schedule 필드 R12 sub-fallback은 functions/src/tips/lib/tips-config.ts 측에도 동일 가드 (parseScheduleOrDefault mirror)

function shouldTickNow(config: TipsAutoConfig, kstNow: KstNowParts): boolean
// pure. minutes !== 30 → false (NEW-H6). hour/dow 매칭 시만 true.
```

### 5.2 Server actions (Next.js)

```ts
async function updateTipsSchedule(formData: FormData): Promise<void>
// FormData: hour=number, daysOfWeek=number[] (multiple checkbox values)
// zod parse fail → redirect /admin/tips/schedule?error=validation
// 성공: revalidate /admin/tips + /admin/tips/schedule, redirect ?updated=1
```

### 5.3 next-tick-time + helpers (Next.js + functions mirror)

```ts
function calculateNextTickTime(config: TipsAutoConfig, now?: Date): NextTickResult
function formatNextTickKst(r: NextTickResult): string
function formatScheduleSummary(schedule: TipsScheduleConfig): string  // Next.js only

function previewSchedule(config: TipsAutoConfig, now: Date, days?: number): PreviewDay[]
```

### 5.4 tipsConfigRepository (Next.js — repo method, R-C2)

```ts
{
  // cycle #31 그대로 (7 메서드 본문 0줄, getConfig만 schedule field 추가)
  getConfig(): Promise<TipsAutoConfig>;       // schedule R12 sub-fallback 추가
  setEnabled(enabled): Promise<void>;
  listTopics(opts?): Promise<TipsTopicDoc[]>;
  getTopic(id): Promise<TipsTopicDoc | null>;
  addTopic(input): Promise<string>;
  updateTopic(id, patch): Promise<void>;
  setTopicActive(id, isActive): Promise<void>;
  listHistory(limit?): Promise<TipsTickEvent[]>;

  // cycle #32 NEW
  setSchedule(schedule: TipsScheduleConfig): Promise<void>;
}
```

### 5.5 tipsScheduleAuditRepository (NEW)

```ts
{
  record(before: TipsScheduleConfig | null, after: TipsScheduleConfig): Promise<void>;
  list(limit?): Promise<TipsScheduleAuditEvent[]>;
}
```

---

## §6. UI Changes

| 위치 | 변화 |
|------|------|
| `/admin/tips` | **ScheduleInfo 컴포넌트만 1 surgical edit** — cron string read-only → `formatScheduleSummary(config.schedule)` + `Link → /admin/tips/schedule`. 다른 5 Suspense child(AutoConfigSection / StatCards / AdminTipsHistoryTable / DraftList / TopicsLink) 0줄 변경 (G7) |
| `/admin/tips/schedule` (NEW) | FlashBanner + CurrentScheduleCard + ScheduleForm + SchedulePreview30 (calendar) + ScheduleAuditList |

> 각 신규 Suspense child는 `await connection()` (M4 cycle #31 결의 재사용 — uncached `new Date()` 사용).

---

## §7. Security & Privacy — M7 결의 재사용

`firestore.rules` 신규 블록 추가:

```js
match /tipsScheduleAudit/{auditId} {
  allow read: if false;
  allow write: if false;
}
```

cycle #31 `tipsAutoConfig` / `tipsTopicPool` / `tipsHistory` 블록 0줄 변경.

- `updateTipsSchedule`: `requireAdminApi()` + zod (hour 0-23 int, daysOfWeek min 1 max 7, 각 0-6 int).
- `setSchedule` server-side sort/dedup 강제 — UI input 순서/중복 무관 안전.
- C1 cycle #31 결의 재사용 — `by: "admin"` literal.
- audit before/after는 corruption 방어 — `parseScheduleOrDefault` 거친 값만 저장.

---

## §8. Implementation Order (S1–S23)

```
S1.  src/lib/tips/tips-config.ts       — 확장 (TipsScheduleConfig + zod + DEFAULT_SCHEDULE + Status literal + Audit Event type [R-M4])
S2.  src/lib/tips/schedule-gate.ts     — NEW pure (shouldTickNow)
S3.  src/lib/tips/schedule-gate.test.ts — 8 cases
S4.  src/lib/tips/next-tick-time.ts    — config-driven 시그니처 + formatScheduleSummary
S5.  src/lib/tips/next-tick-time.test.ts — 5 갱신 (schedule 인자 명시 매핑 [R-L1]) + 5 신규
S6.  src/lib/tips/schedule-preview.ts  — NEW
S7.  src/lib/tips/schedule-preview.test.ts — 6 cases
S8.  functions/src/tips/lib/tips-config.ts (mirror) — 확장 (Audit Event는 제외 [R-M4])
S9.  functions/src/tips/lib/schedule-gate.ts (mirror NEW)
S10. functions/src/tips/lib/next-tick-time.ts (mirror NEW) — `../auto-series/lib/window` import [R-H3]
S11. functions/src/tips/lib/tips-history.ts (mirror) — Status literal 7개로 확장
S12. functions/src/tips/runner.ts — PATCH 0a 삽입 + PATCH 1 1a/1b split [R-M5] + 2 imports (window [R-H3], schedule-gate)
S13. functions/src/tips/index.ts — cron 1줄 + 주석
S14. src/lib/firebase/tips-config-repository.ts — setSchedule 추가 + getConfig 1 surgical (schedule field) + parseScheduleOrDefault [R-H5]
S15. src/lib/firebase/tips-schedule-audit-repository.ts (NEW)
S16. src/app/actions/admin-tips-config-actions.ts — updateTipsSchedule 추가
S17. src/app/admin/tips/schedule/_components/schedule-form.tsx (NEW client)
S18. src/app/admin/tips/schedule/page.tsx (NEW Server Component, 4 Suspense)
S19. src/app/admin/tips/page.tsx — ScheduleInfo 1 surgical edit (config-driven + Link)
S20. firestore.rules — tipsScheduleAudit 블록 추가
S21. scripts/check-queue-mirror.mjs — 16→18 + 기존 #14·#16 갱신 [R-H1·R-M3]
S22. package.json — test:tips 확장
S23. typecheck (Next.js + functions) + build + tests + lint:mirror 18/18 + 통합 검증
```

격리: S1·S2·S4·S6 lib 신규(독립). S8·S9·S10·S11 functions mirror(독립). S12·S13 functions runner 변경(연쇄). S14·S15 server-side(독립). S16·S17·S18·S19 admin UI(연쇄). S20·S21·S22 CI/규칙. S23 통합.

---

## §9. Test Plan

### 9.1 단위 테스트 — M8 결의 재사용

#### `schedule-gate.test.ts` (8 cases)

1. `hours=9, minutes=30, dow=1, schedule={hour:9, daysOfWeek:[1]}` → true
2. `hours=9, minutes=30, dow=2, daysOfWeek=[1]` (DOW 미포함) → false
3. `hours=10, minutes=30, dow=1, schedule.hour=9` → false
4. `hours=9, minutes=0, dow=1, schedule.hour=9, daysOfWeek=[1]` → false (NEW-H6 :30 invariant)
5. `hours=9, minutes=45` → false (off-tick)
6. `config.schedule = undefined` → DEFAULT_SCHEDULE 적용 (매일 09:30 통과 시 true)
7. `daysOfWeek=[]` 직접 주입 → false (defensive — 정상 경로는 zod 거부)
8. `schedule.hour=14, daysOfWeek=[0,6]` 평일 dow=3 14:30 → false

#### `schedule-preview.test.ts` (6 cases)

1. 매일 09:30 schedule → 30일 모두 willPublish=true
2. 평일만 (1,2,3,4,5) → 30일 중 ~22 willPublish (월별 변동)
3. 주말만 (0,6) → ~8-9 willPublish
4. 월 경계 (4/30 → 5/1) — date·month 정확
5. now=4월 마지막날 23:50 → preview[0]은 5/1
6. config.schedule undefined → DEFAULT_SCHEDULE fallback (매일 09:30)

#### `next-tick-time.test.ts` (10 cases) [R-L1 결의]

cycle #31 5 cases는 **schedule 인자를 명시 매핑**해 의미 보존 + 5 신규:

| ID | Input | Schedule | Expected | 의미 |
|----|-------|----------|----------|------|
| 1 | KST 08:00 | `{hour:9, daysOfWeek:[0..6]}` | 오늘 09:30 | cycle #31 case 1 (DEFAULT) |
| 2 | KST 14:15 | `{hour:14, daysOfWeek:[0..6]}` | 오늘 14:30 | cycle #31 case 2 — schedule.hour=14로 명시 |
| 3 | KST 14:30 boundary | `{hour:15, daysOfWeek:[0..6]}` | 오늘 15:30 | cycle #31 case 3 — schedule.hour=15로 명시 [R-L1] |
| 4 | KST 17:31 | `{hour:9, daysOfWeek:[0..6]}` | 다음날 09:30 | cycle #31 case 4 |
| 5 | KST 23:59 | `{hour:9, daysOfWeek:[0..6]}` | 다음날 09:30 | cycle #31 case 5 |
| 6 | KST 월요일 10:00 | `{hour:9, daysOfWeek:[1,3,5]}` (월수금) | 다음 수요일 09:30 | DOW skip |
| 7 | KST 토요일 12:00 | `{hour:9, daysOfWeek:[0,6]}` (주말) | 오늘 토요일 12:00 후라 9:30 못 쓰니… 일요일 09:30 | 주말 only |
| 8 | KST 화요일 09:00 | `{hour:9, daysOfWeek:[2,4]}` (화목) | 오늘 09:30 | every-other-day |
| 9 | corrupt `daysOfWeek=[]` | (corrupt) | DEFAULT_SCHEDULE fallback → 다음 09:30 | empty fallback |
| 10 | host TZ UTC vs Asia/Seoul | (any) | 동일 결과 | TZ 무관 검증 |

### 9.2 통합 검증

- `pnpm exec tsc --noEmit` (Next.js + functions) — exit 0
- `pnpm exec next build` — `/admin/tips/schedule` PPR 포함
- `pnpm test:tips` — 27 cases pass
- `pnpm lint:mirror` — 18/18
- 시나리오 1: admin이 hour=14, daysOfWeek=[1,3,5] 저장 → audit entry 1건 → /admin/tips ScheduleInfo "월·수·금 14:30 KST" + 다음 발행 = 다음 월/수/금 14:30
- 시나리오 2: 토요일 14:30 cron tick → `skip-out-of-schedule` history (DOW 미포함)
- 시나리오 3: 월요일 14:30 cron tick → 정상 발행 (gate 통과 → enabled 통과 → already-today 통과 → publish)
- 시나리오 4: Firestore `schedule` 필드 누락 doc → R12 fallback 매일 09:30 (cycle #30/#31 동작 대등)
- 시나리오 5: hours=10, minutes=0 (NEW-H6 위반 시도) → false (실제 cron `30 * * * *` 발화 X — 방어 layer)

### 9.3 회귀 보호

- cycle #30 `pnpm test:tips` 8/8 (tips-generator + topic-pool) 그대로
- cycle #31 5 next-tick cases는 schedule 인자 명시 매핑으로 expected 보존 [R-L1]
- cycle #31 `/admin/tips` 동작 — AutoConfigSection/StatCards/AdminTipsHistoryTable/DraftList/TopicsLink 5 child 0줄 변경
- cycle #31 `/admin/tips/topics`·`/new`·`/[topicId]` 0줄 변경
- cycle #31 admin-tips-config-actions의 4 actions 본문 0줄 변경
- lint:mirror cycle #28 8 → cycle #30 13 → cycle #31 16 → cycle #32 18 [R-H1]

---

## §10. Risk Table

| Risk | Mitigation | Severity |
|------|------------|:---:|
| Firestore `schedule` 필드 누락 → 발행 정지 | `parseScheduleOrDefault` + `DEFAULT_SCHEDULE` 매일 09:30 (R12) | L |
| Corrupt schedule (hour=25, dow=[7,99]) | `parseScheduleOrDefault` 가드 + zod (server action) | L |
| daysOfWeek=[] 저장 | zod min(1) + UI submit disable | L |
| NEW-H6 :30 위반 (예: cron 변경 실수) | runtime gate `minutes !== 30 → false` 강제 | L |
| autoSeriesTick :00 동시 발화 | cron `30 * * * *` :30 그대로 → 시점 분리 보존 | L |
| schedule 변경 즉시 반영 X | 매 tick fetch (cycle #31 OQ4 패턴) + revalidatePath 양측 | L |
| 30일 미리보기와 실 발행 불일치 | gate 함수 1개 진실 단일화 (preview·runner 모두 사용) | L |
| 발화 9→24/일 noise (skip-out-of-schedule history) | listHistory limit(10) UI에서. cycle #33+ TTL/cleanup 검토 | M |
| audit log 무한 증가 | list limit(20) UI에서. cycle #33+ 통합 audit cleanup | M |
| mirror lint 누락 → drift | `lint:mirror` 18 check + CI 강제 | L |
| cycle #30/#31 invariant 회귀 | 1 surgical edit 1지점만(runner.ts gate insert) + design-validator reality-check (v0.2 — 15 finding 결의) | L |
| `/admin/tips/schedule` Suspense 4개 — 부분 렌더 깨짐 | 각 child Skeleton + connection() (M4) | L |
| **R-C1 (해소됨)** patch count 표기 | "5 patch" → "6 patch" 정정 | L |
| **R-C2 (해소됨)** naming asymmetry | repo method vs free function invariant 명시 | L |
| **R-H3 (해소됨)** functions side `window.ts` path | import 경로 정정 | L |
| **R-H5 (해소됨)** getConfig 0줄 주장 | 1 surgical patch로 정정 | L |
| **R-M5 (해소됨)** PATCH 1 split | 1a/1b split 명시 | L |

---

## §11. Open Questions (자체 답변 + design-validator 검증 결과 v0.2)

| ID | Question | Resolution |
|----|----------|-----------|
| OQ1 | `daysOfWeek` 표현 — number[] vs literal? | **Number array (0-6)** — Date 호환 + zod min(1) 강제 + UI에서만 한글 변환 |
| OQ2 | `daysOfWeek` 정렬·중복 제거 | **Server** — `setSchedule`이 sort + Set dedup |
| OQ3 | hour selector 단위 | 0-23 자유 (HH 단위, NEW-H6 :30 자동) |
| OQ4 | 30일 미리보기 server vs SSG? | **Server-render** — connection() 후 동적 |
| OQ5 | audit `before` 첫 변경 시 | **null** (M6 fallback 검출 시) |
| OQ6 | revalidatePath scope | **/admin/tips + /admin/tips/schedule** (cycle #31 L8 패턴) |
| OQ7 | gate 통과 + already-today 시 status | `skip-already-today` 그대로 |
| OQ8 | functions 측 next-tick-time mirror 필요? | **YES** — 일관성. mirror lint 통일성 |
| OQ9 | DST/timezone 방어 | **YES** — `toKstWallClock` 재사용 |
| OQ10 | `schedule-form.tsx` server action | **plain `action={updateTipsSchedule}`** — cycle #31 M3 패턴 |
| OQ11 | gate vs enabled 게이트 순서 | **schedule gate 먼저** — 의미 분리 (R-M5 split) |
| OQ12 | runner KST wall clock | **`toKstWallClock(now)` + `getUTCDay`** — cycle #28 패턴 |
| OQ13 | audit collection 위치 | **root `tipsScheduleAudit`** — system 하위 X |
| OQ14 | hour 0~23 비정상 시간 보호 | UI 0-23 모두 허용 (운영자 책임). 경고 X |
| OQ15 | `schedule-preview` 페이징 | 30일 단위 1회 (페이징 X) |
| **OQ16 (NEW v0.2)** | TipsScheduleAuditEvent 위치 | **`tips-config.ts`** — 별도 파일 X (R-M4) |
| **OQ17 (NEW v0.2)** | functions 측 toKstWallClock import | **`../auto-series/lib/window`** (Next.js의 `auto-publish-window`와 다름, R-H3) |

---

## §12. Streak Context

cycles #21~#31 모두 single-pass ≥ 90% Match Rate (11-streak). cycle #31 = 99.0% (largest scope ~2,010 LOC, 21 files).

cycle #32 = **12-streak 도전**:
- cycle #31보다 작은 scope (~1,250 LOC, 22 files — 신규 9 + 수정 13)
- mirror 파일 4종 (tips-config 확장 + schedule-gate NEW + next-tick-time NEW mirror + tips-history Status literal)
- functions runner 변경은 PATCH 0a 1지점 + PATCH 1 1a/1b split — risk 낮음
- cycle #30 (R1·R15 generator) + cycle #31 (dynamic-topic-pool 등) 0줄 변경 invariant 12번째 cycle 누적
- design-validator v0.2: 15 finding 모두 §14 결의 매트릭스에 매핑, 본문 직접 반영

R-invariant 보존 streak (12-streak 가정):
- R1 (cycle #19 generator 0줄) — 12번째 cycle (두 자릿수 누적)
- R15 (cycle #19 generator 0줄 변경 streak) — 12번째 cycle
- NEW-H6 (cycle #30 :30 cron offset) — cron 문자열 변경하지만 :30 invariant 영구 보존(런타임 gate 강제)
- NEW-R23 (cycle #31 모든 종료 path history append) — 7번째 status 추가로 패턴 강화
- NEW-R24 (cycle #31 dynamic pool fallback) — 0줄 변경
- NEW-C5 (cycle #31 nanoid16 로컬 복제) — 0줄 변경

---

## §13. Versions

- **v0.1** (2026-05-03): 초안. design-validator agent reality-check 실행 전.
- **v0.2** (2026-05-03): design-validator reality-check 결과 15 finding(Critical 2 / High 5 / Medium 5 / Low 3) 모두 §14 결의 매트릭스에 매핑 + §3·§4·§5·§7·§11 본문 직접 반영. Plan §4.2 L1 표기 잘못(15→17)은 Design 16→18로 정정 [R-H1·R-L3].

---

## §14. Resolution Matrix (v0.2 — design-validator 결과)

| ID | Severity | Issue | Resolution | 반영 위치 |
|----|----------|-------|------------|-----------|
| R-C1 | Critical | "cycle #30/#31 5 patch" 표기 — 실제는 6 patch (PATCH 1·2·3·4·4b·5) | "5 patch" → "6 patch (PATCH 1·2·3·4·4b·5)"로 정정. cycle #32 PATCH 0a 추가 시 7 patch | §1.2, §3.2 코멘트, §3.11, §13 |
| R-C2 | Critical | functions vs Next.js 명명 mismatch (`readTipsAutoConfig` vs `tipsConfigRepository.getConfig`) | functions free function `readTipsAutoConfig(db)` + Next.js repo method `getConfig()` invariant 명시 | §3.6, §5.1, §5.4 |
| R-H1 | High | `check-queue-mirror.mjs` 실제 check 개수 16 (Plan §4.2 L1 "15→17"이 잘못) | Design 16 → 18. Plan §4.2 L1 정정 | §4.3, §13 |
| R-H2 | High | runner.ts 신규 import 명시 부족 — `appendTipsHistory`는 cycle #31 import 그대로 | Design §3.2 코멘트에 "기존 import `appendTipsHistory` 0줄 변경" 추가 | §3.2 imports 블록 |
| R-H3 | High | functions/src/auto-series/lib 파일명은 `window.ts` (Next.js의 `auto-publish-window.ts`와 다름) | `import { toKstWallClock } from "../auto-series/lib/window"` (functions side). 비대칭 invariant 명시 | §3.2, §3.4, §11 OQ17 |
| R-H4 | High | runner 시그니처 `runTipsTick(now: Date)` 0줄 변경 명시 누락 | Design §3.11에 "runner 시그니처 0줄 변경 — cycle #28 R10 패턴" 추가 | §3.11 |
| R-H5 | High | `getConfig` 본문 0줄 immutability 주장과 실제 schedule 필드 추가 충돌 | "`getConfig` 본문 1 surgical patch — 4번째 return field 추가. 다른 7 메서드 본문 0줄" 정정 | §1.2, §3.6, §3.11, §4.2 |
| R-M1 | Medium | `nanoid16()` 로컬 복제 0줄 변경 invariant 누락 | "NEW-C5 — `nanoid16()` 로컬 복제 0줄 변경" 추가 | §1.2, §3.2, §3.11 |
| R-M2 | Medium | `void pickNextTopic` 라인 (cycle #30 immutability marker) 보존 명시 누락 | "cycle #30 import `pickNextTopic` + `void pickNextTopic` line 4·54 0줄 변경" 명시 | §1.2, §3.2, §3.11 |
| R-M3 | Medium | mirror lint check #16 title "6 literal" → "7 literal" 갱신 누락 | Design §4.3 코드 블록에 title도 함께 갱신 | §4.3 |
| R-M4 | Medium | `TipsScheduleAuditEvent` interface 위치 모호 | `tips-config.ts` 단일 위치 결의 (functions mirror 제외 — Next.js 단독) | §3.1.1, §3.1.2, §3.7, §4.2, §11 OQ16 |
| R-M5 | Medium | cycle #31 PATCH 1이 fetch + enabled 두 부분 — 분리/이동 명시 필요 | "cycle #31 PATCH 1을 1a (fetch line 60) + 1b (enabled check) 두 부분으로 split. 1a 보존, 1b는 schedule gate 뒤로 이동. 의미 보존(추가/제거 X)" | §1.2, §3.2 코멘트, §3.11 |
| R-L1 | Low | next-tick-time.test cycle #31 케이스 3 (14:30 → 15:30) — DEFAULT_SCHEDULE이 09:30이라 의미 변경 | "케이스 1~5에 명시적 schedule 인자 매핑 (예: 케이스 3 schedule={hour:15, daysOfWeek:[0..6]})으로 expected 보존" | §9.1, §9.3, §4.2 |
| R-L2 | Low | server-only chain 명시 강화 | §3.3·§3.5에 "// NOT server-only" 헤더 코멘트 추가 | §3.3, §3.5 |
| R-L3 | Low | Plan-Design count 불일치 (Plan 15→17 vs Design 16→18) | Design §13 변경 로그에 "Plan §4.2 L1 표기 잘못 — 실제 16→18 (R-H1·R-L3 결의)" 명시 | §13 |
