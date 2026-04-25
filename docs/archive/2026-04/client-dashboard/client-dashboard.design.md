---
template: design
version: 0.1
feature: client-dashboard
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# client-dashboard Design Document

> **Summary**: 홈 `/page.tsx` 확장 · 2 섹션 주입 (AveragePrice + TopProviders). Server-first · 비로그인 public · providers 근사치 기반 (v2+ analytics-batch로 교체 예정). 6 components · 2 repo methods · 1 pure function · 1 composite index · seed 확장.
>
> **Plan**: [client-dashboard.plan.md](../../01-plan/features/client-dashboard.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** listPriceBookAll limit 100 초과 시 경고 | `providers` count가 100에 도달하면 `console.warn('[client-dashboard] listPriceBookAll cap reached (100). v1.2+ paginate 필요')`. 운영자 모니터링 시그널로만 사용 · 동작에는 영향 없음. |
| **Q2** sampleCount 노출 | `AveragePriceCard` 하단에 small text `"{sampleCount}개 청명 기준"` 표기. 0이면 EmptyDataCard로 대체 (sample text 없음). |
| **Q3** 가로 스크롤 · snap 적용 | Tailwind `flex overflow-x-auto snap-x snap-mandatory` + 카드에 `snap-start shrink-0 w-44`. 모바일 UX 자연스러움. |
| **Q4** Top 5 rating null 순위 | Firestore `orderBy('rating', 'desc')` 기본 NULLS LAST. `repeatRate`도 동일 · 신규 청명은 후순위. UI 영향 없음. |
| **Q5** repeatRate null provider | NULLS LAST로 자연스럽게 후순위. Top 5 진입 가능성은 낮음. "신규 청명" 태그는 v1.2+로 연기 (UI 단순 유지). |
| **Q6** disclaimer 문구 확정 | "참고 시세입니다 · 실제 비용은 청명 개별 제안에 따라 달라져요" + "v2부터 주간 집계로 전환 예정" 2줄. |
| **Q7** AveragePriceCard CTA | 카드 전체를 `<Link href="/quote/new?cat={cat}">` · 우측 하단 "견적 요청 →" text (클릭 가능 영역 최대화). |
| **Q8** seed 확장 | 최소 5 청명 · 각 priceBook 3+ 엔트리 · `repeatRate` 0.3/0.45/0.62/0.78/0.85 분포 · `rating` 4.2~4.9 · `completedWorkCount` 12/23/34/48/67 · `isAvailable=true`. |
| **Q9** repo 신규 vs 재활용 | **신규 2개** (`listTopRated`, `listPriceBookAll`). 기존 `listByCategory`는 `where category array-contains`로 다른 쿼리 · 재활용 불가. |
| **Q10** 0건 카테고리 처리 | `computeAveragePrices`가 `{sampleCount: 0, min/avg/max: null}` 반환 · `AveragePriceSection`이 해당 카테고리 카드를 EmptyDataCard로 렌더. |

---

## 1. Overview

### 1.1 Design Goals
- 홈 `/` 확장 최소 침습 (기존 TopBar · TodayCard · CategoryGrid 전원 유지)
- v2+ analytics-batch 전환 시 **UI 불변**을 보장 (price-aggregator 순수 함수 격리)
- 비로그인 public · 탐색 포커스
- Server-first · cache() 재사용 · Cache Components 일관

### 1.2 Principles
- 2 섹션은 hard-coded 방식으로 `/page.tsx` 하단에 append (새 경로 없음)
- Data source는 providers 컬렉션만 (추가 read 많지 않음 · 100개 이내 cap)
- 순수 함수로 집계 로직 격리 (`lib/dashboard/price-aggregator.ts`)
- 섹션별 Suspense로 장애 격리
- 가로 스크롤 snap으로 모바일 UX 우선

---

## 2. Architecture

### 2.1 Page Extension Diagram

```
┌─────────────────────────────────────────────────┐
│ GET /  (Server shell · 기존 유지 + 신규 2 섹션)   │
│                                                  │
│ [TopBar]                           (기존)         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Suspense: TodayCardSlot  (기존 · 로그인 시)   │ │
│ └─────────────────────────────────────────────┘ │
│ <CategoryGrid>                      (기존)       │
│                                                  │
│ ─── NEW ──────────────────────────────────────── │
│ ┌─────────────────────────────────────────────┐ │
│ │ Suspense fallback=SectionSkeleton:           │ │
│ │   <AveragePriceSection/>                     │ │
│ │     6 × AveragePriceCard (snap-x scroll)     │ │
│ │     SectionDisclaimer("참고 시세")             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Suspense fallback=SectionSkeleton:           │ │
│ │   <TopProvidersSection/>                     │ │
│ │     5 × TopProviderCard (snap-x scroll)      │ │
│ │     empty → EmptyDataCard                    │ │
│ └─────────────────────────────────────────────┘ │
│ ─── END NEW ──────────────────────────────────── │
│                                                  │
│ <footer>                            (기존)       │
└─────────────────────────────────────────────────┘
```

### 2.2 Fetch Sequence

각 섹션은 **독립 Server Component**로서 자체 fetch 수행:

```ts
// AveragePriceSection (Server)
const providers = await providerRepository.listPriceBookAll();
const prices = computeAveragePrices(providers);     // pure
// → 6 카테고리 Record render

// TopProvidersSection (Server)
const top5 = await providerRepository.listTopRated(5);
const dtos = top5.map(toTopProviderCardDTO);        // Server→Client primitive
// → 5 카드 render
```

**페이지 수준 Promise.all은 하지 않음**: 각 Suspense가 독립 스트리밍 가능 → 하나의 인덱스 빌드 미완 상태에서도 다른 섹션은 먼저 렌더.

---

## 3. Data Model

### 3.1 Firestore — 변경 없음
`providers/{id}`: `isAvailable` · `repeatRate` · `rating` · `completedWorkCount` · `priceBook` · `profileImage` · `companyName` 모두 기존 필드.

### 3.2 Firestore Rules — 변경 없음
`providers.read: true` 이미 public.

### 3.3 Firestore Indexes 🆕

`firestore.indexes.json`에 **1개 composite index 추가**:

```json
{
  "collectionGroup": "providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isAvailable", "order": "ASCENDING" },
    { "fieldPath": "repeatRate", "order": "DESCENDING" },
    { "fieldPath": "rating", "order": "DESCENDING" },
    { "fieldPath": "completedWorkCount", "order": "DESCENDING" }
  ]
}
```

배포: `firebase deploy --only firestore:indexes` (~1분 빌드).

### 3.4 Types (`src/types/client-dashboard.ts`)

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

## 4. API Specification

### 4.1 Repository 확장 — `src/lib/firebase/provider-repository.ts`

#### `listTopRated(limit = 5)`
```
where('isAvailable', '==', true)
orderBy('repeatRate', 'desc')
orderBy('rating', 'desc')
orderBy('completedWorkCount', 'desc')
limit(limit)
```

**주의**: Firestore는 `orderBy` 여러 개를 조합하려면 **composite index** 필요 · 3.3 참고.
**NULLS LAST**: Firestore는 `orderBy desc`에서 null을 항상 마지막에 둠 → 신규 청명 자연 후순위.

#### `listPriceBookAll()`
```
where('isAvailable', '==', true)
limit(100)
```

반환: `Provider[]` · priceBook 필드만 필요하지만 Firestore는 필드 선택이 제한적이라 전체 문서 fetch (비용 고려). 100개 cap 초과 시 `console.warn`.

**단일 필드 인덱스**로 충분 · 신규 composite 불필요.

### 4.2 Pure Function — `src/lib/dashboard/price-aggregator.ts`

```ts
import type { Provider } from "@/types/provider";
import type { PriceSummary } from "@/types/client-dashboard";
import {
  QUOTE_CATEGORIES,
  type QuoteCategory,
} from "@/domain/quote-category";

export function computeAveragePrices(
  providers: Provider[],
): Record<QuoteCategory, PriceSummary> {
  const byCategory = new Map<QuoteCategory, number[]>();
  for (const p of providers) {
    for (const entry of p.priceBook ?? []) {
      if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
      byCategory.get(entry.category)!.push(entry.basePrice);
    }
  }
  const result = {} as Record<QuoteCategory, PriceSummary>;
  for (const cat of QUOTE_CATEGORIES) {
    const prices = byCategory.get(cat) ?? [];
    result[cat] = prices.length === 0
      ? { category: cat, sampleCount: 0, min: null, avg: null, max: null }
      : {
          category: cat,
          sampleCount: prices.length,
          min: Math.min(...prices),
          avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          max: Math.max(...prices),
        };
  }
  return result;
}
```

**v2+ 전환 경로**: `dashboardSnapshots/{weekKey}` 컬렉션이 이 함수의 출력 형태와 동일하게 저장되면 fetch만 교체. UI 불변.

`sortTopRated`는 Firestore orderBy가 동일 tie-break을 보장하므로 **v1에서는 생략** · 필요 시 fallback only (YAGNI).

### 4.3 DTO 매핑 — `toTopProviderCardDTO` (Server component 내부)

```ts
function toTopProviderCardDTO(p: Provider): TopProviderCardDTO {
  return {
    providerId: p.id,
    companyName: p.companyName,
    profileImage: p.profileImage ?? null,
    rating: p.rating ?? null,
    completedWorkCount: p.completedWorkCount ?? null,
    repeatRate: p.repeatRate ?? null,
  };
}
```

Firestore Date · Timestamp 없음 → 이미 primitive. 단, `profileImage`/`description` 등 undefined → null normalize.

---

## 5. UI / UX Design

### 5.1 전체 레이아웃 (홈 `/`)

```
┌─────────────────────────────────────────┐
│ [TopBar · 청광]                         │  (기존)
│                                          │
│ [TodayCard (로그인 시) / 로그인 유도]     │  (기존)
│                                          │
│ 어떤 청소가 필요하세요?                    │
│ [CategoryGrid 6 × 2 grid]               │  (기존)
│                                          │
│ 💰 카테고리별 평균가                      │  🆕
│ ┌───────┬───────┬───────┬───... 가로스크롤 │
│ │입주청소│사무실 │에어컨 │...              │
│ │12~25만│15~28만│8~14만 │...              │
│ │3개기준│5개기준│2개기준│...              │
│ │[견적 →]                                │
│ └───────┴───────┴───────┴──────          │
│ 참고 시세 · v2부터 주간 집계 전환 예정       │
│                                          │
│ 🏆 Top 5 청명                           │  🆕
│ ┌────────┬────────┬────────┬────...      │
│ │[img]   │[img]   │[img]   │...          │
│ │ABC청소 │스마트클린│마포홈 │...           │
│ │★4.9 (67)│★4.8 (48)│★4.7 (34)│...       │
│ │재계약85%│재계약78%│재계약62%│...          │
│ └────────┴────────┴────────┴────          │
│                                          │
│ 홍보 피드 둘러보기 →                       │  (기존 footer)
└─────────────────────────────────────────┘
```

### 5.2 AveragePriceCard

```
┌───────────────┐
│ 🏠 입주청소    │
│ 15 ~ 28만원    │
│ 평균 20만원    │
│ ─────────     │
│ 3개 청명 기준   │
│ 견적 요청 →    │
└───────────────┘
```

- Tailwind width: `w-44` (176px · snap-start)
- 0건 카테고리 → EmptyDataCard 대체 "아직 데이터 없음 · 곧 업데이트 예정"

### 5.3 TopProviderCard

```
┌───────────────┐
│  ┌───────┐    │
│  │ img   │    │  profileImage (or 이니셜 gradient)
│  └───────┘    │
│  ABC청소       │
│  ★ 4.9 (67건) │
│  재계약 85%    │
└───────────────┘
```

- Tailwind width: `w-40` (160px · snap-start)
- profileImage null → 이니셜 gradient (기존 provider-profile 패턴 재활용)
- repeatRate null → "신규 청명" 대체

### 5.4 Section Skeleton (Suspense fallback)

```
┌─────────────────────────────────────────┐
│ (섹션 제목 자리)                          │
│ [pulse rect] [pulse rect] [pulse rect]  │
└─────────────────────────────────────────┘
```

공용 스켈레톤 1개 · `SectionSkeleton` — `/page.tsx` 내부 inline 구현.

### 5.5 Component List

| # | Component | Type | Location |
|---|-----------|------|----------|
| 1 | `AveragePriceSection` | Server | `components/client-dashboard/AveragePriceSection.tsx` |
| 2 | `AveragePriceCard` | Client (Link) | 동일 폴더 |
| 3 | `TopProvidersSection` | Server · DTO 매핑 | 동일 폴더 |
| 4 | `TopProviderCard` | Client (Link) | 동일 폴더 |
| 5 | `SectionDisclaimer` | Server · message prop | 동일 폴더 |
| 6 | `EmptyDataCard` | Server · message prop | 동일 폴더 |

**6 컴포넌트 · Server 4 / Client 2**. 인터랙티브 요소는 Link만 → Client를 card 단위로 최소화.

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| listTopRated 실패 (인덱스 빌드 중) | `console.warn` + TopProvidersSection empty fallback |
| listPriceBookAll 실패 | `console.warn` + AveragePriceSection empty fallback |
| providers 0명 | 양쪽 섹션 EmptyDataCard |
| priceBook 0건 카테고리 | 해당 카드만 EmptyDataCard 렌더 (다른 5개는 정상) |
| profileImage null | 이니셜 gradient fallback (provider-profile 기존 패턴) |
| rating/repeatRate null | "신규 청명" 태그 또는 "—" 표시 |

---

## 7. Security

- Firestore rules 변경 없음 · `providers.read: true` 기존 public
- 비로그인도 노출 (탐색 의도)
- Storage 변경 없음 (profileImage는 `profile-images/` 기존 public read)
- CSRF: read-only 페이지 (Server Action 없음)
- Rate limit: read-only · 불필요

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/page.tsx` · `AveragePriceSection` · `TopProvidersSection` · `SectionDisclaimer` · `EmptyDataCard` |
| Presentation Client | `AveragePriceCard` · `TopProviderCard` |
| Application | (없음 · read-only feature) |
| Domain | `types/client-dashboard.ts` (DTO · PriceSummary) · `lib/dashboard/price-aggregator.ts` (pure) |
| Infrastructure | `providerRepository.{listTopRated, listPriceBookAll}` |

---

## 9. Convention

- Server component default · `"use client"`는 2 카드 컴포넌트만
- Import order: external → `@/...` → relative → type
- ARIA: 섹션 `aria-labelledby` · 카드 가로 스크롤 container `role="list"` · 카드 `role="listitem"` · price `aria-label="{category} 평균 {avg}원"` · Link `aria-label` 명시

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/page.tsx                                   🔄 2 섹션 append + Suspense
│
├── components/client-dashboard/                    🆕 폴더
│   ├── AveragePriceSection.tsx                    🆕 Server
│   ├── AveragePriceCard.tsx                       🆕 Client · Link
│   ├── TopProvidersSection.tsx                    🆕 Server · DTO 매핑
│   ├── TopProviderCard.tsx                        🆕 Client · Link
│   ├── SectionDisclaimer.tsx                      🆕 Server
│   └── EmptyDataCard.tsx                          🆕 Server
│
├── types/
│   └── client-dashboard.ts                        🆕 DTO
│
├── lib/firebase/
│   └── provider-repository.ts                     🔄 listTopRated + listPriceBookAll
│
├── lib/dashboard/
│   └── price-aggregator.ts                        🆕 computeAveragePrices
│
├── firestore.indexes.json                         🔄 composite index 1개 추가
│
└── scripts/
    └── seed-first-provider.mjs                    🔄 seed 확장 (repeatRate · priceBook)
```

### 10.2 Implementation Order (8 steps)

1. **types/client-dashboard.ts** + **firestore.indexes.json** 추가 · Firebase deploy (index 빌드 시작)
2. **providerRepository** 확장 (listTopRated + listPriceBookAll · console.warn 포함)
3. **price-aggregator.ts** (computeAveragePrices 순수 함수)
4. **SectionDisclaimer** + **EmptyDataCard** (공용 helper 먼저 · inline 디자인 테스트 용이)
5. **AveragePriceCard** + **AveragePriceSection**
6. **TopProviderCard** + **TopProvidersSection** (DTO 매핑 포함)
7. **app/page.tsx** 2 섹션 append (Suspense + SectionSkeleton)
8. **seed-first-provider.mjs** 확장 + smoke test (인덱스 빌드 완료 확인 후)

### 10.3 Pre-flight 체크리스트

- [ ] `firebase deploy --only firestore:indexes` → composite index "Enabled" 확인
- [ ] Seed 실행 · 5 청명 · priceBook 3+ · repeatRate 분포 확인
- [ ] 홈 `/` 접속 · 2 섹션 렌더 확인
- [ ] 가로 스크롤 snap 동작 (모바일 viewport)
- [ ] AveragePriceCard 클릭 → /quote/new?cat=... 이동
- [ ] TopProviderCard 클릭 → /providers/{id} 이동
- [ ] priceBook 없는 카테고리 → EmptyDataCard 렌더
- [ ] Top 5 없음 상태 → TopProvidersSection EmptyDataCard
- [ ] disclaimer 문구 노출
- [ ] 비로그인 접속도 2 섹션 정상 (public)
- [ ] TS 0 errors · build 성공

---

## 11. Next.js 16 Specific

### 11.1 Cache Components
- `/page.tsx` 자체는 기존 `Suspense<TodayCardSlot>` 유지 · 신규 2 섹션도 Suspense wrap
- `providerRepository.listTopRated` · `listPriceBookAll` — cache() 적용 **안 함** (dashboard 최신성 우선, provider-dashboard와 동일 방침)
- `cache()`는 `providerRepository.get` 등 single-doc read에만 적용 중 (기존)

### 11.2 async params / searchParams
- 홈 `/`는 query param 없음 · `searchParams` 인자 불필요

### 11.3 혼합 공개 데이터
- `providers.read: true` public · 비로그인도 fetch 가능 · CDN 캐시 효과 (Next.js 16 자동)

---

## 12. Test Plan

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 / 접속 | 2 섹션 public 노출 |
| 2 | 로그인 + 요청 없음 | TodayCard empty + 2 섹션 |
| 3 | providers 0명 | 양쪽 섹션 EmptyDataCard |
| 4 | providers 3명 · 각 priceBook 2개 | AveragePrice 카테고리별 집계 정확 |
| 5 | priceBook 없는 카테고리 | 해당 카드만 EmptyDataCard · 나머지 정상 |
| 6 | AveragePriceCard 클릭 | /quote/new?cat={category} |
| 7 | TopProvidersSection 5명 미만 (3명) | 3 카드 렌더 (빈 자리 표시 없음) |
| 8 | TopProvidersSection 5+ | 상위 5명만 |
| 9 | 랭킹 tie-break | Firestore orderBy NULLS LAST 준수 |
| 10 | TopProviderCard 클릭 | /providers/{id} |
| 11 | disclaimer 노출 | "참고 시세" + "v2+ 전환" 2줄 |
| 12 | listPriceBookAll > 100 | 첫 100만 · console.warn |
| 13 | profileImage null | 이니셜 gradient fallback |
| 14 | rating null | "— (0건)" 또는 "신규 청명" 표시 |
| 15 | 가로 스크롤 snap | 모바일 viewport에서 카드 snap 동작 |
| 16 | 인덱스 빌드 중 listTopRated 실패 | console.warn + 섹션 EmptyDataCard fallback |
| 17 | sampleCount 표기 | AveragePriceCard 하단 "{N}개 청명 기준" |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 10건 해소. 홈 `/` 2 섹션 확장 · Server-first · 6 컴포넌트 (Server 4 / Client 2) · Repository 2 메서드 확장 · pure function 격리 · Firestore composite index 1 추가 · seed 확장 · Test Plan 17건 · Implementation Order 8-step | Seokho Lee |
