# Design · partner-series-queue

> **Status**: v0.2 (design-validator 응답 반영 — Critical 5 + High 8 + Medium 7 + Low 4 모두 결의)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.14
> **Author**: Seokho Lee
> **Date**: 2026-04-28
> **PDCA Cycle**: #27
> **Plan Source**: `docs/01-plan/features/partner-series-queue.plan.md` (v1.0 Plan Plus)
> **Streak Target**: 🎯 7번째 single-pass 90s%

---

## 0. Plan vs Design Reconciliation (R1–R8)

| ID | Plan Invariant | Design 반영 |
|----|----------------|-------------|
| R1 | cycle #19 generator + cycle #26 functions/auto-series/lib/generator 모두 0줄 변경 (7번째) | §1.2 — 두 파일 수정 X |
| R2 | cycle #26 ROTATION_POOL fallback 보존 | §3.1 — `effectiveQueue(partner)` 안 fallback 처리 |
| R3 | atomic transaction (lastIndex) 그대로 | §3.2 — `db.runTransaction` 변경 X |
| R4 | window double-check + recentlyPublishedInWindow 그대로 | §3.2 — cycle #26 logic 무변경 |
| R5 | skip-and-continue 정책 그대로 | §3.2 — markWindowConsumed 패턴 유지 |
| R6 | server action 화이트리스트 | §4 — 4개 action 모두 zod 검증 + Admin SDK |
| R7 | partners write `if false` 유지 | §6.1 — firestore.rules 변경 0 |
| **R8 (신규)** | **lastIndex semantic = effectiveQueue index (Path X 채택, C4 결의)** | §3.0 — 모든 add/remove/toggle/reorder 알고리즘이 effectiveQueue 기반 |

---

## 1. File Inventory

### 1.1 신규 파일 (10)

