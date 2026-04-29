# tips-admin-config · Design v0.2 (cycle #31 v1.18)

> Source plan: `docs/01-plan/features/tips-admin-config.plan.md`
> v0.1 → v0.2: design-validator agent reality-check 결과 29 issue 모두 §14 결의 매트릭스에 매핑
> Generated: 2026-04-29
> Streak target: **11번째 consecutive single-pass ≥ 90%** Match Rate
> Approach B (Firestore + 코드 schedule)

---

## §1. Overview

### 1.1 Background

cycle #30(2026-04-28)에서 `/community/tips` 자동 발행 시스템 production 배포. 사용자(운영팀)가 archive 직후 "/admin/tips에 자동 설정이 없어"라고 지적 — admin 운영 자율성 layer 부재. cycle #31에서 Approach B(Firestore config + 코드 schedule + admin UI)로 자율성 확보.

문제:
- 사용자: "운영 자율성 일체"가 필요
- 현재: enabled 토글 X, topic pool hardcoded, schedule admin이 못 봄, history admin이 못 봄
- Plan multiSelect: S2 (ON/OFF) + S4+S5 (Topic CRUD + active 토글) + S7 (Schedule read-only) + S8 (History 10건) — 모두 V1

### 1.2 Surgical Philosophy (11-streak 도전)

