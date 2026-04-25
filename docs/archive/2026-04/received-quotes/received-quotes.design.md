---
template: design
version: 0.1
feature: received-quotes
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# received-quotes Design Document

> **Summary**: 의뢰인이 자기가 제출한 요청의 받은 견적을 진행중/완료 2-tab으로 조회하고, 상세 페이지에서 청명별 견적서를 비교·수락하는 Marketplace v1.1 3번째 feature. Figma 받은견적 탭 1:1 + 4-step 스텝퍼 + acceptQuote Server Action + /providers/{id} stub.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Status**: Draft
> **Plan**: [received-quotes.plan.md](../../01-plan/features/received-quotes.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** 탭 URL 상태 | URL search param `?tab=active\|completed` (default=`active`). Server component `searchParams` async read. back button 친화. |
| **Q2** 빈 상태 탭별 | 두 탭 모두 같은 EmptyState — "아직 요청한 견적이 없어요" + "+ 새 견적 요청" CTA (`/quote/new`). |
| **Q3** QuoteStepper 현재 단계 | `statusToStepIndex`: submitted=0 · quoted=1 · negotiating=2 · booked=3 · completed=3 (전체 check) · cancelled=-1 (특수 표시). |
| **Q4** 수락 후 UX | redirect 없음. `router.refresh()` + toast "{companyName} 견적 수락 · 협의 시작". quote.status 즉시 반영되므로 수락 버튼만 disabled → '수락됨' 텍스트로 변경. |
| **Q5** 청명 이름 클릭 target | 같은 창 (`<Link href="/providers/{id}">`). 새 창 강제 X · UX 일관성. |
| **Q6** `/providers/{id}` stub 디자인 | 업체명 · 평점(있으면) · 지역(첫 번째) · 전화 · 배상보험 badge · "프로필 상세 페이지는 v1.1b에 추가됩니다" 안내 · ← 돌아가기. |
| **Q7** 청명별 카드 순서 | **sentAt asc** (먼저 보낸 청명 우선 — FIFO 공정성). `orderBy('sentAt', 'asc')`로 `listByRequest` 호출 — 기존 repository는 `desc`이므로 파라미터 추가. |
| **Q8** 수락 시 다른 quote 자동 rejected? | **No**. 다른 quote는 'sent' 상태 유지. 경쟁 보존. 의뢰인이 원하면 여러 청명과 동시 협의 가능 (v1.2 chat 전제). |

---

## 1. Overview

### 1.1 Design Goals
- Figma 받은견적 탭 1:1 충실 구현
- 목록 렌더링 P95 < 800ms (parallel quotes.listByRequest per request)
- 수락 TX atomicity 100% (quote + quoteRequest 전이 묶음)
- 기존 자산 최대 재활용 — 신규 repository 0, Server Action 1개 추가

### 1.2 Design Principles
- **Server-first**: 목록·상세 모두 Server Component + Suspense (Cache Components 준수)
- **Client 최소**: accept 버튼 + tab navigation만 Client
- **Reuse over rewrite**: quoteRepository.listByRequest, quoteRequestRepository.listForClient, providerRepository.get 전부 재활용
- **경쟁 보존**: accept 한 번에 1 quote만 전이, 나머지는 'sent' 유지
- **Status-driven UI**: QuoteStepper가 request.status 하나로 4단계 시각화

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────┐
│ / (home)                                          │
│  └─ TodayCard (수정): "요청한 견적 N건" 카드를      │
│     <Link href="/received"> 로 wrapping           │
└───────────────────────────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────────┐
│ /received?tab=active|completed (Server shell)     │
│  └─ Suspense <ReceivedListSkeleton/>              │
│       └─ <ReceivedListBody tab=...>               │
│            verifySessionCookie → clientUid        │
│            quoteRequestRepository.listForClient   │
│            tab 기준 status 필터:                     │
│              active: submitted|quoted|negotiating │
│              completed: booked|completed          │
│            Promise.all(requests → quotes.listByRequest)│
│            quotes min/max 집계                     │
│            → TabBar + (RequestStatusCard | CompletedCard)[] or EmptyState│
└───────────────────────────────────────────────────┘
                   │ 비교하기
                   ▼
┌───────────────────────────────────────────────────┐
│ /received/{requestId} (Server shell)              │
│  └─ Suspense <CompareSkeleton/>                   │
│       └─ <CompareBody requestId=...>              │
│            verifySessionCookie + clientUid check  │
│            quoteRequestRepository.get(requestId)  │
│            clientUid !== auth.uid → notFound      │
│            quoteRepository.listByRequest(requestId, 'asc')│
│            providerRepository.get(providerId) ×N  │
│            → QuoteCompareCard[] (청명명 링크 + AcceptButton Client)│
└───────────────────────────────────────────────────┘
                   │ 수락 클릭
                   ▼
[Server Action: acceptQuote(quoteId)] 9-step TX
  1. verifySessionCookie → clientUid
  2. Zod
  3. Firestore TX:
     - tx.get(quoteRef) + status='sent' 검증
     - tx.get(requestRef) + clientUid 일치 + status ∈ {submitted, quoted} 검증
     - tx.update(quoteRef, {status:'accepted', acceptedAt})
     - tx.update(requestRef, {status:'negotiating'})
  4. return {ok:true, data:{providerId, companyName}}
                   │
                   ▼
Client: router.refresh() + toast({companyName} 견적 수락)
```

### 2.2 데이터 흐름 요약

```
Tab query:
  active → quoteRequest.status ∈ {submitted, quoted, negotiating}
  completed → quoteRequest.status ∈ {booked, completed}

가격 범위 계산:
  const quotes = await quoteRepository.listByRequest(req.id)
  if (quotes.length === 0) return null
  const amounts = quotes.map(q => q.totalAmount)
  return { min: Math.min(...amounts), max: Math.max(...amounts), count: quotes.length }

상세 페이지 카드 정렬:
  quotes by sentAt asc (FIFO 공정성)
```

---

## 3. Data Model

### 3.1 신규 컬렉션: 없음 ✅

기존 컬렉션의 status 전이만 사용:
- `quotes.status`: `'sent' → 'accepted'` (이번 feature)
- `quoteRequests.status`: `{'submitted', 'quoted'} → 'negotiating'` (이번 feature)

다른 quotes는 'sent' 유지 (경쟁 보존).

### 3.2 `lib/errors.ts` 확장

```typescript
export type AppErrorCode =
  | ... // 기존 9개
  | "ALREADY_ACCEPTED"   // v1.1 received-quotes 추가
  | "INTERNAL_ERROR";
```

### 3.3 Firestore Rules 변경 없음

`quotes.update: if false`, `quoteRequests.update: if false` 유지.
Admin SDK bypass 전략으로 Server Action이 전이. Defense-in-depth.

### 3.4 `listByRequest` 정렬 옵션 추가

```typescript
// src/lib/firebase/quote-repository.ts (수정)
export const quoteRepository = {
  // ... 기존
  async listByRequest(
    requestId: string,
    options?: { order?: "asc" | "desc" },
  ): Promise<Quote[]> {
    const order = options?.order ?? "desc";  // 기본값 하위 호환
    const snap = await col()
      .where("requestId", "==", requestId)
      .orderBy("sentAt", order)
      .get();
    return snap.docs.map((d) => toQuote(d.id, d.data()));
  },
};
```

기존 `listByRequest(id)` 호출부는 무영향.

---

## 4. API Specification

### 4.1 Server Action `acceptQuote`

```ts
// src/app/actions/quote-response-actions.ts (기존 파일에 추가)
'use server';

export interface AcceptQuoteInput {
  quoteId: string;
}

export async function acceptQuote(
  input: AcceptQuoteInput,
): Promise<ActionResult<{ providerId: string; companyName: string }>>;
```

**9-step**:
1. Zod parse `{ quoteId: string }`
2. `verifySessionCookie` → clientUid
3. Firestore TX:
   - `tx.get(quoteRef)` → 없으면 `INVALID_INPUT`. `status !== 'sent'` → `ALREADY_ACCEPTED`.
   - `tx.get(quoteRequestRef)` (quote.requestId 기반). `clientUid !== auth.uid` → `FORBIDDEN`. status ∉ `{submitted, quoted}` → `INVALID_STATE`.
   - `tx.update(quoteRef, {status: 'accepted', acceptedAt: serverTimestamp})`
   - `tx.update(quoteRequestRef, {status: 'negotiating'})`
4. TX 성공 후 providerRepository.get(quote.providerId).companyName fetch (toast용)
5. return `{ok:true, data:{providerId, companyName}}`
6. 에러 매핑

### 4.2 Zod

```ts
// src/domain/quote-response-schema.ts 또는 inline in action
import { z } from 'zod';
export const acceptQuoteInputSchema = z.object({
  quoteId: z.string().min(10),
});
export type AcceptQuoteInput = z.infer<typeof acceptQuoteInputSchema>;
```

간단해서 별도 schema 파일보다 `quote-response-actions.ts` 내 inline 배치 권장.

### 4.3 `/received` Server Component 쿼리

```ts
async function ReceivedListBody({ tab }: { tab: 'active' | 'completed' }) {
  const jar = await cookies();
  const uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);

  const all = await quoteRequestRepository.listForClient(uid);
  const filtered = all.filter((r) => {
    if (tab === 'active') {
      return (['submitted', 'quoted', 'negotiating'] as const).includes(r.status);
    } else {
      return (['booked', 'completed'] as const).includes(r.status);
    }
  });

  if (filtered.length === 0) {
    return <ReceivedEmptyState />;
  }

  const enriched = await Promise.all(
    filtered.map(async (req) => {
      const quotes = await quoteRepository.listByRequest(req.id);
      const amounts = quotes.map((q) => q.totalAmount);
      const priceRange =
        amounts.length > 0
          ? { min: Math.min(...amounts), max: Math.max(...amounts), count: amounts.length }
          : null;
      const winner =
        req.status === 'booked' || req.status === 'completed'
          ? quotes.find((q) => q.status === 'accepted') ?? null
          : null;
      const winnerProvider = winner
        ? await providerRepository.get(winner.providerId)
        : null;
      return { request: req, priceRange, quotes, winner, winnerProvider };
    }),
  );

  return (
    <>
      <TabBar activeTab={tab} counts={...} />
      <ul className="flex flex-col gap-3">
        {enriched.map((item) =>
          tab === 'active' ? (
            <RequestStatusCard key={item.request.id} {...item} />
          ) : (
            <CompletedCard key={item.request.id} {...item} />
          ),
        )}
      </ul>
    </>
  );
}
```

### 4.4 `/received/{requestId}` Server Component

```ts
async function CompareBody({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const jar = await cookies();
  const uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);

  const request = await quoteRequestRepository.get(requestId);
  if (!request || request.clientUid !== uid) notFound();

  const quotes = await quoteRepository.listByRequest(requestId, { order: 'asc' });
  const providers = await Promise.all(
    quotes.map((q) => providerRepository.get(q.providerId)),
  );

  return (
    <>
      <RequestSummary request={request} />
      <QuoteStepper status={request.status} />
      <ul className="flex flex-col gap-3">
        {quotes.map((q, i) => (
          <QuoteCompareCard
            key={q.id}
            quote={q}
            provider={providers[i]}
            requestStatus={request.status}
          />
        ))}
      </ul>
    </>
  );
}
```

---

## 5. UI / UX Design

### 5.1 `/received` (목록 페이지)

```
┌──────────────────────────────────────────────┐
│  받은 견적                                     │
│  [진행중 2] [완료 5]                          │  ← Tab
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐ │
│  │ 입주청소 32평                            │ │
│  │ 오늘 09:14 요청                          │ │
│  │ ● ━━ ● ━━ ○ ━━ ○                        │ │  ← QuoteStepper
│  │ 요청  견적수신 협의진행 거래완료           │ │
│  │                                          │ │
│  │ 3개 청명 · 가격 범위                     │ │
│  │ 22~32 만원              [비교하기 →]      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ 에어컨 분해청소 2대                       │ │
│  │ 어제 18:42 요청                           │ │
│  │ ● ━━ ○ ━━ ○ ━━ ○                        │ │
│  │ 1개 청명 · 가격 범위                     │ │
│  │ 9~14 만원               [비교하기 →]     │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

