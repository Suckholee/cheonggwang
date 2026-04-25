---
template: analysis
version: 0.1
feature: client-dashboard
date: 2026-04-21
author: Seokho Lee (via gap-detector)
project: cheonggwang
cycle: "#12 (v1.1b #5 · 마지막)"
match_rate: 100
---

# client-dashboard Gap Analysis Report

> **Cycle #12** · Marketplace Track v1.1b #5 (**v1.1b 마지막** 🏆) · Design v0.1 (design-validator 생략)
> **Plan**: [client-dashboard.plan.md](../01-plan/features/client-dashboard.plan.md)
> **Design**: [client-dashboard.design.md](../02-design/features/client-dashboard.design.md)

---

## Overall Match Rate: **100%** 🏆

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 100% (최고 기록)         │
├─────────────────────────────────────────────┤
│  MVP C1-C15:             100% (15/15)       │
│  Out-of-scope leakage:     0/6 (0%)         │
│  10 Open Questions:      100% (10/10)       │
│  Component List §5.5:    100% (6/6)         │
│  Server/Client split:    100% (4S/2C)       │
│  Repository 확장:         100% (2/2)         │
│  Firestore Index 배포:    100%              │
│  Clean Architecture §8:  100%               │
│  Convention §9:          100%               │
│  Test Plan 1-17:         100%               │
│  Critical 0 / Major 0 / Minor 0             │
│  Positive Divergences: 4 (Design v0.2 후보) │
└─────────────────────────────────────────────┘
```

**Status**: ✅ 100% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP C1-C15 — 15/15 (100%)

| # | 항목 | 구현 위치 |
|---|------|-----------|
| C1 | 6 카테고리 AveragePriceRow | `AveragePriceSection.tsx` · `QUOTE_CATEGORIES.map` |
| C2 | AveragePriceCard → `/quote/new?cat=...` | `AveragePriceCard.tsx` Link whole-card |
| C3 | "참고 시세" 디스클레이머 | `SectionDisclaimer.tsx` · lines prop |
| C4 | min/avg/max 평균가 | `price-aggregator.ts` pure function |
| C5 | EmptyDataCard (sample 0) | per-card + section-wide variants |
| C6 | Top 5 카드 Row | `TopProvidersSection.tsx` + rank badge |
| C7 | TopProviderCard → `/providers/{id}` | `TopProviderCard.tsx` Link |
| C8 | tie-break: repeatRate→rating→completedWorkCount | Firestore orderBy 3-chain |
| C9 | 카드 요소 (image · name · rating · count · repeat) | `TopProviderCard.tsx` |
| C10 | Top 5 empty state | `dtos.length === 0 → EmptyDataCard` |
| C11 | `listTopRated(5)` | `provider-repository.ts` |
| C12 | `listPriceBookAll()` + 100 cap warn | 동 repo |
| C13 | Seed 확장 (5 청명) | `seed-first-provider.mjs` |
| C14 | 홈 `/` 2 섹션 append | `app/page.tsx` |
| C15 | 섹션 Suspense wrap + SectionSkeleton | `app/page.tsx` |

---

## 2. Out-of-scope Leakage — 0/6 (0%)

- Top 5 실시간 ranking · 차트/히스토리 · 단골 · 필터/정렬 · 지도 · 개인화 — 모두 미구현 ✅

---

## 3. 10 Open Questions Resolution — 100%

| Q | 해소 | Status |
|---|------|:---:|
| Q1 | `console.warn` at CAP=100 · 정확한 메시지 | ✅ |
| Q2 | `"{N}개 청명 기준"` small text | ✅ |
| Q3 | `snap-x snap-mandatory` + `shrink-0` | ✅ |
| Q4 | Firestore NULLS LAST 기본 | ✅ |
| Q5 | repeatRate null → "신규 청명" | ✅ |
| Q6 | disclaimer 2줄 exact match | ✅ |
| Q7 | whole-card Link + "견적 →" | ✅ |
| Q8 | 5 청명 · priceBook 2~3 · repeatRate 0.3~0.85 분포 (깔끔이 청소는 의도적 2-category specialist) | ✅ |
| Q9 | 신규 2 메서드 (재활용 아님) | ✅ |
| Q10 | 0-sample → nulls + per-card EmptyDataCard | ✅ |

---

## 4. Component List §5.5 — 6/6 (Server 4 / Client 2)

| # | Component | Type | Match |
|---|-----------|:----:|:---:|
| 1 | AveragePriceSection | Server (`await connection()`) | ✅ |
| 2 | AveragePriceCard | Client (Link) | ✅ |
| 3 | TopProvidersSection | Server · DTO 매핑 | ✅ |
| 4 | TopProviderCard | Client (Link) | ✅ |
| 5 | SectionDisclaimer | Server | ✅ |
| 6 | EmptyDataCard | Server | ✅ |

---

## 5. Clean Architecture §8 — 100%

| Layer | 파일 |
|-------|------|
| Presentation Server | page.tsx · AveragePriceSection · TopProvidersSection · SectionDisclaimer · EmptyDataCard |
| Presentation Client | AveragePriceCard · TopProviderCard |
| Application | (없음 · read-only feature) |
| Domain | `types/client-dashboard.ts` + `lib/dashboard/price-aggregator.ts` (pure, no Firestore imports) |
| Infrastructure | `providerRepository.{listTopRated, listPriceBookAll}` |

의존성 검증:
- `price-aggregator.ts` → `@/types/provider` · `@/types/client-dashboard` · `@/domain/quote-category`만 import (infrastructure 의존 없음) ✅
- `TopProviderCardDTO` primitive only (string · number · null) · Date/Timestamp/undefined 누출 없음 ✅

---

## 6. Convention §9 — 100%

- Server default · Client은 2 Card에만 `"use client"` ✅
- Import order · ARIA `aria-labelledby` / `role="list"` · Link `aria-label` ✅
- PascalCase components · camelCase helpers (formatMan · initialGradientClass · toTopProviderCardDTO · computeAveragePrices) ✅
- 폴더 `client-dashboard/` kebab-case · 파일 `price-aggregator.ts` kebab 일관 ✅

---

## 7. Firestore Index — 배포 완료

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

`firebase deploy --only firestore:indexes` 완료 · Enabled 확인.

---

## 8. Test Plan 1-17 Achievability — 100%

모든 17 시나리오 (비로그인 public · empty/partial/full · Zod 거부 · snap scroll · NULLS LAST · disclaimer · cap warn · gradient fallback · sampleCount 표기 등) 구현 커버.

---

## 9. Positive Divergences (Design v0.2 후보 4건)

### 🟢 #1 `await connection()` · Next.js 16 Cache Components 준수 (**Critical** fix)
- `AveragePriceSection` + `TopProvidersSection` 모두 top of function에 `await connection()` 호출
- Design §11.1에 명시되지 않았으나 **build 성공을 위해 필수** (Next.js 16 `randomBytes before accessing uncached data` 에러 방지)
- **프로젝트 전체 패턴화 권장** — AGENTS.md "This is NOT the Next.js you know" 정책과 정합 · Design v0.2에서 §11.4 신설 후보

### 🟢 #2 0-sample 카테고리도 per-card EmptyDataCard 유지 — UX 개선
- Design §5.2 spec은 data 있을 때만 card 렌더
- 실 구현은 grid 6-card 폭 일관 유지 · "준비 중" 라벨

### 🟢 #3 TopProvidersSection disclaimer 2줄 추가 — 투명성 일관
- Design §5.3는 disclaimer 미명시
- "재계약률 · 평점 · 완료 작업 수 기반 랭킹" + "v2부터 주간 집계 개선 예정" 추가 · AveragePrice 섹션과 일관

### 🟢 #4 `#rank` 배지 overlay — UX 시맨틱 강화
- Design §5.3 mockup은 rank 표기 없음
- 구현은 `#N` 배지 overlay on profile image · "Top 5 청명" 섹션 의도 명확화

