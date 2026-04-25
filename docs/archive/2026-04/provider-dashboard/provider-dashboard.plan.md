---
template: plan-plus
version: 0.1
feature: provider-dashboard
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 홈 대시보드 (provider-dashboard)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #11 (v1.1b #4)
> 선행: provider-profile-editor (v1.1b #3 · Match 99% archived)
> 다음: `/pdca design provider-dashboard`

---

## 1. User Intent Discovery

### 1.1 배경
v1.1b #1~#3에서 청명 쪽 **편집기(provider-profile-editor)** + **공개 프로필(provider-profile reader)** + **하단 네비(bottom-tab-nav)** 완성. 하지만 BottomTabNav의 청명 "홈" 탭이 현재 `/provider/profile` (편집기)로 연결되어, **앱 진입 직후 "오늘 뭘 해야 하는지" 파악할 홈이 없음**. 청명이 편집 탭과 홈을 구분하도록 운영 허브를 신설.

### 1.2 핵심 목적 — 오늘의 운영 허브 (Q1=A)
**청명이 앱 열자마자 "오늘 해야 할 일"을 한눈에 파악**하도록 한다.
- 최상단: 인사말 + 활동중 토글 (`isAvailable`)
- 핵심 섹션: 수신 요청 상위 3 + 전체 N건 link (빠른 대응)
- 보조 섹션: 오늘 일정 placeholder (v1.3 booking 의존) + Quick Stats + Shortcut Grid

### 1.3 타겟 사용자 — Adaptive (Q2=C · 신호 Q3=B)
**수신 요청 개수 기반 2-branch adaptive**:
- `activeRequests === 0` → 신규 UX: EmptyRequestsHint + CTA ("프로필 완성" · "카테고리 넓히기")
- `activeRequests >= 1` → 활성 UX: 상위 3 요청 카드 + propose CTA
- 1순위: 신규 청명 (첫 견적 잡기) · 2순위: 활성 청명 (일거리 놓치지 않기)

### 1.4 MVP 경계
- ✅ `/provider/home` 신규 경로 (stub) · Server shell + Suspense
- ✅ BottomTabNav "홈" 탭 `href` 재배치 (`/provider/profile` → `/provider/home`)
- ✅ DashboardHero (업체명 + 인사말 + AvailabilityToggle + 공개 프로필 링크)
- ✅ ActiveRequestsSection (상위 3 + 전체 N건 link)
- ✅ RequestPreviewCard (category · region · size · 제출시간 · → propose)
- ✅ EmptyRequestsHint (2 CTA: 프로필 완성 · 카테고리 넓히기)
- ✅ TodayScheduleCard placeholder ("v1.3에서 공개" · 자물쇠 아이콘)
- ✅ QuickStatsSection (3 카드: 누적 작업 · 평점 · 응답시간 · null이면 "아직 없음")
- ✅ AvailabilityToggle (Server Action setIsAvailable)
- ✅ ShortcutGrid (4 shortcut: 프로필편집 · 받은요청 · 작업 · 설정 · 받은요청에 badge)
- ✅ `quoteRequestRepository.listForProvider(params)` 신규
- ✅ `setIsAvailable` Server Action
- ❌ 매출 요약 (v2 payment 의존)
- ❌ 단골 고객 목록 (v2+ analytics-batch 의존)
- ❌ 근처 견적 지도 (v1.2 provider-search 의존)
- ❌ onSnapshot 실시간 (v1.2 chat에서 첫 도입 권장)
- ❌ refresh 버튼 / pull-to-refresh
- ❌ Today Schedule 실데이터 (v1.3 booking 의존)

### 1.5 성공 기준 (Q3 동의)
- **S1**: 페이지 로드 <500ms (server fetch 병렬 Promise.all)
- **S2**: 주요 CTA 1-click (요청 → propose · 공개 프로필 → `/providers/{id}`)
- **S3**: empty state에서 회복 동선 명확 (요청 0 → 프로필 완성 / 카테고리 넓히기)
- adaptive UX signal 정확 (active requests 개수 기반)

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| **A** | **Server-rendered vertical feed** (Cache Components 일관 · cache() 재사용) | **채택** |
| B | Client-heavy reactive dashboard (onSnapshot realtime) | 기각 (v1.2 chat에서 첫 도입 · 현재 과도) |
| C | Hybrid (Server shell + Client realtime ActiveRequests) | 기각 (A+B 복잡도 합 · QA 포인트 2배) |

**A 이점**
- v1.1b 마무리 목적에 부합 · 기존 provider-profile/editor 패턴 일관
- `providerRepository` · `userRepository` · `workCaseRepository` 전부 `cache()` 적용됨
- Server Action 1개 + 신규 repo 메서드 1개만 추가 · 코드 표면적 최소
- v1.3+ booking 도입 시 TodayScheduleCard만 교체

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (12개)

| # | 항목 | 위치 |
|---|------|------|
| C1 | `/provider/home` 신규 경로 | `app/provider/home/page.tsx` |
| C2 | BottomTabNav "홈" 탭 재배치 | `components/nav/tab-definitions.ts` |
| C3 | 페이지 shell: header (업체명 + 인사말 + 공개 프로필 링크) | page.tsx + DashboardHero |
| C4 | 수신 요청 상위 3건 카드 | ActiveRequestsSection + RequestPreviewCard |
| C5 | 요청 카드 → `/provider/requests/{id}/propose` CTA | RequestPreviewCard |
| C6 | 요청 개수 배지 (전체 → `/provider/requests`) | ActiveRequestsSection |
| C7 | EmptyRequestsHint (프로필 완성 · 카테고리 넓히기) | EmptyRequestsHint |
| C8 | TodayScheduleCard placeholder ("v1.3에서 공개") | TodayScheduleCard |
| C9 | QuickStats (누적 작업 · 평점 · 응답시간) | QuickStatsSection |
| C10 | AvailabilityToggle (isAvailable) | AvailabilityToggle + Server Action |
| C11 | ShortcutGrid (4 shortcut) | ShortcutGrid |
| C12 | Shortcut 받은 요청 badge (totalCount) | ShortcutGrid |

### 3.2 Out of Scope → v1.2+

| 항목 | 이동 이유 |
|------|----------|
| 매출 요약 | v2 payment 의존 |
| onSnapshot 실시간 | v1.2 chat에서 첫 도입 |
| 주기 revalidate / refresh 버튼 | v1.2 검토 |
| 단골 고객 목록 | v2+ analytics-batch 의존 |
| 근처 견적 지도 | v1.2 provider-search 재활용 |
| Today Schedule 실데이터 | v1.3 booking 의존 |

---

## 4. Architecture Sketch (Phase 4 승인 반영)

### 4.1 Route Strategy
- **신규**: `/provider/home` (Server shell + Suspense + 섹션별 Server 컴포넌트)
- **기존 유지**: `/provider/profile` (editor · v1.1b #3 완결) — BottomTabNav "편집"으로 명명하거나 Shortcut에서 접근
- **BottomTabNav 변경**: `PROVIDER_TABS[0].href: "/provider/profile"` → `"/provider/home"`
- **proxy.ts**: `/provider/home`는 기존 `/provider/*` matcher에 이미 포함 (확인 필요, 없으면 추가)

### 4.2 Server Fetch 병렬화

```ts
const [provider, activeRequests, workCases] = await Promise.all([
  providerRepository.get(providerId),                         // cache()
  quoteRequestRepository.listForProvider({                    // 🆕
    categories: provider.categories,
    status: 'submitted',
    limit: 4,   // top 3 + 1 buffer for count indicator
  }),
  workCaseRepository.listByProvider(providerId, 1),           // 존재 여부
]);
```

- `provider.categories`를 먼저 알아야 해서 실제로는 `providerRepository.get` 먼저 → 이후 나머지 2개 병렬. (Design 단계 trade-off 검토)
- 총 요청 개수는 별도 count 쿼리 대신 limit(4) 결과 + "전체 N건"은 `activeRequests.length >= 4 ? "4+" : activeRequests.length.toString()` 근사 OR separate count query (Design 결정)

### 4.3 Data Sources
- `providers/{id}`: Stats · isAvailable · categories · rating · responseTimeMinutes
- `quoteRequests`: where category in + status == 'submitted' + orderBy createdAt desc + limit
- `workCases`: count placeholder (또는 `provider.completedWorkCount` 사용)

### 4.4 Adaptive Signal (Q2=C · Q3=B)
```
activeRequests.length === 0
  → ActiveRequestsSection → EmptyRequestsHint (2 CTA)
  → ShortcutGrid badge=0 · 프로필 완성 강조
activeRequests.length >= 1
  → ActiveRequestsSection → RequestPreviewCard × min(3, N) + "전체 N건 →"
  → ShortcutGrid badge=N
```

### 4.5 Server Actions (1개)
```ts
setIsAvailable({ available: boolean }): ActionResult<{ isAvailable: boolean }>
// 5-step: Zod → auth → providerId guard → providers.update → revalidatePath × 2
```

---

## 5. Component Tree

```
src/
├── app/
│   └── provider/home/page.tsx                    🆕 Server shell + Suspense
│
├── components/provider-dashboard/                 🆕 폴더 (7 components)
│   ├── DashboardHero.tsx                         🆕 Client
│   ├── AvailabilityToggle.tsx                    🆕 Client
│   ├── ActiveRequestsSection.tsx                 🆕 Server
│   ├── RequestPreviewCard.tsx                    🆕 Client
│   ├── EmptyRequestsHint.tsx                     🆕 Client
│   ├── QuickStatsSection.tsx                     🆕 Server
│   ├── TodayScheduleCard.tsx                     🆕 Server
│   └── ShortcutGrid.tsx                          🆕 Client
│
├── app/actions/
│   └── provider-dashboard-actions.ts             🆕 1 Server Action (setIsAvailable)
│
├── lib/firebase/
│   └── quote-request-repository.ts               🔄 listForProvider 추가
│
├── types/
│   └── dashboard.ts                              🆕 DashboardStats DTO
│
└── components/nav/tab-definitions.ts             🔄 PROVIDER_TABS[0].href 교체
```

---

## 6. Data Flow (Phase 4.3 승인 반영)

### 6.1 GET /provider/home
1. proxy.ts matcher `/provider/*` → require auth
2. Server page: cookies → verifySessionCookie → uid → userRepository.get → providerId guard (없으면 /signup-provider)
3. providerRepository.get (cache) → provider
4. Promise.all: quoteRequestRepository.listForProvider(...) + workCaseRepository.listByProvider(..., 1)
5. 섹션별 Suspense 내부 render · adaptive branch

### 6.2 POST setIsAvailable
1. Zod `{available: z.boolean()}`
2. verifySessionCookie → uid
3. userRepository.get → providerId guard (FORBIDDEN)
4. providerRepository.update(providerId, { isAvailable: available })
5. revalidatePath('/provider/home') + revalidatePath(`/providers/${providerId}`)
6. return `{ ok:true, data: { isAvailable: available } }`

---

## 7. Firestore/Storage Rules

- **Firestore rules**: 변경 없음 (quoteRequests.read는 v1.1에서 이미 auth user 허용 · providers.update:false 유지 · Admin SDK 독점)
- **Firestore indexes**: `category + status + createdAt` composite 필요할 수 있음 (Design 단계에서 확인 · 없으면 `firestore.indexes.json` 추가)
- **Storage rules**: 변경 없음

---

## 8. Open Questions (Design 단계에서 결정)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | activeRequests 총개수를 별도 count 쿼리로 정확히 표시 vs `limit(4)` 결과로 "3+" 근사 | limit+1 pattern (4 fetch → 3 표시 · "더 있음" 표식) |
| Q2 | providers.completedWorkCount placeholder vs workCaseRepository count | placeholder 우선 · Design에서 확정 |
| Q3 | `quoteRequests.where('category', 'in', categories)` 인덱스 존재 여부 | Design 단계에서 firestore.indexes.json 확인 · 없으면 추가 |
| Q4 | notifiedProviderIds 필터 추가 여부 (해당 provider에게 실제로 알림 간 것만) | 현재 쿼리는 category match만 · notifiedProviderIds는 "array-contains" 추가 고려 |
| Q5 | ShortcutGrid 받은요청 badge 실시간성 (Server fetch 시점 vs revalidate) | v1: revalidatePath 의존 · v1.2 onSnapshot |
| Q6 | AvailabilityToggle off → 어떤 효과? (quote-response에서 내 응답 막기?) | v1: 단순 flag · 실제 response 차단은 v1.1c |
| Q7 | /provider/home ≠ /provider/profile 분리 → /provider/profile 편집기 진입은 어디서? | ShortcutGrid 첫 타일 "프로필 편집" |
| Q8 | provider.categories가 빈 배열일 때 쿼리 동작 (where 'in' []) | EmptyRequestsHint + "카테고리 넓히기" 강조 |

---

## 9. Implementation Order (예상 Do 단계)

1. `types/dashboard.ts` + `quoteRequestRepository.listForProvider` 확장 + firestore.indexes.json 보완
2. `provider-dashboard-actions.ts` (setIsAvailable)
3. 공통 컴포넌트: DashboardHero · AvailabilityToggle · EmptyRequestsHint
4. 섹션 컴포넌트: ActiveRequestsSection · QuickStatsSection · TodayScheduleCard
5. RequestPreviewCard · ShortcutGrid
6. `/provider/home/page.tsx` (Server shell + Suspense + adaptive branch)
7. BottomTabNav PROVIDER_TABS "홈" href 교체 + `/provider/profile`는 "편집"으로 명명 여부 결정
8. Smoke test + index build 확인

---

## 10. Brainstorming Log

| Phase | 결정 사항 |
|-------|----------|
| Phase 0 | Master Plan v1.1b 잔여 feature · BottomTabNav "홈" 재배치 필요 · 기존 repos cache 적용 완료 |
| Phase 1 Q1 | A = 오늘의 운영 허브 (운영 포커스) |
| Phase 1 Q2 | C = Adaptive (데이터 유무 기반 UX 변화) |
| Phase 1 Q3 | B = 수신 요청 개수 기반 adaptive signal · S1/S2/S3 성공 기준 동의 |
| Phase 2 | A = Server-rendered vertical feed (Client-heavy B 및 Hybrid C 기각) |
| Phase 3 | 12 MVP 확정 (C1-C12 권장안 · 6개 out-of-scope) |
| Phase 4.1 | Server shell + Promise.all 병렬 fetch + 섹션별 Suspense 승인 |
| Phase 4.2 | 8 컴포넌트 폴더 + 1 Server Action + 1 repo 확장 승인 |
| Phase 4.3 | GET + POST data flow + Test Plan 8개 + firestore index 확인 과제 승인 |

---

## 11. Next Steps

- [ ] `/pdca design provider-dashboard` — Design 문서 작성 (Open Questions 8개 해소 + Test Plan 확장)
- [ ] design-validator 호출
- [ ] `/pdca do provider-dashboard` — 구현 (Implementation Order 8 step)
- [ ] `/pdca analyze provider-dashboard` — Gap detection (목표 ≥99%)
- [ ] `/pdca report + archive provider-dashboard`

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 12 MVP · 6 out-of-scope · 8 Open Questions · 8-step implementation order. Approach A (Server-rendered vertical feed) + Adaptive signal (Q2=C · Q3=B · active requests count 기반) | Seokho Lee |