완료 탭:
```
┌────────────────────────────────────────┐
│ 사무실 정기청소           [이지클린]      │  ← 청명 배지
│ 2일 전 완료                               │
│ ● ━━ ● ━━ ● ━━ ✓                         │  ← 4/4 완료
│ 1개 청명 · 가격 범위                     │
│ 월 52 만원              [☆ 평점 완료]     │  ← v2 review 이전 placeholder
└────────────────────────────────────────┘
```

### 5.2 `/received/{requestId}` (비교 페이지)

```
┌──────────────────────────────────────────────┐
│  ← 받은 견적                                   │
│                                                │
│  입주청소 32평 · 역삼동                        │  ← RequestSummary
│  오늘 09:14 요청                               │
│                                                │
│  ● ━━ ● ━━ ○ ━━ ○                              │  ← QuoteStepper
│  요청  견적수신 협의진행 거래완료               │
│                                                │
│  받은 견적 3건                                  │
│  ┌───────────────────────────────────────┐   │
│  │ [새봄홈서비스 →] ★4.9           배상보험│   │  ← 청명 링크
│  │ 27만원                                  │   │
│  │ 4/22(화) 14:00 · 약 5시간               │   │
│  │ · 기본 입주 24만                         │   │
│  │ · 에어컨 1대 +3만                        │   │
│  │                        [ 수락하기 ]     │   │
│  └───────────────────────────────────────┘   │
│  ┌───────────────────────────────────────┐   │
│  │ [깔끔청소 강남 →] ★4.8                  │   │
│  │ 29만원                                  │   │
│  │ 4/23(수) 10:00 · 약 4시간               │   │
│  │                        [ 수락하기 ]     │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

하나 수락 시 해당 카드만 `[✓ 수락됨]` 비활성 표시. 다른 카드의 수락 버튼은 그대로 (경쟁 유지).

### 5.3 `/providers/{providerId}` (청명 stub)

```
┌────────────────────────────────────────┐
│  ← 돌아가기                             │
│                                         │
│  새봄홈서비스                          │
│  ★ 4.9 (127)                           │
│                                         │
│  📍 서울 강남·서초                     │
│  📞 010-1234-5678                      │
│  ✓ 배상보험 3억                        │
│                                         │
│  ┌───────────────────────────────┐   │
│  │ 프로필 상세 페이지는 곧 추가됩니다│   │
│  │ (v1.1b provider-profile)        │   │
│  └───────────────────────────────┘   │
└────────────────────────────────────────┘
```

### 5.4 홈 `/` TodayCard 수정

기존 "요청한 견적 N건" 영역을 `<Link href="/received">` 로 wrapping. hover 스타일 추가.

```tsx
// TodayCard.tsx 수정
import Link from "next/link";

