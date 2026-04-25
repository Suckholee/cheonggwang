---
template: plan-plus
version: 0.1
feature: provider-search
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명찾기 · 필터 + 정렬 탐색 (provider-search)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #14 (v1.2 #2)
> 선행: chat (v1.2 #1 · Match 100% archived · onSnapshot 첫 도입)
> 다음: `/pdca design provider-search`

---

## 1. User Intent Discovery

### 1.1 배경
v1.2 #1 `chat` 완료로 협의 채널 확보. 고객이 **견적 요청 전 "어떤 청명이 있나" 탐색할 수 있는 수단 부재**. BottomTabNav "청명찾기" 탭은 현재 `/search` placeholder 상태. client-dashboard의 "Top 5 청명"은 미리보기 수준으로 한계 · 전체 탐색 + 필터/정렬이 필요한 시점.

### 1.2 핵심 목적 — 탐색 + 비교 shopping (Q1=A)
**견적 요청 전 고객이 필터/정렬로 청명을 훑어보고 프로필 상세 진입**하도록 한다.
- 카테고리 · 지역 · 배상보험 · 평점 기반 필터
- 재계약률 · 평점 기준 정렬
- 카드 클릭 → `/providers/{id}` → `/quote/new?providerId=...` 전환 유도

### 1.3 Filter & Sort Scope (Q2=A)
**최소 MVP — 4 필터 + 2 정렬**:
- 필터: 카테고리 1개 · 지역 1개 · 배상보험 on/off · 평점 4.0+ on/off
- 정렬: 재계약률 DESC (default) / 평점 DESC
- 기존 composite index 재활용 가능 · 신규 2개 추가 필요

### 1.4 View & Routing (Phase 2=A+A1)
- **Approach A**: Server-first 목록 + URL 쿼리 파라미터
- **A1**: 리스트만 (지도 토글은 v1.2b로 분리)
- URL 예시:
  ```
  /search                                            ← 전체
  /search?cat=move-in                                 ← 카테고리
  /search?city=서울특별시&district=강남구             ← 지역
  /search?insured=1&minRating=4                       ← 필터 combo
  /search?sort=rating                                 ← 정렬
  ```

### 1.5 MVP 경계
- ✅ `/search` placeholder 완전 교체 (Server shell + Suspense + URL param)
- ✅ FilterBar (카테고리 select · 지역 select · 배상 toggle · 평점 toggle · sort · 초기화)
- ✅ ProviderSearchCard (세로 카드 · 사진 + 이름 + 평점 + 재계약 + 카테고리 태그 + 지역 + 배상 배지)
- ✅ SearchEmptyState ("조건에 맞는 청명이 없어요" + 필터 초기화)
- ✅ `providerRepository.search(filters)` 신규 (Firestore query + client-side 보정)
- ✅ `parseSearchParams` pure helper
- ✅ Firestore composite index 2개 추가 (`isAvailable + categories + repeatRate`, `isAvailable + categories + rating`)
- ✅ 100 cap + `console.warn` (v1.2b paginate 트리거)
- ✅ 비로그인 public 노출
- ❌ 지도 뷰 (v1.2b · Kakao Maps + geocoding)
- ❌ 다중 지역/카테고리 선택 (v1.2b)
- ❌ 응답시간 필터 · 경력 필터 · 활동중 only (v1.2b · default `isAvailable:true` 유지)
- ❌ 검색어 입력 (v2+ · Algolia/Typesense)
- ❌ Pagination / Infinite scroll (v1.2b · cursor-based)
- ❌ 거리 기반 정렬 (v1.2b · geocoding)
- ❌ 저장된 검색 · 즐겨찾기 청명 (v2+ · localStorage)
- ❌ 필터별 결과 count badge (v1.2b)

### 1.6 성공 기준
- 5명 seed · 재계약률 DESC 정렬 정확 (마포 홈케어 0.85 → 친환경 0.3)
- 필터 변경 → URL 갱신 → Server 재 fetch → 결과 업데이트 <500ms
- 공유 가능한 URL (copy/paste로 동일 결과 재현)
- 비로그인에서도 탐색 가능
- 결과 0건 → 필터 초기화 CTA로 회복

---

## 2. Alternatives Explored

### 2.1 Core Purpose (Q1)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **탐색 + 비교 (shopping)** | **채택** · 견적 요청 전 탐색 focus |
| B | 지역 기반 로컬 탐색 (map-first) | 기각 · geocoding infrastructure v1.2b |
| C | 추천 기반 (editorial curation) | 기각 · analytics-batch v2+ 의존 |
| D | A + B 혼합 (리스트 ↔ 지도 토글) | 기각 · v1.2b로 분리 |

### 2.2 View & Routing (Phase 2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Server-first + URL query param** | **채택** · SEO · 공유 가능 · Cache Components 호환 |
| B | Client-heavy (in-memory filter) | 기각 · 확장성 낮음 |
| C | Hybrid (Server 초기 + Client realtime) | 기각 · 복잡도만 증가 (static data) |

### 2.3 View 형태
| # | 접근 | 결과 |
|---|------|------|
| **A1** | **리스트만 (v1 MVP)** | **채택** · YAGNI |
| A2 | 리스트 + 지도 placeholder | 기각 · 복잡도 |
| A3 | 리스트 + Kakao Maps embed | 기각 · geocoding v1.2b |

---

## 3. YAGNI Review — 확장 18개 확정

### 3.1 v1 MVP 포함 (18개)

| # | 항목 | 위치 |
|---|------|------|
| C1 | `/search/page.tsx` placeholder 교체 Server shell | `app/search/page.tsx` |
| C2 | `parseSearchParams` pure helper | `lib/search/parse-search-params.ts` |
| C3 | BottomTabNav "청명찾기" `/search` 이미 연결 (검증만) | tab-definitions.ts |
| C4 | FilterBar (sticky · 5 컨트롤) | `FilterBar.tsx` |
| C5 | CategoryFilter (7 radio) | `CategoryFilter.tsx` |
| C6 | RegionFilter (14 select) | `RegionFilter.tsx` |
| C7 | InsuredToggle | `InsuredToggle.tsx` |
| C8 | MinRatingToggle (4.0+) | `MinRatingToggle.tsx` |
| C9 | ResetFiltersButton | `ResetFiltersButton.tsx` |
| C10 | ActiveFiltersSummary (배지 요약) | `ActiveFiltersSummary.tsx` |
| C11 | SortDropdown | `SortDropdown.tsx` |
| C12 | SearchResultsSection | `SearchResultsSection.tsx` |
| C13 | ProviderSearchCard | `ProviderSearchCard.tsx` |
| C14 | ResultsCount ("N명") | `ResultsCount.tsx` |
| C15 | SearchEmptyState | `SearchEmptyState.tsx` |
| C16 | 100+ 결과 console.warn | provider-repository.ts |
| C17 | `providerRepository.search(filters)` | provider-repository.ts |
| C18 | Firestore composite index 2개 | firestore.indexes.json |

### 3.2 Out of Scope → v1.2b+ / v2+

| 항목 | 이동 이유 |
|------|----------|
| 지도 뷰 | v1.2b · Kakao Maps + geocoding |
| 다중 지역/카테고리 | v1.2b |
| 응답시간 · 경력 · 활동중 only | v1.2b |
| 검색어 | v2+ · Algolia/Typesense |
| Pagination / Infinite scroll | v1.2b · cursor-based |
| 거리 기반 정렬 | v1.2b |
| 저장된 검색 · 즐겨찾기 | v2+ localStorage |
| 필터별 count badge | v1.2b |

---

## 4. Architecture Sketch (Phase 4.1)

### 4.1 Fetch Flow
```ts
// /search/page.tsx (Server)
const filters = parseSearchParams(await searchParams);
await connection();   // Next.js 16 dynamic 전환
const providers = await providerRepository.search(filters);
const dtos = providers.map(toProviderSearchCardDTO);
```

### 4.2 `providerRepository.search(filters)`
- Firestore query:
  - `where('isAvailable', '==', true)` default
  - `where('categories', 'array-contains', cat)` — cat 있을 때
  - `where('insured', '==', true)` — insuredOnly
  - `orderBy(sort, 'desc')` — "repeatRate" | "rating"
  - `limit(100)` · 초과 시 `console.warn`
- Client-side 보정 (Firestore 제약 회피):
  - region: city + district 일치
  - minRating: rating >= 4.0

### 4.3 Client filter 변경
```
User click → FilterBar control (Client)
  → updateParam(key, value) via useRouter
  → URL 갱신 → Server re-render
  → parseSearchParams → re-query
  → 새 결과 render
```

---

## 5. Component Tree (Phase 4.2)

```
src/
├── app/search/page.tsx                         🔄 placeholder 교체
│
├── components/search/                           🆕 폴더 (11 components)
│   ├── FilterBar.tsx                           🆕 Client (wrapper)
│   ├── CategoryFilter.tsx                      🆕 Client
│   ├── RegionFilter.tsx                        🆕 Client
│   ├── InsuredToggle.tsx                       🆕 Client
│   ├── MinRatingToggle.tsx                     🆕 Client
│   ├── SortDropdown.tsx                        🆕 Client
│   ├── ResetFiltersButton.tsx                  🆕 Client
│   ├── ActiveFiltersSummary.tsx                🆕 Server
│   ├── ResultsCount.tsx                        🆕 Server
│   ├── SearchResultsSection.tsx                🆕 Server
│   ├── ProviderSearchCard.tsx                  🆕 Client · Link
│   └── SearchEmptyState.tsx                    🆕 Client
│
├── lib/search/
│   └── parse-search-params.ts                  🆕 pure helper
│
├── types/
│   └── search.ts                               🆕 SearchFilters + ProviderSearchCardDTO
│
├── lib/firebase/
│   └── provider-repository.ts                  🔄 search() 추가
│
└── firestore.indexes.json                      🔄 2 indexes 추가
```

**Server 4 · Client 7 · 순수 pure 2**

---

## 6. Data Model (Phase 4.2)

### 6.1 SearchFilters
```ts
export interface SearchFilters {
  category: QuoteCategory | null;
  region: { city: string; district: string } | null;
  insuredOnly: boolean;
  minRating: number | null;        // 4.0 등
  sort: "repeatRate" | "rating";
}
```

### 6.2 ProviderSearchCardDTO
```ts
export interface ProviderSearchCardDTO {
  providerId: string;
  companyName: string;
  profileImage: string | null;
  rating: number | null;
  reviewCount: number | null;
  repeatRate: number | null;
  categories: QuoteCategory[];         // 최대 3개 tag
  regionLabel: string;                 // "서울 강남구 외 2곳"
  insured: boolean;
  insuranceAmount: number | null;      // "3억"
  responseTimeMinutes: number | null;  // "평균 15분"
}
```

### 6.3 Firestore Indexes 🆕 (2개)

```json
{ "collectionGroup": "providers", "fields": [
  { "fieldPath": "isAvailable", "order": "ASCENDING" },
  { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
  { "fieldPath": "repeatRate", "order": "DESCENDING" }
]},
{ "collectionGroup": "providers", "fields": [
  { "fieldPath": "isAvailable", "order": "ASCENDING" },
  { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
  { "fieldPath": "rating", "order": "DESCENDING" }
]}
```

**insured 필터는 client-side 보정**으로 index 폭발 회피.

---

## 7. Firestore/Storage Rules
- **Rules**: 변경 없음 (`providers.read: true` 이미 public)
- **Storage**: 변경 없음
- **proxy.ts**: 변경 없음 (`/search`는 public · matcher 추가 안 함)

---

## 8. Open Questions (Design 단계 해소)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | category 없을 때 (전체) 정렬 인덱스 | 기존 `isAvailable + repeatRate + rating + completedWorkCount` (client-dashboard 인덱스) 재활용 가능 · 추가 없음 |
| Q2 | category 있을 때 sort=rating 인덱스 | 🆕 `isAvailable + categories + rating` 추가 필요 |
| Q3 | client-side region 필터 때 100+ 결과 부족 | 전체 100 fetch 후 region filter → 10개 남을 수도 있음 · 허용 |
| Q4 | minRating=4.0 fixed value 또는 단계적? | v1 toggle 고정 (4.0+) · v1.2b 슬라이더 검토 |
| Q5 | FilterBar sticky 동작 · BottomTabNav 충돌 | top sticky + 상단 16px margin · 간섭 없음 |
| Q6 | regionFilter "전체" 선택 시 city/district URL 파라미터 | 둘 다 삭제 (parseSearchParams에서 없으면 null 처리) |
| Q7 | ProviderSearchCard height 일정 유지 | 카테고리 태그 최대 3개 + "외 N" 표기 |
| Q8 | seed 5명 부족 · 탐색 UX 빈약 | v1.2b에서 seed 10+ 확장 고려 · v1은 demo 5명으로 진행 |
| Q9 | URL invalid param (예: `?cat=invalid`) | parseSearchParams에서 validation · 무효 시 null 처리 |
| Q10 | ActiveFiltersSummary 표시 조건 | 필터 1개 이상 활성 시만 · 0이면 null 반환 |

---

## 9. Implementation Order (예상 Do 단계 · 10 steps)

1. **types/search.ts** + **firestore.indexes.json 2개 추가** + firebase deploy
2. **lib/search/parse-search-params.ts** (pure)
3. **providerRepository.search(filters)** 확장 (client-side 보정 포함)
4. **FilterBar sub-controls** (CategoryFilter · RegionFilter · InsuredToggle · MinRatingToggle · SortDropdown · ResetFiltersButton)
5. **FilterBar wrapper** (sticky UI)
6. **ActiveFiltersSummary · ResultsCount**
7. **ProviderSearchCard** (DTO 매핑 Server · Client Link)
8. **SearchResultsSection · SearchEmptyState**
9. **`/search/page.tsx`** placeholder 교체 (Suspense + SearchBody)
10. Seed 데이터 확인 + smoke test (필터 조합 · URL 공유 · 재계약률 정렬 정확)

---

## 10. Brainstorming Log

| Phase | 결정 사항 |
|-------|----------|
| Phase 0 | `/search` placeholder · BottomTabNav "청명찾기" 이미 연결 · client-dashboard Top 5에 재사용 후보 많음 |
| Phase 1 Q1 | A = 탐색 + 비교 (shopping) |
| Phase 1 Q2 | A = 최소 MVP 4 필터 + 2 정렬 |
| Phase 2 | A = Server-first URL param · A1 = 리스트만 · 지도 v1.2b |
| Phase 3 | 확장 18 MVP 확정 · out-of-scope 8개 v1.2b+/v2+ |
| Phase 4.1 | Server shell + URL param + Firestore query + client-side 보정 · 100 cap warn |
| Phase 4.2 | 11 컴포넌트 (Server 4 / Client 7) + 2 helper + 1 repo 확장 · 2 indexes |
| Phase 4.3 | URL param → parseSearchParams → Firestore query → client-side region/minRating 보정 → DTO 매핑 → render · Test 18건 |

---

## 11. Next Steps

- [ ] `/pdca design provider-search` — Design 문서 (Open Q 10건 해소 + Test Plan 확장)
- [ ] design-validator 호출
- [ ] `/pdca do provider-search` — 구현 (Implementation Order 10 step)
- [ ] `/pdca analyze provider-search` — Gap detection (≥99% 목표)
- [ ] `/pdca report + archive provider-search` — v1.2 #2 완료

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 18 MVP · out-of-scope 8 · 10 Open Questions · 10-step implementation order. Approach: Server-first URL param · 리스트만 · 4 필터 + 2 정렬 · Firestore 쿼리 + client-side 보정 · 2 composite indexes 추가 · 비로그인 public | Seokho Lee |
