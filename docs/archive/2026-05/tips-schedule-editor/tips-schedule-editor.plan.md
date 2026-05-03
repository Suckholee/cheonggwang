# tips-schedule-editor · Plan (cycle #32 v1.19)

> Plan Plus 4-phase output (cycle #31 tips-admin-config 다음 cycle).
> Generated: 2026-05-02
> Streak target: **12번째 consecutive single-pass ≥ 90% Match Rate**.
> Predecessor 보호: cycle #30 (cleaning-tips-content) + cycle #31 (tips-admin-config) 0줄 변경 — generator·topic-pool·tips-history 영역.

---

## §1. User Intent Discovery (Phase 1)

### 1.1 Core Problem

cycle #31 tips-admin-config 배포 후 admin은 ON/OFF·topic CRUD·history는 자율적으로 운영 가능. 그러나 **발행 타이밍**은 여전히 코드 hardcoded:

- `functions/src/tips/index.ts:26` — `schedule: "30 9-17 * * *"` (KST 09:30~17:30 hourly 9-tick)
- `src/lib/tips/next-tick-time.ts` — 9·17·:30 magic number 하드코딩
- 운영팀이 "오늘 16시에 발행" 또는 "주말은 skip" 같은 요청 시 dev 작업 + functions deploy 필요

cycle #31 보고서 §2.6 — "schedule editor Approach A (1,500 LOC)" 후속 cycle 명시. 사용자가 cycle #32 후보로 선정 → 본 cycle.

### 1.2 Target Users

- **Primary**: 청광 admin (운영팀 / 컨텐츠 매니저).
- **Secondary 영향**: tipsTick cron runtime — `30 * * * *` wide cron으로 발화 9→24/일 (Cloud Scheduler 무료 tier 한도 안). gate 통과 1회만 publish 진행.
- **End user 영향**: 0 (community/tips 패널 동작 그대로).

### 1.3 Success Criteria

V1 시점:
- Admin이 `/admin/tips/schedule`에서 시각(hour 0–23) + 요일 mask(월~일) 편집
- 변경 즉시 다음 tick부터 반영 (cycle #31 OQ4 "매 tick fetch" 패턴)
- `/admin/tips`의 "다음 발행 예정" 표시가 admin schedule 기준으로 동적 계산
- 향후 30일 발행 캘린더 미리보기 (gate 적용 결과)
- schedule 변경 audit log (최근 20건)
- 기존 cycle #30·#31 0 regression — functions cron 1줄 + runner gate 1지점만 변경
- NEW-H6 cron offset (autoSeriesTick :00 ↔ tipsTick :30) 보존
- Firestore config 미존재 시 R12 fallback = 매일 09:30 KST

---

## §2. Alternatives Explored (Phase 2)

### Approach A: Wide cron `30 * * * *` + Firestore gate (✅ Selected)
- cron 1줄 변경 deploy, runner에 `shouldTickNow(config, kstNow)` gate 추가
- **Pros**: 코드만 (외부 GCP API 0). NEW-H6 :30 offset 영구 보존. cycle #31 OQ4 "매 tick fetch" 패턴 그대로. 신규 의존성 0. 변경 즉시 반영.
- **Cons**: 발화 9→24/일 (Cloud Scheduler 무료 tier 안 — 비용 미미). 분(MM) 단위 자유도 X (:30 고정).
- **Best for**: 운영 복잡도 최소화 + invariant 보존 우선. cycle #31 11-streak 안전 확장.

### Approach B: Cloud Scheduler API runtime patch (rejected)
- server action이 `google-cloud-scheduler` SDK로 deployed cron 문자열 직접 수정
- **Pros**: 발화량 변화 없음. HH:MM 자유 자유도. cron이 곧 진실(visibility ↑).
- **Cons**: GCP IAM(`cloudscheduler.admin`) 신규. 신규 의존성 + 에뮬레이터 분기 필요. 1,500 LOC급. 변경 latency ~30s. 11-streak 외부 의존성 부담.

### Approach C: `*/15 * * * *` cron + gate (rejected)
- 15분 stride로 분 단위 자유도 확보
- **Pros**: HH:MM 15분 단위 자유.
- **Cons**: NEW-H6 의도(:00 vs :30 offset) 약화 — `:00/:15/:30/:45` 모두 발화 → autoSeriesTick :00과 동시 발화 1/4. 발화 96/일. 운영 노이즈 ↑.

---

## §3. YAGNI Review (Phase 3)

### Included in V1 (사용자 multiSelect 명시 + 핵심 필수)

| ID | Item | 근거 |
|----|------|------|
| **S1** | `tipsAutoConfig.schedule = { hour, daysOfWeek }` Firestore 확장 | 기능의 단일 진실 소스 |
| **S2** | `shouldTickNow(config, kstNow)` pure gate | runner 분기점 |
| **S3** | functions cron 1줄 변경 `30 9-17 * * *` → `30 * * * *` | wide cron + gate 패턴 |
| **S4** | runner gate 통합 + `skip-out-of-schedule` status | 운영 가시성 |
| **S5** | `calculateNextTickTime(config, now)` config-driven 시그니처 변경 | 동적 다음 발행 시각 |
| **S6** | `/admin/tips/schedule` 신규 페이지 (hour selector + DOW checkboxes) | admin 편집 UI |
| **S7** | `updateTipsSchedule` server action + zod | server-only 진입점 |
| **S8** | **Schedule 편집 audit log** (`tipsScheduleAudit` collection) | 사용자 V1 multiSelect 선택 |
| **S9** | **다음 30일 발행 캘린더 미리보기** | 사용자 V1 multiSelect 선택 |
| **S10** | `/admin/tips`에 schedule 요약 카드 + 편집 링크 | 진입 동선 |
| **S11** | `tips-config.ts` mirror 갱신 (zod + DEFAULT_SCHEDULE) | 양 패키지 sync |
| **S12** | `schedule-gate.ts` mirror (NEW 양 패키지) | 양 패키지 sync |
| **S13** | `next-tick-time.ts` mirror (Next.js + functions) | 양 패키지 sync (functions 신규 mirror) |
| **S14** | `TipsTickStatus`에 `skip-out-of-schedule` 추가 + mirror lint 7 status 검증 | C3 결의 확장 |
| **S15** | firestore.rules `tipsScheduleAudit` `read/write: if false` (Admin SDK only) | cycle #31 quoteTrendKeywords 패턴 |
| **S16** | `schedule-gate.test.ts` (NEW) + `next-tick-time.test.ts` 갱신 + `test:tips` 추가 | 테스트 강제 |
| **S17** | `lint:mirror` script 갱신 (15→17 check) | CI 강제 |

### Deferred to cycle #33+

| ID | Item | 이유 |
|----|------|------|
| 공휴일 자동 skip (한국 calendar) | 사용자 multiSelect 미선택 | YAGNI — 운영자 수동 비활성화로 충분 |
| Manual trigger UI에 "스케줄 무시" 라벨 | 사용자 multiSelect 미선택 | 현재도 manual은 schedule 무관 — 라벨만으로 가치 미미 |
| HH:MM 분 단위 자유 | Approach A 채택으로 의도적 제외 | NEW-H6 :30 invariant 보존 우선 |
| 1일 다회 발행 (skip-already-today 해제) | 사용자 Q2 "시각+요일" 선택 (다회 X) | topic pool 소진 risk |
| Schedule preset (아침/점심/저녁) | Approach C 거부 | hour selector로 자유도 충분 |
| Audit log retention/TTL | cycle #33+ 통합 audit cleanup | tipsScheduleAudit + tipsTopicAudit 함께 처리 권장 |
| Topic CRUD audit log (cycle #31 OQ5) | 본 cycle scope 외 | cycle #33+ |

### Permanent rejection

- 분 단위 자유 cron 패턴 (`*/N`) — NEW-H6 :30 offset invariant 영구 보존 우선.
- Cloud Scheduler runtime API — Approach B rejected — 외부 의존성 부담.
- 사용자(end-user) timezone 표시 — KST 고정 (cycle #31 OQ8 결의 재확인).

---

## §4. Selected Approach: Wide cron + Firestore gate (Approach A)

### 4.1 Architecture (Phase 4 Step 1)

```
[Admin 브라우저]
   /admin/tips/schedule
   ┌────────────────────────────────────────┐
   │ 시각: [09 ▼]  요일: ☑월 ☑화 ☑수 ...   │
   │ 다음 30일 발행 미리보기 (gate 적용)    │
   │ 5/3(토) 09:30 ✗ │ 5/5(월) 09:30 ✓ ...  │
   │ 최근 schedule 변경 (audit, 20건)       │
   └────────────────────────────────────────┘
        │ updateTipsSchedule({hour, daysOfWeek})
        ▼
[Server Action]
   tipsAutoConfig.schedule 업데이트 (transaction)
   + tipsScheduleAudit/{id} 신규 entry
   + revalidatePath('/admin/tips', '/admin/tips/schedule')

[GCP Cloud Scheduler]
   cron: "30 * * * *" Asia/Seoul   ← deploy-time, 1줄만 변경
        │  (매 :30 24회/일 발화)
        ▼
[functions/tipsTick runner]
   1) getTipsAutoConfig() — 매 tick fetch (cycle #31 OQ4)
   2) shouldTickNow(config, kstNow)? ← NEW gate
        false → recordTipTick({status:"skip-out-of-schedule"}) + return
        true  → 기존 cycle #31 토글 게이트 (skip-disabled)
              → 기존 cycle #30 already-today 게이트
              → 기존 cycle #30 publish 흐름 (R1 generator 0줄 변경)
```

### 4.2 Components / Modules (Phase 4 Step 2)

#### Mirror 파일 (양 패키지 — `pnpm lint:mirror` 강제)

| # | 파일 | 변경 | mirror 대상 |
|---|------|------|-------------|
| M1 | `src/lib/tips/tips-config.ts` | `TipsScheduleConfig` interface + zod schema 추가, `TipsAutoConfig.schedule` 필드 추가, `DEFAULT_SCHEDULE`/`DEFAULT_TIPS_AUTO_CONFIG` 확장 | `functions/src/tips/lib/tips-config.ts` |
| M2 | `src/lib/tips/schedule-gate.ts` (NEW) | `shouldTickNow(config, kstNow): boolean` — pure | `functions/src/tips/lib/schedule-gate.ts` (NEW) |
| M3 | `src/lib/tips/next-tick-time.ts` | 시그니처 변경: `calculateNextTickTime(config, now)` — config-driven (9·17·:30 magic 제거) | `functions/src/tips/lib/next-tick-time.ts` (NEW mirror — functions 측 신규) |
| M4 | `src/lib/tips/tips-history.ts` (existing) | `TipsTickStatus` literal에 `"skip-out-of-schedule"` 추가 | `functions/src/tips/lib/tips-history.ts` |

#### Next.js 단독

| # | 파일 | 변경 |
|---|------|------|
| N1 | `src/lib/tips/schedule-preview.ts` (NEW) | 향후 30일 발행 예정 일자 list (pure helper, gate 시뮬) |
| N2 | `src/lib/tips/tips-schedule-audit.ts` (NEW) | `tipsScheduleAudit` Firestore repo (Admin SDK) — `recordScheduleAudit`, `listScheduleAudit(limit)` |
| N3 | `src/app/actions/tips-config-actions.ts` (existing) | `updateTipsSchedule(input)` server action 추가 (zod + transaction + audit + revalidate) |
| N4 | `src/app/admin/tips/schedule/page.tsx` (NEW Server Component) | hour selector + DOW checkboxes + 30일 미리보기 + audit history |
| N5 | `src/app/admin/tips/schedule/_components/schedule-form.tsx` (NEW client) | form state + DOW checkbox 그룹 |
| N6 | `src/app/admin/tips/page.tsx` (existing) | schedule 요약 카드 + "편집하기" 링크 추가 |
| N7 | `src/lib/tips/tips-config-repository.ts` (existing) | `getTipsAutoConfig` 결과에 schedule 포함 + R12 fallback에 `DEFAULT_SCHEDULE` |

#### functions 단독

| # | 파일 | 변경 |
|---|------|------|
| F1 | `functions/src/tips/index.ts` | cron `"30 9-17 * * *"` → `"30 * * * *"` (1줄). 주석에 NEW-H6 cycle #32 갱신 |
| F2 | `functions/src/tips/runner.ts` | `shouldTickNow(config, kstNow)` 호출 추가 — false면 즉시 return + `recordTipTick({status:"skip-out-of-schedule"})` |

#### Firestore

| # | 변경 |
|---|------|
| D1 | `tipsAutoConfig` 문서 — `schedule: { hour: number, daysOfWeek: number[] }` 필드 추가 (set merge로 자동 생성, R12 fallback 보장) |
| D2 | `tipsScheduleAudit` collection (NEW) — `{at, kind:"schedule-update", before, after, by:"admin"}` |
| D3 | `firestore.rules` — `tipsScheduleAudit` `read/write: if false` (cycle #31 quoteTrendKeywords 패턴) |
| D4 | `firestore.indexes.json` — 변경 X (Firestore 자동 단일 필드 인덱스로 충분) |

#### 테스트

| # | 파일 | 변경 |
|---|------|------|
| T1 | `src/lib/tips/schedule-gate.test.ts` (NEW) | shouldTickNow 케이스 (hour 일치/불일치, dow 통과/미통과, R12 fallback, :30 invariant) |
| T2 | `src/lib/tips/next-tick-time.test.ts` (existing) | config-driven 시그니처로 갱신, 매일/평일/주말 케이스 |
| T3 | `src/lib/tips/schedule-preview.test.ts` (NEW) | 30일 미리보기 ✓/✗ 분포 |
| T4 | `package.json` `test:tips` | `schedule-gate.test.ts`, `schedule-preview.test.ts` 추가 |

#### CI / 빌드

| # | 변경 |
|---|------|
| L1 | `scripts/check-queue-mirror.mjs` — `tips-config.ts` zod schema mirror, `schedule-gate.ts` 함수 export, `next-tick-time.ts` 함수 export, `TipsTickStatus` 7 literal 모두 양 패키지 동일성 검증 (15→17 check) |

### 4.3 Data Flow (Phase 4 Step 3)

#### Flow ① 관리자 편집 (admin write path)

```
/admin/tips/schedule (Server Component)
  fetch: getTipsAutoConfig() + listScheduleAudit(limit:20)
       │
       ▼
schedule-form.tsx (client)
  hour: select 0-23 / daysOfWeek: 7-checkbox
       │ submit
       ▼
updateTipsSchedule(input)  [server action]
  ├─ zod 검증 (hour 0-23, daysOfWeek ⊂ {0..6})
  ├─ before = (await getTipsAutoConfig()).schedule
  ├─ runTransaction:
  │    ├─ tipsAutoConfig.schedule = after, updatedAt=serverTimestamp, updatedBy="admin"
  │    └─ tipsScheduleAudit/{nanoid()} = {at, kind:"schedule-update", before, after, by:"admin"}
  ├─ revalidatePath("/admin/tips")
  └─ revalidatePath("/admin/tips/schedule")
```

#### Flow ② Cron tick (functions read path)

```
[Cloud Scheduler] :30 매시 발화 (30 * * * * Asia/Seoul, 24/일)
       │
       ▼
tipsTick onSchedule
  ├─ adminConfig = getTipsAutoConfig()              ← 매 tick fetch
  ├─ kstNow = toKstWallClock(Date.now())
  ├─ if (!shouldTickNow(adminConfig, kstNow)):       ← NEW gate (S2/S4)
  │     recordTipTick({status:"skip-out-of-schedule"})
  │     return
  ├─ if (!adminConfig.enabled):                      ← cycle #31 (보존)
  │     recordTipTick({status:"skip-disabled"})
  │     return
  ├─ if (recentlyPublishedToday()):                  ← cycle #30 (보존)
  │     recordTipTick({status:"skip-already-today"})
  │     return
  ├─ topic = pickNextTopicFromPool(...)              ← cycle #31 dynamic-topic-pool (0줄 변경)
  ├─ result = await generateTip(topic) + hygieneCheck
  └─ post create + recordTipTick({status:"published-draft"})
```

#### Flow ③ Next-tick + 30일 미리보기 (server-rendered)

```
/admin/tips (existing Server Component)
  config = getTipsAutoConfig()
  next   = calculateNextTickTime(config, new Date())   ← config-driven (M3)
  → "다음 발행: 2026-05-05(월) 09:30 KST"

/admin/tips/schedule (NEW Server Component)
  config  = getTipsAutoConfig()
  preview = previewSchedule(config, new Date(), 30)    ← N1 pure helper
       ▼
  Array<{date, dow, hour, minutes:30, willPublish: bool}>
  → calendar UI (Server-rendered, 클라 JS 0줄)
```

### 4.4 핵심 의사코드

#### `shouldTickNow` (M2 — pure)

```typescript
export function shouldTickNow(
  config: TipsAutoConfig,
  kstNow: { hours: number; minutes: number; dayOfWeek: number },
): boolean {
  const sched = config.schedule ?? DEFAULT_SCHEDULE;       // R12 fallback
  if (!sched.daysOfWeek.includes(kstNow.dayOfWeek)) return false;
  if (kstNow.hours !== sched.hour) return false;
  if (kstNow.minutes !== 30) return false;                 // NEW-H6 :30 invariant
  return true;
}
```

#### `DEFAULT_SCHEDULE` (R12 fallback — config 누락 시 동작)

```typescript
export const DEFAULT_SCHEDULE: TipsScheduleConfig = {
  hour: 9,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],   // 매일 09:30 KST
};
```

#### Audit entry 구조

```typescript
interface TipsScheduleAuditEvent {
  id: string;
  at: Date;
  kind: "schedule-update";
  before: TipsScheduleConfig | null;     // 최초 변경 시 null
  after:  TipsScheduleConfig;
  by: "admin";
}
```

---

## §5. Scope Definition

### In Scope (V1)

- `tipsAutoConfig.schedule` Firestore 확장 (S1)
- `shouldTickNow` pure gate + runner 통합 (S2~S4)
- functions cron `30 * * * *` 1줄 변경 (S3)
- `next-tick-time.ts` config-driven (S5)
- `/admin/tips/schedule` 페이지 + 편집 form + DOW mask (S6~S7, N4~N5)
- `tipsScheduleAudit` collection + 최근 20건 표시 (S8, N2)
- 30일 발행 미리보기 server-rendered (S9, N1)
- `TipsTickStatus`에 `skip-out-of-schedule` 추가 (S14)
- `firestore.rules` `read/write: if false` (S15)
- `schedule-gate.test.ts` + `next-tick-time.test.ts` 갱신 + `schedule-preview.test.ts` (S16, T1~T4)
- `lint:mirror` 15→17 check (S17, L1)
- R12 fallback 매일 09:30 (cycle #31 OQ4 패턴 재사용)

### Out of Scope (Deferred)

- 한국 공휴일 자동 skip
- Manual trigger UI 라벨
- HH:MM 분 단위 자유
- 1일 다회 발행
- Schedule preset (아침/점심/저녁)
- Audit log TTL/retention (cycle #33+ 통합)
- Topic CRUD audit log (cycle #31 OQ5)

### Permanent Rejection

- 분 단위 cron (`*/N`) — NEW-H6 invariant 보존
- Cloud Scheduler runtime API — Approach B rejected
- end-user timezone 표시 — KST 고정 (cycle #31 OQ8)

---

## §6. Acceptance Criteria

| ID | 기준 |
|----|------|
| AC1 | admin이 `/admin/tips/schedule`에서 hour 0–23 + daysOfWeek mask 변경 후 저장하면 tipsAutoConfig 즉시 갱신 |
| AC2 | 변경 즉시 `/admin/tips`의 "다음 발행 예정" 표시가 새 schedule 기준으로 업데이트 |
| AC3 | 30일 미리보기에서 daysOfWeek 미포함 요일은 ✗, 포함 요일은 hour:30 KST로 ✓ 표시 |
| AC4 | functions runner가 schedule 미통과 tick에 `skip-out-of-schedule` 기록하고 즉시 return |
| AC5 | `tipsAutoConfig` 문서 누락 시 R12 fallback으로 매일 09:30 KST 발행 (cycle #30/#31 동작 동등) |
| AC6 | NEW-H6 :30 offset 보존 — `:00` minutes에 발화하지 않음 (gate가 minutes !== 30 거부) |
| AC7 | 모든 cycle #30·#31 hygiene/topic-pool 동작 0 regression — `topic-pool.ts`, `dynamic-topic-pool.ts`, `infer-categories.ts`, `tips-generator.ts`, `tips-history.ts` 0줄 변경 (단 M4 Status literal 추가는 예외) |
| AC8 | `pnpm lint:mirror` 통과 — `tips-config.ts`/`schedule-gate.ts`/`next-tick-time.ts`/`tips-history.ts` 양 패키지 동일 export |
| AC9 | `pnpm test:tips` 통과 — gate / next-tick / preview |
| AC10 | schedule 변경 시 `tipsScheduleAudit`에 entry 생성, `/admin/tips/schedule`에 최근 20건 표시 |
| AC11 | `firestore.rules` `tipsScheduleAudit` Admin SDK only — 클라 직접 read/write 거부 (rules emulator 검증) |

---

## §7. Test Strategy Outline

| ID | Test | 종류 |
|----|------|------|
| T1 | `shouldTickNow` — hour 일치/불일치/요일 통과/요일 미통과/:30 외 minutes/R12 fallback | unit (tsx) |
| T2 | `calculateNextTickTime` — 매일/평일/주말 schedule, 자정 경계, 하루 안 ahead/뒤 | unit (tsx) |
| T3 | `previewSchedule` — 30일 ✓/✗ 분포 + 월 경계 + DST 무영향(KST) | unit (tsx) |
| T4 | `updateTipsSchedule` server action — zod 거부 케이스 + transaction atomicity | integration (조건 따라 — 미정 design 단계) |
| T5 | runner gate — local emulator로 :00 발화 거부 + :30 통과 시나리오 | manual QA in design |

---

## §8. Implementation Outline (S 시퀀스 — Design 단계 확정)

- **S1**: `tips-config.ts` mirror — schedule 필드 + zod + DEFAULT_SCHEDULE 확장
- **S2**: `schedule-gate.ts` mirror (NEW) — `shouldTickNow` pure
- **S3**: `next-tick-time.ts` mirror — config-driven 시그니처 + functions 측 신규 mirror
- **S4**: `tips-history.ts` mirror — `TipsTickStatus` literal 7개로 확장
- **S5**: `tips-schedule-audit.ts` (Next.js) — Firestore repo
- **S6**: `tips-config-repository.ts` 확장 — schedule R12 fallback
- **S7**: `tips-config-actions.ts` — `updateTipsSchedule` server action
- **S8**: `schedule-preview.ts` (Next.js) — pure helper
- **S9**: `/admin/tips/schedule/page.tsx` + `_components/schedule-form.tsx`
- **S10**: `/admin/tips/page.tsx` 확장 — schedule 요약 카드
- **S11**: `functions/tips/runner.ts` — gate 통합
- **S12**: `functions/tips/index.ts` cron 1줄 변경
- **S13**: `firestore.rules` — `tipsScheduleAudit` 블록
- **S14**: `lint:mirror` script 15→17 check + `package.json` `test:tips` 갱신
- **S15**: `schedule-gate.test.ts` + `next-tick-time.test.ts` 갱신 + `schedule-preview.test.ts`
- **S16**: 통합 검증 (lint:mirror, test:tips, build, design-validator reality-check)

---

## §9. Risk Table

| Risk | Mitigation | Severity |
|------|------------|:---:|
| R12 fallback 누락 시 cron 무한 skip | `DEFAULT_SCHEDULE` 매일 09:30 — config 미존재 동작 동등 | L |
| daysOfWeek=[] 저장 시 영구 skip | UI에서 0개 선택 시 disable submit + zod min(1) | L |
| NEW-H6 :30 offset 위반 | gate `minutes !== 30 → false` 강제 + test T1 | L |
| autoSeriesTick :00과 동시 발화 | `30 * * * *` :30 → 동시 발화 X (변경 없음) | L |
| schedule 변경이 다음 tick에 반영 안 됨 | 매 tick fetch (cycle #31 OQ4 패턴) | L |
| 30일 미리보기와 실 발행 불일치 | gate 함수 1개를 미리보기·runner 모두 사용 — 진실 단일화 | L |
| audit log 무한 증가 | 표시 limit(20)로 UI 부담 차단. cycle #33+ TTL/cleanup 검토 | M |
| mirror lint 누락 | `lint:mirror` script CI 강제 + 17 check 추가 | L |
| cycle #30/#31 invariant 회귀 (R1, R12, R15) | M4 외 0줄 변경 + design-validator reality-check | L |

---

## §10. Open Questions (Design 단계에서 결의 예정)

| ID | Question | Tentative |
|----|----------|-----------|
| OQ1 | `daysOfWeek` 표현 — `Array<0\|1\|...\|6>` (Date.getDay 호환) vs literal "월"~"일"? | Number array — Date 호환 + zod min(1) |
| OQ2 | `daysOfWeek` 정렬 보장 — server에서 sort 후 저장? | YES — 표시 안정 + audit before/after 비교 정확성 |
| OQ3 | hour selector 단위 — 0–23 모두 vs 운영 시간대(예: 6–22)만? | 0–23 자유 (제약은 cron 무관) |
| OQ4 | 30일 미리보기 — Server-render vs static SSG? | Server-render — admin 페이지라 캐싱 불필요 |
| OQ5 | audit `before` 첫 변경 시 null vs `DEFAULT_SCHEDULE`? | null (실제 fallback과 명시 변경 구분) |
| OQ6 | revalidatePath scope — `/admin/tips/schedule`만 vs `/admin/tips` 둘 다? | 둘 다 (cycle #31 OQ7 패턴 — 다음 tick 표시 stale 방지) |
| OQ7 | gate 통과했지만 already-today일 때 status — `skip-already-today` vs 신규 status? | `skip-already-today` 그대로 (cycle #30 status 보존) |
| OQ8 | functions 측 `next-tick-time.ts` mirror 필요? | YES — predictability + mirror lint 통일성. runner는 직접 호출 X여도 mirror 유지 |
| OQ9 | DST/시간대 방어 — Asia/Seoul DST 미적용이지만 host TZ 무관 보장 명시? | YES — `toKstWallClock` 사용 (cycle #28 패턴) |
| OQ10 | `schedule-form.tsx` — Server Action `useActionState` vs 그대로 server action `.bind`? | `.bind(null, ...)` 패턴 (cycle #31 R8 결의 재사용) |

---

## §11. Brainstorming Log (Phase 1~4)

| Phase | 단계 | 결과 |
|-------|------|------|
| Q1 | 핵심 목적 | 스케줄 admin 편집 (타이밍) — 4지선다 중 선택 |
| Q2 | 편집 범위 | 시각(hour) + 요일 mask — HH:MM 자유 / 다회 발행 / 프리셋 거부 |
| Q3 | 메커니즘 | Approach A (wide cron + gate) — B(GCP API) / C(*/15) 거부 |
| Q4 (multi) | YAGNI | audit log + 30일 캘린더 미리보기 채택 / 공휴일 skip · manual 라벨 거부 |
| Phase 4 ① | 아키텍처 | wide cron `30 * * * *` + Firestore gate 승인 |
| Phase 4 ② | 컴포넌트 | M1~M4 mirror + N1~N7 + F1~F2 + D1~D4 + T1~T4 + L1 승인 |
| Phase 4 ③ | 데이터 흐름 | Flow ①②③ + `shouldTickNow` 의사코드 + `DEFAULT_SCHEDULE` 매일 09:30 승인 |

---

## §12. Streak Context

cycles #21~#31 모두 single-pass ≥ 90% Match Rate (11-streak). cycle #31 = 99.0% (largest scope ~2,010 LOC, 21 files).

cycle #32 = **12-streak 도전**:
- cycle #31보다 작은 scope 예상 (~1,200 LOC 추정 — Approach A 단순화 효과)
- mirror 파일 4개 (cycle #31 6개 → 감소)
- functions runner 변경은 1지점(gate insert) — risk 낮음
- cycle #30 (R1 generator) + cycle #31 (R15 topic-pool/dynamic-topic-pool) 0줄 변경 invariant 12번째 cycle 누적

R-invariant 보존 streak (12-streak 가정):
- R1 (cycle #19 generator 0줄) — 12번째 cycle
- R15 (cycle #19 generator 0줄 변경 streak) — 12번째 cycle
- NEW-H6 (cycle #30 :30 cron offset) — cron 문자열 변경하지만 :30 invariant는 영구 보존

---

## §13. Next Step

```
/pdca design tips-schedule-editor
```

Design 단계에서 OQ1~OQ10 결의 + S1~S16 implementation order 확정 + design-validator reality-check (functions/tips/runner.ts, src/lib/tips/next-tick-time.ts, src/lib/tips/tips-config.ts 실제 코드 reference 검증).