- **R15 cycle #19 partner-promo-generator 0줄 변경 11번째** — 신규 admin config layer 별도 작성
- **R1 cycle #26 auto-series runner 0줄 변경 13번째** — 영향 X (autoSeries 로직 별도)
- cycle #30 generated tips-generator·prompt·**topic-pool**·stock-images·today-kst·infer-categories·hygiene-guard·tip-repository 0줄 변경 (cycle #30 자체도 보존, **C2 결의** — pickNextTopic signature 미변경, 신규 helper 별도 작성)
- 변경 대상: `functions/src/tips/runner.ts` (cycle #30 파일, 5 surgical edit) + `src/app/admin/tips/page.tsx` (cycle #30 파일, 4 sections 추가)
- back-compat fallback 강제 — Firestore 미존재 시 cycle #30 동작 유지 (R12 cycle #29 패턴 재사용)
- Option A 코드 복제 6번째 사이클 — tips-config + dynamic-topic-pool + tips-history 양 패키지 mirror
- cycle #28 toKstWallClock 패턴 재사용 — `src/lib/tips/next-tick-time.ts`에 cron `30 9-17 * * *` schedule parser

### 1.3 v0.1 → v0.2 변경 요약

design-validator agent reality-check 결과:
- **6 Critical**: getAdminUid 부재, pickNextTopic 시그니처 변경 risk, mirror lint 검증 누락, Timestamp/Date 불일치, server-only chain blocking test, 잘못된 server action bind 패턴
- **5 High**: import 보존 누락, 인덱스 design/plan 불일치, functions path alias 부재, helper 중복 가능성, error scope 모호
- **10 Medium**: 다양한 type drift, default 값 미지정, fallback graceful 처리 누락, 등
- **8 Low**: 코사메틱·일관성·LOC 합산

모두 §14 결의 매트릭스에 1:1 매핑. **§3·§4·§5·§7 본문에 직접 반영.**

---

## §2. Goals / Non-goals

### 2.1 Goals

| ID | Goal |
|---|---|
| G1 | Admin이 `/admin/tips`에서 ON/OFF 즉시 토글 (S2) — Firestore write → 다음 tick에 즉시 반영 |
| G2 | Admin이 `/admin/tips/topics`에서 topic 추가/제거(soft delete via isActive)/수정/시즌 변경 (S4+S5) |
| G3 | Admin이 `/admin/tips`에서 다음 tipsTick 발화 KST 시각 + cron pattern 즉시 확인 (S7) |
| G4 | Admin이 `/admin/tips`에서 최근 10건 tipsTick 결과 확인 (success/skip/fail 사유 + topic + post link) (S8) |
| G5 | Firestore config/topic/history 미존재 시 0 regression (cycle #30 동작 그대로) — R12 fallback |
| G6 | R15 cycle #19 generator 11번째 무수정 + cycle #30 자체 immutability 보존 (C2 결의 — pickNextTopic 시그니처 미변경) |
| G7 | tipsTick 매 종료 path가 tipsHistory append (NEW-R23 — 운영 가시성) |

### 2.2 Non-goals

- **Deferred to cycle #32+**: dailyLimit 변경 UI, schedule editor (cron pattern admin 편집), audit log, hard delete, drag-and-drop reorder, history TTL/cleanup, topic-별 history filter
- **Permanent**: AI prompt admin 편집 (R6 cycle #19), 사용자 UGC topic 제안 (cycle #30 G1), card-news format (R18)

---

## §3. Architecture

### 3.1 Firestore Schema

#### 3.1.1 `system/tipsAutoConfig` (single doc) — C4·M1·L2 결의

```ts
// src/lib/tips/tips-config.ts (NOT server-only — pure types, C5 결의)
// Date 타입 사용 (repo conversion, C4 결의). Firestore 측은 Timestamp 저장.
export interface TipsAutoConfig {
  enabled: boolean;          // default: true
  updatedAt: Date;           // 서버 read-time conversion (Timestamp → Date)
  updatedBy: 'admin';        // C1·M2 결의 — 단일 admin 세션, uid 없음
}
```

**Default fallback (R12)**: doc 미존재 시 `{ enabled: true, updatedAt: new Date(0), updatedBy: 'admin' }` — cycle #30 동작 유지.

> **M6 결의** — UI ScheduleInfo 컴포넌트는 `updatedAt.getTime() === 0` 검출 → "기본값 (Firestore 미설정)" 라벨 표시.

#### 3.1.2 `tipsTopicPool/{topicId}` (collection) — C4·L1·L3 결의

```ts
// src/lib/tips/tips-config.ts (NOT server-only)
export interface TipsTopicDoc {
  // L1 결의 — id는 Firestore 저장 X. snap.id에서 derived.
  /** Firestore doc id (snap.id) — derived, not stored */
  id: string;
  label: string;             // 5~120자 (zod)
  category: 'bathroom' | 'kitchen' | 'aircon' | 'living' | 'move' | 'general';
  season: 'spring' | 'summer' | 'fall' | 'winter' | null;
  intent: 'howto' | 'guide' | 'checklist' | 'comparison' | 'qa' | null;
  photoless: boolean;        // default: false
  isActive: boolean;         // default: true. S5 토글
  order: number;             // L3 결의 — Date.now() + Math.random() 마이크로 jitter
  createdAt: Date;           // C4 결의
  updatedAt: Date;
  createdBy: 'admin';        // C1·M2 결의 — 단일 admin
}
```

**Default fallback (R12·NEW-R24)**: collection 빈 query → static `TIPS_TOPIC_POOL` 사용 (cycle #30 30개 그대로).

**Index 신규 — H2 결의** (firestore.indexes.json):
```json
{ "collectionGroup": "tipsTopicPool", "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "order", "order": "ASCENDING" }
  ]
}
```

> **H2 결의** — `tipsHistory at DESC`는 단일 필드 인덱스 → Firestore 자동 생성. firestore.indexes.json에서 제외.

#### 3.1.3 `tipsHistory/{tickId}` (collection) — C4·L2 결의

```ts
// src/lib/tips/tips-config.ts (NOT server-only — pure types + literal union)
// C3 결의 — mirror lint가 "published-draft" + "skip-disabled" literal을 검증하므로 literal 보존 필수
export type TipsTickStatus =
  | 'published-draft'         // 정상 — draft 저장됨
  | 'skip-disabled'           // S2 enabled=false
  | 'skip-already-today'      // R16 일일 1건 제한
  | 'skip-no-topic'           // pool 소진 또는 모두 비활성
  | 'compose-fail'            // AI generate throw
  | 'hygiene-fail';           // hygiene score 미달

export interface TipsTickEvent {
  id: string;                 // Firestore doc id (derived)
  at: Date;                   // C4·L2 결의
  status: TipsTickStatus;
  topicId?: string;
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
}
```

> **H2 결의** — tipsHistory 단일 필드 `at` 인덱스는 Firestore 자동 생성. explicit 정의 X.

### 3.2 Functions runner 변경 (`functions/src/tips/runner.ts`) — H1·C2·M2 결의

**H1 결의** — 기존 cycle #30 imports (line 1-8) 보존. 신규 imports 3개 추가:

```ts
// functions/src/tips/runner.ts (수정 — H1 결의)
// === 기존 cycle #30 imports 보존 (lines 1-8) ===
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { composeTipDraft } from "./lib/tips-generator";
import { pickNextTopic } from "./lib/topic-pool";  // ← 시그니처 미변경 (C2 결의)
import { pickStockImage } from "./lib/stock-images";
import { getTodayKstStart, currentKstSeason } from "./lib/today-kst";
import { inferCategoriesFromTopic } from "./lib/infer-categories";
import { uniqueSlug } from "../auto-series/lib/slug";
// === 신규 imports 추가 (cycle #31) ===
import { readTipsAutoConfig } from "./lib/tips-config";
import { fetchActiveTopicPool, pickNextTopicFromPool } from "./lib/dynamic-topic-pool";
import { appendTipsHistory } from "./lib/tips-history";
```

```ts
// runTipsTick 본문 — 5 surgical patches (cycle #30 logic 보존)
export async function runTipsTick(now: Date): Promise<void> {
  const db = getFirestore();

  // [PATCH 1] config gate — S2 enabled 체크
  const config = await readTipsAutoConfig(db);
  if (!config.enabled) {
    await appendTipsHistory(db, { status: "skip-disabled" });
    console.log("[tips] disabled by admin — skip");
    return;
  }

  // R16 — 일일 1건 제한 (cycle #30 그대로)
  const todayKstStart = getTodayKstStart(now);
  const todaySnap = await db.collection("posts")
    .where("postType", "==", "tip")
    .where("createdAt", ">=", Timestamp.fromDate(todayKstStart))
    .limit(1).get();
  if (!todaySnap.empty) {
    // [PATCH 2] history append
    await appendTipsHistory(db, { status: "skip-already-today" });
    console.log("[tips] already generated today — skip");
    return;
  }

  // RAG anti-drift (cycle #30 그대로)
  const recentSnap = await db.collection("posts")
    .where("postType", "==", "tip")
    .orderBy("createdAt", "desc")
    .limit(20).get();
  const recentTitles = recentSnap.docs.map((d) => (d.data().title as string) ?? "");

  // [PATCH 3] dynamic topic pool — Firestore 우선 + static fallback (NEW-R24)
  // C2 결의 — cycle #30 pickNextTopic 시그니처 미변경, 신규 helper 사용
  const seasonNow = currentKstSeason(now);
  const pool = await fetchActiveTopicPool(db);  // empty면 static fallback 자체 처리
  const topic = pickNextTopicFromPool(pool, { recentTitles, seasonNow });
  if (!topic) {
    await appendTipsHistory(db, { status: "skip-no-topic" });
    console.warn("[tips] no available topic — pool exhausted");
    return;
  }

  // AI compose (cycle #30 그대로)
  let draft;
  try {
    draft = await composeTipDraft({ topic, recentTitles });
  } catch (e) {
    // [PATCH 4] history append
    await appendTipsHistory(db, {
      status: "compose-fail",
      topicId: topic.id,
      reason: e instanceof Error ? e.message.slice(0, 200) : String(e),
    });
    console.error("[tips] compose failed", e);
    return;
  }

  if (!draft.passed) {
    await appendTipsHistory(db, {
      status: "hygiene-fail",
      topicId: topic.id,
      hygieneScore: draft.hygieneScore,
      reason: draft.reasons.slice(0, 3).join(", "),
    });
    console.warn(`[tips] hygiene failed: ${draft.reasons.join(", ")}`);
    return;
  }

  // post create (cycle #30 그대로)
  const postId = nanoid16();
  const slug = await uniqueSlug(db, draft.title);
  await db.collection("posts").doc(postId).create({
    /* ... cycle #30 fields 그대로 ... */
  });

  // [PATCH 5] history append — 성공
  await appendTipsHistory(db, {
    status: "published-draft",
    topicId: topic.id,
    postId,
    postSlug: slug,
    hygieneScore: draft.hygieneScore,
  });

  console.log(`[tips] saved draft ${postId} topic=${topic.id}`);
}
```

> **C2·G6 결의** — `pickNextTopic` (cycle #30 시그니처)은 **미변경**. 신규 함수 `pickNextTopicFromPool(pool, args)`을 `dynamic-topic-pool.ts`에 추가. cycle #30 `topic-pool.ts` 0줄 변경 보존. R15 invariant 11번째 cycle 통과.

### 3.3 dynamic-topic-pool helper — C2·H3 결의

**Next.js side** (`src/lib/tips/dynamic-topic-pool.ts`):

```ts
import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { TIPS_TOPIC_POOL, type PickNextTopicArgs } from "./topic-pool";  // C2 결의
import type { TipTopic } from "./prompt";

/**
 * Firestore tipsTopicPool 우선 + 빈 collection 시 static fallback (R12·NEW-R24).
 */
export async function fetchActiveTopicPool(): Promise<TipTopic[]> {
  const snap = await adminDb
    .collection("tipsTopicPool")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .limit(50)
    .get();

  if (snap.empty) {
    return TIPS_TOPIC_POOL;  // R12·NEW-R24 fallback
  }

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: data.label as string,
      category: data.category as TipTopic["category"],
      season: (data.season ?? undefined) as TipTopic["season"] | undefined,
      intent: (data.intent ?? undefined) as TipTopic["intent"] | undefined,
      photoless: data.photoless === true,
    };
  });
}

/**
 * cycle #30 pickNextTopic 로직 + pool 인자 추가 (C2 결의 — cycle #30 함수 미변경).
 * 동일 4단계 알고리즘 (시즌 필터 → recent 회피 → 후보 0이면 시즌 해제 → 랜덤).
 */
export function pickNextTopicFromPool(
  pool: TipTopic[],
  args: PickNextTopicArgs,
): TipTopic | null {
  const { recentTitles, seasonNow } = args;
  const recentSet = new Set(recentTitles);

  const seasonal = pool.filter((t) => !t.season || t.season === seasonNow);
  const candidates = seasonal.filter((t) => !recentSet.has(t.label));

  const final = candidates.length > 0
    ? candidates
    : pool.filter((t) => !recentSet.has(t.label));

  if (final.length === 0) return null;
  return final[Math.floor(Math.random() * final.length)];
}
```

**Functions side mirror** — `functions/src/tips/lib/dynamic-topic-pool.ts`:

```ts
// H3 결의 — functions package는 @/ alias 없음 → 상대 import만 사용
import type { Firestore } from "firebase-admin/firestore";
import { TIPS_TOPIC_POOL, type PickNextTopicArgs } from "./topic-pool";
import type { TipTopic } from "./tips-generator";

export async function fetchActiveTopicPool(db: Firestore): Promise<TipTopic[]> {
  // 동일 로직 — 빈 시 fallback
  const snap = await db
    .collection("tipsTopicPool")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .limit(50)
    .get();
  if (snap.empty) return TIPS_TOPIC_POOL;
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: data.label as string,
      category: data.category as TipTopic["category"],
      season: (data.season ?? undefined) as TipTopic["season"] | undefined,
      intent: (data.intent ?? undefined) as TipTopic["intent"] | undefined,
      photoless: data.photoless === true,
    };
  });
}

export function pickNextTopicFromPool(
  pool: TipTopic[],
  args: PickNextTopicArgs,
): TipTopic | null {
  // 동일 4단계 알고리즘 (Next.js side와 동일)
  const { recentTitles, seasonNow } = args;
  const recentSet = new Set(recentTitles);
  const seasonal = pool.filter((t) => !t.season || t.season === seasonNow);
  const candidates = seasonal.filter((t) => !recentSet.has(t.label));
  const final = candidates.length > 0
    ? candidates
    : pool.filter((t) => !recentSet.has(t.label));
  if (final.length === 0) return null;
  return final[Math.floor(Math.random() * final.length)];
}
```

### 3.4 next-tick-time.ts (S7) — H4 결의

```ts
// src/lib/tips/next-tick-time.ts
import { toKstWallClock } from "@/lib/partner/auto-publish-window";

/**
 * cron `30 9-17 * * *` Asia/Seoul 패턴에 대해 다음 발화 KST 시각 계산.
 * Host TZ 무관 (cycle #28 패턴).
 *
 * H4 결의 — `nextAutoPublishWindow`은 weekday-window 의도(partner 자동 발행),
 *           본 helper는 cron `:30 hourly` 의도 (tips). 별도 함수로 작성.
 */
export interface NextTickResult {
  utc: Date;
  year: number;
  month: number;  // 1-based for display
  date: number;
  hours: number;
  minutes: number;
}

export function calculateNextTickTime(now: Date = new Date()): NextTickResult {
  const wall = toKstWallClock(now);
  const { year, month: m0, date, hours, minutes } = wall;

  let nextH: number;
  let nextDate = date;
  let nextMonth = m0;
  let nextYear = year;

  if (hours < 9) {
    nextH = 9;
  } else if (hours < 17) {
    if (minutes < 30) {
      nextH = hours;
    } else {
      nextH = hours + 1;
    }
  } else if (hours === 17 && minutes < 30) {
    nextH = 17;
  } else {
    nextH = 9;
    const tmp = new Date(Date.UTC(year, m0, date + 1));
    nextYear = tmp.getUTCFullYear();
    nextMonth = tmp.getUTCMonth();
    nextDate = tmp.getUTCDate();
  }

  const utc = new Date(
    Date.UTC(nextYear, nextMonth, nextDate, nextH - 9, 30, 0, 0),
  );

  return {
    utc, year: nextYear, month: nextMonth + 1, date: nextDate,
    hours: nextH, minutes: 30,
  };
}

export function formatNextTickKst(r: NextTickResult): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return `${r.year}-${pad2(r.month)}-${pad2(r.date)} ${pad2(r.hours)}:${pad2(r.minutes)} KST`;
}
```

### 3.5 tips-config-repository (Next.js) — C1·C4·M2 결의

`src/lib/firebase/tips-config-repository.ts`:

```ts
import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  TipsAutoConfig,
  TipsTopicDoc,
  TipsTickEvent,
} from "@/lib/tips/tips-config";

const SYS_DOC = () => adminDb.collection("system").doc("tipsAutoConfig");
const TOPICS = () => adminDb.collection("tipsTopicPool");
const HISTORY = () => adminDb.collection("tipsHistory");

export const tipsConfigRepository = {
  // Config
  async getConfig(): Promise<TipsAutoConfig> {
    const snap = await SYS_DOC().get();
    if (!snap.exists) {
      // R12 fallback — M6 결의 (UI 측에서 new Date(0) 검출)
      return { enabled: true, updatedAt: new Date(0), updatedBy: "admin" };
    }
    const d = snap.data()!;
    return {
      enabled: d.enabled !== false,
      updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),  // C4 결의
      updatedBy: "admin",  // C1·M2 결의 — 단일 admin
    };
  },

  // C1·M2 결의 — adminUid 인자 제거
  async setEnabled(enabled: boolean): Promise<void> {
    await SYS_DOC().set(
      {
        enabled,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "admin",
      },
      { merge: true },
    );
  },

  // Topics
  async listTopics(opts: { onlyActive?: boolean } = {}): Promise<TipsTopicDoc[]> {
    let q: FirebaseFirestore.Query = TOPICS();
    if (opts.onlyActive) q = q.where("isActive", "==", true);
    const snap = await q.orderBy("order", "asc").get();
    return snap.docs.map(toTipsTopicDoc);
  },

  async getTopic(id: string): Promise<TipsTopicDoc | null> {
    const snap = await TOPICS().doc(id).get();
    return snap.exists ? toTipsTopicDoc(snap) : null;
  },

  async addTopic(input: TipsTopicAddInput): Promise<string> {
    // L3 결의 — order millisecond collision 방지 (jitter)
    const order = Date.now() + Math.random();
    const ref = await TOPICS().add({
      ...input,
      isActive: true,
      order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "admin",  // C1·M2
    });
    return ref.id;
  },

  async updateTopic(id: string, patch: TipsTopicUpdateInput): Promise<void> {
    await TOPICS().doc(id).update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  async setTopicActive(id: string, isActive: boolean): Promise<void> {
    await TOPICS().doc(id).update({
      isActive,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  // History
  async listHistory(limit = 10): Promise<TipsTickEvent[]> {
    const snap = await HISTORY().orderBy("at", "desc").limit(limit).get();
    return snap.docs.map(toTipsTickEvent);
  },
};

function toTipsTopicDoc(snap: FirebaseFirestore.DocumentSnapshot): TipsTopicDoc {
  const d = snap.data()!;
  return {
    id: snap.id,  // L1 결의 — derived
    label: String(d.label ?? ""),
    category: d.category,
    season: d.season ?? null,
    intent: d.intent ?? null,
    photoless: d.photoless === true,
    isActive: d.isActive !== false,
    order: typeof d.order === "number" ? d.order : 0,
    createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(0),  // C4
    updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),  // C4
    createdBy: "admin",
  };
}

function toTipsTickEvent(snap: FirebaseFirestore.DocumentSnapshot): TipsTickEvent {
  const d = snap.data()!;
  return {
    id: snap.id,
    at: (d.at as Timestamp)?.toDate?.() ?? new Date(0),  // C4·L2
    status: d.status,
    topicId: typeof d.topicId === "string" ? d.topicId : undefined,
    postId: typeof d.postId === "string" ? d.postId : undefined,
    postSlug: typeof d.postSlug === "string" ? d.postSlug : undefined,
    hygieneScore: typeof d.hygieneScore === "number" ? d.hygieneScore : undefined,
    reason: typeof d.reason === "string" ? d.reason : undefined,
  };
}
```

### 3.6 admin-tips-config-actions.ts — C1·C6·M2·M3·M5·M10 결의

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { requireAdminApi } from "@/lib/auth/require-admin";

const topicSchema = z.object({
  label: z.string().min(5).max(120),
  category: z.enum(["bathroom", "kitchen", "aircon", "living", "move", "general"]),
  season: z.enum(["spring", "summer", "fall", "winter"]).nullable().optional(),
  intent: z.enum(["howto", "guide", "checklist", "comparison", "qa"]).nullable().optional(),
  photoless: z.boolean().default(false),
});

// C1·M2 결의 — adminUid 제거
export async function toggleAutoEnabled(enabled: boolean): Promise<void> {
  await requireAdminApi();
  await tipsConfigRepository.setEnabled(enabled);
  revalidatePath("/admin/tips");
}

// M3 결의 — plain server form (cycle #30 manual trigger 패턴 일치, RHF 미사용)
// M10 결의 — zod throw → redirect to ?error=validation 분기 (cycle #30 패턴)
export async function addTopic(formData: FormData): Promise<void> {
  await requireAdminApi();
  let parsed;
  try {
    parsed = topicSchema.parse({
      label: formData.get("label"),
      category: formData.get("category"),
      season: formData.get("season") || null,
      intent: formData.get("intent") || null,
      photoless: formData.get("photoless") === "on",
    });
  } catch (e) {
    console.warn("[admin-tips-config] addTopic validation failed", e);
    redirect("/admin/tips/topics/new?error=validation");
  }
  const id = await tipsConfigRepository.addTopic(parsed);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");  // L8 결의 — active count 카드 stale 방지
  redirect(`/admin/tips/topics?added=${encodeURIComponent(id)}`);
}

// C6 결의 — bind-style (action={updateTopic.bind(null, topicId)})
export async function updateTopic(topicId: string, formData: FormData): Promise<void> {
  await requireAdminApi();
  let parsed;
  try {
    parsed = topicSchema.parse({
      label: formData.get("label"),
      category: formData.get("category"),
      season: formData.get("season") || null,
      intent: formData.get("intent") || null,
      photoless: formData.get("photoless") === "on",
    });
  } catch (e) {
    console.warn("[admin-tips-config] updateTopic validation failed", e);
    redirect(`/admin/tips/topics/${encodeURIComponent(topicId)}?error=validation`);
  }
  await tipsConfigRepository.updateTopic(topicId, parsed);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");
  redirect(`/admin/tips/topics?updated=${encodeURIComponent(topicId)}`);
}

export async function setTopicActive(topicId: string, isActive: boolean): Promise<void> {
  await requireAdminApi();
  await tipsConfigRepository.setTopicActive(topicId, isActive);
  revalidatePath("/admin/tips/topics");
  revalidatePath("/admin/tips");  // L8 결의
}
```

### 3.7 admin UI 변경 — M4·M5·M9·L6 결의

#### `/admin/tips/page.tsx` 확장 (cycle #30 파일 수정)

```
[헤더] + [Flash banner]
+ [AdminTipsAutoConfigToggle]   ← S2 client toggle (서버에서 initial value 받음)
+ [ScheduleInfo]                 ← S7 server, M6 결의 (updatedAt=epoch 시 "기본값" 표시)
+ [StatCards]                    ← cycle #30 그대로
+ [AdminTipsHistoryTable]        ← S8 server, M9 결의 (try/catch + getAdminDataErrorMessage)
+ [DraftList]                    ← cycle #30 그대로
+ [TopicsLink]                   ← /admin/tips/topics 진입 버튼
```

각 신규 Suspense child는 `await connection()` 호출 (M4 결의 — cacheComponents 호환).

#### `/admin/tips/topics/page.tsx` (NEW) — L6 결의

```
[헤더] + [+ 신규 토픽] 버튼
+ [Flash banner]                 ← L6 결의 — added=*/updated=* 표시
+ [TopicListTable]
   - 컬럼: label / category / season / intent / photoless / isActive / 편집 / 토글
   - row: 모든 topic (isActive 무관)
   - 빨간 배지로 비활성 topic 강조
   - active=true count 표시 (Risk M 완화 — 마지막 1개 비활성화 confirm)
   - 토글 click → setTopicActive (server action) + revalidate
```

#### `/admin/tips/topics/new/page.tsx` (NEW) — M5·M10 결의

```
[헤더] [← 토픽 목록]
+ [Flash banner]                 ← error=validation 표시
+ [AdminTipsTopicForm action={addTopic}]  ← plain server form (M3 결의)
   - label (required), category (default: general)
   - season, intent (default: null/empty)
   - photoless (default: unchecked)
   - submit → addTopic server action → redirect /admin/tips/topics?added=…
```

#### `/admin/tips/topics/[topicId]/page.tsx` (NEW) — C6·M5 결의

```
[헤더] [← 토픽 목록]
+ [Flash banner]                 ← error=validation 표시
+ [AdminTipsTopicForm initial={topic} action={updateTopic.bind(null, topicId)}]  ← C6 결의
```

### 3.8 Critical invariants — G6·C2 결의 강화

- **R15 cycle #19 generator 11번째 무수정** — `partner-promo-generator.ts` 0줄
- **R1 auto-series runner 13번째 무수정** — `functions/src/auto-series/runner.ts` 0줄
- **NEW-R23** — 모든 runTipsTick 종료 path는 tipsHistory 1건 append (skip-disabled / skip-already-today / skip-no-topic / compose-fail / hygiene-fail / published-draft)
- **NEW-R24** — dynamic topic pool은 Firestore 우선 + static fallback (configure 실수 방어)
- **R12 (cycle #29) back-compat fallback** — Firestore config/topic doc 미존재 → cycle #30 동작
- **cycle #30 자체 immutability (G6 강화)** — `tips-generator.ts`, `prompt.ts`, `topic-pool.ts` (**C2 결의 — pickNextTopic 시그니처 미변경**), `stock-images.ts`, `today-kst.ts`, `infer-categories.ts`, `hygiene-guard.ts`, `tip-repository.ts`, `admin-tips-actions.ts` 모두 0줄 변경
- **Option A 코드 복제 6번째 사이클** — `tips-config.ts` + `dynamic-topic-pool.ts` + `tips-history.ts` 양 패키지 mirror (3 신규 mirror 파일)

---

## §4. Component / Module Inventory

### 4.1 신규 파일 (15) — M3·L4·L5 결의

| # | 파일 | 역할 | LOC |
|---|---|---|---:|
| 1 | `src/lib/tips/tips-config.ts` | Pure types (NOT server-only, **C5 결의**) + zod schema | 90 |
| 2 | `src/lib/tips/dynamic-topic-pool.ts` | fetchActiveTopicPool + **pickNextTopicFromPool (C2 결의)** | 120 |
| 3 | `src/lib/tips/next-tick-time.ts` | calculateNextTickTime + formatNextTickKst (S7) | 70 |
| 4 | `src/lib/tips/next-tick-time.test.ts` | **5 cases (M8 결의 — design wins)** | 100 |
| 5 | `src/lib/firebase/tips-config-repository.ts` | get/setConfig + topic CRUD + listHistory | 220 |
| 6 | `src/components/admin/AdminTipsAutoConfigToggle.tsx` | client toggle (S2) — server action 호출 | 80 |
| 7 | `src/components/admin/AdminTipsHistoryTable.tsx` | server S8 table (10건) + try/catch (**M9 결의**) | 120 |
| 8 | `src/components/admin/AdminTipsTopicForm.tsx` | **plain server form (M3 결의 — RHF 미사용)** | 100 |
| 9 | `src/app/admin/tips/topics/page.tsx` | Topic 목록 + active toggle + flash banner (L6) | 250 |
| 10 | `src/app/admin/tips/topics/new/page.tsx` | new topic form + error=validation banner | 70 |
| 11 | `src/app/admin/tips/topics/[topicId]/page.tsx` | topic 편집 form (C6 bind) + error banner | 90 |
| 12 | `src/app/actions/admin-tips-config-actions.ts` | toggleEnabled + addTopic + updateTopic + setTopicActive (**M10 결의 try/catch**) | 220 |
| 13 | `functions/src/tips/lib/tips-config.ts` | mirror — readTipsAutoConfig (functions side, **H3 결의 relative imports**) | 50 |
| 14 | `functions/src/tips/lib/dynamic-topic-pool.ts` | mirror — fetchActiveTopicPool + pickNextTopicFromPool | 100 |
| 15 | `functions/src/tips/lib/tips-history.ts` | appendTipsHistory + TipsTickStatus mirror (**C3 결의 literal 검증**) | 80 |

**소계 신규**: ~1,760 LOC. M3 결의로 row 8 -150 LOC (RHF → plain). L4 결의 — Plan 추정 1,650 + 110 (test 1 + history table). 총합 일관성 확인됨.

### 4.2 수정 파일 (5) — H2·M5 결의

| 파일 | 변경 |
|---|---|
| `src/app/admin/tips/page.tsx` | Toggle + ScheduleInfo + HistoryTable + TopicsLink 4 sections 추가 (~100 LOC 추가, 각 Suspense child `await connection()`) |
| `functions/src/tips/runner.ts` | 5 surgical patches (config + dynamic pool + history append) + 3 신규 imports (~40 LOC 추가) |
| `firestore.indexes.json` | `tipsTopicPool (isActive ASC, order ASC)` 1 신규. **H2 결의 — tipsHistory at DESC 자동, 미추가** |
| `firestore.rules` | tipsAutoConfig + tipsTopicPool + tipsHistory `read: if false; write: if false;` (Admin SDK only, **M7 결의**) |
| `scripts/check-queue-mirror.mjs` | 13 → 16 (3 신규 mirror check) |
| `package.json` | `pnpm test:tips` 확장 — next-tick-time.test 추가 |

> Plan §5.2 `package.json` 변경 — 1줄 추가 (DT0).

### 4.3 CI lint 확장 (13 → 16) — C3 결의

기존 13 (cycle #21~#30) + 신규 3:

```js
{
  title: "tips-config readTipsAutoConfig 양 패키지 (NEW cycle #31)",
  files: [
    "src/lib/tips/tips-config.ts",
    "functions/src/tips/lib/tips-config.ts",
  ],
  test: (src) => /TipsAutoConfig/.test(src),
},
{
  title: "dynamic-topic-pool fetchActiveTopicPool + pickNextTopicFromPool 양 패키지 (C2 결의)",
  files: [
    "src/lib/tips/dynamic-topic-pool.ts",
    "functions/src/tips/lib/dynamic-topic-pool.ts",
  ],
  test: (src) =>
    /fetchActiveTopicPool/.test(src) && /pickNextTopicFromPool/.test(src),
},
{
  title: "TipsTickStatus literal 양 패키지 (C3 결의 — drift 방지)",
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
    /hygiene-fail/.test(src),
},
```

> **C3 결의** — 마지막 check가 6개 status literal 모두 양 패키지에서 검증. drift 방지.

### 4.4 Test runner 확장 — M8 결의

```json
"scripts": {
  ...
  "test:tips": "npx tsx src/lib/llm/tips-generator.test.ts && npx tsx src/lib/tips/topic-pool.test.ts && npx tsx src/lib/tips/next-tick-time.test.ts"
}
```

총 13 cases (cycle #30 8 + cycle #31 5).

### 4.5 환경 변수
추가 없음.

---

## §5. API Contracts

### 5.1 Firestore admin SDK (functions runner)

```ts
async function readTipsAutoConfig(db: Firestore): Promise<TipsAutoConfig>
// doc 미존재 → R12 fallback { enabled: true, ... }

async function fetchActiveTopicPool(db: Firestore): Promise<TipTopic[]>
// 빈 collection → static TIPS_TOPIC_POOL fallback (NEW-R24)

function pickNextTopicFromPool(pool: TipTopic[], args: PickNextTopicArgs): TipTopic | null
// C2 결의 — cycle #30 pickNextTopic 시그니처 미변경, 신규 함수 별도

async function appendTipsHistory(
  db: Firestore,
  event: Omit<TipsTickEvent, "id" | "at">,
): Promise<void>
// at: serverTimestamp 자동
```

### 5.2 Server actions (Next.js) — C1·C6·M2 결의

```ts
async function toggleAutoEnabled(enabled: boolean): Promise<void>
// adminUid 인자 X (C1·M2 결의 — 단일 admin)

async function addTopic(formData: FormData): Promise<void>
// 성공: redirect /admin/tips/topics?added={id}
// zod fail: redirect /admin/tips/topics/new?error=validation (M10)

async function updateTopic(topicId: string, formData: FormData): Promise<void>
// C6 결의 — bind 패턴 사용: action={updateTopic.bind(null, topicId)}
// 성공: redirect /admin/tips/topics?updated={id}
// zod fail: redirect /admin/tips/topics/{id}?error=validation

async function setTopicActive(topicId: string, isActive: boolean): Promise<void>
// L8 — revalidate /admin/tips + /admin/tips/topics
```

### 5.3 calculateNextTickTime (UI)

```ts
function calculateNextTickTime(now?: Date): NextTickResult
function formatNextTickKst(r: NextTickResult): string
```

### 5.4 tipsConfigRepository (Next.js side)

```ts
{
  getConfig(): Promise<TipsAutoConfig>;       // R12 fallback
  setEnabled(enabled): Promise<void>;          // C1·M2 — uid 제거
  listTopics(opts?): Promise<TipsTopicDoc[]>;
  getTopic(id): Promise<TipsTopicDoc | null>;
  addTopic(input): Promise<string>;            // C1·M2 — uid 제거, jitter order
  updateTopic(id, patch): Promise<void>;
  setTopicActive(id, isActive): Promise<void>;
  listHistory(limit?): Promise<TipsTickEvent[]>;
}
```

---

## §6. UI Changes

| 위치 | 변화 |
|---|---|
| `/admin/tips` | Toggle (S2) + ScheduleInfo (S7, M6 fallback) + HistoryTable (S8, M9 try/catch) + TopicsLink |
| `/admin/tips/topics` (NEW) | 전체 topic 목록 + active toggle + flash banner (added/updated) + active count |
| `/admin/tips/topics/new` (NEW) | plain server form + error=validation banner |
| `/admin/tips/topics/[topicId]` (NEW) | edit form (bind) + error banner |
| Admin nav | "청소 노하우" 탭 그대로 (cycle #30) |

> 각 신규 Suspense child는 `await connection()` 호출 (**M4 결의**) — cacheComponents 호환.

---

## §7. Security & Privacy — M7 결의

`firestore.rules` 신규 블록 (M7 결의 — Admin SDK only 패턴, `quoteTrendKeywords` 동일):

```js
match /system/tipsAutoConfig {
  allow read: if false;
  allow write: if false;
}
match /tipsTopicPool/{topicId} {
  allow read: if false;
  allow write: if false;
}
match /tipsHistory/{tickId} {
  allow read: if false;
  allow write: if false;
}
```

- All server actions: `requireAdminApi()` 가드 + zod schema 검증 (M10 try/catch)
- `setTopicActive` race condition 안전 — Firestore atomic update
- `addTopic`·`updateTopic` zod label 5~120자 강제 (admin 신뢰 — sanitize 미적용)
- C1 결의 — single admin session, uid 추적 X. createdBy/updatedBy = "admin" literal

---

## §8. Implementation Order (S1–S16) — design 단계 확정

```
S1. tips-config.ts (Next.js)        — pure types + zod (NOT server-only)
S2. dynamic-topic-pool.ts (Next.js) — fetchActiveTopicPool + pickNextTopicFromPool
S3. next-tick-time.ts + .test.ts    — S7 helper + 5 cases
S4. tips-config-repository.ts       — Next.js Firestore access
S5. functions/tips/lib/tips-config.ts (mirror)
S6. functions/tips/lib/dynamic-topic-pool.ts (mirror — H3 relative imports)
S7. functions/tips/lib/tips-history.ts (appendTipsHistory + TipsTickStatus literals)
S8. functions/tips/runner.ts        — 5 surgical patches + 3 신규 imports (H1)
S9. admin-tips-config-actions.ts    — server actions (M10 try/catch + C6 bind 지원)
S10. AdminTipsAutoConfigToggle.tsx + AdminTipsHistoryTable.tsx + AdminTipsTopicForm.tsx
S11. /admin/tips/topics/page.tsx
S12. /admin/tips/topics/new/page.tsx + /[topicId]/page.tsx (C6 bind)
S13. /admin/tips/page.tsx — Toggle + Schedule + History + TopicsLink (M4 connection())
S14. firestore.indexes.json + firestore.rules (M7 admin-only)
S15. scripts/check-queue-mirror.mjs (13 → 16) + package.json test:tips 확장 (M8)
S16. typecheck (Next.js + functions) + build + tests + lint:mirror 16/16 + 통합 검증
```

격리: S1·S2·S3 독립 (lib 신규). S5·S6·S7 functions mirror — bulk. S8 functions runner — single file 수정. S9·S10·S11·S12·S13 admin UI — Suspense 단위 독립.

---

## §9. Test Plan

### 9.1 단위 테스트 — M8 결의 (5 cases)

#### next-tick-time.test.ts
1. `now = 2026-04-29 KST 08:00` → 다음 = `2026-04-29 09:30 KST`
2. `now = 2026-04-29 KST 14:15` → 다음 = `2026-04-29 14:30 KST`
3. `now = 2026-04-29 KST 14:30` → 다음 = `2026-04-29 15:30 KST`
4. `now = 2026-04-29 KST 17:31` → 다음 = `2026-04-30 09:30 KST`
5. `now = 2026-04-29 KST 23:59` (자정 직전) → 다음 = `2026-04-30 09:30 KST`

> Host TZ 무관 검증 — Node UTC 환경에서도 동일 결과.

### 9.2 통합 검증

- `pnpm exec tsc --noEmit` (Next.js + functions) — exit 0
- `pnpm exec next build` — full prerender (admin/tips, admin/tips/topics, /new, /[topicId] 모두 PPR)
- `pnpm test:tips` — 13 cases pass (cycle #30 8 + cycle #31 5)
- `pnpm lint:mirror` — 16/16
- 시나리오 1 (S2): admin Toggle OFF → 다음 tipsTick → skip-disabled 1건 history → /community/tips 변화 없음
- 시나리오 2 (S4): admin이 새 topic "테스트 주제" 추가 + active=true → 다음 tipsTick에서 candidates에 등장
- 시나리오 3 (S5): 모든 topic isActive=false → tipsTick → skip-no-topic 1건 history
- 시나리오 4 (S7): /admin/tips 표시된 다음 예정 시각이 실제 cron 발화 시각과 일치
- 시나리오 5 (S8): 시나리오 1·2·3 후 /admin/tips → history table에 각 시나리오 1건씩 표시

### 9.3 회귀 보호

- cycle #30 `pnpm test:tips` 8/8 (tips-generator + topic-pool) 그대로 유지
- cycle #29 lint:mirror 8 → cycle #30 13 → cycle #31 16
- cycle #30 `/admin/tips` 동작 유지 — 기존 StatCards + DraftList 정상

---

## §10. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| `tipsAutoConfig` doc 미존재 | R12 fallback `enabled: true` (getConfig 명시) | L |
| `tipsTopicPool` 빈 → 영구 skip-no-topic | NEW-R24 fallback → static TIPS_TOPIC_POOL | L |
| Admin이 모든 topic isActive=false | UI active count 표시 + 마지막 1개 confirm 경고 (S5) | M |
| tipsHistory 무한 증가 | listHistory limit(10). cycle #32+ TTL/cleanup 검토 | M |
| Topic CRUD race ↔ cron tick | Firestore atomic — 안전 | L |
| schedule 변경 안내 무시 | UI label 강조 + tooltip with sample 요청 텍스트 | L |
| AI footer (cycle #29 R14) 영향 | 영향 없음 — partner-promo postType만 footer | L |
| **C1**: getAdminUid 부재 | 단일 admin literal "admin" 사용 (cycle #30 패턴 일치) | L (해소됨) |
| **C2**: cycle #30 pickNextTopic 시그니처 변경 | 신규 함수 pickNextTopicFromPool 별도 작성 (cycle #30 0줄 변경 보존) | L (해소됨) |
| Next.js 16 cacheComponents — Toggle 즉시 반영? | revalidatePath + Suspense + connection() | L |
| `/admin/tips` 5+ Suspense | 각 child Skeleton fallback — 부분 렌더 | L |
| zod schema 미spec → 무한 throw | M10 결의 try/catch + redirect ?error=validation | L (해소됨) |

---

## §11. Open Questions (자체 답변 + design-validator 검증 결과)

| ID | Question | Resolution |
|----|---|---|
| OQ1 | `getAdminUid()` 존재? | **NO — C1 결의** — 단일 admin literal "admin" 사용. cycle #30 패턴 일치 (`runner.ts:94 providerOwnerUid: "admin"`). 별도 헬퍼 작성 X |
| OQ2 | tipsHistory 단일 필드 인덱스 explicit? | **NO — H2 결의** — Firestore 자동 생성. firestore.indexes.json에서 제외 |
| OQ3 | `tipsAutoConfig` doc 초기화 | admin 첫 토글 시점 — set merge로 자동 생성. R12 fallback 보장 |
| OQ4 | functions runner config read 빈도 | 매 tick fetch (50ms 내, 변경 즉시 반영). 비용 무시 |
| OQ5 | `pickNextTopic` 시그니처 변경? | **NO — C2 결의** — 신규 함수 `pickNextTopicFromPool` 별도 작성. cycle #30 0줄 변경 보존 |
| OQ6 | cycle #30 manual trigger dynamic pool 적용? | NO V1 — manual은 자유 form. cycle #32+ 검토 |
| OQ7 | Topic CRUD revalidate 범위 | `/admin/tips/topics` + `/admin/tips` (L8 결의 — active count stale 방지) |
| OQ8 | tipsTopicPool migration script? | NO — back-compat fallback 충분. cycle #30 30 static 그대로 보존 |
| **OQ9 (NEW)** | tips-config.ts에 server-only? | **NO — C5 결의** — pure types + zod, tsx test 가능 |
| **OQ10 (NEW)** | `firestore.rules` 패턴 | **M7 결의** — `read/write: if false` (Admin SDK only). quoteTrendKeywords 패턴 일치 |

---

## §12. Streak Context

cycles #21~#30 모두 ≥ 90% Match Rate single-pass. cycle #30 = 98.5% (10-streak 마일스톤).

cycle #31 = **11-streak 도전**:
- 큰 scope 두 번 연속 (cycle #30 ~1,710 LOC → cycle #31 ~2,010 LOC = 신규 1,760 + 수정 250)
- Firestore schema 신규 + 6 mirror 파일 + admin CRUD UI + 5 patches
- R15 invariant 11번째 cycle 무수정 — 두 자릿수 invariant longevity 유지
- R12 cycle #29 back-compat fallback 패턴 재사용 (3번째 cycle: #29 publishMode → #30 nothing → #31 config doc)
- Option A 코드 복제 6번째 cycle (3 신규 mirror 파일)

---

## §13. Next Step

```
/pdca do tips-admin-config
```

S1~S16 순차 진행. S1·S2·S3·S5·S6·S7 독립 (lib 신규). S8 single-file (functions runner). S9·S10·S11·S12·S13 admin UI Suspense 단위 독립. R15 invariant 11번째 검증 + cycle #30 자체 0줄 변경 검증.

---

## §14. 결의 매트릭스 (v0.1 → v0.2 — 29 issue 모두 결의)

### Critical (6)

| ID | Issue | 결의 |
|---|---|---|
| **C1** | `getAdminUid()` 부재 (admin-session.ts에 없음, JWT payload uid X) | §3.1.1·§3.1.2·§3.5·§3.6 — `updatedBy/createdBy: "admin"` literal 사용. `getAdminUid` import 제거. cycle #30 패턴 일치 (`runner.ts:94`) |
| **C2** | `pickNextTopic` 시그니처 변경 risk → cycle #30 immutability 깨짐 | §3.2·§3.3·§3.8·§4.1#2·§4.3·§5.1·§11 OQ5 — 신규 함수 `pickNextTopicFromPool(pool, args)`을 dynamic-topic-pool.ts에 추가. cycle #30 `topic-pool.ts:pickNextTopic` 0줄 변경 보존. R15·G6 통과 |
| **C3** | tips-history mirror lint check가 Next.js side에서 함수 미존재 | §4.3 — 마지막 check를 6개 TipsTickStatus literal 검증으로 변경. 양 패키지에서 string literal 모두 보존 강제 |
| **C4** | Timestamp/Date type drift (interface vs repo conversion) | §3.1.1·§3.1.2·§3.1.3·§3.5 — 모든 interface가 `Date` 타입 사용. Firestore Timestamp는 repo에서 `.toDate()` 변환 |
| **C5** | tips-config.ts에 server-only → tsx test blocking | §3.1.1 코멘트 + §11 OQ9 — pure types + zod만 (NOT server-only). prompt.ts 패턴 일치 |
| **C6** | Server action bind 패턴 잘못 — `(fd) => updateTopic(topicId, fd)` invalid | §3.6·§3.7·§5.2 — `action={updateTopic.bind(null, topicId)}` 사용. cycle #30 manual trigger 패턴 X (parameterized 필요 시 bind) |

### High (5)

| ID | Issue | 결의 |
|---|---|---|
| **H1** | functions runner 기존 imports 보존 명시 누락 | §3.2 — 기존 imports (lines 1-8) preserved + 3 신규 imports 추가 명시 |
| **H2** | tipsHistory at DESC explicit index → plan과 design 불일치 | §3.1.3 + §4.2 — Firestore 단일 필드 자동 생성. firestore.indexes.json에서 제거. plan §5.2 update 권장 (Plan은 archive 후 변경 X — design이 정답) |
| **H3** | functions package `@/` alias 부재 → mirror import 패턴 | §3.3·§4.1 row 14 — functions side는 relative imports만 사용 (예: `./topic-pool`, `./tips-generator`) |
| **H4** | `nextAutoPublishWindow`과 `calculateNextTickTime` 중복? | §3.4 NOTE — `nextAutoPublishWindow`은 weekday-window 의도, 본 helper는 cron `:30 hourly` 의도. 별도 함수 — 의도 분리 명시 |
| **H5** | compose-fail searchParam ↔ tipsHistory 충돌 | §3.7 + §4.2 — `?error=compose-fail` 은 manual trigger 전용. cron 실패는 tipsHistory에만 기록. 두 path 분리 명시 |

### Medium (10)

| ID | Issue | 결의 |
|---|---|---|
| **M1** | tipsHistory.at type drift (Timestamp vs serverTimestamp) | C4와 동일 — Date interface, repo 변환 |
| **M2** | setEnabled adminUid 필요? | C1과 동일 — adminUid 인자 제거 |
| **M3** | TopicForm — RHF vs plain server form? | §3.7·§4.1 row 8 — plain server form (cycle #30 패턴 일치, ~100 LOC, RHF 250 LOC 절감 -150) |
| **M4** | revalidatePath + cacheComponents Suspense 즉시 반영? | §3.7·§6 — 각 신규 Suspense child가 `await connection()` 호출. cacheComponents opt-out 보장 |
| **M5** | 기본 form 값 — category/season/intent/photoless | §3.7 — category default 'general', season/intent default null (empty string), photoless default unchecked |
| **M6** | getConfig fallback `new Date(0)` UI 표시 | §3.5 + §3.7 ScheduleInfo + §10 — UI에서 `getTime() === 0` 검출 → "기본값 (Firestore 미설정)" 라벨 |
| **M7** | firestore.rules 패턴 — read:if false vs admin claim? | §7 + §11 OQ10 — `read/write: if false` (Admin SDK only). quoteTrendKeywords 패턴 일치. explicit 블록 명시 |
| **M8** | next-tick-time.test cases 4 vs 5 | §9.1 + §4.1 row 4 — design wins (5 cases, midnight edge 포함). plan은 archive (변경 X) |
| **M9** | listHistory index 미준비 시 throw | §3.7 HistoryTable + §10 — try/catch + getAdminDataErrorMessage 패턴 (cycle #30 hotfix 재사용). graceful UI banner |
| **M10** | zod parse throw → Next.js error boundary | §3.6 + §10 — addTopic + updateTopic try/catch + redirect ?error=validation. cycle #30 manual trigger 패턴 일치 |

### Low (8)

| ID | Issue | 결의 |
|---|---|---|
| **L1** | TipsTopicDoc.id Firestore 저장 X | §3.1.2 코멘트 — `derived, not stored` 명시 |
| **L2** | TipsTickEvent.at Date | C4와 동일 |
| **L3** | order Date.now() collision | §3.1.2 + §3.5 addTopic — `Date.now() + Math.random()` jitter |
| **L4** | LOC 합 1830 vs 1650 | §4.1 — M3 결의로 row 8 -150 → 신규 1,760. delta +110 (test 1 + history table) — 합리화 명시 |
| **L5** | filename `admin-tips-config-actions.ts` collision risk | §4.1 row 12 — cycle #30 `admin-tips-actions.ts`와 별개. naming 그대로 (`-config` suffix로 구분) |
| **L6** | added=*/updated=* 플래시 banner | §3.7 + §6 — `/admin/tips/topics`에 flash banner 추가 (added/updated/error 케이스) |
| **L7** | mirror check 3 regex 명확성 | §4.3 마지막 check — 6개 literal 모두 검증으로 explicit |
| **L8** | setTopicActive revalidate scope | §3.6 + §11 OQ7 — `/admin/tips/topics` + `/admin/tips` 양쪽 revalidate (active count stale 방지) |

---

## §15. v0.2 Final State

- **신규 파일**: 15개 / ~1,760 LOC (M3 결의로 -150)
- **수정 파일**: 5개 + package.json (1줄) / ~250 LOC
- **총합**: ~2,010 LOC, 21 file touches
- **CI lint**: 13 → 16 (3 신규 mirror check)
- **Test cases**: cycle #30 8 + cycle #31 5 = 13
- **R15 invariant**: 11번째 cycle 무수정 도전 (C2 결의로 cycle #30 immutability 보존)
- **R12 fallback**: 3번째 cycle 적용 (#29 → #30 → #31)
- **Option A**: 6번째 cycle (3 신규 mirror)
- **결의 매트릭스**: 29 issues 1:1 매핑 (6 Critical + 5 High + 10 Medium + 8 Low)

11-streak 도전 — cycle #30 보다 큰 scope이지만 design-validator reality-check로 모든 issue 사전 결의. single-pass ≥ 90% 가능성 높음.
