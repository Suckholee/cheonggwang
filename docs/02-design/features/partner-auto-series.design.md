# Design · partner-auto-series

> **Status**: v0.2 (design-validator 응답 반영 — Critical 6 + High 8 + Medium 7 + Low 5 모두 결의 — Option A 코드 복제 전략 채택)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.13
> **Author**: Seokho Lee
> **Date**: 2026-04-27
> **PDCA Cycle**: #26
> **Plan Source**: `docs/01-plan/features/partner-auto-series.plan.md` (v1.0 Plan Plus)
> **Streak Target**: 6번째 single-pass 90s%

---

## 0. Plan vs Design Reconciliation (R1–R7)

| ID | Plan Invariant | Design 반영 |
|----|----------------|-------------|
| R1 | cycle #19 `generatePartnerPromoDraft` 시그니처 변경 0건 (6번째 검증) | §3.1 — **Option A 채택**: cycle #19 generator 코드를 `functions/src/auto-series/lib/`에 복제. `src/lib/llm/partner-promo-generator.ts`는 100% 무수정 (시그니처·내부 모두). 향후 동기화는 CI lint check (M1 후속)로 보장 |
| R2 | lastIndex atomic update | §4.1 — `db.runTransaction()` read→pickSlot→write 단일 단계. 동시 cron tick 충돌 방지 |
| R3 | window double-check (autoPublish + autoSeries) | §4.1 — runner 진입 시 `partner.autoSeries.enabled === true` AND `isInAutoPublishWindow(partner.autoPublish)` 둘 다 통과해야 진행 |
| R4 | 같은 윈도우 안 중복 발행 방지 | §4.1 — `recentlyPublishedInWindow(partner, now)` — `lastTickAt >= currentWindowStart` 체크 |
| R5 | hygiene-fail은 skip — lastIndex 진행, transient error는 lastTickAt 보존 | §4.2 — try/catch 분기. hygiene-fail/photo-missing → lastTickAt 갱신(이번 윈도우 소비). transient error(LLM_FAILURE 등) → lastTickAt 갱신 안 함(다음 hourly tick 재시도 가능) |
| R6 | seriesHistory append-only | §8.1 — firestore.rules `partners/{id}/seriesHistory` `allow create: if isAdmin(); allow update, delete: if false`. Cloud Functions Admin SDK는 rules bypass — 클라이언트 직접 write 차단 목적 |
| R7 | partner self-write 정책 | §5.1·§8.1 — **결의: 모든 partner write는 server action 경유.** firestore.rules `partners write: if false` 유지(cycle #19 그대로). server action 내에서 zod 화이트리스트로 enabled/brandTone만 허용 + 나머지 server-only |

---

## 1. File Inventory

### 1.1 신규 파일 (18 — 16 + 2 추가)

| # | 경로 | 역할 |
|---|------|------|
| 1 | `src/domain/auto-series-angle.ts` | `AutoSeriesAngle` type + label/emoji + ANGLE_KEYWORD_STRATEGY |
| 2 | `src/domain/auto-series-rotation-pool.ts` | AUTO_SERIES_ROTATION_POOL 10 slot + `pickSlot(index)` |
| 3 | `src/types/auto-series.ts` | `PartnerAutoSeries` + `SeriesHistoryEvent` + `DEFAULT_AUTO_SERIES` |
| 4 | `src/lib/auto-series/derive-inputs.ts` | `deriveAutoInputs(partner, angle)` (Next.js 측 — admin/series UI에서도 사용) |
| 5 | `src/lib/firebase/auto-series-repository.ts` | seriesHistory list + lastIndex transaction (Next.js 측, server actions에서 사용) |
| 6 | `src/lib/partner/auto-publish-window.ts` 의 **신규 export** `currentWindowStart()` + `recentlyPublishedInWindow()` (H3 결의 — 기존 파일 확장) | KST 정확 처리, `toKST` helper 재사용 |
| 7 | `src/app/actions/partner-auto-series-actions.ts` | `togglePartnerAutoSeries` + `resetSeriesIndex` (admin) |
| 8 | `src/app/partner/series/page.tsx` | 사장님 진행 현황 페이지 (server) |
| 9 | `src/components/partner/PartnerAutoSeriesPanel.tsx` | GO/STOP 토글 + 다음 발행 미리보기 (client) |
| 10 | `src/components/partner/PartnerSeriesHistoryList.tsx` | 최근 발행 이력 20건 (server) |
| 11 | `src/app/admin/auto-series/page.tsx` | admin 모니터링 페이지 |
| 12 | `src/components/admin/AutoSeriesDashboard.tsx` | partner별 상태 + 24h 통계 |
| 13 | `functions/src/auto-series/index.ts` | Scheduled Function entry — `autoSeriesTick` |
| 14 | `functions/src/auto-series/runner.ts` | 단일 partner 처리 로직 |
| 15 | `functions/src/auto-series/lib/generator.ts` | **(C1·C2 결의 — Option A)** cycle #19 `partner-promo-generator.ts` 핵심 복제. `import "server-only"` 제거. functions 런타임 호환 |
| 16 | `functions/src/auto-series/lib/derive-inputs.ts` | functions 측 복제본 (C1·C2). Next.js 측 #4와 동일 로직 |
| 17 | `functions/src/auto-series/lib/post-writer.ts` | **(C3·C4 결의)** `uniqueSlug` + `inferCategoriesAuto` + `createPostFromDraft` (Timestamp.fromDate / publishedAt 자동 / categories enrichment 모두 명시 처리) |
| 18 | `scripts/seed-auto-series-defaults.mjs` | 강남 코워킹 시연 시드 (L5 결의 — 시드 디테일 §10 참조) |

### 1.2 수정 파일 (10 — 8 + 2 추가)

| 파일 | 변경 |
|------|------|
| `src/types/partner.ts` | `Partner.autoSeries?: PartnerAutoSeries` 추가 |
| `src/types/post.ts` | `Post.isAutoSeries?: boolean` 추가 |
| `src/lib/firebase/partner-repository.ts` | `toPartner` read 매핑 + `listAutoSeriesEnabled()` query helper + **`updateAutoSeries(id, partial)` 신규 메서드** (H6 결의) |
| `src/lib/firebase/post-repository.ts` | CreatePostInput·toPost·create에 isAutoSeries 매핑 |
| `src/components/partner/PartnerPostCard.tsx` | isAutoSeries=true 면 우상단 🤖 배지 |
| `src/components/community/PostDetailView.tsx` | (선택적) 헤더에 "🤖 AI 자동 발행" 라벨 |
| `src/app/partner/layout.tsx` | nav에 '시리즈' 항목 추가 — **'+ 새 초고' 직후 위치(H8 결의)** |
| `src/lib/partner/auto-publish-window.ts` | `currentWindowStart()` + `recentlyPublishedInWindow()` 신규 export (H3 결의) — 기존 `toKST`, `isInAutoPublishWindow` 재사용 |
| `firestore.rules` | partners write 그대로 `if false` 유지(자체-write 안 만듦, R7 결의). `partners/{id}/seriesHistory` rule 신규 |
| `firestore.indexes.json` | `partners (autoSeries.enabled asc, status asc)` 신규 1건 (M2 검증: dot-path 인덱스 Firebase CLI 지원 확인됨) |

### 1.3 인프라 변경

| 자산 | 변경 |
|------|------|
| `firebase.json` | functions runtime 그대로 (cycle #20 인프라 재사용) |
| `functions/package.json` | **`nanoid` 추가** (H1 결의) — 또는 Node 22+ `crypto.randomUUID()`로 대체 (선택) |
| `functions/tsconfig.json` | 변경 없음 — Option A로 cross-package import 회피 (C1 결의) |

### 1.4 환경 변수·의존성
- 환경 변수: `GOOGLE_GENERATIVE_AI_API_KEY` (이미 functions/research에서 사용 중) — Cloud Functions secret으로 명시 등록 (H4 결의, §4.1 참조)
- 의존성: `nanoid` 추가 (H1) 또는 `crypto.randomUUID()` 사용

### 1.5 Option A 코드 복제 전략 — 동기화 정책

**복제 범위** (functions/src/auto-series/lib/generator.ts):
1. cycle #19 `partner-promo-generator.ts`의 `generatePartnerPromoDraft` 함수 + 의존 helper (`describePhoto`, `composeDraft`, `cleanupPartnerPostPhotos`)
2. cycle #19 `partner-promo-rag.ts`의 `retrievePartnerStyleReferences`
3. cycle #24 `partner-rag-context.ts`의 `getRagContext` + `buildRagContextSection`
4. cycle #24 `partner-profile-repository.ts`의 `getProfile` (functions 측 read 전용 mini repo)
5. cycle #25 `card-news-generator.ts` + `template-context.ts` + `post-format-fallback.ts`
6. cycle #19 `hygiene-guard.ts`의 `checkMarkdownHygiene`

**제외**: `import "server-only"` 모든 라인 제거. `@/*` path alias는 functions/src 내부 상대 경로로 변환.

**동기화 보증**:
- `functions/src/auto-series/lib/generator.ts` 상단에 `// ⚠️ MIRROR OF src/lib/llm/partner-promo-generator.ts — keep in sync` 마커
- CI에 lint script: `scripts/check-auto-series-mirror.mjs` — 양쪽 파일의 핵심 함수 시그니처 + body hash 비교, mismatch 시 fail
- 미러링 보강 작업이 별도 PR로 들어와도 functions 측 즉시 동기화 (cycle #19 generator는 5사이클 안정 — 동기화 빈도 매우 낮음)

---

## 2. Data Model

### 2.1 `AutoSeriesAngle` (`src/domain/auto-series-angle.ts`)

```ts
export type AutoSeriesAngle = "usp" | "menu" | "review" | "event" | "story";

export const AUTO_SERIES_ANGLES: AutoSeriesAngle[] = [
  "usp", "menu", "review", "event", "story",
];

export const ANGLE_LABELS: Record<AutoSeriesAngle, string> = {
  usp:    "강점·차별점",
  menu:   "메뉴·가격",
  review: "고객 후기",
  event:  "이벤트·할인",
  story:  "매장 이야기",
};

export const ANGLE_EMOJI: Record<AutoSeriesAngle, string> = {
  usp:    "✨",  menu:   "🍽️",  review: "💬",  event:  "🎉",  story:  "📖",
};
```

### 2.2 `PartnerAutoSeries` (`src/types/auto-series.ts`)

```ts
import type { BrandTone } from "@/types/post";
import type { AutoSeriesAngle } from "@/domain/auto-series-angle";
import type { PostFormat } from "@/domain/post-format";

export interface PartnerAutoSeries {
  enabled: boolean;
  /** -1: 첫 tick 시 (lastIndex+1) % 10 = 0번 슬롯부터. server-only write */
  lastIndex: number;
  /** 마지막 cron tick 처리 시각 (성공·hygiene-fail·photo-missing 시에만 갱신, transient error 시 미갱신 — H2/R5) */
  lastTickAt: Date | null;
  /** self-write 허용 (server action zod 화이트리스트로) */
  brandTone: BrandTone;
  /** server-only write */
  totalPublished: number;
  /** server-only write */
  totalFailed: number;
}

export const DEFAULT_AUTO_SERIES: PartnerAutoSeries = {
  enabled: false,
  lastIndex: -1,
  lastTickAt: null,
  brandTone: "friendly",
  totalPublished: 0,
  totalFailed: 0,
};

export type SeriesHistoryStatus =
  | "published"
  | "hygiene-fail"
  | "error"
  | "photo-missing";

export interface SeriesHistoryEvent {
  id: string;
  slotIndex: number;
  angle: AutoSeriesAngle;
  format: PostFormat;
  status: SeriesHistoryStatus;
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
  at: Date;
}
```

### 2.3 ROTATION_POOL (`src/domain/auto-series-rotation-pool.ts`)

```ts
import type { PostFormat } from "@/domain/post-format";
import type { AutoSeriesAngle } from "./auto-series-angle";

export interface RotationSlot { angle: AutoSeriesAngle; format: PostFormat; }

export const AUTO_SERIES_ROTATION_POOL: RotationSlot[] = [
  { angle: "usp",    format: "blog" },
  { angle: "menu",   format: "card-news" },
  { angle: "review", format: "blog" },
  { angle: "event",  format: "card-news" },
  { angle: "story",  format: "blog" },
  { angle: "usp",    format: "card-news" },
  { angle: "menu",   format: "blog" },
  { angle: "review", format: "card-news" },
  { angle: "event",  format: "blog" },
  { angle: "story",  format: "card-news" },
];

export function pickSlot(lastIndex: number): { nextIndex: number; slot: RotationSlot } {
  const nextIndex = (lastIndex + 1) % AUTO_SERIES_ROTATION_POOL.length;
  return { nextIndex, slot: AUTO_SERIES_ROTATION_POOL[nextIndex] };
}
```

`pickSlot(-1)` → 0, `pickSlot(9)` → 0 (M3 검증: 라운드 로빈 정확).

### 2.4 Partner 확장 (`src/types/partner.ts`)

```ts
export interface Partner {
  // ... 기존 필드 (cycle #19~#25)
  /** v1.13 cycle #26 */
  autoSeries?: PartnerAutoSeries;
}
```

**toPartner 매핑** (M6 결의): Firestore에서 `autoSeries`가 누락되면 `undefined` 반환. 호출자(server action·runner)가 `partner.autoSeries ?? DEFAULT_AUTO_SERIES`로 fallback.

### 2.5 Post 확장 (`src/types/post.ts`)

```ts
export interface Post {
  // ... cycle #25 format/templateId/templateScenarios 포함
  /** v1.13 cycle #26 */
  isAutoSeries?: boolean;
}
```

**Partner.isSample 추가 안 함** (C5 결의): runner가 `isSample` 필드를 post에 setting하지 않음. 더미 시연용 sample 구분은 Partner.isSample 필드를 신규 도입할지 후속 사이클(#27+)에서 결정.

---

## 3. LLM / Generator 통합 (Option A)

### 3.1 R1 invariant — `src/lib/llm/partner-promo-generator.ts` 100% 무수정 (6번째 검증)

cycle #19 generator 파일은 본 사이클에서 **단 1줄도 변경하지 않음**. Cloud Functions에서는 별도 복제본 사용.

### 3.2 functions/src/auto-series/lib/generator.ts (신규, 복제본)

```ts
// ⚠️ MIRROR OF src/lib/llm/partner-promo-generator.ts — keep in sync (cycle #26 R1)
// Source last synced: cycle #25 commit 8d6cd1a + ffdb434
// Differences from source:
//   1. Removed `import "server-only"` lines (functions runtime — no Next.js bundler)
//   2. Replaced `@/*` path alias with relative imports inside functions/src
//   3. No other behavioral changes — same args object, same return type, same internals

import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { adminStorage } from "./firebase-admin-handle";
// ... (전체 cycle #19 + #24 + #25 합쳐진 generator 핵심 로직)

export async function generatePartnerPromoDraft(input): Promise<PartnerPromoDraftResult> {
  // identical to src/lib/llm/partner-promo-generator.ts 후 cycle #25 변경 모두 포함
  // ...
}
```

복제 대상 함수 (cycle #19~#25):
- `describePhoto` (Vision)
- `composeDraft` (LLM with format/card-news support — cycle #25)
- `generatePartnerPromoDraft` (orchestrator)
- `cleanupPartnerPostPhotos` (Storage cleanup)
- `retrievePartnerStyleReferences` (cycle #19 RAG)
- `getRagContext` + `buildRagContextSection` (cycle #24)
- `partnerProfileRepository.getProfile` (cycle #24, mini)
- `validateCardNewsBody` + `buildCardNewsInstruction` + `patchComposeSchemaForCardNews` (cycle #25)
- `buildTemplateContextSection` (cycle #25)
- `checkMarkdownHygiene` (cycle #19 hygiene-guard)
- `postFormatFallback` (cycle #25)

### 3.3 deriveAutoInputs (양측 — Next.js + functions 동시 존재)

```ts
import type { Partner } from "@/types/partner";  // (functions 측은 상대 경로)
import type { AutoSeriesAngle } from "@/domain/auto-series-angle";

interface DerivedInputs { keywords: string[]; photoUrls: string[]; }

export function deriveAutoInputs(
  partner: Partner,
  angle: AutoSeriesAngle,
): DerivedInputs | { error: "photo-missing" } {
  const photos = partner.profile?.photoUrls ?? [];
  if (photos.length === 0) return { error: "photo-missing" };

  const offset = ((partner.autoSeries?.lastIndex ?? 0) + 10) % photos.length;
  const photoUrls = [
    photos[offset],
    photos[(offset + 1) % photos.length],
  ].slice(0, Math.min(2, photos.length));

  const keywords = pickKeywordsByAngle(angle, partner);
  return { keywords, photoUrls };
}

function pickKeywordsByAngle(angle: AutoSeriesAngle, partner: Partner): string[] {
  const profile = partner.profile;
  switch (angle) {
    case "usp":
      return profile?.usps?.slice(0, 3) ?? [partner.businessName, "추천"];
    case "menu":
      return (profile?.priceItems ?? [])
        .slice(0, 2)
        .map((p) => p.name)
        .filter((s): s is string => Boolean(s));   // M7 결의 — explicit predicate
    case "review":
      return ["고객 후기", partner.businessName];
    case "event":
      return ["신규 오픈", "특별 할인"];
    case "story":
      return ["매장 이야기", partner.regionLabel ?? partner.businessName];
  }
}
```

---

## 4. Cloud Functions Runner

### 4.1 `functions/src/auto-series/index.ts` (H4 결의 — secrets 명시)

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { runAutoSeriesTick } from "./runner";

if (getApps().length === 0) initializeApp();

const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret("GOOGLE_GENERATIVE_AI_API_KEY");

export const autoSeriesTick = onSchedule(
  {
    schedule: "every 1 hours from 09:00 to 18:00",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0,
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY],   // H4 결의
  },
  async () => {
    await runAutoSeriesTick(new Date());
  },
);
```

배포 전 1회: `firebase functions:secrets:set GOOGLE_GENERATIVE_AI_API_KEY` (functions/research에서 이미 등록됐을 가능성 — 공유 가능).

### 4.2 `functions/src/auto-series/runner.ts` (Critical 다수 결의 반영)

```ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generatePartnerPromoDraft } from "./lib/generator";       // C1·C2: 복제본
import { isInAutoPublishWindow, recentlyPublishedInWindow } from "./lib/window";  // H3
import { pickSlot } from "./lib/rotation";                          // 복제본 (Option A)
import { deriveAutoInputs } from "./lib/derive-inputs";             // 복제본
import { uniqueSlug, inferCategoriesAuto, createPostFromDraft } from "./lib/post-writer";  // C3·C4
import type { Partner } from "./lib/types-partner";                 // 복제 (필요 최소만)

export async function runAutoSeriesTick(now: Date): Promise<void> {
  const db = getFirestore();
  const snap = await db.collection("partners")
    .where("autoSeries.enabled", "==", true)
    .where("status", "==", "active")
    .get();

  const results = await Promise.allSettled(
    snap.docs.map((doc) => processOnePartner(db, doc.id, doc.data() as Partner, now))
  );

  // M1 결의 — rejection visibility
  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length > 0) {
    console.warn(`[auto-series] tick rejections=${rejected.length}`, {
      samples: rejected.slice(0, 3).map((r) =>
        (r as PromiseRejectedResult).reason?.message ?? String((r as PromiseRejectedResult).reason),
      ),
    });
  }
}

async function processOnePartner(
  db: FirebaseFirestore.Firestore,
  partnerId: string,
  partner: Partner,
  now: Date,
): Promise<void> {
  // R3 window double-check
  if (!isInAutoPublishWindow(partner.autoPublish, now)) return;
  if (recentlyPublishedInWindow(partner, now)) return;   // R4

  // R2 atomic transaction — lastIndex 진행 (lastTickAt은 결과에 따라 분기 — H2 결의)
  const slotResult = await db.runTransaction(async (tx) => {
    const ref = db.collection("partners").doc(partnerId);
    const fresh = await tx.get(ref);
    const lastIndex = (fresh.data()?.autoSeries?.lastIndex ?? -1) as number;
    const { nextIndex, slot } = pickSlot(lastIndex);
    tx.update(ref, { "autoSeries.lastIndex": nextIndex });   // lastTickAt은 별도 (H2)
    return { nextIndex, slot };
  });

  const { nextIndex, slot } = slotResult;
  const { angle, format } = slot;

  // photo-missing 가드
  const derived = deriveAutoInputs(partner, angle);
  if ("error" in derived) {
    await markWindowConsumed(db, partnerId, now);   // H2 — window 소비
    await appendSeriesHistory(db, partnerId, {
      slotIndex: nextIndex, angle, format,
      status: "photo-missing",
      reason: "partner.profile.photoUrls 비어있음",
      at: now,
    });
    await db.collection("partners").doc(partnerId).update({
      "autoSeries.totalFailed": FieldValue.increment(1),
    });
    return;
  }

  const postId = nanoid(16);   // H1: functions/package.json에 nanoid 추가
  try {
    // R1 cycle #19 generator 동일 시그니처 (Option A — 복제본 호출)
    const draft = await generatePartnerPromoDraft({
      uid: partner.ownerUid,
      partnerId,
      postId,
      photoUrls: derived.photoUrls,
      keywords: derived.keywords,
      slogan: null,
      brandTone: partner.autoSeries?.brandTone ?? "friendly",
      businessName: partner.businessName,
      format,
    });

    if (!draft.passed) {
      // R5 hygiene-fail — window 소비
      await markWindowConsumed(db, partnerId, now);
      await appendSeriesHistory(db, partnerId, {
        slotIndex: nextIndex, angle, format,
        status: "hygiene-fail",
        reason: draft.reasons.join(", "),
        hygieneScore: draft.hygieneScore,
        at: now,
      });
      await db.collection("partners").doc(partnerId).update({
        "autoSeries.totalFailed": FieldValue.increment(1),
      });
      return;
    }

    // C3 결의 — uniqueSlug functions 측 helper 사용
    const slug = await uniqueSlug(db, draft.title);
    // C4 결의 — postRepository.create와 동일 수준 매핑 (Timestamp.fromDate, publishedAt, inferCategories)
    await createPostFromDraft(db, postId, {
      partner, draft, photoUrls: derived.photoUrls,
      slug, brandTone: partner.autoSeries?.brandTone ?? "friendly",
      keywords: derived.keywords, generatedAt: now,
      isAutoSeries: true,
      // H7 결의 — providerId convention `partner:${partner.id}` 그대로 (route.ts:334와 일치)
    });

    await markWindowConsumed(db, partnerId, now);
    await appendSeriesHistory(db, partnerId, {
      slotIndex: nextIndex, angle, format,
      status: "published",
      postId, postSlug: slug,
      hygieneScore: draft.hygieneScore,
      at: now,
    });
    await db.collection("partners").doc(partnerId).update({
      "autoSeries.totalPublished": FieldValue.increment(1),
    });

    // L1 결의 — revalidate via webhook (선택적 OOS, 5분 staleness 수용)
    // await fetch(`${process.env.NEXT_BASE_URL}/api/internal/revalidate?secret=${REV_SECRET}&path=/community/partners`)
  } catch (e) {
    // R5/H2 결의 — transient error는 lastTickAt 갱신 X (다음 hourly tick 재시도 가능)
    await appendSeriesHistory(db, partnerId, {
      slotIndex: nextIndex, angle, format,
      status: "error",
      reason: extractErrorMessage(e),  // M5 결의
      at: now,
    });
    await db.collection("partners").doc(partnerId).update({
      "autoSeries.totalFailed": FieldValue.increment(1),
    });
    // ⚠️ markWindowConsumed 호출 안 함 — 다음 tick에서 재시도 (R5)
  }
}

async function markWindowConsumed(db, partnerId, now): Promise<void> {
  await db.collection("partners").doc(partnerId).update({
    "autoSeries.lastTickAt": FieldValue.serverTimestamp(),
  });
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 500);
  if (typeof e === "object" && e !== null) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg.slice(0, 500);
  }
  try { return JSON.stringify(e).slice(0, 500); } catch { return String(e).slice(0, 500); }
}
```

### 4.3 functions/src/auto-series/lib/post-writer.ts (C3·C4 결의)

```ts
import type { FirebaseFirestore as F } from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { titleToSlug } from "./slug";  // 복제본
import { inferCategories } from "./infer-categories";  // 복제본 (cycle #19 자산)

export async function uniqueSlug(db: F.Firestore, title: string, maxTries = 3): Promise<string> {
  const base = titleToSlug(title);
  for (let i = 0; i < maxTries; i++) {
    const candidate = `${base}-${nanoid(4)}`;
    const exists = await db.collection("posts").where("slug", "==", candidate).limit(1).get();
    if (exists.empty) return candidate;
  }
  throw new Error("SLUG_CONFLICT");
}

export function inferCategoriesAuto(
  visionTags: string[],
  partnerCategory: string | null,
): string[] {
  const visionCats = inferCategories(visionTags);
  if (partnerCategory) {
    return [partnerCategory, ...visionCats.filter((c) => c !== partnerCategory)];
  }
  return visionCats;
}

export interface CreatePostFromDraftInput {
  partner: Partner;
  draft: PartnerPromoDraftResult;
  photoUrls: string[];
  slug: string;
  brandTone: BrandTone;
  keywords: string[];
  generatedAt: Date;
  isAutoSeries: boolean;
}

export async function createPostFromDraft(
  db: F.Firestore,
  postId: string,
  input: CreatePostFromDraftInput,
): Promise<void> {
  const { partner, draft, photoUrls, slug, brandTone, keywords, generatedAt, isAutoSeries } = input;
  const categories = inferCategoriesAuto(draft.visionTags, partner.category);

  await db.collection("posts").doc(postId).create({
    providerId: `partner:${partner.id}`,    // H7: route.ts와 일치
    providerOwnerUid: partner.ownerUid,
    companyName: partner.businessName,
    categories,
    regionLabel: partner.regionLabel,
    title: draft.title,
    slug,
    coverImageUrl: photoUrls[0] ?? null,
    coverImageAlt: draft.coverImageAlt,
    bodyMarkdown: draft.bodyMarkdown,
    summary80: draft.summary80,
    topicHint: null,
    brandTone,
    postType: "partner-promo",
    publishStatus: "published",
    sourcePhotos: photoUrls,
    generationMeta: {
      model: process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ?? "gemini-2.5-flash",
      generatedAt: Timestamp.fromDate(generatedAt),    // C4: 명시 변환
      ragSourceIds: draft.ragSourceIds,
      hygieneScore: draft.hygieneScore,
      visionTags: draft.visionTags,
      keywordsHint: keywords,
      source: "auto-series",
      cardNewsValidationFailed: draft.cardNewsValidationFailed,
    },
    format: draft.format,
    isAutoSeries,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: FieldValue.serverTimestamp(),    // C4: published 자동 설정
  });
}
```

### 4.4 window-helpers — `src/lib/partner/auto-publish-window.ts` 확장 (H3 결의)

```ts
// 기존 isInAutoPublishWindow, toKST 보존. 신규 두 export 추가:

import type { Partner } from "@/types/partner";

export function currentWindowStart(cfg: AutoPublishConfig, now: Date): Date | null {
  if (!cfg.enabled || cfg.weekdays.length === 0) return null;
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return null;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
  const start = new Date(kst);
  start.setHours(Math.floor(cfg.startMinute / 60), cfg.startMinute % 60, 0, 0);
  return start;
}

export function recentlyPublishedInWindow(partner: Partner, now: Date): boolean {
  // M3: 반드시 isInAutoPublishWindow가 true일 때만 호출 (call site invariant)
  const lastTick = partner.autoSeries?.lastTickAt;
  if (!lastTick) return false;
  const winStart = currentWindowStart(partner.autoPublish, now);
  if (!winStart) return false;
  return lastTick.getTime() >= winStart.getTime();
}
```

functions 측은 별도 복제본 (Option A) — `functions/src/auto-series/lib/window.ts`에 동일 로직.

---

## 5. Server Actions

### 5.1 `togglePartnerAutoSeries` (R7 + H6 + M6 결의)

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { DEFAULT_AUTO_SERIES } from "@/types/auto-series";

const inputSchema = z.object({
  enabled: z.boolean(),
  brandTone: z.enum(["friendly", "professional", "playful"]).optional(),
});

interface ActionResult { ok: boolean; message?: string }

export async function togglePartnerAutoSeries(
  input: z.infer<typeof inputSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = inputSchema.parse(input);

    if (parsed.enabled && (partner.profile?.photoUrls?.length ?? 0) < 1) {
      return { ok: false, message: "매장 사진 1장 이상 등록 후 자동 시리즈를 켜주세요. (/partner/profile)" };
    }
    if (parsed.enabled && !partner.autoPublish.enabled) {
      return { ok: false, message: "자동발행이 OFF 상태입니다. /partner/settings에서 먼저 자동발행을 켜주세요." };
    }

    // M6 결의 — first-time enablement이면 DEFAULT 채우기
    const isFirst = !partner.autoSeries;
    if (isFirst) {
      await partnerRepository.updateAutoSeries(partner.id, {
        ...DEFAULT_AUTO_SERIES,
        enabled: parsed.enabled,
        brandTone: parsed.brandTone ?? "friendly",
      });
    } else {
      // R7 — server action zod 화이트리스트로 enabled/brandTone만
      await partnerRepository.updateAutoSeries(partner.id, {
        enabled: parsed.enabled,
        ...(parsed.brandTone ? { brandTone: parsed.brandTone } : {}),
      });
    }
    revalidatePath("/partner/series");   // H6
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "일시적 오류" };
  }
}

export async function resetSeriesIndex(partnerId: string): Promise<ActionResult> {
  try {
    await requireAdminApi();
    await partnerRepository.updateAutoSeries(partnerId, {
      lastIndex: -1,
      lastTickAt: null,
    });
    revalidatePath("/admin/auto-series");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "오류" };
  }
}
```

`partnerRepository.updateAutoSeries` (H6 결의 신규 메서드):
```ts
async updateAutoSeries(id: string, patch: Partial<PartnerAutoSeries>): Promise<void> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    fields[`autoSeries.${k}`] = v === null ? FieldValue.delete() : v;
  }
  fields.updatedAt = FieldValue.serverTimestamp();
  await col().doc(id).update(fields);
}
```

---

## 6. UI Components

### 6.1 `/partner/series/page.tsx`

```
┌──────────────────────────────────────────┐
│ 🟢 자동 시리즈                  [STOP]  │
├──────────────────────────────────────────┤
│ 다음 발행 예정: 2026-04-30 14:00 KST     │
│   ✨ 강점·차별점 angle                    │
│   📝 블로그글 format                      │
├──────────────────────────────────────────┤
│ brandTone: friendly  [변경]              │
│ 누적 발행: 23건 · 실패 4건               │
├──────────────────────────────────────────┤
│ 최근 발행 이력 (20건)                    │
│ ✅ 04-29 14:02 · ✨ usp · 📝 위생 0.95  │   ← L2: "위생" 라벨 명시
│ ✅ 04-29 09:01 · 💬 review · 🖼️ 0.88   │
│ ⚠️ 04-28 14:01 · 🍽️ menu · 📝 위생 실패 │
│ ✅ 04-27 14:00 · 🎉 event · 📝 0.92     │
│ ...                                      │
└──────────────────────────────────────────┘
```

### 6.2 PartnerAutoSeriesPanel (client) — GO/STOP 토글, brandTone 셀렉트

### 6.3 PartnerPostCard 🤖 배지 — cycle #25 카드 우상단에 추가

```tsx
{post.isAutoSeries ? (
  <span className="absolute top-2 right-2 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
    🤖 자동
  </span>
) : null}
```

### 6.4 `/admin/auto-series/page.tsx` — 활성 partner / 24h 통계 / partner별 lastTickAt·lastIndex·success/fail

### 6.5 partner/layout.tsx nav 5번째 항목 (H8 결의)

기존 nav 순서 (cycle #25): `내 글 / + 새 초고 / 매장 정보 / 설정`. **'+ 새 초고' 직후 5번째에 '시리즈' 추가**:

```tsx
<Link href="/partner/series" className="...">
  ✨ 시리즈
</Link>
```

→ 최종: `내 글 / + 새 초고 / ✨ 시리즈 / 매장 정보 / 설정`

---

## 7. Routing & Auth Guards

| URL | Method | 가드 | 동작 |
|-----|--------|------|------|
| `/partner/series` | GET | requirePartnerPage | 진행 현황 + 이력 |
| `/admin/auto-series` | GET | requireAdminPage | 모니터링 |
| (Cloud Functions) `autoSeriesTick` | scheduled | service account | every 1 hour |
| (server action) `togglePartnerAutoSeries` | call | requirePartnerApi | 토글 |
| (server action) `resetSeriesIndex` | call | requireAdminApi | reset |

---

## 8. Storage·Firestore Rules

### 8.1 firestore.rules (R6·R7·H5 결의)

```javascript
function isOwner(partnerId) {
  return request.auth != null
    && request.auth.uid == get(/databases/$(database)/documents/partners/$(partnerId)).data.ownerUid;
}
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}

match /partners/{partnerId} {
  // 기존 cycle #19 규칙 그대로 — 모든 client write 차단
  allow read: if true;       // 또는 기존 정책 유지
  allow write: if false;     // ← R7 결의: server action(Admin SDK)만 write 가능

  // R6 결의 — seriesHistory append-only
  match /seriesHistory/{eventId} {
    allow read: if isOwner(partnerId) || isAdmin();
    allow create: if isAdmin();   // 클라이언트 직접 write 차단 (Cloud Functions Admin SDK는 rules bypass)
    allow update, delete: if false;
  }
}
```

### 8.2 firestore.indexes.json — 신규 1건

```json
{
  "collectionGroup": "partners",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "autoSeries.enabled", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

(M2: dot-path 인덱스 Firebase CLI 정상 지원 확인. v1 partner 100명까지는 전체 스캔 비용 미미.)

### 8.3 Storage Rules — 변경 없음

---

## 9. Open Questions (design-validator v0.2 응답 후)

| OQ | 답 |
|----|---|
| OQ1 | **Option A 코드 복제 채택** — `functions/src/auto-series/lib/`에 cycle #19 generator 복제. `import "server-only"` 제거 |
| OQ2 | KST 윈도우 정밀도 — 기존 `toKST` 재사용 + `currentWindowStart` 신규. DST/midnight 단위 테스트 (S4) |
| OQ3 | photo-missing 시 lastIndex 진행 (현재 설계). 사장님이 사진 추가 시 다음 윈도우부터 정상 |
| OQ4 | 같은 윈도우 1번만 — `recentlyPublishedInWindow` + `markWindowConsumed` (성공·hygiene-fail·photo-missing 시) |
| OQ5 | autoPublish OFF + autoSeries 토글 시도 → server action 거부 |
| OQ6 | seriesHistory 자동 cleanup OOS — listHistory limit=20 |
| OQ7 | brandTone angle별 다양화 OOS |
| OQ8 | profile 업데이트 즉시 반영 — 다음 tick부터 자동 |
| OQ9 | transient error 시 lastTickAt 갱신 X → 다음 hourly tick 재시도 (H2) |
| OQ10 | admin 강제 즉시 발행 OOS (resetSeriesIndex로 우회) |
| OQ11 | OQ1과 통합 — Option A 채택 |
| OQ12 | seriesHistory `(at desc) limit 20` — 단일 인덱스 |

---

## 10. Implementation Order

| Step | 작업 | 예상 LOC |
|------|------|----------|
| S1 | domain: AutoSeriesAngle + ROTATION_POOL | 100 |
| S2 | type: PartnerAutoSeries + Partner.autoSeries + Post.isAutoSeries | 80 |
| S3 | derive-inputs.ts (Next.js 측) | 100 |
| S4 | currentWindowStart + recentlyPublishedInWindow (auto-publish-window.ts 확장) + 단위 테스트 | 150 |
| S5 | auto-series-repository (history list + lastIndex 조회 helpers) | 120 |
| S6 | partner-repository.updateAutoSeries + listAutoSeriesEnabled + toPartner 확장 | 100 |
| S7 | post-repository: isAutoSeries 매핑 | 30 |
| S8 | togglePartnerAutoSeries + resetSeriesIndex actions | 120 |
| S9 | functions/src/auto-series/index.ts + runner.ts | 250 |
| S10 | functions/src/auto-series/lib/generator.ts (Option A 복제 — 큰 작업) | 700 |
| S11 | functions/src/auto-series/lib/{post-writer, window, derive-inputs, slug, infer-categories, types}.ts | 350 |
| S12 | /partner/series + Panel + HistoryList | 350 |
| S13 | /admin/auto-series + Dashboard | 250 |
| S14 | PartnerPostCard·PostDetailView 🤖 배지 | 30 |
| S15 | partner/layout.tsx '시리즈' nav | 10 |
| S16 | firestore.rules + indexes.json | 50 |
| S17 | seed-auto-series-defaults.mjs (L5 디테일 — 강남 코워킹·weekdays=[2,4]·startMinute=540·endMinute=1080·brandTone='friendly') | 80 |
| S18 | scripts/check-auto-series-mirror.mjs (CI lint) | 80 |

**총 예상: ~2,950 LOC** (Plan §7 1,500–2,000 → Option A 복제로 +50% 증가. 동기화 비용 trade-off 수용)

---

## 11. Acceptance Criteria

| AC | 기준 |
|----|------|
| AC1 | autoSeries.enabled=true 파트너의 다음 윈도우에 자동 글 1건 발행 |
| AC2 | lastIndex 윈도우마다 1씩 증가 (atomic) |
| AC3 | 같은 윈도우 안 중복 발행 X (recentlyPublishedInWindow) |
| AC4 | hygiene-fail 시 현재 윈도우 skip — lastIndex/lastTickAt 진행, 다음 윈도우에서 다음 angle 시도 (L3 결의 wording) |
| AC5 | photo-missing 시 'photo-missing' 이벤트 + skip (window 소비) |
| AC6 | cycle #19 partner-promo-generator.ts 변경 0줄 (R1, 6번째 검증) |
| AC7 | server action zod 화이트리스트 — enabled/brandTone만 partner 변경 가능, lastIndex 시도 거부 |
| AC8 | seriesHistory append-only (firestore.rules update/delete: if false) |
| AC9 | autoPublish OFF + autoSeries 토글 → 거부 메시지 |
| AC10 | photo 0건 partner autoSeries 켤 때 거부 메시지 |
| AC11 | PartnerPostCard isAutoSeries=true 시 🤖 배지 |
| AC12 | /partner/series 다음 발행 예정 (요일·시각·angle·format) 정확 표시 |
| AC13 | /admin/auto-series 24h 통계 (success/fail/hygiene/photo-missing) 표시 |
| AC14 | atomic transaction race 시 lastIndex 정상 (단위 테스트 mock concurrent 5 ticks) |
| AC15 | transient error 시 lastTickAt 미갱신 → 다음 hourly tick 재시도 (H2) |
| AC16 | functions/src/auto-series/lib/generator.ts와 src/lib/llm/partner-promo-generator.ts 핵심 시그니처 일치 (CI lint pass) |
| AC17 | scripts/check-auto-series-mirror.mjs가 mismatch 시 exit code !=0 |

---

## 12. Migration & Rollback

### 12.1 Migration
- DB schema 무수정 — `Partner.autoSeries`·`Post.isAutoSeries` optional
- 기존 partner 자동 시리즈 OFF 상태 유지
- 시드 1건 (강남 코워킹) — 시연용

### 12.2 Rollback
- Cloud Functions `autoSeriesTick` 배포 revert만으로 cron 정지
- Next.js 코드 revert로 UI 제거
- 자동 발행된 post는 그대로 (isAutoSeries 필드 optional)

### 12.3 Feature Flag
- `partner.autoSeries.enabled` 자체가 per-partner flag
- 글로벌 OFF는 functions/src/auto-series/index.ts에서 `process.env.AUTO_SERIES_DISABLED=='1'` 체크 (선택적, 현 사이클 OOS)

---

## 13. Cross-Cycle Impact

| Cycle | 영향 | 검증 |
|-------|------|------|
| #19 partner-promo | `partner-promo-generator.ts` 0줄 변경 (R1 6번째 검증) — Option A 복제로 격리 | R1, AC6 |
| #20 quote-trend-keywords | `functions/src/research`와 인접 모듈 — `defineSecret` 패턴 재사용 | 인프라 학습 |
| #24 partner-rag-system | `partner.profile` 자동 derive 활용 ↑ — 모델 변경 0 (cycle #25 R2 그대로) | — |
| #25 partner-content-formats | format ROTATION에서 활용 + Post.isAutoSeries 추가 + PartnerPostCard 배지 | format/카드 그리드 검증 |

---

## 14. design-validator 결의 매트릭스 (26/26)

| 카테고리 | 결의 |
|---------|------|
| 🔴 C1 functions tsconfig 못 import | §1.5 + §3.2 — Option A 코드 복제 채택 |
| 🔴 C2 server-only 마커 충돌 | §1.5 — 복제 시 `import "server-only"` 제거 |
| 🔴 C3 uniqueSlug functions 측 helper | §4.3 `functions/src/auto-series/lib/post-writer.ts`의 `uniqueSlug(db, title)` |
| 🔴 C4 직접 db.create 누락 처리 | §4.3 `createPostFromDraft` — Timestamp.fromDate / publishedAt / inferCategories 모두 명시 |
| 🔴 C5 Partner.isSample 미존재 | §2.5 — runner가 isSample setting 안 함, sample 구분은 후속 사이클 |
| 🔴 C6 firestore.rules logically broken | §8.1 R7 — partners write `if false` 유지, server action만 write |
| 🟠 H1 nanoid 의존성 | §1.3 — `functions/package.json`에 nanoid 추가 |
| 🟠 H2 lastTickAt 정책 | §4.2 `markWindowConsumed` — 성공/hygiene-fail/photo-missing 시만 갱신, transient error 시 미갱신 |
| 🟠 H3 currentWindowStart KST math | §4.4 — `auto-publish-window.ts` 확장, `toKST` 재사용 |
| 🟠 H4 secrets declaration | §4.1 `defineSecret` + `secrets: [GOOGLE_GENERATIVE_AI_API_KEY]` |
| 🟠 H5 isOwner/isAdmin helpers | §8.1 — 명시 정의 |
| 🟠 H6 partnerRepository.updateAutoSeries | §1.2 + §5.1 — 신규 메서드 + revalidatePath |
| 🟠 H7 providerId convention | §4.3 — `partner:${partner.id}` route.ts:334와 일치 |
| 🟠 H8 nav 위치 | §6.5 — '+ 새 초고' 직후 5번째 |
| 🟡 M1 Promise.allSettled rejection | §4.2 — 거부 카운트·sample 로깅 |
| 🟡 M2 인덱스 dot-path | §8.2 — Firebase CLI 지원 확인 + scale 노트 |
| 🟡 M3 pickSlot 경계 | §2.3 — 명시 |
| 🟡 M4 weekday gating 위치 | §13 risk — cron + runner 양쪽 |
| 🟡 M5 error message 안전 추출 | §4.2 `extractErrorMessage` |
| 🟡 M6 DEFAULT_AUTO_SERIES first write | §5.1 — first-time enablement 시 DEFAULT 채움 |
| 🟡 M7 TS narrowing | §3.3 `.filter((s): s is string => Boolean(s))` |
| 🔵 L1 revalidatePath webhook | §4.2 (선택적 OOS, 5분 staleness 수용) |
| 🔵 L2 위생 라벨 | §6.1 — "위생 0.95" 명시 |
| 🔵 L3 AC4 wording | §11 — 명확화 |
| 🔵 L4 photo-missing 3회 경고 | OOS — Plan §6 risk-table 명시 |
| 🔵 L5 seed 디테일 | §10 S17 — 강남 코워킹·weekdays=[2,4]·time·brandTone 명시 |

전 26 발굴 모두 결의 완료.

---

## 15. Next Steps

1. v0.2 사용자 승인
2. **`/pdca do partner-auto-series`** → S1 → S18 순차 구현
3. 구현 완료 후 **`/pdca analyze`** → gap-detector 검증
4. ≥ 90% 시 **`/pdca report`** → **6사이클 연속 single-pass** 마일스톤