function RequestRow({ count }: { count: number }) {
  return (
    <Link
      href="/received"
      className="block rounded-xl bg-indigo-50 px-4 py-3 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            요청한 견적 {count}건 →
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            받은 견적 비교하기
          </p>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      </div>
    </Link>
  );
}
```

### 5.5 Component List

| Component | Type | Location |
|-----------|------|----------|
| `ReceivedPage` | Server | `app/received/page.tsx` |
| `ComparePage` | Server | `app/received/[requestId]/page.tsx` |
| `ProviderStubPage` | Server | `app/providers/[providerId]/page.tsx` |
| `TabBar` | Client | `components/received/TabBar.tsx` (URL state) |
| `RequestStatusCard` | Server | `components/received/RequestStatusCard.tsx` |
| `CompletedCard` | Server | `components/received/CompletedCard.tsx` |
| `QuoteStepper` | Server | `components/received/QuoteStepper.tsx` |
| `QuoteCompareCard` | Client | `components/received/QuoteCompareCard.tsx` (AcceptButton 포함) |
| `ReceivedEmptyState` | Server | `components/received/ReceivedEmptyState.tsx` |
| `AcceptButton` | Client | `components/received/QuoteCompareCard.tsx` 내부 |

---

## 6. Error Handling

| Code | User Message | Recovery |
|------|-------------|----------|
| `INVALID_INPUT` | 필드 에러 메시지 | 유지 |
| `UNAUTHORIZED` | "로그인이 필요합니다" | `/login?next=...` |
| `FORBIDDEN` | "본인 요청만 접근 가능합니다" | `/received` 복귀 |
| `INVALID_STATE` | "이미 다른 청명이 수락되었거나 진행중입니다" | `router.refresh()` (최신 상태 반영) |
| `ALREADY_ACCEPTED` | "이미 수락된 견적입니다" | `router.refresh()` |
| `INTERNAL_ERROR` | "일시적 오류" | retry |

---

## 7. Security Considerations

- **Owner guard 2-tier**: Server Action `clientUid === quoteRequest.clientUid` + 상세 페이지 Server Component에서 동일 검증
- **TX atomicity**: race 시 두 번째 accept는 quote.status !== 'sent' 조건에서 차단
- **Admin SDK bypass**: Firestore rules `update: if false` 유지 · client 직접 write 차단
- **notFound 일관**: 다른 사용자 요청 / 없는 requestId → 404 (정보 누설 없음)

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation (Server)** | `app/received/page.tsx`, `app/received/[requestId]/page.tsx`, `app/providers/[providerId]/page.tsx` · 카드 컴포넌트 대부분 |
| **Presentation (Client)** | `TabBar.tsx`, `QuoteCompareCard.tsx` (AcceptButton 포함) |
| **Application** | `app/actions/quote-response-actions.ts` (기존 파일에 `acceptQuote` 추가) |
| **Domain** | `domain/quote-status.ts` (기존 · `QUOTE_STATUSES` + `statusToStepIndex` 신규 유틸 추가) |
| **Infrastructure** | `quoteRepository` (listByRequest order 파라미터), `quoteRequestRepository`, `providerRepository` 전부 재활용 |

---

## 9. Coding Convention Recap

- 컴포넌트 PascalCase (`RequestStatusCard.tsx`, `QuoteCompareCard.tsx`)
- utility/lib kebab-case
- Server-only repository: `import 'server-only'`
- Client component: `'use client'`
- Server Action: `'use server'` 첫 줄
- Import 순서: external → `@/...` → relative → type
- AppError + ActionResult 패턴 재활용

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── received/
│   │   ├── page.tsx                      🆕 목록 (2-tab + ?tab=)
│   │   └── [requestId]/page.tsx          🆕 비교 페이지
│   ├── providers/
│   │   └── [providerId]/page.tsx         🆕 청명 stub
│   ├── page.tsx                          (기존 · TodayCard 수정에서 연결)
│   └── actions/
│       └── quote-response-actions.ts     🔄 acceptQuote 추가
├── components/
│   ├── quote/
│   │   └── TodayCard.tsx                 🔄 RequestRow를 Link로 wrapping
│   └── received/                         🆕 폴더
│       ├── TabBar.tsx                    🆕 Client (URL state)
│       ├── RequestStatusCard.tsx         🆕 Server
│       ├── CompletedCard.tsx             🆕 Server
│       ├── QuoteStepper.tsx              🆕 Server
│       ├── QuoteCompareCard.tsx          🆕 Client (AcceptButton)
│       └── ReceivedEmptyState.tsx        🆕 Server
├── lib/firebase/
│   └── quote-repository.ts               🔄 listByRequest({order}) optional
├── domain/
│   └── quote-status.ts                   🔄 statusToStepIndex util 추가
└── lib/errors.ts                         🔄 ALREADY_ACCEPTED 추가

firestore.rules                           (변경 없음)
firestore.indexes.json                    (변경 없음)
proxy.ts                                  (변경 없음 — /received는 public 아님이지만 비로그인 시 redirect는 페이지 레벨에서 처리. matcher 추가 권장)
```

