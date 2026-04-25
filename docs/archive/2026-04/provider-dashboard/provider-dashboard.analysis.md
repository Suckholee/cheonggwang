---
template: analysis
version: 0.1
feature: provider-dashboard
date: 2026-04-21
author: Seokho Lee (via gap-detector)
project: cheonggwang
cycle: "#11 (v1.1b #4)"
match_rate: 99
---

# provider-dashboard Gap Analysis Report

> **Cycle #11** · Marketplace Track v1.1b #4 · Design v0.2 (post design-validator)
> **Plan**: [provider-dashboard.plan.md](../01-plan/features/provider-dashboard.plan.md)
> **Design**: [provider-dashboard.design.md](../02-design/features/provider-dashboard.design.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP C1-C12:             100% (12/12)       │
│  Out-of-scope leakage:     0/6 (0%)         │
│  10 Open Questions:      100% (10/10)       │
│  Component Tree §5.3:    100% (8/8)         │
│  Server/Client split:    100% (4S/4C)       │
│  Repository 확장 §4.2:    100% (2/2)         │
│  Server Action §4.1 5-step: 100%            │
│  Server→Client DTO §3.1a: 100%              │
│  Clean Architecture §8:  100%               │
│  BottomTabNav §2.2:      100%               │
│  Auth guards 3-tier:     100%               │
│  Test Plan 1-20 achievable: 100%            │
│  Critical 0 / Major 0 / Minor 2 (cosmetic)  │
└─────────────────────────────────────────────┘
```

**Status**: ≥ 90% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP C1-C12 — 12/12 (100%)

| # | 항목 | 구현 위치 |
|---|------|-----------|
| C1 | `/provider/home` Server shell + Suspense | `src/app/provider/home/page.tsx` |
| C2 | BottomTabNav "홈" 탭 재배치 | `src/components/nav/tab-definitions.ts` L38 |
| C3 | Page shell (header + 업체명 + 인사말 + 공개 프로필 링크) | `page.tsx` + `DashboardHero.tsx` |
| C4 | 수신 요청 상위 3건 카드 | `ActiveRequestsSection.tsx` + `RequestPreviewCard.tsx` |
| C5 | 요청 카드 → `/provider/requests/{id}/propose` CTA | `RequestPreviewCard.tsx` |
| C6 | 요청 개수 배지 + 전체 → `/provider/requests` | `ActiveRequestsSection.tsx` |
| C7 | EmptyRequestsHint (프로필 완성 · 카테고리 넓히기) | `EmptyRequestsHint.tsx` |
| C8 | TodayScheduleCard placeholder ("v1.3에서 공개" + Lock) | `TodayScheduleCard.tsx` |
| C9 | QuickStats (누적 작업 · 평점 · 응답시간 · null → "아직 없음") | `QuickStatsSection.tsx` |
| C10 | AvailabilityToggle (isAvailable · Server Action) | `AvailabilityToggle.tsx` + `setIsAvailable` |
| C11 | ShortcutGrid (4 shortcut) | `ShortcutGrid.tsx` |
| C12 | Shortcut 받은 요청 badge (totalCount) | `ShortcutGrid.tsx` |

---

## 2. Out-of-scope Leakage — 0/6 (0%)

- 매출 요약 · onSnapshot 실시간 · 주기 revalidate/refresh · 단골 고객 · 근처 견적 지도 · Today 실데이터 — 모두 미구현 ✅

---

## 3. 10 Open Questions Resolution — 100%

| Q | 해소 | Status |
|---|------|:---:|
| Q1 | `getCountFromServer` + `limit(3)` 병렬 (Admin SDK `.count()` aggregation) | ✅ |
| Q2 | `provider.completedWorkCount ?? null` placeholder | ✅ |
| Q3 | 기존 `category+status+createdAt` composite 재사용 | ✅ |
| Q4 | notifiedProviderIds 필터 추가 안 함 · category match only | ✅ |
| Q5 | revalidatePath 의존 · onSnapshot 없음 | ✅ |
| Q6 | v1 단순 flag · 응답 차단 v1.1c | ✅ |
| Q7 | ShortcutGrid 첫 타일 "프로필 편집" → `/provider/profile` | ✅ |
| Q8 | `categories === []` → 쿼리 skip + EmptyRequestsHint | ✅ |
| Q9 | `/provider/home` 채택 | ✅ |
| Q10 | KST offset getGreeting · 서버 계산 → hydration 안전 | ✅ |

---

## 4. Component Tree §5.3 — 8/8 (Server 4 / Client 4)

| # | Component | Type | Match |
|---|-----------|:----:|:---:|
| 1 | DashboardHero | Server | ✅ |
| 2 | AvailabilityToggle | Client | ✅ |
| 3 | ActiveRequestsSection | Server | ✅ |
| 4 | RequestPreviewCard | Client | ✅ |
| 5 | EmptyRequestsHint | Client | ✅ |
| 6 | QuickStatsSection | Server | ✅ |
| 7 | TodayScheduleCard | Server | ✅ |
| 8 | ShortcutGrid | Client | ✅ |

Design v0.2 `DashboardHero` Client→Server 승격 결정 반영 · hydration 안전 · `AvailabilityToggle`만 Client leaf.

---

## 5. Repository 확장 §4.2 — 2/2

- `listForProvider({categories, status?, limit?})` — `categories===[]` → `[]` / `.slice(0,10)` 방어 / `where category in + status == + orderBy createdAt desc + limit` ✅
- `countForProvider({categories, status?})` — `.count()` aggregation · `.data().count` return · 같은 방어 ✅

---

## 6. Server Action §4.1 — 5-step 100%

`setIsAvailable`: Zod → verifySession → providerId guard (FORBIDDEN) → providerRepository.update → revalidatePath × 2 → return. `resolveProviderId` helper localize (shared util은 v1.2 검토).

---

## 7. Server→Client DTO §3.1a — 100%

`QuoteRequestPreviewDTO`: id · category · regionLabel · sizeLabel · **createdAtMs(number)** · note. Firestore Timestamp → Server Date → Client ms 변환 체인 완결. Hydration mismatch 원천 차단.

---

## 8. Clean Architecture §8 — 100%

| Layer | 파일 |
|-------|------|
| Presentation Server | page.tsx · DashboardHero · ActiveRequestsSection · QuickStatsSection · TodayScheduleCard |
| Presentation Client | AvailabilityToggle · RequestPreviewCard · EmptyRequestsHint · ShortcutGrid |
| Application | provider-dashboard-actions.ts (setIsAvailable) |
| Domain | types/dashboard.ts · 재사용 (QUOTE_CATEGORIES 등) |
| Infrastructure | quoteRequestRepository.{listForProvider, countForProvider} · providerRepository.update · userRepository.get |

---

## 9. BottomTabNav §2.2 — 100%

`PROVIDER_TABS[0].href: "/provider/profile"` → `"/provider/home"` + `exact: true` 추가. `/provider/profile`은 ShortcutGrid 전용 진입점으로 역할 분리 (Q7).

---

## 10. Auth Guards 3-tier — 100%

- 비로그인 → `/login?next=%2Fprovider%2Fhome`
- provider role 없음 → `/signup-provider`
- provider record 없음 → `/signup-provider`

---

## 11. Test Plan 1-20 Achievability — 100%

모든 20개 시나리오 (비로그인/no-role/no-record · empty/1/5 requests · 카테고리 0 · Toggle happy/rollback · QuickStats null · BottomTabNav route · Shortcut route+badge · Today coming-soon · KST greeting · proxy matcher · `>10` defense · DTO hydration · server getGreeting) 구현 커버.

---

## 12. Minor Gaps (2건 · cosmetic · 수정 불필요)

| # | 항목 | Impact |
|---|------|--------|
| m1 | EmptyRequestsHint "카테고리 넓히기" CTA도 `/provider/profile?tab=basic`으로 연결 (basic 탭 내부에 카테고리 그리드 존재) | 실제 도착 화면 동일 · 기능 영향 없음 |
| m2 | Design §5.1 "전체 N건 →" 문구 vs 실제 "전체 보기 →" + heading 옆 `({totalCount}건)` 분리 표시 | 정보량 동등 · 중복 회피 · cosmetic |

**Positive Divergences** (Design 상회)
- DashboardSkeleton Suspense fallback 구체화
- 모든 섹션에 `aria-labelledby` 일관 · ShortcutGrid badge `aria-label` · AvailabilityToggle `role=switch` + `aria-checked` 4종 세트
- `formatRelative` 7일 초과 시 `toLocaleDateString("ko-KR")` fallback
- `emphasizeCategories`/`emphasizeProfile` dual-branch indigo bg 강조
- **Bonus bug fix**: TriageClient BottomTabNav 겹침 수정 (`bottom: var(--bottom-nav-height) · z-30 · pb-32` + toast lift)

---

## 13. Build/Quality Evidence

- `pnpm tsc --noEmit` — 0 errors
- `pnpm build` — 성공 · 29 routes (`/provider/home` 신규)
- Firestore rules / indexes 불변 (기존 composite 재사용)
- PhotoUpload / 기타 feature regression 없음

---

## 14. Cross-Cycle Consistency

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
#11 provider-dashboard        99% ← 본 cycle
```

Marketplace v1.1b **4/5 완료** (bottom-tab-nav · provider-profile · provider-profile-editor · provider-dashboard). 잔여 1개: `client-dashboard`.

---

## 15. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report provider-dashboard`
3. → `/pdca archive provider-dashboard --summary`
4. → 다음 feature:
   - `client-dashboard` (v1.1b 마지막 · Figma 평균가 · Top5)
   - v1.2 진입: `chat` · `provider-search`

---

## 16. Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **99%** |
| Critical / Major / Minor | 0 / 0 / 2 (cosmetic) |
| Scope creep | 없음 |
| Missing items | 없음 |
| Regression risk | 없음 (bonus fix 포함) |
| Next | `/pdca report provider-dashboard` |
