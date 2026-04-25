---
template: design
version: 0.1
feature: provider-dashboard
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-dashboard Design Document

> **Summary**: `/provider/home` 신규 경로 · 청명 오늘의 운영 허브. Server shell + Suspense + 8 components adaptive (수신 요청 개수 기반). 1 Server Action (setIsAvailable). Repository 2 메서드 확장 (listForProvider, countForProvider). BottomTabNav "홈" 탭 재배치.
>
> **Plan**: [provider-dashboard.plan.md](../../01-plan/features/provider-dashboard.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** activeRequests 총개수 표시 방식 | **Firestore `getCountFromServer` + `limit(3)` 병렬**. Count 쿼리 비용 저렴 (Admin SDK count aggregation) · 정확한 "전체 N건" 표시. 3개 초과 시 `+ N` badge. |
| **Q2** 누적 작업 수 데이터 소스 | **`provider.completedWorkCount ?? null` placeholder 우선**. v2+ analytics-batch가 실 집계. null이면 "아직 없음". `workCases` count 쿼리 폴백은 v1.2 검토 (비용·일관성 고려). |
| **Q3** category+status+createdAt 인덱스 | **존재 확인** (firestore.indexes.json L64-71 · 기존 listForTriage와 공유). 추가 인덱스 불필요. |
| **Q4** notifiedProviderIds 필터 추가 여부 | **추가 안 함**. `listForTriage` 패턴과 일관 · category-match만. v1.0 quote-request이 첫 seed에만 알렸더라도, v1.1부터 카테고리 매칭 모든 청명이 dashboard에서 볼 수 있어야 함. providerResponses 제외 로직은 triage 전용. |
| **Q5** ShortcutGrid badge 실시간성 | **revalidatePath 의존** (v1). realtime은 v1.2 chat에서 onSnapshot 첫 도입. |
| **Q6** isAvailable off 의미 | **v1은 단순 flag** (providers.isAvailable=false). 실 응답 차단 (quote-response에서 내가 filter 대상 제외)은 v1.1c. 공개 프로필(reader)은 현재도 이 플래그 활용 여지. |
| **Q7** `/provider/profile` 접근 경로 | **ShortcutGrid 첫 타일 "프로필 편집"** (`/provider/profile`). BottomTabNav "홈"은 `/provider/home`. editor는 BottomTabNav 내부 진입점 없이 shortcut 전용. |
| **Q8** provider.categories === [] 처리 | **쿼리 skip + EmptyRequestsHint 특화 메시지**. `listForProvider(categories=[])` → 빈 배열 즉시 반환 (Firestore `in []` 불가). UI는 "카테고리를 먼저 선택하세요" + "프로필 완성하기" 링크 강조. |
| **Q9** 홈 route `/provider` vs `/provider/home` | **`/provider/home` 채택**. `/provider`를 홈으로 두면 네임스페이스 충돌 · 기존 `/provider/profile`·`/provider/requests`·`/provider/works`·`/provider/settings` 패턴 일관. `/provider` 자체 접근 시 `/provider/home`으로 redirect (선택). |
| **Q10** Hero 인사말 로직 | KST 시간대 기반 "좋은 아침/점심/저녁" + companyName. 생일·주기 인사는 v1.2+ YAGNI. |

---

## 1. Overview

### 1.1 Design Goals
- Server-first · Cache Components 일관
- Adaptive UX (수신 요청 개수 기반 2-branch)
- 1 Server Action + 1 repo 확장으로 코드 표면적 최소
- 기존 provider-profile-editor · provider-profile 패턴 재사용
- v1.3+ booking 도입 시 TodayScheduleCard만 교체 가능한 구조

### 1.2 Design Principles
- **Parallel fetch**: 1차 `providerRepository.get` → 2차 `Promise.all([listForProvider, getCountFromServer, workCases meta])`
- **Section-level Suspense**: 각 섹션 독립 · 한 섹션 실패해도 다른 섹션 렌더
- **Adaptive single source**: `activeRequests.length` 하나로 UX 분기
- **Client boundary 최소화**: Interactive만 Client (AvailabilityToggle, RequestPreviewCard Link, ShortcutGrid)
- **No realtime**: v1.2 chat 이후 검토

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────┐
│ /provider/home  (Server shell + Suspense)           │
│  ├─ auth guard (cookies → verifySession → uid)      │
│  ├─ userRepository.get(uid) → providerId            │
│  ├─ providerRepository.get(providerId)              │
│  └─ Promise.all:                                    │
│      ├─ quoteRequestRepository.listForProvider(...) │
│      ├─ quoteRequestRepository.countForProvider(...)│
│      └─ (workCaseRepository count → provider field) │
│                                                     │
│  Render sections:                                   │
│    <DashboardHero provider+greeting/>               │
│       └─ <AvailabilityToggle initial/>              │
│    <ActiveRequestsSection                           │
│       requests={top3} total={count}/>               │
│       ├─ empty → <EmptyRequestsHint                 │
│       │            hasCategories={bool}/>           │
│       └─ list → <RequestPreviewCard/> × 3           │
│                + "전체 N건 →" link                   │
│    <TodayScheduleCard state="coming-soon"/>         │
│    <QuickStatsSection stats={...}/>                 │
│    <ShortcutGrid badge={count}/>                    │
└────────────────────────────────────────────────────┘
```

### 2.2 Route Strategy

- **신규**: `/provider/home`
- **BottomTabNav**: `PROVIDER_TABS[0].href: "/provider/profile"` → `"/provider/home"` · label "홈" 유지
- **proxy.ts**: 기존 `/provider/:path*` matcher 포함 (변경 없음)
- **/provider/profile**: editor로서 유지 · ShortcutGrid "프로필 편집" 타일로 접근

### 2.3 Fetch 병렬화 Sequence

```ts
// Step 1: auth + providerId
const uid = await verifySessionCookie(...);
const user = await userRepository.get(uid);          // cache()
if (!user?.providerId) redirect('/signup-provider');
const providerId = user.providerId;

// Step 2: providerRepository.get (cache) — 선행 (categories 필요)
const provider = await providerRepository.get(providerId);
if (!provider) redirect('/signup-provider');

// Step 3: 병렬 dashboard fetch
const [activeRequests, totalCount] = await Promise.all([
  quoteRequestRepository.listForProvider({
    categories: provider.categories,
    status: 'submitted',
    limit: 3,
  }),
  quoteRequestRepository.countForProvider({
    categories: provider.categories,
    status: 'submitted',
  }),
]);

// Step 4: section render with adaptive branch
```

---

## 3. Data Model

### 3.1 Firestore — 변경 없음

기존 필드만 사용:
- `providers/{id}`: companyName · isAvailable · categories · rating · responseTimeMinutes · completedWorkCount
- `quoteRequests/{id}`: category · status · createdAt · region · size · photos · note

### 3.1a Server→Client DTO (신규)

`QuoteRequest`는 Firestore `Timestamp` 필드 포함 → Client 컴포넌트에 직접 전달 불가 (serialization).  `ActiveRequestsSection`(Server)에서 DTO로 매핑한 후 `RequestPreviewCard`(Client)에 primitive만 전달.

```ts
// types/dashboard.ts
export interface QuoteRequestPreviewDTO {
  id: string;
  category: QuoteCategory;
  regionLabel: string;          // `${city} ${district}` 직접 결합
  sizeLabel: string | null;     // `${size}평` or null
  createdAtMs: number;          // Date.getTime() · Client에서 formatRelativeTime
  note: string | null;          // note?.slice(0, 80) 요약
}

export interface DashboardStats {
  completedWorkCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  responseTimeMinutes: number | null;
}
```

매핑은 `ActiveRequestsSection.tsx` (Server Component) 내부 함수 `toPreviewDTO(request: QuoteRequest)` 담당.

### 3.2 Firestore Rules — 변경 없음
- `providers.update: false` 유지 · `setIsAvailable` Server Action Admin SDK 독점
- `quoteRequests.read`: 현재 auth user 허용 (청명이 자기 category 쿼리 가능)

### 3.3 Firestore Indexes — 변경 없음
- 기존 `category + status + createdAt` composite (firestore.indexes.json L64-71) 재사용
- 기존 `listForTriage`와 공유

### 3.4 Storage — 변경 없음

---

## 4. API Specification

### 4.1 Server Action (1개)

#### `setIsAvailable`

```ts
// src/app/actions/provider-dashboard-actions.ts

export interface SetIsAvailableInput {
  available: boolean;
}

export async function setIsAvailable(
  rawInput: SetIsAvailableInput,
): Promise<ActionResult<{ isAvailable: boolean }>>;
```

**5-step**:
1. Zod `{ available: z.boolean() }`
2. `verifySessionCookie` → uid (via helper)
3. `userRepository.get(uid).providerId` guard → `FORBIDDEN`
4. `providerRepository.update(providerId, { isAvailable: input.available })`
5. `revalidatePath('/provider/home')` + `revalidatePath(\`/providers/${providerId}\`)`
6. return `{ ok: true, data: { isAvailable: input.available } }`

**Note**: `resolveProviderId` helper는 provider-profile-editor에서 쓴 동일 패턴 · 별도 shared util로 추출할지 v1.2에 검토 (지금은 각 파일에 localize).

### 4.2 Repository 확장

#### `quoteRequestRepository.listForProvider`

```ts
async listForProvider(params: {
  categories: QuoteCategory[];
  status?: QuoteStatus;
  limit?: number;
}): Promise<QuoteRequest[]>
```

**쿼리**:
```
where('category', 'in', categories.slice(0, 10))   // Firestore in 최대 10개
where('status', '==', status ?? 'submitted')
orderBy('createdAt', 'desc')
limit(limit ?? 3)
```

**Edge cases**:
- `categories.length === 0` → `return []` (쿼리 skip)
- `categories.length > 10` → `.slice(0, 10)` 적용 · 현재 QUOTE_CATEGORIES는 6개라 실제로 도달 불가 · 방어 코드. v1.2+ 카테고리 확장 시 경고 로그 추가 검토.

#### `quoteRequestRepository.countForProvider`

```ts
async countForProvider(params: {
  categories: QuoteCategory[];
  status?: QuoteStatus;
}): Promise<number>
```

**구현**: Firestore Admin SDK aggregation
```ts
const agg = await col()
  .where('category', 'in', categories.slice(0, 10))
  .where('status', '==', status ?? 'submitted')
  .count()
  .get();
return agg.data().count;
```

**Edge case**: `categories.length === 0` → `return 0`

### 4.3 providerRepository — 변경 없음
- 기존 `update(id, patch)` 재활용 (provider-profile-editor에서 추가된 메서드)
- 기존 `get(id)` 재활용 (cache() 적용됨)

---

## 5. UI / UX Design

### 5.1 `/provider/home` 전체 레이아웃

```
┌─────────────────────────────────────────────┐
│ 청명 홈                          [로그아웃]    │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ 좋은 오후입니다 · {companyName}          │   │
│ │ 공개 프로필 보기 →                      │   │
│ │                                      │   │
│ │ 활동중 [ON/OFF]  ← AvailabilityToggle │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ 수신 요청 · 전체 N건 →                        │  ActiveRequestsSection
│ ┌──────────────┐ ┌──────────────┐           │
│ │ 입주청소      │ │ 사무실청소     │  ...      │
│ │ 서울 강남구    │ │ 강남구 선정릉  │           │
│ │ 32평 · 5분전  │ │ 50평 · 1시간전 │           │
│ └──────────────┘ └──────────────┘           │
│                                              │
│ 🔒 오늘 일정                                  │  TodayScheduleCard
│ v1.3에서 공개 예정                            │
│                                              │
│ 실적                                         │  QuickStatsSection
│ ┌────┬────┬────┐                            │
│ │ 누적│ 평점│ 응답│                            │
│ │  5 │ 4.8│ 15분│                            │
│ └────┴────┴────┘                            │
│                                              │
│ 빠른 이동                                    │  ShortcutGrid
│ ┌──────┬──────┐                             │
│ │프로필 │받은요청│ ← badge: N                 │
│ │편집  │       │                             │
│ └──────┴──────┘                             │
│ ┌──────┬──────┐                             │
│ │ 작업 │ 설정  │                             │
│ └──────┴──────┘                             │
└─────────────────────────────────────────────┘
```

### 5.2 Empty state (activeRequests === 0)

```
┌──────────────────────────────────────┐
│ 수신 요청                              │
│                                      │
│ 아직 받은 요청이 없어요                │
│                                      │
│ 📋 프로필을 완성해 매칭률을 높이세요    │
│    [프로필 완성하기 →]                 │
│                                      │
│ 🏷 더 많은 카테고리를 선택하세요        │
│    [카테고리 설정 →]                   │
└──────────────────────────────────────┘
```

조건 분기:
- `provider.categories.length < 3` → "카테고리 설정" CTA 강조
- `!provider.description || !provider.priceBook?.length` → "프로필 완성" CTA 강조

### 5.3 Component List

| # | Component | Type | Location |
|---|-----------|------|----------|
| 1 | `DashboardHero` | Server (greeting 서버 계산 · AvailabilityToggle 자식) | `components/provider-dashboard/DashboardHero.tsx` |
| 2 | `AvailabilityToggle` | Client · useTransition + setIsAvailable | 동일 폴더 |
| 3 | `ActiveRequestsSection` | Server · adaptive branch + DTO 매핑 | 동일 폴더 |
| 4 | `RequestPreviewCard` | Client · `QuoteRequestPreviewDTO` prop · Link to propose | 동일 폴더 |
| 5 | `EmptyRequestsHint` | Client · 2 CTA | 동일 폴더 |
| 6 | `TodayScheduleCard` | Server · coming-soon state | 동일 폴더 |
| 7 | `QuickStatsSection` | Server · 3 카드 | 동일 폴더 |
| 8 | `ShortcutGrid` | Client · 4 shortcut + badge | 동일 폴더 |

**8 컴포넌트 · Server 4 (Hero · ActiveRequestsSection · QuickStatsSection · TodayScheduleCard) · Client 4 (AvailabilityToggle · RequestPreviewCard · EmptyRequestsHint · ShortcutGrid)**.

`DashboardHero`를 Server로 승격: 인사말은 서버 컴퓨트 (hydration mismatch 방지) · `<AvailabilityToggle>` Client leaf만 하단에 배치. 공개 프로필 링크는 `<Link>`.

### 5.4 DashboardHero 인사말 로직

**서버 계산 + prop 주입** (hydration mismatch 방지)

```ts
// DashboardHero.tsx (Server Component)
function getGreeting(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  if (kst < 6) return "편안한 밤";
  if (kst < 12) return "좋은 아침";
  if (kst < 18) return "좋은 오후";
  return "편안한 저녁";
}

export function DashboardHero({ provider }: Props) {
  const greeting = getGreeting();  // 서버에서 한 번 계산
  return <>... {greeting} · {provider.companyName} ...</>;
}
```

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 비로그인 /provider/home | `/login?next=/provider/home` redirect |
| provider role 없음 | `/signup-provider` redirect |
| provider 레코드 없음 | `/signup-provider` redirect (데이터 불일치) |
| listForProvider 실패 (인덱스 빌드 중 등) | ActiveRequestsSection 자체 에러 fallback (빈 상태로 표시 · console.warn) |
| countForProvider 실패 | "전체 N건 →" 링크는 count 없이 "더 보기 →" 로 fallback |
| setIsAvailable 실패 | AvailabilityToggle 에러 토스트 · 이전 상태 rollback |
| provider.categories === [] | ActiveRequestsSection empty 상태 · "카테고리 설정" CTA 강조 |
| Zod 실패 | AppError INVALID_INPUT |

---

## 7. Security

- **Firestore rules `providers.update: false`**: Server Action Admin SDK 독점 (기존 패턴)
- **Ownership guard**: `userRepository.get(uid).providerId` 검증 후에만 update
- **Storage rules**: 변경 없음
- **CSRF**: Next.js Server Action 내장 보호
- **quoteRequests.read**: v1.1 규칙으로 auth user 접근 허용 (청명이 category 쿼리 가능)
- **rate limit**: setIsAvailable은 간단 토글 · v1 MVP에서 rate limit 생략 · v1.1c 검토

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation Server** | `app/provider/home/page.tsx` |
| **Presentation Client** | `components/provider-dashboard/*` (8개 · Server 4: Hero·ActiveRequestsSection·QuickStatsSection·TodayScheduleCard · Client 4: AvailabilityToggle·RequestPreviewCard·EmptyRequestsHint·ShortcutGrid) |
| **Application** | `app/actions/provider-dashboard-actions.ts` (1 Server Action) |
| **Domain** | `types/dashboard.ts` (DashboardStats DTO) · 기존 `QUOTE_CATEGORIES` · `QuoteStatus` |
| **Infrastructure** | `quoteRequestRepository.{listForProvider, countForProvider}` (추가) · 기존 `providerRepository`, `userRepository`, `workCaseRepository` |

---

## 9. Convention

- 컴포넌트 PascalCase · utility kebab-case
- Server-only repositories (`import "server-only"`)
- Client: `"use client"` directive
- Import order: external → `@/...` → relative → type
- ARIA: 섹션에 `aria-labelledby` · 토글에 `role="switch"` + `aria-checked` · badge에 `aria-label` (예: "받은 요청 3건")

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── provider/home/page.tsx                    🆕 Server shell + Suspense
│   └── actions/
│       └── provider-dashboard-actions.ts         🆕 1 Server Action (setIsAvailable)
├── components/provider-dashboard/                 🆕 폴더
│   ├── DashboardHero.tsx                         🆕 Client · 인사말 + 공개 프로필 링크 + Toggle
│   ├── AvailabilityToggle.tsx                    🆕 Client · useTransition
│   ├── ActiveRequestsSection.tsx                 🆕 Server · adaptive branch
│   ├── RequestPreviewCard.tsx                    🆕 Client · Link
│   ├── EmptyRequestsHint.tsx                     🆕 Client · 2 CTA
│   ├── QuickStatsSection.tsx                     🆕 Server · 3 카드
│   ├── TodayScheduleCard.tsx                     🆕 Server · coming-soon
│   └── ShortcutGrid.tsx                          🆕 Client · 4 tile
├── types/
│   └── dashboard.ts                              🆕 DashboardStats DTO
├── lib/firebase/
│   └── quote-request-repository.ts               🔄 listForProvider + countForProvider 추가
└── components/nav/tab-definitions.ts             🔄 PROVIDER_TABS[0].href 교체
```

### 10.2 Implementation Order (8 steps)

1. **types/dashboard.ts** + **quoteRequestRepository 확장** (listForProvider + countForProvider)
2. **provider-dashboard-actions.ts** (setIsAvailable + resolveProviderId helper localize)
3. **DashboardHero** + **AvailabilityToggle** (인사말 + 토글)
4. **ActiveRequestsSection** + **RequestPreviewCard** + **EmptyRequestsHint** (핵심 섹션)
5. **QuickStatsSection** + **TodayScheduleCard** (보조 섹션)
6. **ShortcutGrid** (4 shortcut + badge)
7. **`/provider/home/page.tsx`** (Server shell · Promise.all · 섹션 조립)
8. **BottomTabNav tab-definitions.ts** PROVIDER_TABS[0] href 교체 + smoke test

### 10.3 Pre-flight 체크리스트

- [ ] Firestore `category+status+createdAt` 인덱스 상태 확인 (이미 존재 · skip)
- [ ] 청명 계정으로 /provider/home 접속 · 활성/empty 분기 모두 확인
- [ ] AvailabilityToggle on/off → /providers/{id} reader 반영 확인
- [ ] BottomTabNav "홈" 탭 → /provider/home 연결 확인
- [ ] 비로그인/비-provider redirect 동작 확인
- [ ] Shortcut "프로필 편집" → /provider/profile (editor) 진입 확인
- [ ] QuickStats null 값 → "아직 없음" 표시 확인

---

## 11. Next.js 16 Specific

### 11.1 Cache Components
- page.tsx cookies() 호출 → Suspense 내부 (기존 provider-profile 패턴 동일)
- providerRepository.get · userRepository.get — 이미 `cache()` wrapped
- quoteRequestRepository.listForProvider · countForProvider — 매번 fresh (cache 안 함 · dashboard 최신성 우선)

### 11.2 revalidatePath

Server Action 성공 시:
- `/provider/home` (dashboard 최신)
- `/providers/${providerId}` (reader · 공개 프로필에도 isAvailable 영향 시)

### 11.3 async params/searchParams
- 현재 query param 없음 · future (예: `?filter=today`)는 v1.2 검토

---

## 12. Test Plan

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /provider/home | /login redirect |
| 2 | provider role 없음 | /signup-provider redirect |
| 3 | provider record 없음 | /signup-provider redirect |
| 4 | provider.categories === [] | EmptyRequestsHint "카테고리 설정" CTA 강조 |
| 5 | activeRequests === 0 | EmptyRequestsHint + 2 CTA 노출 |
| 6 | activeRequests === 1 | RequestPreviewCard × 1 · "전체 1건 →" |
| 7 | activeRequests === 5 | Top 3 card + "전체 5건 →" 링크 |
| 8 | RequestPreviewCard 클릭 | /provider/requests/{id}/propose |
| 9 | AvailabilityToggle on → off | providers.isAvailable=false + revalidate + reader 반영 |
| 10 | AvailabilityToggle 실패 (network 에러) | 에러 토스트 · 이전 상태 rollback |
| 11 | QuickStats rating=null | "아직 없음" 표시 |
| 12 | BottomTabNav "홈" 클릭 | /provider/home navigate (기존 /provider/profile 아님) |
| 13 | Shortcut "프로필 편집" 클릭 | /provider/profile (editor) |
| 14 | Shortcut "받은 요청" badge | totalCount 일치 |
| 15 | TodayScheduleCard | "v1.3에서 공개" 자물쇠 상태 |
| 16 | Hero 인사말 KST 변동 | 시간대 따라 아침/오후/저녁 전환 |
| 17 | proxy.ts matcher | `/provider/home` 자동 auth 적용 |
| 18 | `categories.length > 10` 방어 | `.slice(0, 10)` 적용 · 현 QUOTE_CATEGORIES 6개라 실제 도달 없음 · 쿼리 에러 없음 |
| 19 | QuoteRequestPreviewDTO 매핑 | Server에서 Timestamp → ms 변환 · Client `RequestPreviewCard`에 primitive 전달 · hydration 에러 없음 |
| 20 | DashboardHero 서버 계산 greeting | SSR/hydration 일치 · 시간대 전환은 서버 재요청 시점에 발생 |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 10건 해소. Server shell + Suspense · adaptive UX · listForProvider + countForProvider · setIsAvailable · 8 컴포넌트 · BottomTabNav "홈" 재배치 · `/provider/home` 신규 경로 · Test Plan 17건 · Implementation Order 8-step | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 피드백 97%→ 반영: (1) 컴포넌트 카운트 8개 일관화 + DashboardHero Server 승격 (2) `QuoteRequestPreviewDTO` 신규 + Timestamp→ms 매핑 (Server→Client serialization 보장) (3) getGreeting dead 라인 제거 + 서버 계산 prop 주입 (4) `categories.length > 10` 방어 문서화 + Test #18 추가 (5) Test #19 DTO 매핑 · #20 greeting hydration 추가 (6) §8 Server/Client 4-4 분류 명시 | Seokho Lee |
