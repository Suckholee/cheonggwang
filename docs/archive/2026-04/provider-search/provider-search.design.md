---
template: design
version: 0.1
feature: provider-search
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-search Design Document

> **Summary**: `/search` placeholder 교체 · Server-first + URL query param · 4 필터 + 2 정렬 · Firestore query + client-side 보정 (region/minRating) · 11 컴포넌트 (Server 4 / Client 7) + 2 pure helpers · 2 composite indexes · 비로그인 public · 100 cap + warn.
>
> **Plan**: [provider-search.plan.md](../../01-plan/features/provider-search.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** category 없을 때 정렬 인덱스 | **기존 `isAvailable + repeatRate + rating + completedWorkCount` 재활용** (client-dashboard 인덱스) · 추가 없음 |
| **Q2** category 있을 때 sort=rating | 🆕 `isAvailable + categories + rating` composite index 필요 |
| **Q3** client-side region 필터 때 부족한 결과 | 100 fetch 후 client filter → 결과 10개 미만도 허용 · v1은 demo 품질 충분 · v1.2b에서 fetch 확대 검토 |
| **Q4** minRating 값 | **v1 toggle 고정값 4.0+** · 슬라이더는 v1.2b |
| **Q5** FilterBar sticky 동작 | `sticky top-0 z-10` · BottomTabNav는 bottom이라 간섭 없음 · mobile viewport safe |
| **Q6** regionFilter "전체" 선택 | city/district URL 파라미터 둘 다 삭제 (`parseSearchParams` null 반환) |
| **Q7** ProviderSearchCard 높이 일관 | 카테고리 태그 **최대 3개** + "외 N" 표기 · `line-clamp-1` description 생략 |
| **Q8** seed 부족 (5명) | v1에서 demo 5명으로 진행 · v1.2b에 10+ 확장 검토 · SearchEmptyState로 자연스럽게 회복 |
| **Q9** URL invalid param | `parseSearchParams`에서 validation · `cat=invalid` → null · `sort=wrong` → "repeatRate" default |
| **Q10** ActiveFiltersSummary 표시 조건 | 필터 1개 이상 활성 시만 · 0이면 `return null` (섹션 숨김) |

---

## 1. Overview

### 1.1 Design Goals
- Server-first + URL query param · SEO + 공유 가능 URL
- Next.js 16 Cache Components 호환 (`await connection()` 패턴)
- 기존 Firestore 인덱스 최대 재활용 + 2개만 신규
- 비로그인 public · proxy matcher 변경 없음
- Client-side 보정으로 Firestore 복합 쿼리 제약 회피

### 1.2 Principles
- Server 컴포넌트 = shell + Firestore query + DTO 매핑
- Client 컴포넌트 = URL 갱신(router.replace) + 필터 UI
- Pure helpers: `parseSearchParams`, DTO 매핑 분리
- `providerRepository.search()`는 Firestore 제약 내 query + in-memory post-filter

---

## 2. Architecture

### 2.1 Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│ GET /search?cat=...&city=...&district=...&insured=1           │
│            &minRating=4&sort=repeatRate                       │
│                                                               │
│ 1. Server /search/page.tsx (placeholder 교체)                 │
│    └─ <Suspense fallback={<SearchSkeleton/>}>                 │
│         <SearchBody searchParams={props.searchParams}/>       │
│       </Suspense>                                             │
│                                                               │
│ 2. SearchBody (Server · async)                                │
│    ├─ const raw = await searchParams                          │
│    ├─ const filters = parseSearchParams(raw)  ← pure          │
│    ├─ await connection()  (Next.js 16 dynamic 전환)            │
│    ├─ const providers = await providerRepository.search(f)   │
│    └─ const dtos = providers.map(toProviderSearchCardDTO)    │
│                                                               │
│ 3. Render:                                                    │
│    <FilterBar filters/>                    (Client wrapper)   │
│      ├─ <CategoryFilter current/>         (Client)            │
│      ├─ <RegionFilter current/>           (Client)            │
│      ├─ <InsuredToggle on/>               (Client)            │
│      └─ <MinRatingToggle on/>             (Client)            │
│    <SortDropdown current/>                 (Client)           │
│    <ActiveFiltersSummary filters/>         (Server)           │
│    <ResultsCount n={dtos.length}/>         (Server)           │
│    <SearchResultsSection cards={dtos}/>    (Server)           │
│      ├─ empty → <SearchEmptyState/>       (Client · Link)     │
│      └─ list  → <ProviderSearchCard/>×N   (Client · Link)     │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Client filter 변경 흐름

```
User clicks CategoryFilter "에어컨청소"
  → CategoryFilter (Client)
  → updateParam('cat', 'aircon') [useRouter.replace]
  → URL: /search?cat=aircon
  → Next.js re-render Server
  → parseSearchParams → Firestore re-query
  → 새 결과 render (Suspense fallback 짧게 표시)
```

### 2.3 Route Strategy
- **신규 경로 없음**. 기존 `/search`의 placeholder만 교체.
- BottomTabNav "청명찾기" 이미 `/search` 연결 (v1.1b #1에서 설정).
- **proxy.ts matcher 변경 없음** · `/search`는 public.

---

## 3. Data Model

### 3.1 Firestore — 변경 없음
기존 `providers` 컬렉션 필드만 사용 · Storage 변경 없음 · rules 변경 없음.

### 3.2 Firestore Indexes 🆕 (2개)

```json
{ "collectionGroup": "providers", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "isAvailable", "order": "ASCENDING" },
  { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
  { "fieldPath": "repeatRate", "order": "DESCENDING" }
]},
{ "collectionGroup": "providers", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "isAvailable", "order": "ASCENDING" },
  { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
  { "fieldPath": "rating", "order": "DESCENDING" }
]}
```

기존 index 활용:
- `isAvailable + repeatRate + rating + completedWorkCount` (client-dashboard) → category 없을 때 정렬
- `categories(array) + createdAt` (기존) → 불필요 (search는 rating/repeatRate 정렬)

### 3.3 Types (`src/types/search.ts`) 🆕

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export interface SearchFilters {
  category: QuoteCategory | null;
  region: { city: string; district: string } | null;
  insuredOnly: boolean;
  minRating: number | null;   // 4.0 등
  sort: "repeatRate" | "rating";
}

export interface ProviderSearchCardDTO {
  providerId: string;
  companyName: string;
  profileImage: string | null;
  rating: number | null;
  reviewCount: number | null;
  repeatRate: number | null;
  categories: QuoteCategory[];          // max 3 + "외 N" 표기
  categoriesOverflow: number;           // 3 초과 수
  regionLabel: string;                  // "서울 강남구" or "서울 강남구 외 2곳"
  insured: boolean;
  insuranceAmount: number | null;       // 만원 단위 변환 후 "3억"
  responseTimeMinutes: number | null;
}

export function hasAnyFilter(f: SearchFilters): boolean {
  return (
    f.category !== null ||
    f.region !== null ||
    f.insuredOnly ||
    f.minRating !== null
  );
}
```

---

## 4. API Specification

### 4.1 `parseSearchParams` (pure · `src/lib/search/parse-search-params.ts`) 🆕

```ts
import {
  QUOTE_CATEGORIES,
  isQuoteCategory,
  type QuoteCategory,
} from "@/domain/quote-category";
import type { SearchFilters } from "@/types/search";

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchFilters {
  const catRaw = typeof raw.cat === "string" ? raw.cat : null;
  const category: QuoteCategory | null =
    catRaw && isQuoteCategory(catRaw) ? catRaw : null;

  const city = typeof raw.city === "string" ? raw.city : null;
  const district = typeof raw.district === "string" ? raw.district : null;
  const region = city && district ? { city, district } : null;

  const insuredOnly = raw.insured === "1";
  const minRating = raw.minRating === "4" ? 4.0 : null;

  const sort: SearchFilters["sort"] =
    raw.sort === "rating" ? "rating" : "repeatRate";

  return { category, region, insuredOnly, minRating, sort };
}
```

### 4.2 `providerRepository.search` 확장

```ts
// 기존 provider-repository.ts에 추가
async search(filters: SearchFilters): Promise<Provider[]> {
  const CAP = 100;
  let q = col()
    .where("isAvailable", "==", true) as FirebaseFirestore.Query;

  if (filters.category) {
    q = q.where("categories", "array-contains", filters.category);
  }
  // insured · region · minRating 전부 client-side 보정 (index 폭발 회피)
  q = q.orderBy(filters.sort, "desc").limit(CAP);

  const snap = await q.get();
  if (snap.size >= CAP) {
    console.warn(
      `[provider-search] result cap reached (${CAP}). v1.2+ paginate 필요`,
    );
  }

  let providers = snap.docs.map((d) => toProvider(d.id, d.data()));

  // client-side 보정 (Firestore 복합 쿼리 제약 회피)
  if (filters.insuredOnly) {
    providers = providers.filter((p) => p.insured);
  }
  if (filters.region) {
    providers = providers.filter((p) =>
      p.regions.some(
        (r) =>
          r.city === filters.region!.city &&
          r.district === filters.region!.district,
      ),
    );
  }
  if (filters.minRating !== null) {
    providers = providers.filter(
      (p) => p.rating != null && p.rating >= filters.minRating!,
    );
  }

  return providers;
}
```

**모든 보조 필터 (insured · region · minRating)는 client-side 보정**으로 통일 · Firestore는 `isAvailable + categories(optional) + orderBy` 2-3 필드만 사용 → **composite index 2개만 추가** (isAvailable+categories+repeatRate / +rating). 4필드 조합 폭발 회피.

**v1.2+ 확장 경로**: 100 cap 내에서 filter 후 <10 결과가 빈번해지면 Firestore 인덱스 추가 + server-side filter로 전환.

### 4.3 DTO 매핑

**위치**: `src/components/search/SearchResultsSection.tsx` 내부 helper (Server 컴포넌트가 제공받은 `Provider[]`을 Card용 DTO로 변환)

```ts
// SearchResultsSection.tsx 내부 helper
function toProviderSearchCardDTO(p: Provider): ProviderSearchCardDTO {
  const firstRegion = p.regions[0];
  const regionCount = p.regions.length;
  const regionLabel = firstRegion
    ? regionCount > 1
      ? `${firstRegion.city} ${firstRegion.district} 외 ${regionCount - 1}곳`
      : `${firstRegion.city} ${firstRegion.district}`
    : "전국";
  const categoriesShown = p.categories.slice(0, 3);
  const categoriesOverflow = Math.max(0, p.categories.length - 3);
  return {
    providerId: p.id,
    companyName: p.companyName,
    profileImage: p.profileImage ?? null,
    rating: p.rating,
    reviewCount: p.reviewCount ?? null,
    repeatRate: p.repeatRate ?? null,
    categories: categoriesShown,
    categoriesOverflow,
    regionLabel,
    insured: p.insured,
    insuranceAmount: p.insuranceAmount ?? null,
    responseTimeMinutes: p.responseTimeMinutes ?? null,
  };
}
```

---

## 5. UI / UX Design

### 5.1 전체 레이아웃

```
┌─────────────────────────────────────────┐
│ 🔍 청명찾기                               │  (header optional · sticky 아님)
│                                          │
│ [카테고리 ▾]  [지역 ▾]                    │  FilterBar (sticky top-0)
│ [☐ 배상]  [☐ 평점 4.0+]                   │
│ [정렬: 재계약률 ▾]        [초기화]        │
│                                          │
│ 카테고리: 입주청소 · 지역: 서울 강남구       │  ActiveFiltersSummary
│                                          │
│ 청명 5명                                  │  ResultsCount
│                                          │
│ ┌──────────────────────────────────┐    │  ProviderSearchCard
│ │ [img]  마포 홈케어 ⭐ 4.8 (89)       │    │
│ │        재계약 85% · 배상보험 3억    │    │
│ │        🏠입주 · ❄️에어컨 · 📆정기    │    │
│ │        서울 마포구 · 응답 15분       │    │
│ │                           자세히 →  │    │
│ └──────────────────────────────────┘    │
│ ┌──────────────────────────────────┐    │
│ │ ... (다음 카드) ...               │    │
│ └──────────────────────────────────┘    │
│                                          │
│ (0건 · empty)                             │
│ 🔍 조건에 맞는 청명이 없어요                │
│ [필터 초기화 →]                           │
└─────────────────────────────────────────┘
```

### 5.2 ProviderSearchCard

```
┌─────────────────────────────────────────┐
│ ┌──────┐  마포 홈케어                      │
│ │ img  │  ⭐ 4.8 (89) · 재계약 85%         │
│ │ 80px │  🛡 배상 3억 · ⏱ 15분 응답        │
│ └──────┘  🏠 🏢 ❄️ +2                    │
│           서울 마포구 외 2곳                │
│                                   → 자세히 │
└─────────────────────────────────────────┘
```

- Link to `/providers/{providerId}`
- 사진 없음 → 이니셜 gradient (client-dashboard 패턴 재활용)
- `hover:border-indigo-300` interactive hint
- `insured` 있으면 🛡 배지 · 없으면 숨김
- `repeatRate` null 시 "신규 청명" 태그

### 5.3 Component List

| # | Component | Type | Location |
|---|-----------|:----:|----------|
| 1 | FilterBar (wrapper) | Client | `components/search/FilterBar.tsx` |
| 2 | CategoryFilter | Client | 동일 |
| 3 | RegionFilter | Client · **14 옵션** ("전체" sentinel + 13 `FORM_REGION_OPTIONS`) | 동일 |
| 4 | InsuredToggle | Client | 동일 |
| 5 | MinRatingToggle | Client | 동일 |
| 6 | SortDropdown | Client | 동일 |
| 7 | ResetFiltersButton | Client | 동일 |
| 8 | ActiveFiltersSummary | Server | 동일 |
| 9 | ResultsCount | Server | 동일 |
| 10 | SearchResultsSection | Server | 동일 |
| 11 | ProviderSearchCard | Client · Link | 동일 |
| 12 | SearchEmptyState | Client · Link | 동일 |

**12 컴포넌트 · Server 3 / Client 9** (Plan의 "Server 4 / Client 7"보다 Client 많음 — ResetFiltersButton/SearchEmptyState가 Link 필요해서 Client로 승격).

### 5.4 `useUpdateSearchParam` hook (공용 Client util)

**위치**: `src/lib/search/use-update-search-param.ts` 🆕 (pure helper 3번째 파일)

```ts
"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * FilterBar 하위 Client 컨트롤이 공용으로 사용 · URL query param 갱신.
 * router.replace + {scroll: false}로 스크롤 위치 보존.
 */
export function useUpdateSearchParam() {
  const router = useRouter();
  const sp = useSearchParams();

  return (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  };
}
```

### 5.5 DTO Formatters (공용)

- **`insuranceAmount` → "3억"**: `formatInsuranceAmount(won: number): string` — `won >= 1e8 ? "${Math.round(won/1e8)}억" : "${Math.round(won/1e4)}만"`
- **`responseTimeMinutes` → "평균 15분"**: `${minutes}분` (v1 단순 표시)
- 둘 다 `ProviderSearchCard` 내부 inline 함수로 1회 사용 → 별도 util 추출은 YAGNI (v1.2b에서 공용화 검토)

### 5.6 `initialGradient` 재사용

`src/components/client-dashboard/TopProviderCard.tsx`의 `initialGradientClass` 함수를 **공용 util로 이동하지 않고** `ProviderSearchCard`에 **동일 로직 inline 복제** (2 caller만 · 복제 허용). v1.2b에서 3+ caller 발생 시 `lib/format/` 추출 검토.

### 5.5 SearchEmptyState

```
┌─────────────────────────────────────────┐
│ 🔍 조건에 맞는 청명이 없어요                │
│ 필터를 조정해 보거나 전체 목록을 확인해 보세요│
│                                          │
│ [필터 초기화 →]                           │
└─────────────────────────────────────────┘
```

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| URL invalid param (cat=X) | parseSearchParams null 처리 · UI 기본 상태 |
| Firestore query 실패 (인덱스 빌드 중) | try/catch → console.warn → 빈 배열 반환 → SearchEmptyState |
| 결과 0건 | SearchEmptyState + "필터 초기화" Link |
| 100 초과 | console.warn · 첫 100만 표시 · v1.2b paginate 추후 |
| Region client-side 필터 후 0건 | 위와 동일 (EmptyState) |
| minRating filter 후 0건 | 위와 동일 |

---

## 7. Security

- Firestore rules `providers.read: true` 이미 public · 변경 없음
- 비로그인도 탐색 가능 (intent 의도)
- URL param은 read-only · 변조 위험 없음
- Storage 변경 없음 · proxy matcher 변경 없음

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/search/page.tsx` · `ActiveFiltersSummary` · `ResultsCount` · `SearchResultsSection` |
| Presentation Client | `FilterBar` (+ 5 sub-controls) · `SortDropdown` · `ResetFiltersButton` · `ProviderSearchCard` · `SearchEmptyState` |
| Application | (없음 · read-only) |
| Domain | `types/search.ts` · `lib/search/parse-search-params.ts` (pure) |
| Infrastructure | `providerRepository.search()` (추가) · 기존 repos 재활용 |

---

## 9. Convention

- `"use client"` / Server default
- Import order: external → `@/...` → relative → type
- ARIA: FilterBar `aria-label="필터"` · SortDropdown `aria-label="정렬 기준"` · ProviderSearchCard `aria-label` with composite 정보 · ResultsCount `role="status"` · role="list" + role="listitem"

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/search/page.tsx                         🔄 placeholder 교체
│
├── components/search/                           🆕 폴더 (12 components)
│   ├── FilterBar.tsx                           🆕 Client wrapper
│   ├── CategoryFilter.tsx                      🆕 Client
│   ├── RegionFilter.tsx                        🆕 Client
│   ├── InsuredToggle.tsx                       🆕 Client
│   ├── MinRatingToggle.tsx                     🆕 Client
│   ├── SortDropdown.tsx                        🆕 Client
│   ├── ResetFiltersButton.tsx                  🆕 Client
│   ├── ActiveFiltersSummary.tsx                🆕 Server
│   ├── ResultsCount.tsx                        🆕 Server
│   ├── SearchResultsSection.tsx                🆕 Server (toProviderSearchCardDTO 내부)
│   ├── ProviderSearchCard.tsx                  🆕 Client · Link
│   └── SearchEmptyState.tsx                    🆕 Client · Link
│
├── lib/search/
│   ├── parse-search-params.ts                  🆕 pure
│   └── use-update-search-param.ts              🆕 Client hook (공용 URL 갱신)
│
├── types/
│   └── search.ts                               🆕
│
├── lib/firebase/
│   └── provider-repository.ts                  🔄 search() 추가
│
└── firestore.indexes.json                      🔄 2 indexes
```

### 10.2 Implementation Order (10 steps)

1. `types/search.ts` + `firestore.indexes.json` 2개 추가 · firebase deploy
2. `lib/search/parse-search-params.ts` (pure)
3. `providerRepository.search(filters)` 확장 (client-side 보정 + warn)
4. `FilterBar` 하위 Client 컨트롤 (CategoryFilter · RegionFilter · InsuredToggle · MinRatingToggle · SortDropdown · ResetFiltersButton) + `useUpdateSearchParam` hook
5. `FilterBar` wrapper (sticky top)
6. `ActiveFiltersSummary` (Server) + `ResultsCount` (Server)
7. `ProviderSearchCard` (Client · DTO prop)
8. `SearchResultsSection` (Server · DTO 매핑 + empty branch) + `SearchEmptyState`
9. `/search/page.tsx` 전면 교체 (Suspense + SearchBody + parseSearchParams + search + connection)
10. smoke test (5 seed · 필터 조합 · URL 공유 · 재계약률 정확 · empty state)

### 10.3 Pre-flight 체크리스트

- [ ] 2 composite indexes Enabled 확인
- [ ] 비로그인 /search 접속 → 전체 목록 노출
- [ ] 필터 조합 모두 URL 변경 + 결과 갱신
- [ ] "필터 초기화" 버튼 → `/search`로 이동
- [ ] 카드 클릭 → /providers/{id}
- [ ] seed 5명 재계약률 순 (마포>청광>스마트>깔끔>친환경)
- [ ] TS 0 errors · build 성공

---

## 11. Next.js 16 Specific

### 11.1 async searchParams
```ts
export default function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SearchSkeleton/>}>
      <SearchBody searchParams={props.searchParams}/>
    </Suspense>
  );
}
```

### 11.2 `await connection()` 패턴
- `SearchBody` 내부에서 `connection()` 호출 후 Firestore query 수행 · client-dashboard 학습 사례 적용

### 11.3 Cache Components
- 동적 렌더 (URL param 변동) · `providerRepository.search`는 cache 안 함

### 11.4 router.replace
- FilterBar 변경 시 `router.replace({ scroll: false })`로 re-render trigger · 스크롤 보존

---

## 12. Test Plan (20건 확장)

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /search | 전체 목록 노출 (public) |
| 2 | /search (default) | 5 청명 · 재계약률 DESC (마포>청광>스마트>깔끔>친환경) |
| 3 | ?cat=move-in | 입주청소 category 포함 청명만 |
| 4 | ?city=서울특별시&district=강남구 | 강남 regions 포함 청명만 |
| 5 | ?insured=1 | 배상보험 청명만 |
| 6 | ?minRating=4 | rating >= 4.0 |
| 7 | ?cat=X&city=Y&insured=1 | 복합 필터 AND |
| 8 | ?sort=rating | 평점 DESC 정렬 |
| 9 | ?sort=repeatRate (default) | 재계약률 DESC |
| 10 | 결과 0건 | SearchEmptyState + 필터 초기화 |
| 11 | 100+ 결과 | console.warn |
| 12 | CategoryFilter 변경 | URL 갱신 + re-render |
| 13 | ResetFiltersButton 클릭 | /search 이동 |
| 14 | ProviderSearchCard 클릭 | /providers/{id} |
| 15 | ActiveFiltersSummary | 필터 0개 → 숨김 · 1+ → 배지 |
| 16 | ?cat=invalid | null 처리 → 전체 노출 |
| 17 | BottomTabNav "청명찾기" | /search navigate |
| 18 | seed 5명 default 정렬 | 마포(0.85) · 청광(0.78) · 스마트(0.62) · 깔끔(0.45) · 친환경(0.3) |
| 19 | 카드 categories >3 | "🏠 🏢 ❄️ +N" 표기 |
| 20 | 카드 insuranceAmount | 만원 변환 "3억" 표기 |
| 21 | Firestore index precondition | 모든 필터 조합 FAILED_PRECONDITION 없음 (insured·region·minRating은 client-side → Firestore query는 2필드만) |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. 10 Open Questions 해소. Server-first URL param · Firestore query + client-side 보정 (region/minRating) · 12 컴포넌트 (Server 3 / Client 9) + 2 pure helpers · 2 composite indexes 추가 · 100 cap warn · 비로그인 public · Test Plan 20건 · Implementation Order 10-step | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 97% 피드백 반영 (8건): (H2) `insuredOnly`도 **client-side 보정**으로 이동 → Firestore index 폭발 회피 · `FAILED_PRECONDITION` 예방 (H1) 컴포넌트 카운트 12·Server3/Client9를 Design 기준으로 확정 (M3) `useUpdateSearchParam` hook `lib/search/use-update-search-param.ts`로 파일 분리 (3rd pure helper) (L6) RegionFilter 14 옵션 ("전체" sentinel + 13) 명시 (L7) `toProviderSearchCardDTO` 위치 `SearchResultsSection.tsx` 내부 helper로 고정 (L8) `initialGradient`는 ProviderSearchCard에 inline 복제 (2 caller · YAGNI) · §5.5 DTO Formatters subsection 추가 · Test #21 index precondition 추가 | Seokho Lee |
