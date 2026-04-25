---
template: analysis
version: 0.1
feature: provider-profile-editor
date: 2026-04-21
author: Seokho Lee (via gap-detector)
project: cheonggwang
cycle: "#10 (v1.1b #3)"
match_rate: 99
---

# provider-profile-editor Gap Analysis Report

> **Cycle #10** · Marketplace Track v1.1b #3 · Design v0.2 (post design-validator fixes)
> **Plan**: [provider-profile-editor.plan.md](../01-plan/features/provider-profile-editor.plan.md)
> **Design**: [provider-profile-editor.design.md](../02-design/features/provider-profile-editor.design.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP 15/15:               100%              │
│  Out-of-scope leakage:      0/10 (0%)       │
│  4 Server Actions step-spec 100% (25/25)    │
│  10 Open Questions:       100%              │
│  Test Plan 1-17 achievable: 100%            │
│  Component Tree §2.1:     100% (10/10)      │
│  Clean Architecture §8:   100%              │
│  Storage/Firestore rules: 100%              │
│  PhotoUpload regression:  100%              │
│  Critical 0 / Major 0 / Minor 3 (cosmetic)  │
└─────────────────────────────────────────────┘
```

**Status**: ✅ >= 90% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP 15/15 (100%)

| # | 항목 | 구현 위치 |
|---|------|-----------|
| 1 | `/provider/profile` stub → 3-tab shell + header | `src/app/provider/profile/page.tsx` (EditorBody Server) |
| 2 | ProfileEditorTabs (Client · URL state) | `ProfileEditorTabs.tsx` Link-based · role=tablist · aria-selected |
| 3 | BasicInfoTab (RHF + zodResolver) | `BasicInfoTab.tsx` useForm + zodResolver(basicInfoInputSchema) |
| 4 | profileImage 업로드 (PhotoUpload pathPrefix=profile-images) | BasicInfoTab · pageId="profile" · maxPhotos=1 |
| 5 | description textarea (max 500) | BasicInfoTab · counter · setValueAs null |
| 6 | regions 1~5 (FORM_REGION_OPTIONS) | `RegionCheckboxGrid.tsx` · 5 max enforce + disabled on limit |
| 7 | categories 1~6 (QUOTE_CATEGORIES) | `CategoryCheckboxGrid.tsx` · 6 max (all selectable) |
| 8 | contactPhone | BasicInfoTab · regex Zod |
| 9 | `updateProfileBasic` Server Action | `provider-editor-actions.ts` |
| 10 | PriceBookTab (RHF + useFieldArray) | `PriceBookTab.tsx` · 10 max enforce |
| 11 | priceBook entry CRUD | `PriceBookEntryRow.tsx` + append/remove |
| 12 | `upsertPriceBook` Server Action | 전체 replace |
| 13 | PortfolioTab (grid + 업로드) | `PortfolioTab.tsx` · 2-col sm:grid |
| 14 | workCase 업로드 (Before+After+meta) | `WorkCaseUploadForm.tsx` · nanoid(16) pre-issue · Controller×2 |
| 15 | workCase 삭제 + Storage delete | `WorkCaseCard.tsx` confirm + `deleteWorkCase` action |

---

## 2. Out-of-scope Leakage — 0/10 (0%)

- 리뷰 답변 · workCase 수정 · priceBook options · 사진 crop · dnd 순서 · side-by-side 미리보기 · Stats 편집 · verified toggle · 변경 이력/undo · 일괄 업로드 — 모두 미구현 ✅

---

## 3. 4 Server Actions — Step Spec Compliance (25/25)

| Action | Steps | Match |
|--------|-------|:---:|
| `updateProfileBasic` | 8/8 (Zod → auth → guard → read old → update → oldPath delete → revalidate×2 → return) | ✅ |
| `upsertPriceBook` | 5/5 | ✅ |
| `createWorkCase` | 5/5 · `completedAt = serverTimestamp()` Plan §6.3 준수 · `completedDaysAgo` 필드 absent | ✅ |
| `deleteWorkCase` | 7/7 · ownership verify 2-branch FORBIDDEN | ✅ |

모든 Action이 `try/catch` + Zod issue → INVALID_INPUT + `toActionError` 경로 일관. Prior 9 cycles와 동일 패턴.

---

## 4. 10 Open Questions Resolution — 100%

| Q | 해소 | Status |
|---|------|:---:|
| Q1 workCaseId pre-issue (nanoid 16) | `useState(() => nanoId16())` + regen after success | ✅ |
| Q2 before/after 독립 photos[] | PhotoUpload × 2, pageId `${workCaseId}-before/-after` | ✅ |
| Q3 priceBook 전체 replace | `providers.update({priceBook: entries})` | ✅ |
| Q4 old Storage best-effort delete | `deleteStorageSafely` helper | ✅ |
| Q5 unsaved changes 생략 | v1 MVP 제외 (의도적) | ✅ |
| Q6 categories 1~6 Zod | schema min/max | ✅ |
| Q7 regions 1~5 Zod + UI enforce | schema + RegionCheckboxGrid disabled on limit | ✅ |
| Q8 profileImage nullable | schema + reader fallback | ✅ |
| Q9 null = 명시적 삭제 (v0.2 확정) | single replace semantic + oldPath best-effort delete | ✅ |
| Q10 completedAt = now (소급 제외) | serverTimestamp, Schema 입력에 completedAt 없음 | ✅ |

---

## 5. Storage Path Spec Match

| Caller | pathPrefix | pageId | Resolved Storage path | Match |
|--------|-----------|--------|----------------------|:---:|
| BasicInfoTab (profile photo) | `profile-images` | `profile` | `profile-images/{uid}/profile/*` | ✅ |
| WorkCaseUploadForm (Before) | `work-photos` | `${workCaseId}-before` | `work-photos/{uid}/{workCaseId}-before/*` | ✅ |
| WorkCaseUploadForm (After) | `work-photos` | `${workCaseId}-after` | `work-photos/{uid}/{workCaseId}-after/*` | ✅ |

Storage rules (`storage.rules`): `profile-images/{uid}/{pageId}/{fileName}` + `work-photos/{uid}/{workCaseId}/{fileName}` — wildcard captures 모두 매치. ✅ deployed.

Firestore rules 불변: `providers.update: false` + `workCases.write: false` (Admin SDK 독점). ✅

---

## 6. Test Plan 1-17 Achievability — 100%

| # | Test | Achievable |
|---|------|:---:|
| 1 | 비로그인 → /login | ✅ |
| 2 | provider role 없음 → /signup-provider | ✅ |
| 3 | profileImage 업로드 → reflect | ✅ |
| 4 | description 500자 Zod 거부 | ✅ |
| 5 | regions 0개 Zod 거부 | ✅ |
| 6 | 11번째 entry 거부 + 버튼 disable | ✅ |
| 7 | basePrice 음수 거부 | ✅ |
| 8 | workCase create 성공 | ✅ |
| 9 | before/after 누락 Zod 거부 | ✅ |
| 10 | WorkCaseCard 삭제 + Storage 정리 | ✅ |
| 11 | 타 provider workCase 삭제 → FORBIDDEN | ✅ |
| 12 | `?tab=invalid` → basic fallback | ✅ |
| 13 | revalidatePath after each action | ✅ |
| 14 | 저장 후 새로고침 유지 | ✅ |
| 15 | PhotoUpload regression (quote-form, editor) | ✅ |
| 16 | Before 성공 + After 실패 재시도 | ✅ |
| 17 | profileImage 교체 old path 삭제 | ✅ |

---

## 7. PhotoUpload Regression — ✅ No Regression

- `QuoteForm.tsx`: `<PhotoUpload pageId pathPrefix="quote-photos" .../>` — `maxPhotos` 미지정 → default MAX_PHOTOS=3
- `EditorShell.tsx`: `<PhotoUpload pageId .../>` — `maxPhotos` 미지정 → default MAX_PHOTOS=3
- `QuoteProposalForm.tsx`: PhotoUpload 미사용

UI counter `{photos.length}/{maxPhotos}`가 자동 대응 ("N/3" · "N/1").

---

## 8. Component Tree §2.1 — 10/10 (100%)

모든 10 컴포넌트가 Design §5.5 spec 대로 `components/provider-profile-editor/` 하위 생성. Server/Client boundary · RHF/useFieldArray/Controller 사용 위치 일치.

---

## 9. Clean Architecture §8 — 100%

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/provider/profile/page.tsx` |
| Presentation Client | `components/provider-profile-editor/*` (9) + `components/editor/PhotoUpload.tsx` |
| Application | `app/actions/provider-editor-actions.ts` (4 actions) |
| Domain | `domain/provider-editor-schema.ts` · `QUOTE_CATEGORIES` · `FORM_REGION_OPTIONS` |
| Infrastructure | `providerRepository.update` · `workCaseRepository.{create,get,delete}` · `adminStorage` |

Dependency direction 준수 · `"use server"` / `"use client"` / `server-only` 정확 · 의존성 역전 없음.

---

## 10. Minor Gaps (3건 · cosmetic · 무영향 · 수정 불필요)

| # | 항목 | 위치 | Impact |
|---|------|------|--------|
| m1 | FORM_REGION_OPTIONS 실제 13개 (Design "14개"로 표기 — "전국" 제외 계산) | `domain/region-presets.ts` | 수치 표기 · Zod max 5 제약 내 기능 영향 없음 |
| m2 | priceBook append `basePrice: 0` 기본값 (Design 목업은 200000 양수 예시) | `PriceBookTab.tsx` | UX 미세 · placeholder는 `200000` 제공 |
| m3 | "활동 지역 (1~5개)" 헤더 병기는 grid 내부 hint로 표시 (label에는 "활동 지역"만) | `BasicInfoTab.tsx` | cosmetic |

**Positive Divergences** (Design 상회 개선)
- `WorkCaseCard`에 `confirm()` 네이티브 다이얼로그 — 오삭제 방지
- `WorkCaseUploadForm` 저장 성공 후 `nextId` 재발급 + `reset()` — 연속 업로드 UX
- `PhotoUpload` counter가 `{maxPhotos}` 동적 대응
- `EditorSkeleton` Suspense fallback
- `parseTab` page-level util 분리
- `deleteWorkCase` FORBIDDEN 브랜치 2-split (not-exists vs not-owner)

---

## 11. Build/Quality Evidence

- `pnpm tsc --noEmit` — 0 errors
- `pnpm build` — 성공 (`/provider/profile` prerendered as static HTML with dynamic streamed content)
- `pnpm lint` — 신규 코드 error 0 · watch() 경고는 기존 QuoteForm 패턴과 일관
- `firebase deploy --only storage` — 배포 완료
- `firestore.rules` 불변 · `firestore.indexes.json` 불변

---

## 12. Cross-Cycle Consistency

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
#10 provider-profile-editor   99% ← 본 cycle
```

Marketplace v1.1b 진행도: **3/5 feature 완료** (bottom-tab-nav ✅ · provider-profile ✅ · provider-profile-editor ✅).

---

## 13. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report provider-profile-editor`
3. → `/pdca archive provider-profile-editor --summary`
4. → 다음 feature 후보 (v1.1b 잔여):
   - `provider-dashboard` (Figma 청명 홈)
   - `client-dashboard` (Figma 평균가 · Top5)
   - v1.2 `chat` · `provider-search`

---

## 14. Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **99%** |
| Critical / Major / Minor | 0 / 0 / 3 (cosmetic) |
| Scope creep | 없음 |
| Missing items | 없음 |
| Regression risk (PhotoUpload) | 없음 |
| Next | `/pdca report provider-profile-editor` |