### 10.2 proxy.ts 업데이트 (선택)

`/received/*` 는 로그인 필수 → matcher 에 추가 권장:

```ts
matcher: [
  "/dashboard/:path*",
  "/editor/:path*",
  "/quote/:path*",
  "/provider/:path*",
  "/received/:path*",   // 🆕
]
```

### 10.3 statusToStepIndex 유틸

```ts
// src/domain/quote-status.ts 추가
export function statusToStepIndex(status: QuoteStatus): number {
  switch (status) {
    case "submitted": return 0;
    case "quoted":    return 1;
    case "negotiating": return 2;
    case "booked":    return 3;
    case "completed": return 3;    // 전체 complete
    case "cancelled": return -1;   // 특수 (Stepper에서 "취소됨" 표시)
  }
}
```

### 10.4 Implementation Order (7 steps)

1. **Domain**: `quote-status.ts` `statusToStepIndex` 추가 · `lib/errors.ts` `ALREADY_ACCEPTED` 추가
2. **Repository**: `quote-repository.ts` `listByRequest({order})` 옵션 파라미터
3. **Server Action**: `quote-response-actions.ts` 에 `acceptQuote` 9-step TX 추가
4. **Shared components**: `QuoteStepper.tsx`, `ReceivedEmptyState.tsx`, `TabBar.tsx`
5. **Card components**: `RequestStatusCard.tsx`, `CompletedCard.tsx`, `QuoteCompareCard.tsx` (AcceptButton)
6. **Routes**: `/received/page.tsx`, `/received/[requestId]/page.tsx`, `/providers/[providerId]/page.tsx`
7. **Integration**: 홈 `TodayCard.tsx` Link wrapping + `proxy.ts` matcher 확장

