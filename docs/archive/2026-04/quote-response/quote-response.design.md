---
template: design
version: 0.1
feature: quote-response
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# quote-response Design Document

> **Summary**: 청명이 의뢰인 견적 요청을 받아 triage(관심없음/제안하기)하고 항목별 분해 견적서를 작성·전송하는 Marketplace v1.1 2번째 feature. Figma Tinder-like 1-by-1 triage + 견적 작성 폼 + quotes/providerResponses 컬렉션 신규 + QuoteStatus 6-state 확장.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Status**: Draft
> **Plan**: [quote-response.plan.md](../../01-plan/features/quote-response.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** category 단일 유지 | 기존 `category: QuoteCategory` 단일 필드 유지. Triage 쿼리는 `where('category', 'in', provider.categories)` (QuoteCategory 6개 ≤ Firestore `in` 10개 제한). |
| **Q2** 'responded' status 마이그레이션 | MVP 배포 전 실데이터 0건이므로 하드 cutover. `QuoteStatus` enum에서 'responded' 제거, 'quoted' 로 대체. `toQuoteRequest` read-alias 방어: `'responded'` 문자열을 `'quoted'` 로 매핑 (defense-in-depth). |
| **Q3** ProviderResponse composite id | `${providerId}_${requestId}` · 두 id 모두 Firestore auto-id([a-zA-Z0-9]{20}) or nanoid — 언더스코어 없음 → 충돌 불가. |
| **Q4** quote items min/max | `useFieldArray` min=1 (기본항목 자동 1줄), max=10 (UI 간결성). Zod `.min(1).max(10)` 강제. |
| **Q5** Proposal 제출 후 redirect | `/provider/requests` 로 이동 (큐에서 자연 pop, 다음 요청 triage 연속성). Toast "견적 {totalAmount}원 전송됨" 표시. |
| **Q6** 빈 큐 empty state | "모두 확인했어요! 새 요청이 도착하면 알려드릴게요" · 홈 링크. v1.1b real-time badge는 provider-dashboard 에서. |
| **Q7** 신규 env | 없음. 이메일 알림 미포함. 기존 env 재활용. |
| **Q8** 견적서 pdf/이메일 | out-of-scope v1.1b. 현재는 앱 내 `quotes/{id}` 저장만. |

---

## 1. Overview

### 1.1 Design Goals
- Figma 1:1 충실 구현 (Tinder-like card + 3-action bar)
- 평균 5분 이내 견적 제출 (항목 분해 폼 UX 최적화)
- QuoteStatus 6-state enum 전이 100% 일관성 (후속 v1.2 chat/v1.3 booking 기반 제공)
- 기존 자산 최대 재활용: `AppError`·`ActionResult`·`errors.ts`·`rate-limit.ts`·`quote-request-repository`·`provider-repository`·`user-repository`

### 1.2 Design Principles
- **Server-first 데이터**: triage 페이지 server shell → Suspense 내부에서 Firestore read (Cache Components 준수)
- **Atomic 제안**: `submitQuote`는 TX로 quotes.create + providerResponses.set + quoteRequests.update 묶음
- **Role guard**: `/provider/*` 라우트는 proxy.ts matcher + 페이지 레벨 double guard (user.providerId + providers doc 존재)
- **Idempotent pass**: `providerResponses.{status:'passed'}` upsert merge — 중복 pass 시 no-op
- **Graceful failure**: 의뢰인 이메일 알림은 v1.1b로 이연, MVP는 Firestore write만 성공 기준

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│ /provider/profile (기존 stub)                            │
│  + "받은 요청 보기 →" 링크 추가                            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ /provider/requests (Server shell)                       │
│  └─ Suspense <TriageSkeleton>                           │
│       └─ <TriageBody>                                   │
│            verifySessionCookie → uid                    │
│            userRepository.get(uid).providerId guard     │
│            providerRepository.get(providerId)           │
│            quoteRequestRepository.listForTriage({...})  │
│            providerResponseRepository.listPassedOrQuoted│
│            (pass/quoted 제외된 큐 계산)                  │
│            → <TriageClient requests={...} provider={...}│
│                                                          │
│ TriageClient (Client):                                  │
│   - currentIndex state                                  │
│   - <RequestCard request={currentRequest} />            │
│   - <TriageActionBar                                    │
│       onPass={() => { passRequest(id); nextIndex(); }}  │
│       onAsk={() => toast('v1.2 예정')} disabled          │
│       onPropose={() => router.push(`.../${id}/propose`)}│
│     />                                                   │
│   - pagination "N/M · 역삼 주변" 상단                    │
└─────────────────────────────────────────────────────────┘
                         │ Propose 클릭
                         ▼
┌─────────────────────────────────────────────────────────┐
│ /provider/requests/{id}/propose (Server shell)          │
│  └─ Suspense <ProposeFormSkeleton>                      │
│       └─ <ProposeFormBody>                              │
│            verifySessionCookie + providerId guard       │
│            quoteRequestRepository.get(id)               │
│            providerResponseRepository.get(...)          │
│            (이미 'quoted'면 ALREADY_QUOTED redirect)     │
│            → <QuoteProposalForm                         │
│                request={...} provider={...} />          │
│                                                          │
│ QuoteProposalForm (Client):                             │
│   RHF + zodResolver + useFieldArray(items)              │
│   자동 계산 totalAmount = sum(items.price)              │
│   submit → submitQuote Server Action                    │
└─────────────────────────────────────────────────────────┘
                         │ submit
                         ▼
[Server Action: submitQuote]
  1. Zod parse
  2. verifySessionCookie → uid + providerId guard
  3. Rate limit 'quote:${providerId}' 1분 10건
  4. quoteRequest get·status guard (submitted|quoted 허용)
  5. providerResponse get·already-quoted guard
  6. Firestore TX:
     - quotes/{newId}.create(...)
     - providerResponses/{providerId}_{requestId}.set({status:'quoted', respondedAt})
     - quoteRequests/{requestId}.update({status:'quoted'}) (already 'quoted'면 no-op)
  7. return {ok:true, data:{quoteId}}
                         │
                         ▼
Client: router.replace('/provider/requests') + toast
```

### 2.2 Data Flow (Triage 큐 계산)

```
Input:
  providerId, provider.categories  (sign-up에서 1~6개)

Step 1 — quoteRequests query (Firestore):
  where('category', 'in', provider.categories)   // max 10
  where('status', 'in', ['submitted', 'quoted']) // 응답 가능한 상태만
  order by createdAt desc
  limit 50

Step 2 — 내 providerResponses 조회:
  where('providerId', '==', providerId)
  where('status', 'in', ['passed', 'quoted'])
  (결과 requestId Set 생성)

Step 3 — 필터:
  queue = quoteRequests.filter(r => !respondedSet.has(r.id))

Step 4 — UI 렌더:
  currentIndex = 0
  "N/M · {provider.regions[0].district || '전국'} 주변"
```

---

## 3. Data Model

### 3.1 신규 `quotes/{quoteId}`

```typescript
// src/types/quote.ts (신규)
export interface QuoteItem {
  label: string;       // "기본 입주청소", "에어컨 1대", "창문 외부"
  price: number;       // 원 단위 정수
  note?: string | null;
}

export type QuoteStatus = "sent" | "accepted" | "rejected";

export interface Quote {
  id: string;
  requestId: string;           // quoteRequests FK
  providerId: string;
  clientUid: string;           // denormalized (received-quotes 쿼리 용)
  items: QuoteItem[];          // min 1, max 10
  scheduledAt: Date | null;    // 4월 22일 14:00
  estimatedWorkHours: number | null;
  totalAmount: number;         // sum(items.price) — 서버 재계산
  insured: boolean;
  insuranceAmount?: number | null;
  status: QuoteStatus;
  sentAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
}
```

### 3.2 신규 `providerResponses/{providerId_requestId}`

```typescript
// src/types/provider-response.ts (신규)
export type ProviderResponseStatus = "passed" | "quoted";

export interface ProviderResponse {
  id: string;                      // "{providerId}_{requestId}"
  providerId: string;
  requestId: string;
  status: ProviderResponseStatus;
  respondedAt: Date;
}
```

### 3.3 `quoteRequests` 확장

```typescript
// src/types/quote-request.ts — 수정
export type QuoteStatus =
  | "submitted"
  | "quoted"         // 'responded' → 'quoted' 변경
  | "negotiating"
  | "booked"
  | "completed"
  | "cancelled";

// 신규
export type RoomType =
  | "원룸"
  | "투룸"
  | "쓰리룸"
  | "포룸이상"
  | "오피스텔"
  | "기타";

export interface QuoteRequest {
  // ... 기존
  roomType?: RoomType;   // v1.1 quote-response 확장
  status: QuoteStatus;   // enum 확장
}
```

**Repository read 방어** (`quote-request-repository.ts` `toQuoteRequest`):
```ts
const rawStatus = d.status as string;
const normalizedStatus: QuoteStatus =
  rawStatus === "responded" ? "quoted" : (rawStatus as QuoteStatus);
```

### 3.4 `QuoteCategory` — `in` 쿼리 지원

Firestore `in` 쿼리는 10개 이하 허용. QuoteCategory 6개 → 안전. 그러나 향후 확장 여지 고려해 `query-helpers.ts` 유틸로 chunk split 패턴 문서화 (MVP는 미구현, 주석만).

### 3.5 Firestore Rules 추가

```javascript
// quotes (청명 own/client own read, 청명 create only, no update/delete)
match /quotes/{quoteId} {
  function myProviderId() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.providerId;
  }
  allow read: if request.auth != null
              && (
                resource.data.providerId == myProviderId()
                || resource.data.clientUid == request.auth.uid
              );
  allow create: if request.auth != null
                && request.resource.data.providerId == myProviderId()
                && request.resource.data.status == 'sent';
  allow update: if false;  // 서버 Admin SDK만 (accept/reject 시)
  allow delete: if false;
}