| # | 경로 | 역할 |
|---|------|------|
| 1 | `src/types/auto-series.ts` (확장) | `QueueItem` interface 추가 + `PartnerAutoSeries.photoCursor` 추가 (C1 결의) |
| 2 | `src/lib/auto-series/effective-queue.ts` | `effectiveQueue(partner)` — queue 또는 fallback |
| 3 | `src/lib/auto-series/queue-preview.ts` | `nextNSlots(partner, n=5)` |
| 4 | `src/lib/auto-series/lastindex-correction.ts` (신규, R8 결의) | `correctLastIndexAfterRemove` + `correctLastIndexAfterReorder` 순수 함수 (단위 테스트 가능) |
| 5 | `src/components/partner/PartnerSeriesQueueEditor.tsx` (client) | 큐 카드 + 편집 |
| 6 | `src/components/partner/PartnerSeriesQueueAddDialog.tsx` (client) | 미사용 slot 표시 모달 |
| 7 | `src/components/partner/PartnerSeriesQueuePreview.tsx` (server) | 다음 5개 발행 시각·시나리오 |
| 8 | `functions/src/auto-series/lib/effective-queue.ts` (mirror) | functions 측 동일 로직 |
| 9 | `src/lib/auto-series/queue-helpers.ts` | `availableSlots(currentQueue)` — AddDialog용 |
| 10 | `scripts/check-queue-mirror.mjs` (또는 cycle #26 통합) — H6 결의 | CI lint — effectiveQueue body hash + QueueItem type shape 비교 |

### 1.2 수정 파일 (10) — H5 결의 반영

| 파일 | 변경 |
|------|------|
| `src/types/partner.ts` | `Partner.autoSeriesQueue?: QueueItem[]` 추가 |
| `src/types/auto-series.ts` | `PartnerAutoSeries.photoCursor: number` 추가 (default 0, C1 결의) |
| `src/lib/firebase/partner-repository.ts` | toPartner: autoSeriesQueue·photoCursor 매핑 + `updateAutoSeriesQueue`·`updateAutoSeriesQueueAndIndex` |
| `src/app/actions/partner-auto-series-actions.ts` | 4개 action 추가 + photoCursor는 server action에서 변경 X (server-only via runner) |
| `src/lib/auto-series/derive-inputs.ts` (cycle #26) | photo offset을 `lastIndex` 대신 `partner.autoSeries.photoCursor` 사용 — C1 결의 |
| `src/lib/partner/auto-publish-window.ts` | `nextNAutoPublishWindows(cfg, now, n)` 신규 export — C5 결의 |
| `functions/src/auto-series/runner.ts` | `partnerFromSnap` autoSeriesQueue·photoCursor 매핑 (C2 결의) + effectiveQueue 호출 + photoCursor 매 tick increment |
| `functions/src/auto-series/lib/types.ts` | `QueueItem` mirror + `PartnerAutoSeries.photoCursor` |
| `functions/src/auto-series/lib/derive-inputs.ts` (mirror) | photoCursor 사용으로 변경 (C1 mirror) |
| `src/app/partner/series/page.tsx` | QueueEditor + QueuePreview 섹션 추가 |

### 1.3 deprecated 마킹 (H5)

| 파일 | 처리 |
|------|------|
| `functions/src/auto-series/lib/rotation.ts` `pickSlot` | `@deprecated` JSDoc — runner는 effectiveQueue + modulo 직접 사용. 함수 자체는 보존(backward compat 0 risk) |

### 1.4 인프라 변경 (변경 0)
- `firestore.rules`·`firestore.indexes.json` 변경 없음 (R7)
- 의존성 추가 없음 (`nanoid`는 이미 cycle #26에서 root에 있음 — M4 확인 완료)

---

## 2. Data Model

### 2.1 `QueueItem` (`src/types/auto-series.ts`)

```ts
import type { AutoSeriesAngle } from "@/domain/auto-series-angle";
import type { PostFormat } from "@/domain/post-format";

export interface QueueItem {
  /** nanoid(8) — 큐 안 식별자 (안정적 reference, reorder 보정용) */
  id: string;
  angle: AutoSeriesAngle;
  format: PostFormat;
  /** false = 일시정지 (cron skip, 큐에는 남음) */
  enabled: boolean;
}
```

### 2.2 `PartnerAutoSeries` 확장 (C1 결의)

```ts
export interface PartnerAutoSeries {
  // ... 기존 필드 (enabled, lastIndex, lastTickAt, brandTone, totalPublished, totalFailed)

  /**
   * v1.14 cycle #27 (C1 결의): photo offset 전용 cursor.
   * lastIndex와 분리 — queue length 변경에 영향 받지 않고 매 tick +1.
   * undefined 또는 누락 시 0으로 fallback (cycle #26 호환).
   */
  photoCursor: number;
}

export const DEFAULT_AUTO_SERIES: PartnerAutoSeries = {
  // ... 기존 default
  photoCursor: 0,   // 신규
};
```

### 2.3 `Partner.autoSeriesQueue` (`src/types/partner.ts`)

```ts
export interface Partner {
  // ... 기존 필드
  autoSeriesQueue?: QueueItem[];   // 신규
}
```

### 2.4 R8 invariant — lastIndex semantic (신규)

**Path X 채택 (C4 결의)**: `partner.autoSeries.lastIndex`는 항상 **effectiveQueue 안에서의 인덱스**.

- `effectiveQueue(partner)` = enabled=true 항목만 (또는 비어있으면 ROTATION_POOL fallback)
- `lastIndex ∈ [-1, effectiveQueue.length - 1]`
- runner cron tick: `nextIndex = (((lastIndex + 1) % effective.length) + effective.length) % effective.length`
- add/remove/toggle/reorder 모두 새 effectiveQueue 안에서 의미 유지

이 invariant가 깨지면 modulo wrap이 자동 보정 (안전망), but 정확성은 lastindex-correction 함수가 보장.

### 2.5 H3 결의 — 빈 큐 fallback 시 lastIndex carryover

```
시나리오 1: queue → empty (모두 disabled 또는 [])
  effectiveQueue = ROTATION_POOL (length 10)
  lastIndex (이전 queue 안 인덱스) → ROTATION_POOL의 동일 숫자 인덱스로 사용
  수학적으로 modulo wrap. UX 영향: ROTATION_POOL 안 임의 위치부터 시작하는 효과
  허용 (사장님 직관과는 다르지만 코드 정합성 우선)

시나리오 2: queue → re-populated (사장님이 다시 추가)
  effectiveQueue = 사장님 큐
  lastIndex 그대로 사용 → modulo wrap으로 새 큐 안 위치 결정
  새 큐 첫 항목부터 시작 원하면 사장님이 admin reset 호출 또는 v2에서 자동 reset 옵션
```

**Design 명시**: 위 동작은 의도된 것이며, 큐 전환 시 자동 reset은 v2 OOS. UI에 "큐가 비어있어 시스템 기본 시나리오로 발행됩니다" 배너 (L2).

### 2.6 C3 결의 — seriesHistory.slotIndex semantic

cycle #26 `seriesHistory.slotIndex`는 그대로 두되 **"snapshot at write time"** 의미로 재정의:
- runner 시점의 effectiveQueue 안 인덱스를 기록 (이전엔 POOL 0–9 가정)
- UI(`PartnerSeriesHistoryList`)는 **slotIndex 미사용**, 항상 `angle`+`format` payload로 렌더 (이미 그렇게 구현됨, cycle #26 검증)
- slotIndex는 디버그·analytics용으로만 보존

이 결정으로 cycle #26 history payload 호환성 100% 유지.

---

## 3. Core Logic

### 3.0 R8 invariant — lastIndex Path X (C4 결의)

모든 알고리즘에서 `partner.autoSeries.lastIndex`는 **effectiveQueue 안 인덱스**.

```
effectiveQueue 정의:
  if (autoSeriesQueue가 있고 enabled 항목 1개 이상):
    return autoSeriesQueue.filter(q => q.enabled).map(q => ({angle, format}))
  else:
    return ROTATION_POOL  // R2 fallback

lastIndex 갱신:
  - cron tick: (lastIndex+1) % effective.length
  - add/toggle: 신규 enabled 항목 추가 → lastIndex 그대로 유효 (append + modulo wrap)
  - remove: 활성 항목 ID로 새 effectiveQueue 안 위치 찾기
  - reorder: 활성 항목 ID로 새 effectiveQueue 안 위치 찾기
```

### 3.1 `effectiveQueue(partner)` (R2)

```ts
// src/lib/auto-series/effective-queue.ts
import type { Partner } from "@/types/partner";
import { AUTO_SERIES_ROTATION_POOL, type RotationSlot } from "@/domain/auto-series-rotation-pool";

export function effectiveQueue(partner: Partner): RotationSlot[] {
  const queue = partner.autoSeriesQueue;
  if (!queue || queue.length === 0) return AUTO_SERIES_ROTATION_POOL;
  const active = queue
    .filter((q) => q.enabled)
    .map((q) => ({ angle: q.angle, format: q.format }));
  if (active.length === 0) return AUTO_SERIES_ROTATION_POOL;
  return active;
}
```

functions 측 mirror (`functions/src/auto-series/lib/effective-queue.ts`)도 동일. CI lint(`check-queue-mirror.mjs`)로 동기화 보장.

### 3.2 runner.ts 변경 (C2 + R8 반영)

```ts
// functions/src/auto-series/runner.ts (변경 부분만)

import { effectiveQueue } from "./lib/effective-queue";

// C2 결의: partnerFromSnap에 autoSeriesQueue + photoCursor 매핑
function partnerFromSnap(id: string, d: FirebaseFirestore.DocumentData): Partner {
  const autoSeries = d.autoSeries
    ? {
        // ... 기존 매핑
        photoCursor:
          typeof d.autoSeries.photoCursor === "number"
            ? d.autoSeries.photoCursor
            : 0,   // C1 결의 default
      }
    : undefined;

  // QueueItem shape validation
  const queueRaw = d.autoSeriesQueue;
  const autoSeriesQueue = Array.isArray(queueRaw)
    ? queueRaw.filter(
        (q): q is QueueItem =>
          q !== null &&
          typeof q === "object" &&
          typeof q.id === "string" &&
          typeof q.enabled === "boolean" &&
          isAutoSeriesAngle(q.angle) &&
          isPostFormat(q.format),
      )
    : undefined;

  return {
    id,
    // ... 기존 필드
    autoSeries,
    autoSeriesQueue,    // 신규
    // ...
  };
}

async function processOnePartner(db, partner, now) {
  // 기존 window check + recentlyPublishedInWindow 그대로 ...

  const effective = effectiveQueue(partner);   // R2

  const slotResult = await db.runTransaction(async (tx) => {
    const ref = db.collection("partners").doc(partner.id);
    const fresh = await tx.get(ref);
    const lastIndex =
      typeof fresh.data()?.autoSeries?.lastIndex === "number"
        ? (fresh.data()!.autoSeries.lastIndex as number)
        : -1;

    // R8 lastIndex Path X: effective.length로 modulo
    const len = effective.length;
    const nextIndex = (((lastIndex + 1) % len) + len) % len;

    // C1 photoCursor — lastIndex와 별도 매 tick +1
    const photoCursor =
      typeof fresh.data()?.autoSeries?.photoCursor === "number"
        ? (fresh.data()!.autoSeries.photoCursor as number)
        : 0;
    const nextPhotoCursor = photoCursor + 1;

    tx.update(ref, {
      "autoSeries.lastIndex": nextIndex,
      "autoSeries.photoCursor": nextPhotoCursor,
    });
    return { nextIndex, slot: effective[nextIndex], photoCursor: nextPhotoCursor };
  });

  // ... derive·generate·post (cycle #26 그대로)
}
```

### 3.3 derive-inputs.ts 변경 (C1)

```ts
// src/lib/auto-series/derive-inputs.ts (변경 부분)

export function deriveAutoInputs(partner: Partner, angle: AutoSeriesAngle): DeriveResult {
  const photos = partner.profile?.photoUrls ?? [];
  if (photos.length === 0) return { error: "photo-missing" };

  // C1: photoCursor 기반 라운드 로빈 (lastIndex와 분리)
  const cursor = partner.autoSeries?.photoCursor ?? 0;
  const offset = ((cursor % photos.length) + photos.length) % photos.length;
  const photoUrls = [
    photos[offset],
    photos[(offset + 1) % photos.length],
  ].slice(0, Math.min(2, photos.length));

  // ... 키워드 derivation 그대로
}
```

functions 측 mirror도 동일 로직. CI lint로 보장.

### 3.4 lastIndex 보정 함수 (`src/lib/auto-series/lastindex-correction.ts`)

C4 + H1 + R8 결의 — 모두 effectiveQueue 기반.

```ts
import type { QueueItem } from "@/types/auto-series";

export interface CorrectionInput {
  prevQueue: QueueItem[];
  nextQueue: QueueItem[];
  prevLastIndex: number;
}

/**
 * remove/reorder/toggle 후 effectiveQueue 안 active item 위치를 보존하도록 lastIndex 보정.
 * R8 invariant: lastIndex는 effectiveQueue 인덱스.
 *
 * 알고리즘:
 *   1. prevEffective[prevLastIndex]의 id 추출 (active item ID)
 *   2. nextEffective에서 그 id의 위치 찾기
 *   3. 못 찾으면 -1 (다음 tick에 newEffective[0]부터 시작)
 */
export function correctLastIndex(input: CorrectionInput): number {
  const { prevQueue, nextQueue, prevLastIndex } = input;
  const prevEffective = prevQueue.filter((q) => q.enabled);
  const nextEffective = nextQueue.filter((q) => q.enabled);

  if (prevLastIndex < 0 || prevLastIndex >= prevEffective.length) {
    return -1; // invalid prev → reset
  }
  const activeId = prevEffective[prevLastIndex]?.id;
  if (!activeId) return -1;

  const newPos = nextEffective.findIndex((q) => q.id === activeId);
  return newPos >= 0 ? newPos : -1;
}
```

이 함수는 **순수 함수** — 단위 테스트로 모든 edge case 검증 (Test Plan §9.5).

### 3.5 `nextNAutoPublishWindows` (C5 결의 — 신규 helper)

```ts
// src/lib/partner/auto-publish-window.ts (신규 export)

export function nextNAutoPublishWindows(
  cfg: AutoPublishConfig,
  now: Date,
  n: number,
): Array<{ startsAt: Date; endsAt: Date }> {
  if (!cfg.enabled || cfg.weekdays.length === 0) return [];

  const result: Array<{ startsAt: Date; endsAt: Date }> = [];
  let cursor = now;
  for (let i = 0; i < n; i++) {
    const w = nextAutoPublishWindow(cfg, cursor);
    if (!w.startsAt || !w.endsAt) break;
    result.push({ startsAt: w.startsAt, endsAt: w.endsAt });
    // 다음 윈도우 계산을 위해 cursor를 endsAt + 1분으로 이동
    cursor = new Date(w.endsAt.getTime() + 60 * 1000);
  }
  return result;
}
```

### 3.6 `nextNSlots(partner, n)` — 미리보기

```ts
// src/lib/auto-series/queue-preview.ts
import { effectiveQueue } from "./effective-queue";
import { nextNAutoPublishWindows } from "@/lib/partner/auto-publish-window";

export function nextNSlots(
  partner: Partner,
  n = 5,
  now: Date = new Date(),
): Array<{ slot: RotationSlot; estimatedAt: Date }> {
  const effective = effectiveQueue(partner);
  if (effective.length === 0) return [];

  const lastIndex = partner.autoSeries?.lastIndex ?? -1;
  const windows = nextNAutoPublishWindows(partner.autoPublish, now, n);

  return windows.map((w, i) => {
    const idx = (((lastIndex + i + 1) % effective.length) + effective.length) % effective.length;
    return { slot: effective[idx], estimatedAt: w.startsAt };
  });
}
```

### 3.7 `availableSlots` (M5 결의 명시)

```ts
// src/lib/auto-series/queue-helpers.ts
import { AUTO_SERIES_ANGLES } from "@/domain/auto-series-angle";
import { POST_FORMATS } from "@/domain/post-format";

/** AddDialog: 큐에 없는 (angle × format) 조합. 순서: angle outer × format inner. */
export function availableSlots(
  currentQueue: QueueItem[],
): Array<{ angle: AutoSeriesAngle; format: PostFormat }> {
  const used = new Set(currentQueue.map((q) => `${q.angle}:${q.format}`));
  const result = [];
  for (const angle of AUTO_SERIES_ANGLES) {
    for (const format of POST_FORMATS) {
      if (!used.has(`${angle}:${format}`)) {
        result.push({ angle, format });
      }
    }
  }
  return result;
}
```

---

## 4. Server Actions

### 4.1 4개 신규 actions (M7 결의 — drift-proof zod)

```ts
// src/app/actions/partner-auto-series-actions.ts (확장)

import { AUTO_SERIES_ANGLES } from "@/domain/auto-series-angle";
import { POST_FORMATS } from "@/domain/post-format";
import { correctLastIndex } from "@/lib/auto-series/lastindex-correction";

const queueItemSchema = z.object({
  angle: z.enum([...AUTO_SERIES_ANGLES] as [string, ...string[]]),
  format: z.enum([...POST_FORMATS] as [string, ...string[]]),
});

export async function addQueueItem(
  input: z.infer<typeof queueItemSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = queueItemSchema.parse(input);

    const currentQueue = partner.autoSeriesQueue ?? [];
    const dup = currentQueue.some(
      (q) => q.angle === parsed.angle && q.format === parsed.format,
    );
    if (dup) return { ok: false, message: "이미 큐에 있는 시나리오입니다." };

    const newItem: QueueItem = {
      id: nanoid(8),
      angle: parsed.angle,
      format: parsed.format,
      enabled: true,
    };
    const next = [...currentQueue, newItem];

    // R8 + H2: 신규 enabled 항목 append → lastIndex 그대로 유효 (effectiveQueue 끝에 추가)
    await partnerRepository.updateAutoSeriesQueue(partner.id, next);

    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function removeQueueItem(itemId: string): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const prevQueue = partner.autoSeriesQueue ?? [];
    if (!prevQueue.find((q) => q.id === itemId)) {
      return { ok: false, message: "항목을 찾을 수 없습니다." };
    }

    const nextQueue = prevQueue.filter((q) => q.id !== itemId);
    const newLastIndex = correctLastIndex({
      prevQueue,
      nextQueue,
      prevLastIndex: partner.autoSeries?.lastIndex ?? -1,
    });

    // H7 결의 — atomic transaction으로 cron race 방지
    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      nextQueue,
      newLastIndex,
    );

    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function toggleQueueItem(
  itemId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const prevQueue = partner.autoSeriesQueue ?? [];
    const nextQueue = prevQueue.map((q) =>
      q.id === itemId ? { ...q, enabled } : q,
    );
    const newLastIndex = correctLastIndex({
      prevQueue,
      nextQueue,
      prevLastIndex: partner.autoSeries?.lastIndex ?? -1,
    });

    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      nextQueue,
      newLastIndex,
    );
    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function reorderQueue(
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const prevQueue = partner.autoSeriesQueue ?? [];
    if (orderedIds.length !== prevQueue.length) {
      return { ok: false, message: "순서 데이터 무결성 오류" };
    }

    const idMap = new Map(prevQueue.map((q) => [q.id, q]));
    const nextQueue = orderedIds.map((id) => idMap.get(id)).filter((q): q is QueueItem => q !== undefined);
    if (nextQueue.length !== prevQueue.length) {
      return { ok: false, message: "순서 데이터 매핑 오류" };
    }

    const newLastIndex = correctLastIndex({
      prevQueue,
      nextQueue,
      prevLastIndex: partner.autoSeries?.lastIndex ?? -1,
    });

    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      nextQueue,
      newLastIndex,
    );
    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
```

### 4.2 partnerRepository (H7 atomic 결의)

```ts
async updateAutoSeriesQueue(id: string, queue: QueueItem[]): Promise<void> {
  await col().doc(id).update({
    autoSeriesQueue: queue,
    updatedAt: FieldValue.serverTimestamp(),
  });
},

/** H7: atomic transaction — cron tick과 사장님 편집 race 방지 */
async updateAutoSeriesQueueAndIndexAtomic(
  id: string,
  queue: QueueItem[],
  lastIndex: number,
): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const ref = col().doc(id);
    // 단순 read-then-write (현재 값 무시) — last-write-wins이지만 cron의 lastIndex update와 atomic 보장
    tx.update(ref, {
      autoSeriesQueue: queue,
      "autoSeries.lastIndex": lastIndex,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
},
```

### 4.3 H8 확인 — `requirePartnerApi`

코드베이스 reality check 완료: `src/lib/auth/require-partner.ts:88` `export async function requirePartnerApi()` 존재. cycle #26 actions에서 import 정상.

---

## 5. UI Components

### 5.1 `PartnerSeriesQueueEditor.tsx` (client) — L2 결의

```
┌────────────────────────────────────────────────────────┐
│ 발행 큐 관리                          [+ 시나리오 추가] │
│ ⚠️ (L2 결의) 큐가 비어있어 시스템 기본 시나리오로 발행 │  ← 큐 비어있을 때 banner
│    됩니다 ← banner (effective=ROTATION_POOL일 때만)    │
├────────────────────────────────────────────────────────┤
│ ⋮⋮ ① ✨ 강점·차별점 · 📝 블로그글     [⏸][🗑️] [▲][▼]   │
│ ⋮⋮ ② 🍽️ 메뉴·가격 · 🖼️ 카드뉴스       [⏸][🗑️] [▲][▼]   │
│ ⋮⋮ ③ 💬 고객 후기 · 📝 블로그글       [▶][🗑️] [▲][▼]    │  ← 일시정지 (회색)
│ ⋮⋮ ④ 🎉 이벤트 · 🖼️ 카드뉴스          [⏸][🗑️] [▲][▼]   │
└────────────────────────────────────────────────────────┘

drag-and-drop:
  - 데스크탑: HTML5 native draggable
  - 모바일 iOS Safari: ▲▼ 버튼 fallback (M2 결의)
  - 모바일 UX: drag handle 시각적 약하게 표시
```

### 5.2 `PartnerSeriesQueueAddDialog.tsx` (M1 결의 — 빈 상태 처리)

```
┌────────────────────────────────────┐
│ + 시나리오 추가          [×]        │
├────────────────────────────────────┤
│ {availableSlots.length === 0 ?      │
│  "모든 시나리오가 이미 큐에 있어요. │
│   일부를 삭제하거나 일시정지하면    │
│   다시 추가할 수 있어요."          │
│  : 8개 옵션 카드}                   │
└────────────────────────────────────┘
```

### 5.3 `PartnerSeriesQueuePreview.tsx` (server)

```
📅 다음 5개 발행 예정
┌────────────────────────────────────────┐
│ ① 04-29 09:00  ✨ 강점 · 📝 블로그       │
│ ② 04-29 18:00  🍽️ 메뉴 · 🖼️ 카드뉴스    │
│ ③ 04-30 09:00  🎉 이벤트 · 📝 블로그     │
│ ④ 04-30 18:00  📖 이야기 · 🖼️ 카드뉴스  │
│ ⑤ 05-02 09:00  ✨ 강점 · 📝 블로그       │
└────────────────────────────────────────┘
```

`nextNSlots(partner, 5)` 결과. windows 부족 시 적게 표시.

### 5.4 `/partner/series/page.tsx` 통합

기존 흐름:
1. PartnerAutoSeriesPanel (GO/STOP, brandTone)
2. AutoPublishSettings (요일·시간)
3. 다음 발행 예정 (1개)
4. 누적 통계
5. 최근 발행 이력

신규:
- 2.5 **PartnerSeriesQueueEditor** ← 추가
- 3.5 **PartnerSeriesQueuePreview** (다음 5개) ← 추가

---

## 6. Storage·Firestore Rules

### 6.1 firestore.rules (변경 0)
- partners write `if false` 유지 (R7) — server action만 write
- 클라이언트 직접 큐 수정 차단

### 6.2 firestore.indexes.json (변경 0)

---

## 7. Open Questions (전부 결의됨)

| OQ | 답 |
|----|---|
| OQ1 | last-write-wins 인정 — H7 결의로 atomic transaction 추가하여 race 최소화 |
| OQ2 | iOS Safari HTML5 drag 미지원 — ▲▼ 버튼이 mobile primary, drag는 desktop pointer-only enhancement (M2 결의) |
| OQ3 | lastindex-correction.ts 순수 함수 + 단위 테스트 (Test Plan §9.5) |
| OQ4 | 사장님 자유의지 — 1개 시나리오 반복도 정상 |
| OQ5 | UI banner — L2 결의, QueueEditor 상단 |
| OQ6 | nextNAutoPublishWindows + toKST 사용 — C5 결의. KR no DST이지만 helper에 toKST 명시 |
| OQ7 | UI 가이드만, 코드 enforce X |
| OQ8 | enabled=false 항목 영구 삭제 가능 — 사용자 결정 |
| OQ9 | revalidatePath 4개 action 모두 호출 — H4 결의 |
| OQ10 | 마이그레이션 시드 OOS — 기존 partner는 fallback 자동 동작 |

---

## 8. Implementation Order

| Step | 작업 | 산출물 | 의존성 | LOC |
|------|------|--------|--------|-----|
| S1 | QueueItem + Partner.autoSeriesQueue + PartnerAutoSeries.photoCursor | types/* | — | 60 |
| S2 | partnerRepository: toPartner + 2개 update 메서드 (atomic 포함) | partner-repository.ts | S1 | 180 |
| S3 | effectiveQueue + queue-preview + queue-helpers + lastindex-correction (4 helpers) | lib/auto-series/* | S1 | 250 |
| S4 | nextNAutoPublishWindows (auto-publish-window.ts 확장) + 단위 테스트 | lib/partner/* | — | 80 |
| S5 | derive-inputs.ts photoCursor 사용 (Next.js + functions mirror) | derive-inputs.ts × 2 | S1 | 30 |
| S6 | server actions 4개 (add/remove/toggle/reorder) | actions/partner-auto-series-actions.ts | S2·S3 | 250 |
| S7 | functions runner.ts: partnerFromSnap + effectiveQueue + photoCursor + lib mirror | functions/auto-series/* | S3·S5 | 100 |
| S8 | PartnerSeriesQueueEditor (client, drag + ▲▼) | components/partner/* | S6 | 380 |
| S9 | PartnerSeriesQueueAddDialog (client, empty state) | components/partner/* | S6·S8 | 160 |
| S10 | PartnerSeriesQueuePreview (server) | components/partner/* | S3·S4 | 120 |
| S11 | /partner/series page 통합 | app/partner/series/page.tsx | S8·S9·S10 | 50 |
| S12 | scripts/check-queue-mirror.mjs (cycle #26 통합 또는 신규) | scripts/* | S3·S7 | 80 |
| S13 | 단위 테스트 — lastindex-correction (6 cases) + nextNAutoPublishWindows (4 cases) | __tests__/* | S3·S4 | 200 |

**총 예상: ~1,940 LOC** (Plan §7 1,380 → +560 LOC, design-validator 결의 반영분: photoCursor + lastindex-correction + atomic transaction + 단위 테스트)

---

## 9. Acceptance Criteria

| AC | 기준 |
|----|------|
| AC1 | 큐 항목 추가 → autoSeriesQueue 갱신 + 다음 cron tick 사용 |
| AC2 | 일시정지 토글 → enabled=false, cron skip |
| AC3 | 영구 삭제 → array filter + lastIndex 보정 정확 (correctLastIndex) |
| AC4 | reorderQueue → ID 매핑, lastIndex 보정 정확 |
| AC5 | 빈 큐 시 ROTATION_POOL fallback (R2) |
| AC6 | autoSeriesQueue=undefined인 cycle #26 partner 변경 없이 동작 |
| AC7 | AddDialog가 미사용 slot만 표시 (10 - 현재 큐 길이) |
| AC8 | 같은 angle×format 중복 추가 server-side 거부 |
| AC9 | reorderQueue orderedIds 길이 불일치 거부 |
| AC10 | nextNSlots(5) 시각·시나리오 정확 (단위 테스트) |
| AC11 | drag-and-drop 데스크탑, ▲▼ 모바일 모두 동작 |
| AC12 | functions runner partnerFromSnap이 autoSeriesQueue 매핑 (C2) |
| AC13 | photoCursor가 lastIndex와 분리되어 매 tick +1 (C1) |
| AC14 | derive-inputs photo offset이 photoCursor 사용 |
| AC15 | seriesHistory.slotIndex는 snapshot semantics, UI는 angle/format 사용 (C3) |
| AC16 | nextNAutoPublishWindows N개 정확, KST 윈도우 (C5) |
| AC17 | correctLastIndex 단위 테스트 6 cases (Path X) |
| AC18 | empty queue UI banner 표시 (L2) |
| AC19 | AddDialog 빈 상태 메시지 (M1) |
| AC20 | partners write `if false` 유지 (R7) |
| AC21 | cycle #19/#26 generator 0줄 변경 (R1 7th) |
| AC22 | functions ↔ src effectiveQueue + QueueItem shape 일치 (CI lint) |
| AC23 | atomic transaction으로 cron-edit race 방지 (H7) |

---

## 9.5 Test Plan (L4 결의)

| Layer | 대상 | 케이스 |
|---|---|---|
| Unit (Vitest) | `correctLastIndex` | (1) prev=valid, item kept → 같은 위치, (2) prev=valid, item removed → 다음 활성, (3) prev=valid, item disabled → 같은 위치 효과 큐 mapping, (4) prevLastIndex=-1 → -1, (5) prev=invalid (>= length) → -1, (6) prev=last item, removed → -1 |
| Unit (Vitest) | `effectiveQueue` | (1) undefined → POOL, (2) [] → POOL, (3) all disabled → POOL, (4) mixed → enabled only |
| Unit (Vitest) | `availableSlots` | (1) empty queue → 10, (2) 5 in queue → 5 remaining, (3) 10 in queue → 0 |
| Unit (Vitest) | `nextNAutoPublishWindows` | (1) n=5 with weekdays=[2,4] → 5 windows, (2) cfg.enabled=false → [], (3) DST 처리 (KR no DST 명시), (4) cursor가 endsAt+1분 정확 이동 |
| Mirror lint | `check-queue-mirror.mjs` | effectiveQueue body hash + QueueItem type shape 비교 |
| Manual | UI smoke | /partner/series → 4개 action 시연 + fallback banner |

---

## 10. Migration & Rollback

### 10.1 Migration
- DB schema migration 불필요 — `Partner.autoSeriesQueue?` + `photoCursor` 모두 optional
- 기존 partner: photoCursor undefined → 0으로 fallback (C1)
- runner cold-start: queue 없으면 ROTATION_POOL fallback

### 10.2 Rollback
- 코드 revert만으로 완전 롤백
- runner의 effectiveQueue 호출 → ROTATION_POOL 직접 사용으로 복원
- partner.autoSeriesQueue + photoCursor 데이터는 Firestore에 그대로 (optional 필드, 무해)

### 10.3 Feature Flag
- 별도 플래그 없음
- 글로벌 OFF 필요 시 effectiveQueue 함수가 ROTATION_POOL 강제 반환 (1줄 변경)

---

## 11. Cross-Cycle Impact

| Cycle | 영향 | 검증 |
|---|---|---|
| #19 partner-promo | generator 0줄 변경 (R1 7th) | git diff |
| #26 partner-auto-series | runner.ts ~50 LOC 변경 (partnerFromSnap + effectiveQueue + photoCursor). ROTATION_POOL fallback 보존 (R2) | runner 단위 테스트 |
| #25 partner-content-formats | format(blog/card-news) 그대로 큐 항목에 사용 | 영향 없음 |
| #24 partner-rag-system | partner.profile derive 그대로 | 영향 없음 |
| #28 (예정) | 본 사이클 큐 모델을 admin이 read+reset 권한으로 확장 | 후속 사이클 의존 |

---

## 12. design-validator 결의 매트릭스 (24/24)

| ID | 결의 |
|---|---|
| 🔴 C1 photo offset collapse | photoCursor 신규 필드 분리 (§2.2) |
| 🔴 C2 partnerFromSnap 누락 | functions runner.ts 매핑 추가 (§3.2) |
| 🔴 C3 seriesHistory.slotIndex semantic | "snapshot at write time" 재정의, UI는 angle/format 사용 (§2.6) |
| 🔴 C4 lastIndex semantic 모호 | Path X 채택 — effectiveQueue index (R8 신규 invariant) |
| 🔴 C5 nextNSlots placeholder | nextNAutoPublishWindows 신규 helper (§3.5) |
| 🟠 H1 AD5 vs §4.1 충돌 | correctLastIndex 순수 함수로 통합 (§3.4) |
| 🟠 H2 addQueueItem invariant | enabled=true append → lastIndex 그대로 유효 명시 (§4.1) |
| 🟠 H3 빈 큐 fallback carryover | 명시적 정의 (§2.5) |
| 🟠 H4 revalidatePath 충분성 | 4개 action 모두 호출 (§4.1) |
| 🟠 H5 functions mirror 누락 enumerate | §1.2·1.3 추가 (rotation.ts deprecated) |
| 🟠 H6 mirror lint 구체화 | effectiveQueue body hash + QueueItem shape (§1.1 #10) |
| 🟠 H7 동시성 race | atomic transaction (§4.2) |
| 🟠 H8 requirePartnerApi 확인 | 코드베이스 reality 확인 완료 (§4.3) |
| 🟡 M1 AddDialog 빈 상태 | 빈 메시지 (§5.2) |
| 🟡 M2 iOS Safari drag | ▲▼ buttons primary, drag desktop only (§5.1) |
| 🟡 M3 lastIndex >= length 경계 | modulo wrap + 단위 테스트 (§9.5) |
| 🟡 M4 nanoid 의존성 | root 이미 있음 확인 |
| 🟡 M5 availableSlots 순서 | angle outer × format inner 명시 (§3.7) |
| 🟡 M6 cycle #28 admin reset | resetSeriesIndex 호환 명시 (§11) |
| 🟡 M7 zod drift-proof | `z.enum([...AUTO_SERIES_ANGLES])` 사용 (§4.1) |
| 🔵 L1 SC→AC 매핑 | §0 reconciliation 표 보강 |
| 🔵 L2 빈 큐 banner 위치 | QueueEditor 상단 (§5.1) |
| 🔵 L3 한국어 용어 일관성 | "큐", "발행 시리즈" 통일 |
| 🔵 L4 Test Plan 누락 | §9.5 신규 추가 |

전 24 발굴 모두 결의 완료.

---

## 13. Next Steps

1. v0.2 사용자 승인
2. **`/pdca do partner-series-queue`** → S1~S13 순차 구현
3. **`/pdca analyze`** → gap-detector 검증
4. ≥ 90% 즉시 **`/pdca report`** → 🎯 7사이클 연속 single-pass 마일스톤