### 10.5 Pre-flight 체크리스트

- [ ] `proxy.ts` matcher `/received/:path*` 추가 검증
- [ ] `/received?tab=completed` URL 수동 테스트
- [ ] 다른 사용자 request 상세 접근 시 404 확인
- [ ] 같은 요청에 2명 수락 경쟁 시 두 번째는 INVALID_STATE 확인
- [ ] 수락 후 홈 TodayCard count 변화 없음 (status는 여전히 negotiating — active 탭에 남음)

---

## 11. Next.js 16 Specific Patterns

### 11.1 async searchParams · params

```tsx
// /received/page.tsx
export default function ReceivedPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<ReceivedListSkeleton/>}>
      <ReceivedListBody searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ReceivedListBody({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'completed' ? 'completed' : 'active';
  // ...
}

// /received/[requestId]/page.tsx
export default function ComparePage(props: {
  params: Promise<{ requestId: string }>;
}) {
  return (
    <Suspense fallback={<CompareSkeleton/>}>
      <CompareBody params={props.params} />
    </Suspense>
  );
}

async function CompareBody({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  // ...
}
```

### 11.2 Cache Components 준수

모든 `cookies()` 호출은 Suspense 내부 (provider-signup / quote-response 패턴 일관).

### 11.3 Router refresh 후 카드 상태 반영

