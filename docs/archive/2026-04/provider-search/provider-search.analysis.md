---
template: analysis
version: 0.1
feature: provider-search
date: 2026-04-21
author: Seokho Lee (via gap-detector)
project: cheonggwang
cycle: "#14 (v1.2 #2)"
match_rate: 100
---

# provider-search Gap Analysis Report

> **Cycle #14** · Marketplace Track v1.2 #2 · Design v0.2 (post-validator 97% → 8 fixes)
> **Plan**: [provider-search.plan.md](../01-plan/features/provider-search.plan.md)
> **Design**: [provider-search.design.md](../02-design/features/provider-search.design.md)

---

## Overall Match Rate: **100%** 🏆 (3 cycles 연속 퍼펙트)

```
┌─────────────────────────────────────────────────┐
│ Overall Match Rate: 100%                         │
├─────────────────────────────────────────────────┤
│ MVP C1-C18:                 100% (18/18)         │
│ Out-of-scope leakage:         0/8 (0%)           │
│ 10 Open Questions:          100% (10/10)         │
│ Component List §5.3:        100% (12/12)         │
│ Server/Client split:        100% (3S / 9C)       │
│ Design v0.2 validator fixes:100% (8/8)           │
│ repository.search() 규격:   100% (2-3필드+3 보정) │
│ 2 composite indexes:        100% (deployed)      │
│ URL router.replace pattern: 100% (scroll:false)  │
│ await connection() (N16):   100%                 │
│ Test Plan #1-#21:           100% achievable      │
│ Critical 0 / Major 0 / Minor 0                   │
│ Positive Divergences: 3 (Design v0.3 후보)        │
└─────────────────────────────────────────────────┘
```

**Status**: ✅ 100% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP C1-C18 — 18/18 (100%)

모든 18 항목 구현 확인됨 (FilterBar wrapper · 5 sub-controls · Sort · Reset · 4 Server helper · 2 Client card · Repository 확장 · 2 indexes).

## 2. Out-of-scope Leakage — 0/8 (0%)

지도 · 다중 선택 · 응답시간/경력/활동중 필터 · 검색어 · pagination · 거리 정렬 · 저장된 검색 · filter count badge — **모두 미구현** ✅

## 3. 10 Open Questions Resolution — 100%

모든 Q 해소 (category 없을 때 기존 index 재활용 · `insuredOnly` client-side · FilterBar sticky · "전체" sentinel · 카테고리 3+overflow · invalid param null fallback · hasAnyFilter 0시 null 반환).

## 4. Design v0.2 Validator-Fix Items — 8/8

| Fix | Status |
|-----|:---:|
| (H1) 12 components Server 3 / Client 9 alignment | ✅ |
| (H2) `insuredOnly` client-side (index 폭발 회피) | ✅ |
| (M3) `useUpdateSearchParam` 별도 파일 | ✅ |
| (L6) RegionFilter "전체" + 13 options | ✅ |
| (L7) `toProviderSearchCardDTO` in SearchResultsSection | ✅ |
| (L8) `initialGradient` inline (2 callers 복제) | ✅ |
| §5.5 DTO formatters (insurance / responseTime) | ✅ |
| Test #21 Firestore index precondition | ✅ 구조적 보장 |

## 5. Components §5.3 — 12/12 (Server 3 / Client 9)

## 6. providerRepository.search() — 100%

Firestore: `isAvailable + optional categories + orderBy(sort) + limit(100)` → **2-3 필드만** · Client-side 보정 순서 insured → region → minRating.

## 7. Firestore Indexes — 2개 deploy 완료

- 🆕 `isAvailable + categories + repeatRate`
- 🆕 `isAvailable + categories + rating`
- 기존 `isAvailable + repeatRate + rating + completedWorkCount` 재활용 (category 없는 repeatRate sort)

## 8. Clean Architecture + Convention — 100%

## 9. Positive Divergences (3 · Design v0.3 후보)

1. **SortDropdown default 제거 로직** — URL 오염 방지 (`v === "repeatRate" ? null : v`)
2. **SearchEmptyState dual-branch** — hasFilters false 시 별도 메시지
3. **MinRatingToggle `on: boolean` prop** — number → bool 얇은 래핑 (threshold 확장 시 재작업)

## 10. Build/Quality Evidence

- `pnpm tsc --noEmit` — 0 errors ✅
- `pnpm build` — 30 routes · 성공 ✅
- `firebase deploy --only firestore:indexes` — 완료 ✅

## 11. Cross-Cycle Consistency

```
#1  promo-page                  93%
#2-3                           96-97%
#4-#11                          99%
#12 client-dashboard           100% 🏆 v1.1b 마감
#13 chat                       100% 🏆 v1.2 #1 · onSnapshot
#14 provider-search            100% 🏆 v1.2 #2 · 3 cycles 연속 ← 본 cycle
```

## 12. Next Steps

1. ✅ Check phase 완료 (100%)
2. → `/pdca report provider-search`
3. → `/pdca archive provider-search --summary`
4. → 다음 후보:
   - v1.3 `booking` (일정 확정 · 마켓 루프 종결)
   - v1.2b `provider-search-map` (Kakao Maps)
   - v1.2b `chat-rich-types` (이미지 · scheduleRequest)

---

## 13. Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** 🏆 (3 cycles 연속) |
| Critical / Major / Minor | 0 / 0 / 0 |
| Scope creep | 없음 |
| Missing items | 없음 |
| Regression risk | 없음 |
| Positive Divergences | 3 (Design v0.3 후보) |
| Next | `/pdca report provider-search` |