// providerResponses (청명 own read·upsert)
match /providerResponses/{docId} {
  function myProviderId() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.providerId;
  }
  allow read: if request.auth != null
              && resource.data.providerId == myProviderId();
  allow create, update: if request.auth != null
                        && request.resource.data.providerId == myProviderId()
                        && request.resource.data.status in ['passed', 'quoted'];
  allow delete: if false;
}

// quoteRequests.update — 기존 'false' 유지 (Admin SDK bypass로 서버만 status 전이)
```

### 3.6 Firestore Indexes 추가

```json
[
  // Triage 큐 (category × status × createdAt)
  {
    "collectionGroup": "quoteRequests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "category", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  // Quotes by request (received-quotes 준비)
  {
    "collectionGroup": "quotes",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "requestId", "order": "ASCENDING" },
      { "fieldPath": "sentAt", "order": "DESCENDING" }
    ]
  },
  // ProviderResponses by provider × status (triage 필터)
  {
    "collectionGroup": "providerResponses",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "providerId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  }
]
```

---

## 4. API Specification

### 4.1 Server Action `passRequest`

```ts
// src/app/actions/quote-response-actions.ts
'use server';

export interface PassRequestInput {
  requestId: string;
}

export async function passRequest(
  input: PassRequestInput,
): Promise<ActionResult<{ requestId: string }>>;
```

**5-step**:
1. `verifySessionCookie` → uid
2. `userRepository.get(uid).providerId` — 없으면 `FORBIDDEN`
3. Zod: `z.object({ requestId: z.string().min(10) })`
4. `providerResponses/{providerId}_{requestId}.set({providerId, requestId, status:'passed', respondedAt: serverTimestamp()}, {merge:true})`
5. return `{ok:true, data:{requestId}}`

### 4.2 Server Action `submitQuote`

```ts
export interface SubmitQuoteInput {
  requestId: string;
  items: Array<{ label: string; price: number; note?: string | null }>;
  scheduledAt: string | null;       // ISO string (client → server)
  estimatedWorkHours: number | null;
  insured: boolean;
  insuranceAmount?: number | null;
}

