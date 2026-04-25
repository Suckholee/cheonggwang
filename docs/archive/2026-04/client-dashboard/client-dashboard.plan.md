---
template: plan-plus
version: 0.1
feature: client-dashboard
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 고객 홈 대시보드 (client-dashboard)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #12 (v1.1b #5 · **마지막**)
> 선행: provider-dashboard (v1.1b #4 · Match 99% archived)
> 다음: `/pdca design client-dashboard`

---

## 1. User Intent Discovery

### 1.1 배경
v1.1b #1~#4 완료로 청명 쪽 UX 완성도 확보. 고객 쪽은 quote-request(v1.0) 이후 홈 `/` shell만 존재하며 **탐색/비교 UX 부재**. 고객이 "청소 견적을 얼마나 들까?" · "어떤 청명이 잘하나?"를 견적 요청 전에 확인할 수단이 없음. Marketplace v1.1b 마지막 feature로 고객 쪽에도 shell 완성.

### 1.2 핵심 목적 — 가격 투명성 + 탐색 촉진 (Q1=A)
**고객이 견적 요청 전 가격 및 Top 청명을 한눈에 파악**하도록 기존 홈 `/`에 2 섹션 주입.
- AveragePriceSection — 6 카테고리 평균가 (min~max + avg)
- TopProvidersSection — Top 5 청명 카드 (재계약률·평점·완료 작업 기반)

### 1.3 타겟 사용자 & 라우팅 (Q2=A)
- **1차**: 신규 방문 고객 (견적 요청 전 가격 탐색)
- **라우팅**: 기존 홈 `/` 확장 (라우팅 churn 없음 · Master Plan "홈 확장" 뉘앙스와 정합)
- 비로그인도 노출 (탐색 포커스 · providers.read=true public)

### 1.4 Data Source (Q3=D)
**v1은 `providers` 컬렉션 기반 근사치**:
- 평균가: `providers.priceBook[*].basePrice`를 카테고리별 집계 (min/avg/max)
- Top 5: `isAvailable==true` + `repeatRate DESC, rating DESC, completedWorkCount DESC` ordering
- "참고 시세" 디스클레이머 + "v2+ 주간 집계로 전환 예정" 명시
- v2+ `analytics-batch` 도입 시 `dashboardSnapshots/{weekKey}/{category}` 컬렉션으로 **입력만 교체**하고 UI 불변 (price-aggregator pure function 격리 덕분)

### 1.5 Layout (Phase 2=A)
```
[TopBar (기존)]
[CategoryGrid 6 category (기존)]
[TodayCard (로그인 시 · 기존)]
─────────────
🆕 <AveragePriceSection/>   (신규 상단)
🆕 <TopProvidersSection/>   (신규 하단)
─────────────
[BottomTabNav (기존)]
```

### 1.6 MVP 경계
- ✅ 홈 `/page.tsx`에 2 섹션 append (기존 구조 보존)
- ✅ `AveragePriceSection` + `AveragePriceCard` (6 카테고리 · 가로 스크롤)
- ✅ `TopProvidersSection` + `TopProviderCard` (Top 5 · 가로 스크롤)
- ✅ `providerRepository.listTopRated(limit=5)` 신규
- ✅ `providerRepository.listPriceBookAll()` 신규 (limit 100 안전장치)
- ✅ `price-aggregator.ts` 순수 함수 (computeAveragePrices + sortTopRated)
- ✅ `SectionDisclaimer` 공용 ("참고 시세" / "v2+ 전환 예정")
- ✅ `EmptyDataCard` 공용 empty state
- ✅ 섹션별 Suspense
- ✅ Firestore composite index 1개 추가 (`isAvailable + repeatRate + rating + completedWorkCount`)
- ✅ Seed 확장 (기존 청명 repeatRate · priceBook 확충)
- ❌ Top 5 실시간 ranking (v2+ analytics-batch)
- ❌ 카테고리별 평균가 차트·히스토리 (v2+)
- ❌ 단골 청명 섹션 (v1.2b 재계약 유도)
- ❌ 필터/정렬 UI (v1.2 provider-search 담당)
- ❌ 지도 뷰 (v1.2 provider-search)
- ❌ 사용자별 개인화 (v2+)

### 1.7 성공 기준
- 홈 로드 <500ms (기존 + 신규 Promise.all 병렬)
- AveragePriceCard 클릭 → `/quote/new?cat={category}` 1-click 전환
- TopProviderCard 클릭 → `/providers/{id}` 1-click 전환
- 데이터 부족 상태에서도 UX 자연스러움 (EmptyDataCard · disclaimer 명시)
- price-aggregator 순수 함수로 v2+ 전환 시 UI 불변

---

## 2. Alternatives Explored

### 2.1 Route Strategy (Q2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **홈 `/` 확장 (신규 섹션 추가)** | **채택** (Master Plan 정합 · 최소 침습) |
| B | `/search` placeholder 대체 | 기각 (v1.2 provider-search가 주도) |
| C | 로그인/미로그인 adaptive (홈) | 기각 (v1에서 복잡 · v1.2b 재계약 시 도입) |
| D | `/client/home` 별도 경로 | 기각 (routing churn · BottomTabNav 재배치 부담) |

### 2.2 Data Source (Q3)
| # | 접근 | 결과 |
|---|------|------|
| A | Seed 수동 집계 | 기각 (운영자 부담) |
| B | Query-time `.count()/average()` | 기각 (비용 누적 · 데이터 부족 노출) |
| C | providers 기반 근사치 | - |
| **D** | **C + v2+ analytics-batch 교체 예정 명시** | **채택** |

### 2.3 Layout (Phase 2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **상단 기존 유지 + 하단 2 섹션 추가** | **채택** (UX churn 없음) |
| B | CategoryGrid 직후 삽입 | 기각 (TodayCard 밀림) |
| C | 별도 "탐색" 블록 | 기각 (중복 느낌) |

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (15개)

| # | 항목 | 위치 |
|---|------|------|
| C1 | `AveragePriceRow` — 6 카테고리 평균가 카드 | `AveragePriceSection.tsx` |
| C2 | AveragePriceCard → `/quote/new?cat=...` | `AveragePriceCard.tsx` |
| C3 | "참고 시세" 디스클레이머 | `SectionDisclaimer.tsx` |
| C4 | 평균가 계산 로직 (min/avg/max) | `price-aggregator.ts` |
| C5 | EmptyDataCard (평균가 sample 0) | `EmptyDataCard.tsx` |
| C6 | `TopProvidersRow` — Top 5 카드 | `TopProvidersSection.tsx` |
| C7 | TopProviderCard → `/providers/{id}` | `TopProviderCard.tsx` |
| C8 | 랭킹 tie-break (repeatRate→rating→completedWorkCount) | `price-aggregator.ts sortTopRated` |
| C9 | 카드 요소 (profileImage · companyName · rating · count) | `TopProviderCard.tsx` |
| C10 | Top 5 empty state | `EmptyDataCard.tsx` 재사용 |
| C11 | `providerRepository.listTopRated(5)` | `provider-repository.ts` |
| C12 | `providerRepository.listPriceBookAll()` (limit 100) | `provider-repository.ts` |
| C13 | Seed 확장 (repeatRate · priceBook 풍부) | `scripts/seed-first-provider.mjs` |
| C14 | 홈 `/` Server-side 2 섹션 삽입 | `app/page.tsx` |
| C15 | 섹션 Suspense wrap | `app/page.tsx` |

### 3.2 Out of Scope → v1.2+ / v2+

| 항목 | 이동 이유 |
|------|----------|
| Top 5 실시간 ranking | v2+ analytics-batch |
| 차트·히스토리 | v2+ |
| 단골 청명 섹션 (재계약) | v1.2b |
| 필터/정렬 UI | v1.2 provider-search |
| 지도 뷰 | v1.2 provider-search |
| 개인화 | v2+ |

---

## 4. Architecture Sketch (Phase 4.1 승인 반영)

### 4.1 Fetch Flow

```ts
// 기존 auth 및 페이지 구조 유지
const [topProviders, priceProviders] = await Promise.all([
  providerRepository.listTopRated(5),         // 🆕
  providerRepository.listPriceBookAll(),      // 🆕
]);

const averagePrices = computeAveragePrices(priceProviders); // pure
const topDTOs = topProviders.map(toTopProviderCardDTO);     // DTO
```

### 4.2 Layer 분리 (Clean Architecture)
- **Presentation Server**: `page.tsx` · 2 Section · Disclaimer · EmptyDataCard
- **Presentation Client**: AveragePriceCard · TopProviderCard
- **Application**: (없음 · read-only)
- **Domain**: `types/client-dashboard.ts` (DTO) · pure helper `lib/dashboard/price-aggregator.ts`
- **Infrastructure**: `providerRepository.{listTopRated, listPriceBookAll}`

---

## 5. Component Tree

```
src/
├── app/page.tsx                                   🔄 홈에 2 섹션 append
│
├── components/client-dashboard/                    🆕 폴더 (6 components)
│   ├── AveragePriceSection.tsx                    🆕 Server
│   ├── AveragePriceCard.tsx                       🆕 Client · Link
│   ├── TopProvidersSection.tsx                    🆕 Server · DTO 매핑
│   ├── TopProviderCard.tsx                        🆕 Client · Link
│   ├── SectionDisclaimer.tsx                      🆕 Server · 공용
│   └── EmptyDataCard.tsx                          🆕 Server · 공용
│
├── types/
│   └── client-dashboard.ts                        🆕 TopProviderCardDTO · PriceSummary
│
├── lib/firebase/
│   └── provider-repository.ts                     🔄 listTopRated + listPriceBookAll
│
├── lib/dashboard/
│   └── price-aggregator.ts                        🆕 순수 함수
│
├── firestore.indexes.json                         🔄 composite index 1개 추가
│
└── scripts/
    └── seed-first-provider.mjs                    🔄 seed 확장 (repeatRate · priceBook)
```

---

## 6. Data Flow (Phase 4.3 승인 반영)

### 6.1 GET /
1. 기존 auth flow (tryVerifySessionCookie · optional)
2. 기존 섹션 렌더 (TopBar · CategoryGrid · TodayCard)
3. 🆕 Parallel fetch: `Promise.all([listTopRated(5), listPriceBookAll()])`
4. 🆕 Pure: `computeAveragePrices(providers)` · `toTopProviderCardDTO(provider)`
5. 🆕 Render 2 섹션 (각자 Suspense + EmptyDataCard fallback)

### 6.2 Repository 메서드

#### `providerRepository.listTopRated(limit = 5)`
```
where('isAvailable', '==', true)
orderBy('repeatRate', 'desc')
orderBy('rating', 'desc')
orderBy('completedWorkCount', 'desc')
limit(limit)
```
→ 🆕 composite index 필요 (isAvailable + repeatRate + rating + completedWorkCount)

#### `providerRepository.listPriceBookAll()`
```
where('isAvailable', '==', true)
limit(100)
```
→ 기존 단일 필드 인덱스로 충분 · 100+ pagination은 v2+

### 6.3 price-aggregator.ts (순수 함수)

```ts
export function computeAveragePrices(
  providers: Provider[],
): Record<QuoteCategory, PriceSummary>;

export function sortTopRated(
  providers: Provider[],
  limit: number,
): Provider[];  // Firestore orderBy와 동일 tie-break · fallback for in-memory
```

### 6.4 DTO

```ts
export interface TopProviderCardDTO {
  providerId: string;
  companyName: string;
  profileImage: string | null;
  rating: number | null;
  completedWorkCount: number | null;
  repeatRate: number | null;
}

export interface PriceSummary {
  category: QuoteCategory;
  sampleCount: number;
  min: number | null;
  avg: number | null;
  max: number | null;
}
```

---

## 7. Firestore/Storage Rules / Indexes

- **Rules**: 변경 없음 (`providers.read: true` 이미 public)
- **Indexes** 🆕:
  ```json
  {
    "collectionGroup": "providers",
    "fields": [
      { "fieldPath": "isAvailable", "order": "ASCENDING" },
      { "fieldPath": "repeatRate", "order": "DESCENDING" },
      { "fieldPath": "rating", "order": "DESCENDING" },
      { "fieldPath": "completedWorkCount", "order": "DESCENDING" }
    ]
  }
  ```
- **Storage**: 변경 없음

---

## 8. Open Questions (Design 단계 해소)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | listPriceBookAll limit 100 초과 시 경고 로그 여부 | Design에서 warn log 추가 결정 |
| Q2 | sampleCount 노출 방식 ("3건 기준" 표기 여부) | Design v0.2 AveragePriceCard 하단 small text |
| Q3 | 가로 스크롤 vs 그리드 · 모바일 horizontal scroll snap 필요 | Tailwind `snap-x snap-mandatory` 적용 · Design §5 예시 |
| Q4 | Top 5 rating null 처리 (우선순위에서 후순위? 제외?) | Firestore orderBy로 NULLS LAST (Firestore 기본) |
| Q5 | repeatRate null provider (예: 신규 청명) 포함 여부 | NULLS LAST · "최신 가입" 태그 고려 여부 Design |
| Q6 | disclaimer 문구 확정 | "참고 시세 · 실제 견적은 청명 개별 제안" + "v2+ 주간 집계 전환 예정" |
| Q7 | AveragePriceCard 클릭 CTA 문구 | "견적 요청하기 →" vs 카드 전체 Link |
| Q8 | seed 확장 범위 | 최소 5 청명 · 각 priceBook 3+ · repeatRate 분포 (0.3~0.9) |
| Q9 | providerRepository 재활용 vs 신규 함수 분리 | 신규 2 메서드 (listByCategory 재활용 불가 — category 조건 다름) |
| Q10 | computeAveragePrices 0건 카테고리 처리 | `{sampleCount:0, min:null, avg:null, max:null}` 반환 · UI EmptyDataCard 렌더 |

---

## 9. Implementation Order (예상 Do 단계)

1. **types/client-dashboard.ts** + **firestore.indexes.json** 추가
2. **providerRepository 확장** (listTopRated + listPriceBookAll)
3. **price-aggregator.ts** (computeAveragePrices + sortTopRated · unit test 친화)
4. **SectionDisclaimer** + **EmptyDataCard** (공용 helper)
5. **AveragePriceSection** + **AveragePriceCard**
6. **TopProvidersSection** + **TopProviderCard** + DTO 매핑
7. **app/page.tsx** 2 섹션 append + Suspense
8. **seed 확장** + Firebase index 배포 + smoke test

---

## 10. Brainstorming Log

| Phase | 결정 사항 |
|-------|----------|
| Phase 0 | v1.1b 마지막 · Master Plan "홈 확장" 정합 · analytics-batch 없음 제약 |
| Phase 1 Q1 | A = 가격 투명성 + 탐색 촉진 |
| Phase 1 Q2 | A = 홈 `/` 확장 (routing churn 없음) |
| Phase 1 Q3 | D = providers 근사치 + v2+ 전환 예정 명시 |
| Phase 2 | A = 상단 기존 유지 + 하단 2 섹션 추가 |
| Phase 3 | 15 MVP 확정 (C1-C15 전체 · 6 out-of-scope) |
| Phase 4.1 | Parallel fetch · price-aggregator 순수 함수 분리 · 섹션별 Suspense |
| Phase 4.2 | 6 컴포넌트 (2 Section + 2 Card + 2 Helper) · DTO 2종 |
| Phase 4.3 | Repository 2 메서드 · composite index 1 추가 · Test Plan 12건 |

---

## 11. Next Steps

- [ ] `/pdca design client-dashboard` — Design 문서 (Open Q 10건 해소 + Test Plan 확장)
- [ ] design-validator 호출
- [ ] `/pdca do client-dashboard` — 구현 (Implementation Order 8 step)
- [ ] `/pdca analyze client-dashboard` — Gap detection (≥99% 목표)
- [ ] `/pdca report + archive client-dashboard` → **v1.1b 5/5 완료 🏆**

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 15 MVP · 6 out-of-scope · 10 Open Questions · 8-step implementation order. Approach: 홈 `/` 확장 · providers 기반 근사치 · price-aggregator 순수 함수 · 2 Section + 2 Card + 2 Helper · Firestore composite index 1 추가 | Seokho Lee |