```tsx
// AcceptButton (QuoteCompareCard 내부)
"use client";
const [isPending, startTransition] = useTransition();
function handleAccept() {
  startTransition(async () => {
    const result = await acceptQuote({ quoteId });
    if (result.ok) {
      toast.success(`${result.data.companyName} 견적 수락 · 협의 시작`);
      router.refresh();   // Server Component 다시 렌더 → quote.status='accepted' 반영
    } else {
      toast.error(result.message);
    }
  });
}
```

---

## 12. Test Plan

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| 1 | 홈에서 TodayCard "요청한 견적" 클릭 | `/received?tab=active` 이동, 진행중 요청 리스트 |
| 2 | 완료 탭 클릭 | `?tab=completed`, status ∈ {booked, completed} 요청만 |
| 3 | 빈 상태 (요청 0건) | 두 탭 모두 EmptyState + "+ 새 견적 요청" |
| 4 | 비교하기 클릭 | `/received/{id}` 상세, QuoteCompareCard 청명별 |
| 5 | 다른 사용자 requestId URL 직접 접근 | 404 notFound |
| 6 | 수락 버튼 클릭 (정상) | TX 성공, toast, router.refresh, 해당 카드 "수락됨" 상태 |
| 7 | 같은 quote 재수락 (race) | ALREADY_ACCEPTED 에러 toast |
| 8 | 요청이 이미 booked 상태 | INVALID_STATE (status ∉ {submitted, quoted}) |
| 9 | 청명 이름 클릭 | `/providers/{id}` stub 이동 |
| 10 | 스텝퍼 렌더 · status='quoted' | index=1 (요청·견적수신만 active) |
| 11 | 수락 후 홈 복귀 | TodayCard count 동일 (status='negotiating'도 active에 포함) |
| 12 | 비로그인 `/received` 접근 | proxy가 `/login?next=/received` redirect |
| 13 | `listByRequest` 기본 호출 (`desc` 하위 호환) | 기존 quote-response 경로 영향 없음 |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 8건 해소. acceptQuote 9-step TX. 2-tab URL state. QuoteStepper statusToStepIndex. QuoteCompareCard sentAt asc. /providers/{id} stub. 7-step 구현 순서. | Seokho Lee |