export async function submitQuote(
  input: SubmitQuoteInput,
): Promise<ActionResult<{ quoteId: string }>>;
```

**10-step**:
1. `verifySessionCookie` → uid
2. `userRepository.get(uid).providerId` guard (없으면 `FORBIDDEN`)
3. Zod: `submitQuoteInputSchema.parse(input)` — items min/max, price ≥ 0, ISO date, etc.
4. Rate limit `checkAndIncrement('quote:'+providerId, 10, 60_000)` (1분 10건)
5. `quoteRequestRepository.get(requestId)` — 없으면 `INVALID_INPUT`. status ∉ `{submitted, quoted}` 이면 `INVALID_STATE` (이미 booked/completed/cancelled 된 요청)
6. `providerResponseRepository.get({providerId, requestId})` — status === 'quoted' 이면 `ALREADY_QUOTED`
7. Firestore TX:
   - `quotes/{providerRef.doc()}.create({requestId, providerId, clientUid: request.clientUid, items, scheduledAt: Timestamp.fromDate OR null, estimatedWorkHours, totalAmount, insured, insuranceAmount, status:'sent', sentAt: serverTimestamp()})`
   - `providerResponses/{providerId}_{requestId}.set({providerId, requestId, status:'quoted', respondedAt: serverTimestamp()}, {merge:true})`
   - `quoteRequests/{requestId}.update({status:'quoted'})` — already 'quoted'면 update 자체는 idempotent
8. return `{ok:true, data:{quoteId}}`
9. 에러 매핑: ZodError → `INVALID_INPUT`, AppError → `toActionError`, 기타 → `INTERNAL_ERROR`
10. Client: `router.replace('/provider/requests')` + toast

**신규 `AppErrorCode` 추가**: `INVALID_STATE`, `ALREADY_QUOTED`

### 4.3 Zod Schemas

```ts
// src/domain/quote-proposal-schema.ts (신규)
import { z } from 'zod';
import { QUOTE_CATEGORIES, type QuoteCategory } from './quote-category';