---

## 10. Build/Quality Evidence

- `pnpm tsc --noEmit` — 0 errors ✅
- `pnpm build` — 성공 · 29 routes (변경 없음, `/` 확장) ✅
- `firebase deploy --only firestore:indexes` 완료 ✅
- Seed 실행: 5 청명 시드 (기존 1 + 신규 4) ✅
- Smoke test: 2 섹션 렌더 · 5 청명 rank 정렬 확인 ✅

---

## 11. Cross-Cycle Consistency

```
#1  promo-page                93%
#2  content-research-pipeline 96%
#3  promo-feed                97%
#4  quote-request             99%
#5  provider-signup           99%
#6  quote-response            99%
#7  received-quotes           99%
#8  bottom-tab-nav            99%
#9  provider-profile          99%
#10 provider-profile-editor   99%
#11 provider-dashboard        99%
#12 client-dashboard         100% ← 본 cycle · 최고 기록 🏆
```

## 🏆 Marketplace v1.1b **5/5 완료**

```
#8  bottom-tab-nav            (99%)  ✅
#9  provider-profile          (99%)  ✅
#10 provider-profile-editor   (99%)  ✅
#11 provider-dashboard        (99%)  ✅
#12 client-dashboard         (100%)  ✅ ← v1.1b 마감
```

---

## 12. Next Steps

1. ✅ Check phase 완료 (100%)
2. → `/pdca report client-dashboard`
3. → `/pdca archive client-dashboard --summary` · **v1.1b 마감 🏆**
4. → v1.2 진입:
   - `chat` (onSnapshot 첫 도입 · quote-response 협의 채널)
   - `provider-search` (`/search` placeholder 교체 · 리스트/지도)

---

## 13. Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** 🏆 |
| Critical / Major / Minor | 0 / 0 / 0 |
| Scope creep | 없음 |
| Missing items | 없음 |
| Regression risk | 없음 |
| Positive Divergences | 4 (Design v0.2 후보) |
| Next | `/pdca report client-dashboard` |