export const quoteItemSchema = z.object({
  label: z.string().min(1, '항목명 필수').max(40),
  price: z.number().int().min(0).max(100_000_000),
  note: z.string().max(200).nullable().optional(),
});

export const submitQuoteInputSchema = z.object({
  requestId: z.string().min(10),
  items: z.array(quoteItemSchema).min(1, '최소 1개 항목').max(10),
  scheduledAt: z.string().datetime().nullable(),
  estimatedWorkHours: z.number().int().min(1).max(48).nullable(),
  insured: z.boolean(),
  insuranceAmount: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteInputSchema>;

export const passRequestInputSchema = z.object({
  requestId: z.string().min(10),
});

export type PassRequestInput = z.infer<typeof passRequestInputSchema>;

// ─── UI용 client form schema (useFieldArray 호환) ─────
export const proposalFormSchema = z.object({
  requestId: z.string().min(10),
  items: z.array(quoteItemSchema).min(1).max(10),
  scheduledAtDate: z.string().optional(),    // yyyy-mm-dd
  scheduledAtTime: z.string().optional(),    // HH:mm
  estimatedWorkHours: z.number().int().min(1).max(48).nullable(),
  insured: z.boolean(),
  insuranceAmount: z.number().int().min(0).nullable().optional(),
});

export type ProposalFormInput = z.infer<typeof proposalFormSchema>;
```

### 4.4 Repositories

```ts
// src/lib/firebase/quote-repository.ts (신규)
export const quoteRepository = {
  async create(data: Omit<Quote, 'id' | 'sentAt'>): Promise<string> { ... },
  async get(id: string): Promise<Quote | null> { ... },
  async listByRequest(requestId: string): Promise<Quote[]> { ... },  // received-quotes 용
  async listByProvider(providerId: string, limit = 50): Promise<Quote[]> { ... },  // provider-dashboard 용
};

// src/lib/firebase/provider-response-repository.ts (신규)
export const providerResponseRepository = {
  async get(providerId: string, requestId: string): Promise<ProviderResponse | null> { ... },
  async upsertPassed(providerId: string, requestId: string): Promise<void> { ... },
  async upsertQuoted(providerId: string, requestId: string): Promise<void> { ... },
  async listRespondedRequestIds(providerId: string): Promise<Set<string>> {
    // where('providerId','==',providerId).where('status','in',['passed','quoted'])
    // returns Set of requestIds
  },
};

// src/lib/firebase/quote-request-repository.ts (확장)
export const quoteRequestRepository = {
  // ... 기존
  async listForTriage(options: {
    providerCategories: QuoteCategory[];  // max 6
    excludeRequestIds: Set<string>;
    limit?: number;
  }): Promise<QuoteRequest[]> {
    const q = col()
      .where('category', 'in', options.providerCategories)
      .where('status', 'in', ['submitted', 'quoted'])
      .orderBy('createdAt', 'desc')
      .limit(options.limit ?? 50);
    const snap = await q.get();
    return snap.docs
      .map(d => toQuoteRequest(d.id, d.data()))
      .filter(r => !options.excludeRequestIds.has(r.id));
  },
};
```

---

## 5. UI / UX Design

### 5.1 `/provider/requests` (Triage)

Figma 충실 반영:

```
┌────────────────────────────────────────┐
│  받은 요청          🔽 필터 (v1.1b)    │
│  1 / 3 · 역삼 주변                      │
├────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐ │
│  │ [입주청소] [비정기 1회]           │ │  카테고리 칩
│  │                                   │ │
│  │ 역삼동 · 32평 · 동네              │ │  제목
│  │                                   │ │
│  │ ┌────┐ ┌────┐                     │ │  사진 (1-3장, 없으면 skeleton)
│  │ └────┘ └────┘                     │ │
│  │                                   │ │
│  │ 📅 희망일정  4월 24일(목) 오전     │ │
│  │ 📍 지역      역삼동                │ │
│  │ 🏠 공간      32평 · 투룸          │ │
│  │ 👥 경쟁 청명  3명                  │ │
│  │                                   │ │
│  │ 고객 요청사항                      │ │
│  │ ┌────────────────────────────┐    │ │
│  │ │ 이사 들어가기 전 청소...      │    │ │
│  │ └────────────────────────────┘    │ │
│  │                                   │ │
│  │ 표준 견적 범위                     │ │  (provider.priceBook[category]
│  │ 24~30만원                         │ │   없으면 숨김)
│  └──────────────────────────────────┘ │
├────────────────────────────────────────┤
│ [ ✗ ]  [ 💬 ]  [ ✓ 제안하기 ]          │  bottom fixed action bar
│ 관심없음  문의   (primary)              │  문의 disabled
└────────────────────────────────────────┘
```

빈 큐:
```
┌────────────────────────────────────────┐
│  받은 요청                              │
│  0 / 0                                  │
├────────────────────────────────────────┤
│         🎉                              │
│                                         │
│   모두 확인했어요!                      │
│   새 요청이 도착하면 알려드릴게요         │
│                                         │
│   [ 홈으로 ]                            │
└────────────────────────────────────────┘
```

### 5.2 `/provider/requests/{id}/propose` (견적 작성)

```
┌────────────────────────────────────────┐
│  ← 받은 요청                            │
├────────────────────────────────────────┤
│  견적 작성                              │
│  입주청소 · 역삼동 · 32평               │  요약 1줄
│                                         │
│  항목                                   │
│  ┌──────────────────────────┐ [삭제]   │
│  │ 기본 입주청소               │          │
│  │ 240000원                   │          │
│  └──────────────────────────┘          │
│  ┌──────────────────────────┐ [삭제]   │
│  │ 에어컨 1대                  │          │
│  │ 30000원                    │          │
│  └──────────────────────────┘          │
│  [ + 항목 추가 ]                        │  disabled when items.length >= 10
│                                         │
│  희망 일정                              │
│  [ 4/22(화) ▾ ] [ 14:00 ▾ ]            │
│                                         │
│  작업 예상 시간                         │
│  [ 5 ] 시간                             │
│                                         │
│  [x] 배상보험 가입                      │
│  배상보험 금액 (insured 시)             │
│  [ 300000000 ] 원                       │
│                                         │
│  ─────────────────────────              │
│  합계                     270000원       │  실시간 계산
│                                         │
│  [   270,000원 견적 제출   ]            │
└────────────────────────────────────────┘
```

### 5.3 `/provider/profile` 수정 (기존 stub에 링크 추가)

등록 정보 섹션 아래에:
```
[ 받은 요청 보기 → ]
```
버튼 추가. `/provider/requests` 링크.

### 5.4 Component List

| Component | Type | Location | Role |
|-----------|------|----------|------|
| `RequestCard` | Server | `components/provider/RequestCard.tsx` | Figma 카드 상단부 (카테고리·제목·사진·details·note·견적범위) |
| `TriageClient` | Client | `components/provider/TriageClient.tsx` | currentIndex state + 3-action 핸들러 |
| `TriageActionBar` | Client | (동일 파일 또는 분리) | Pass/Ask/Propose 버튼 fixed-bottom |
| `EmptyQueue` | Server | (동일 파일) | 빈 큐 상태 |
| `QuoteProposalForm` | Client | `components/provider/QuoteProposalForm.tsx` | RHF + useFieldArray + submit |
| `RequestSummaryBar` | Server | (propose page에서) | propose 헤더 1줄 |

---

## 6. Error Handling

| Code | User Message | Recovery |
|------|-------------|----------|
| `INVALID_INPUT` | 필드별 zod 메시지 | 폼 유지 + inline 에러 |
| `UNAUTHORIZED` | "로그인이 필요합니다" | `/login?next=...` |
| `FORBIDDEN` | "청명 계정만 접근 가능합니다" | `/signup-provider` redirect |
| `INVALID_STATE` | "이 요청은 이미 다른 청명이 거래중입니다" | /provider/requests 복귀 |
| `ALREADY_QUOTED` | "이미 견적을 보낸 요청입니다" | /provider/requests 복귀 |
| `RATE_LIMITED` | "요청이 많습니다. 잠시 후 다시 시도해주세요" | disable + 자동 retry |
| `INTERNAL_ERROR` | "일시적 오류" | retry |

---

## 7. Security Considerations

- **Role guard 2-tier**: proxy.ts matcher + 페이지 레벨 `userRepository.get(uid).providerId` 검사
- **Provider doc 존재 확인**: `providers.get(providerId)` null 시 `/signup-provider` redirect (orphan users 방지)
- **Server-side totalAmount 재계산**: client의 totalAmount 신뢰하지 않음. `items.reduce((s,i)=>s+i.price,0)` 서버에서 재계산해 저장.
- **Rate limit**: `quote:{providerId}` 1분 10건 — bot 방지 + DoS 완화
- **Firestore rules double-check**: `get(users/uid).providerId == request.resource.data.providerId` Admin SDK 우회되므로 서버만 실제 쓰기. rules는 client 변조 방어.
- **Server totalAmount 일관성**: Zod schema는 totalAmount를 받지 않음 (client 계산은 display만, 서버 재계산)
- **ProviderResponse composite id**: 자연스럽게 1:1 unique constraint (같은 청명이 같은 요청에 중복 응답 불가)

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation (Server)** | `app/provider/requests/page.tsx`, `app/provider/requests/[id]/propose/page.tsx` |
| **Presentation (Client)** | `components/provider/TriageClient.tsx`, `components/provider/QuoteProposalForm.tsx` |
| **Application** | `app/actions/quote-response-actions.ts` (passRequest + submitQuote) |
| **Domain** | `domain/quote-proposal-schema.ts`, 기존 `quote-category.ts` 재사용 |
| **Infrastructure** | `lib/firebase/quote-repository.ts` (신규), `lib/firebase/provider-response-repository.ts` (신규), `lib/firebase/quote-request-repository.ts` (확장), 기존 `user-repository.ts`/`provider-repository.ts`/`auth-admin.ts`/`rate-limit.ts` 재활용 |

의존 방향: Presentation → Application → Domain / Infrastructure. Domain은 외부 의존 0.

---

## 9. Coding Convention Recap

- 컴포넌트 PascalCase (`TriageClient.tsx`, `QuoteProposalForm.tsx`)
- utility/lib kebab-case (`quote-response-actions.ts`, `quote-repository.ts`, `provider-response-repository.ts`, `quote-proposal-schema.ts`)
- Server-only: `import 'server-only'` (repository, action)
- Client: `'use client'`
- Server Action: `'use server'` 첫 줄
- Import 순서: external → `@/...` → relative → type
- `AppError` + `toActionError` 패턴 재활용

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── provider/
│   │   ├── profile/page.tsx              🔄 "받은 요청 보기" 링크 추가
│   │   └── requests/
│   │       ├── page.tsx                  🆕
│   │       └── [id]/
│   │           └── propose/page.tsx      🆕
│   └── actions/
│       └── quote-response-actions.ts     🆕 passRequest + submitQuote
├── components/provider/                  🆕 폴더
│   ├── RequestCard.tsx                   🆕
│   ├── TriageClient.tsx                  🆕
│   └── QuoteProposalForm.tsx             🆕
├── lib/firebase/
│   ├── quote-repository.ts               🆕
│   ├── provider-response-repository.ts   🆕
│   └── quote-request-repository.ts       🔄 listForTriage + toQuoteRequest status alias
├── domain/
│   ├── quote-proposal-schema.ts          🆕
│   ├── quote-status.ts                   🆕 (types/quote-request.ts에서 enum 이동 + Master Plan 일치)
│   └── room-type.ts                      🆕
├── types/
│   ├── quote.ts                          🆕
│   ├── provider-response.ts              🆕
│   └── quote-request.ts                  🔄 QuoteStatus 확장, roomType 추가
├── lib/errors.ts                         🔄 INVALID_STATE, ALREADY_QUOTED AppErrorCode 추가
└── proxy.ts                              (변경 없음 · /provider/:path* 이미 포함)

firestore.rules                           🔄 quotes + providerResponses 블록 추가
firestore.indexes.json                    🔄 인덱스 3개 추가
storage.rules                             (변경 없음)
```

### 10.2 Implementation Order (7 steps)

1. **Domain + Types + Errors**: `quote-proposal-schema.ts` (Zod 3), `quote-status.ts` enum 6-state, `room-type.ts`, `types/quote.ts`, `types/provider-response.ts`, `types/quote-request.ts` 확장, `errors.ts` 신규 코드 2개
2. **Repositories**: `quote-repository.ts`, `provider-response-repository.ts`, `quote-request-repository.ts` `listForTriage` + status alias 방어
3. **Server Actions**: `app/actions/quote-response-actions.ts` (passRequest + submitQuote · TX 포함 · totalAmount 서버 재계산)
4. **UI Components**: `RequestCard` (server) · `TriageClient` + `TriageActionBar` (client) · `EmptyQueue` (server) · `QuoteProposalForm` (client, useFieldArray)
5. **Routes**: `/provider/requests/page.tsx` (Server shell + Suspense + auth/role guard), `/provider/requests/[id]/propose/page.tsx` (Server shell), `/provider/profile/page.tsx` "받은 요청 보기" 링크 추가
6. **Infra**: `firestore.rules` (quotes + providerResponses 블록 + helper func `myProviderId()`), `firestore.indexes.json` (3 신규 indexes)
7. **Deploy**: `firebase deploy --only firestore:rules,firestore:indexes`

### 10.3 Pre-flight 체크리스트

- [ ] 이전 cycle env (RESEND_API_KEY, EMAIL_FROM, OPERATOR_EMAIL, APP_URL) 이미 필요 — 본 feature는 추가 없음
- [x] provider-signup 완료로 실 청명 계정 생성 가능 (테스트 provider 1개 이상 필요)
- [ ] Firestore `in` 쿼리 10개 제한 인지 (QuoteCategory 6개라 안전, 확장 시 주의)
- [ ] dev 환경에서 실제 triage flow smoke test (provider 로그인 → 요청 목록 → pass → 제안)

---

## 11. Next.js 16 Specific Patterns

### 11.1 async params (`[id]/propose/page.tsx`)

```tsx
// src/app/provider/requests/[id]/propose/page.tsx
type Params = { id: string };

export default function ProposePage(props: {
  params: Promise<Params>;
}) {
  return (
    <Suspense fallback={<ProposeFormSkeleton/>}>
      <ProposeFormBody params={props.params} />
    </Suspense>
  );
}

async function ProposeFormBody({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  // ... cookies + providerId guard + fetch request
}
```

### 11.2 Cache Components · Suspense 내 `cookies()`

`TriageBody`, `ProposeFormBody` 등 `cookies()` 호출하는 async component는 모두 Suspense 내부에 배치 (quote-request · provider-signup 패턴 일관).

### 11.3 proxy.ts

기존 matcher `"/provider/:path*"` 이미 포함 · 변경 없음.

### 11.4 Server Action TX 패턴

```ts
let quoteId = "";
await adminDb.runTransaction(async (tx) => {
  // quoteRequest get (status guard)
  const reqRef = adminDb.collection('quoteRequests').doc(requestId);
  const reqSnap = await tx.get(reqRef);
  if (!reqSnap.exists) throw new AppError('INVALID_INPUT', '요청을 찾을 수 없습니다');
  const currentStatus = reqSnap.data()!.status;
  if (!['submitted', 'quoted'].includes(currentStatus)) {
    throw new AppError('INVALID_STATE', '이미 진행중이거나 종료된 요청입니다');
  }
  const clientUid = reqSnap.data()!.clientUid;

  // providerResponse already-quoted check
  const prRef = adminDb.collection('providerResponses').doc(`${providerId}_${requestId}`);
  const prSnap = await tx.get(prRef);
  if (prSnap.exists && prSnap.data()!.status === 'quoted') {
    throw new AppError('ALREADY_QUOTED', '이미 견적을 보낸 요청입니다');
  }

  // 3-write
  const quoteRef = adminDb.collection('quotes').doc();
  quoteId = quoteRef.id;
  tx.create(quoteRef, { /* ... */ });
  tx.set(prRef, { providerId, requestId, status: 'quoted', respondedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (currentStatus === 'submitted') {
    tx.update(reqRef, { status: 'quoted' });
  }
});
```

---

## 12. Test Plan

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| 1 | 청명 로그인 → /provider/requests 접근 | categories match + 미응답 요청 리스트, currentIndex=0, Figma 카드 렌더 |
| 2 | 빈 큐 | "모두 확인했어요!" empty state + 홈 링크 |
| 3 | Pass 클릭 | providerResponses {status:'passed'} merge, currentIndex++ |
| 4 | Pass 후 새로고침 | Pass한 요청 큐에서 제외됨 |
| 5 | 제안하기 클릭 | `/provider/requests/{id}/propose` 이동 |
| 6 | 항목 1개 + 금액 입력 → 제출 | quotes.create + providerResponses {status:'quoted'} + quoteRequests {status:'quoted'} + /provider/requests redirect |
| 7 | 항목 11개 추가 시도 | +버튼 disabled, zod 거부 |
| 8 | price 음수 입력 | zod 거부 |
| 9 | 다른 청명이 이미 booked/completed한 요청에 제안 | `INVALID_STATE` 에러 |
| 10 | 같은 요청에 2번 제안 시도 | `ALREADY_QUOTED` 에러 |
| 11 | Rate limit (1분 11건) | 429 `RATE_LIMITED` |
| 12 | 비로그인 /provider/requests 접근 | proxy가 /login?next= redirect |
| 13 | 고객 계정 (providerId 없음) /provider/requests | role guard FORBIDDEN → /signup-provider redirect |
| 14 | 요청 사진 있는 경우 vs 없는 경우 | 있으면 grid 표시, 없으면 placeholder 없이 생략 |
| 15 | roomType 있는 기존 요청 vs 없는 요청 | 있으면 "32평 · 투룸" 표시, 없으면 "32평"만 |
| 16 | QuoteRequest.status='responded' (legacy) read | repository에서 'quoted'로 normalize |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 8건 해소. passRequest 5-step + submitQuote 10-step Server Action, quotes/providerResponses 컬렉션, QuoteStatus 6-state 확장, Figma 1:1 UI, TX atomic 3-write, Rules `get()` helper, 7-step 구현 순서 | Seokho Lee |
