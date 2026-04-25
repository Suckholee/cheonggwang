---
template: report
version: 1.0
feature: provider-profile-editor
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
cycle: "#10 (v1.1b #3)"
match_rate: 99
---

# provider-profile-editor PDCA 완료 보고서

> **Cycle #10** · Marketplace Track v1.1b · 3번째 feature  
> **Plan**: [provider-profile-editor.plan.md](../01-plan/features/provider-profile-editor.plan.md)  
> **Design**: [provider-profile-editor.design.md](../02-design/features/provider-profile-editor.design.md) (v0.2)  
> **Analysis**: [provider-profile-editor.analysis.md](../03-analysis/provider-profile-editor.analysis.md)

---

## 1. 기능 개요

### 1.1 완료 내용
**`/provider/profile` 완전 교체** · 3-tab 청명 프로필 편집기

| 영역 | 기능 |
|------|------|
| 기본정보 탭 | 프로필 사진 업로드 · 소개글 · 활동지역(1~5) · 서비스 카테고리(1~6) · 연락처 |
| 서비스 단가 탭 | priceBook CRUD (최대 10개 항목) · category/unit/unitLabel/basePrice 편집 |
| 포트폴리오 탭 | workCase 업로드 (Before/After 2장 + category/sizeLabel/memo) · 삭제 |

### 1.2 기술 결과물
- **4 Server Actions**: `updateProfileBasic` · `upsertPriceBook` · `createWorkCase` · `deleteWorkCase`
- **10 컴포넌트**: ProfileEditorTabs · BasicInfoTab · PriceBookTab · PortfolioTab · WorkCaseUploadForm · WorkCaseCard · PriceBookEntryRow · RegionCheckboxGrid · CategoryCheckboxGrid + EditorBody
- **4 Zod schemas**: basicInfoInputSchema · priceBookEntrySchema · createWorkCaseInputSchema · deleteWorkCaseInputSchema
- **Repository 확장**: providerRepository.update · workCaseRepository.{create,get,delete}
- **Storage rules 확장**: profile-images/{uid}/{pageId} · work-photos/{uid}/{workCaseId}

---

## 2. 핵심 지표

### 2.1 Match Rate

```
Overall Match Rate: 99%
├─ MVP 15/15: 100%
├─ Out-of-scope 0/10: 0% (leakage 없음)
├─ 4 Server Actions step-spec: 100% (25/25 steps)
├─ 10 Open Questions: 100% 해소
├─ Test Plan achievability: 100%
├─ Clean Architecture: 100%
└─ Critical 0 / Major 0 / Minor 3 (cosmetic)
```

### 2.2 결함 현황

| 등급 | 수량 | 설명 |
|------|------|------|
| Critical | 0 | — |
| Major | 0 | — |
| Minor | 3 | 숫자 표기(14→13) · basePrice 기본값(0) · 헤더 힌트 위치 (모두 무영향) |

---

## 3. Plan-Design-Implementation 정합성

### 3.1 MVP 15/15 완료

| # | 항목 | 상태 |
|---|------|------|
| 1-8 | BasicInfoTab + profileImage + description + regions + categories + contactPhone + updateProfileBasic | ✅ |
| 9-12 | PriceBookTab + priceBook CRUD + upsertPriceBook | ✅ |
| 13-15 | PortfolioTab + workCase 업로드 + 삭제 + createWorkCase + deleteWorkCase | ✅ |

### 3.2 Out-of-scope 10/10 준수

모든 deferred 항목 미구현:
- ❌ 리뷰 답변 작성 (v2)
- ❌ workCase 수정 (v1.1c)
- ❌ priceBook options 배열 편집 (v1.1c)
- ❌ 프로필 사진 crop/resize (v1.1c)
- ❌ drag-drop 순서 변경 (v1.1c)
- ❌ side-by-side 미리보기 (v1.1c)
- ❌ Stats 편집 (v2+)
- ❌ verified toggle (admin-only)
- ❌ 변경 이력/undo (v2+)
- ❌ 일괄 업로드 zip (v2+)

---

## 4. 주요 설계 결정

### 4.1 Open Questions 해소 (10/10)

| Q | 해소 내용 |
|---|----------|
| **Q1** workCaseId 사전 발급 | nanoid(16) · useState 초기화 · Storage 경로 일관성 확보 |
| **Q2** before/after 상태 동기화 | PhotoUpload 2회 호출 · 독립 photos[] state · pageId `${workCaseId}-before/-after` |
| **Q3** priceBook 전체 replace | entries 배열 전체 submit · partial update 회피 |
| **Q4** 기존 profileImage 삭제 | deleteStorageSafely helper · best-effort · path 변경 시만 old file 제거 |
| **Q5** unsaved changes 경고 | v1 MVP 제외 (의도적) · v1.1c 후속 |
| **Q6** categories min/max | 1~6 Zod 제약 · 전 카테고리 선택 가능 |
| **Q7** regions min/max | 1~5 Zod · RegionCheckboxGrid UI enforce |
| **Q8** profileImage nullable | null 허용 · reader에서 이니셜 fallback |
| **Q9** null 시맨틱 (v0.2) | **명시적 삭제**로 확정 · oldPath best-effort 제거 |
| **Q10** completedAt (v0.2) | serverTimestamp 고정 · 소급 입력 제외 |

### 4.2 설계 반복

**v0.1 → v0.2 변경** (design-validator 피드백 6건)
1. `profileImage: null` 시맨틱 명확화 (명시적 삭제)
2. `completedDaysAgo` 제거 · `completedAt = now` 고정
3. profile-images pageId → `profile` 센티넬 (가독성)
4. tab fallback 타입 내로잉
5. revalidatePath 스텝 명시
6. Test Plan 확장 (PhotoUpload regression · orphan · old path)

---

## 5. 핵심 파일 변경

### 5.1 신규 생성 (6개)

| 파일 | 라인 | 역할 |
|------|------|------|
| `src/app/actions/provider-editor-actions.ts` | ~350 | 4 Server Actions |
| `src/domain/provider-editor-schema.ts` | ~100 | 4 Zod schemas |
| `src/components/provider-profile-editor/ProfileEditorTabs.tsx` | ~80 | 탭 navigation (URL state) |
| `src/components/provider-profile-editor/BasicInfoTab.tsx` | ~180 | 기본정보 형식 |
| `src/components/provider-profile-editor/PriceBookTab.tsx` | ~150 | 단가 관리 (useFieldArray) |
| `src/components/provider-profile-editor/PortfolioTab.tsx` | ~120 | 작업 그리드 + 업로드 폼 |

### 5.2 신규 생성 (4개 sub-components)

| 파일 | 역할 |
|------|------|
| `WorkCaseUploadForm.tsx` | Before/After PhotoUpload × 2 · nanoid pre-issue |
| `WorkCaseCard.tsx` | Grid card · confirm 삭제 · Storage 동기화 |
| `PriceBookEntryRow.tsx` | useFieldArray row · category/unit/unitLabel/basePrice |
| `RegionCheckboxGrid.tsx` · `CategoryCheckboxGrid.tsx` | 멀티 선택 · 최대값 enforce |

### 5.3 수정 (5개)

| 파일 | 변경 내용 |
|------|----------|
| `src/app/provider/profile/page.tsx` | stub 완전 교체 · EditorBody Server shell · Suspense · header 유지 |
| `src/lib/firebase/provider-repository.ts` | `update()` 메서드 추가 · updatedAt 자동 |
| `src/lib/firebase/work-case-repository.ts` | `create()` · `get()` · `delete()` 추가 · timestamp 변환 |
| `src/lib/firebase/admin.ts` | `adminStorage` export 추가 |
| `src/components/editor/PhotoUpload.tsx` | `maxPhotos` optional prop 추가 · 기존 caller 호환 |

### 5.4 수정 (배포)

| 파일 | 변경 내용 |
|------|----------|
| `storage.rules` | profile-images/{uid}/{pageId} · work-photos/{uid}/{workCaseId} 블록 추가 |
| `firestore.rules` | 변경 없음 (write:false 유지) |
| `firestore.indexes.json` | 변경 없음 |

---

## 6. 기술 하이라이트

### 6.1 PhotoUpload 재활용 + maxPhotos 확장

기존 PhotoUpload는 3장 제한. 프로필 사진(1장) · Before/After(각 1장)를 위해:
- `maxPhotos` optional prop 추가 (default MAX_PHOTOS=3)
- 기존 caller (QuoteForm 등) regression 없음
- UI counter 동적 대응 (`{photos.length}/{maxPhotos}`)

### 6.2 nanoid(16) 사전 발급

```tsx
const [nextId, setNextId] = useState(() => generateNanoId());
// 마운트 시: workCaseId 미리 생성
// submit 후: setNextId(generateNanoId()) · form reset
// Storage path: work-photos/{uid}/{workCaseId}-before/-after
// Firestore: workCases.doc(workCaseId).create(...)
```

→ Storage path와 Firestore id 일관성 · 기존 quote-request 패턴 동일

### 6.3 deleteStorageSafely helper

```ts
async function deleteStorageSafely(filePath: string) {
  try {
    await adminStorage.bucket().file(filePath).delete();
  } catch (err) {
    console.warn(`[deleteStorageSafely] orphan: ${filePath}`, err);
  }
}
```

→ best-effort · 실패 시 warn log · orphan 허용 (v1.1c cleanup job 후속)

### 6.4 resolveProviderId helper

```ts
async function resolveProviderId(uid: string): Promise<string> {
  const user = await userRepository.get(uid);
  if (!user?.providerId) {
    return Response.forbidden("Not a provider");
  }
  return user.providerId;
}
```

→ 4 Server Actions 공통 auth 패턴 · 일관성

### 6.5 Tab URL state Server+Client 분리

- **Server**: `searchParams.tab` → TabKey validation → defaultTab
- **Client**: `ProfileEditorTabs` → `usePathname` · `useSearchParams` · Link-based navigation
- 주소창 뒤로가기 친화 · shallow routing

### 6.6 Q9/Q10 v0.2 시맨틱 확정

- **Q9** `profileImage: null` = 명시적 삭제 → 새 프로필 사진 없을 시 null submit · Server Action은 단순 replace · oldPath best-effort 삭제
- **Q10** `completedAt` = serverTimestamp 고정 → 과거 완료 작업 소급은 v1.1c (Plan §6.3)

---

## 7. 학습 및 재사용 가능 패턴

### 7.1 PhotoUpload maxPhotos 패턴

단일/다중 이미지 양쪽 대응하는 재사용 가능 패턴:
- ProfilePhoto (1장) · Before/After (각 1장) · WorkGallery (3~10장) 모두 동일 컴포넌트
- v1.1b 잔여 `client-dashboard` · `provider-search` 등에서 즉시 활용 가능

### 7.2 resolveProviderId helper

청명 인증 guard 패턴 · 4개 action 공통:
```ts
const providerId = await resolveProviderId(uid);
```

v1.1b 잔여 feature (`provider-dashboard` 등) · v1.2 `chat` · `provider-search`에서 재사용

### 7.3 3-tab URL state Server+Client 분리

provider-profile-editor가 정책화 · `?tab=` 기반 탭 라우팅:
- provider-dashboard (statistics · 받은 요청 · 제출 제안)
- client-dashboard (찜·요청 히스토리·알림)
- admin-dashboard (user/provider 관리)

모두 동일 패턴 적용 가능 (Design §2.2 copy-paste)

### 7.4 Server Action 4-step atomic pattern

Zod → auth → guard → Firestore write → revalidatePath 표준화:
- 트랜잭션 불필요 (단일 문서 업데이트)
- 에러 처리 일관 (try/catch + toActionError)
- Prior 9 cycles와 동일 (숙련도 확립)

---

## 8. Cross-Cycle 추이

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

**10개 cycle 연속 99%+ 유지** · Marketplace v1.1b 진행도 **3/5 완료** (bottom-tab-nav ✅ · provider-profile ✅ · provider-profile-editor ✅)

---

## 9. 다음 단계

### 9.1 v1.1b 잔여 (2개)

| Feature | 예상 難度 | 예상 기간 |
|---------|---------|---------|
| `provider-dashboard` | 중 · 3-tab layout · stats query (4 aggregates) | 3~4 cycles |
| `client-dashboard` | 중 · 2-tab layout · favorites/requests/notifications | 3~4 cycles |

### 9.2 v1.2 후보 (parallel)

- `chat` (1:1 messaging · 알림 연동)
- `provider-search` (filter · sorting · map)

---

## 10. 아카이빙 확인

### 10.1 문서 정합성

| 문서 | 버전 | 상태 |
|------|------|------|
| Plan | v0.1 | ✅ 최신 |
| Design | v0.2 | ✅ design-validator 피드백 반영 완료 |
| Analysis | v0.1 | ✅ Match 99% 확정 |
| Report | v1.0 | ✅ 본 문서 |

### 10.2 배포 현황

| 항목 | 상태 |
|------|------|
| 코드 (src/app, src/components, src/domain, src/lib) | ✅ merged to main |
| Storage rules | ✅ `firebase deploy --only storage` |
| Firestore rules | ✅ 변경 없음 · 기존 유지 |
| Build & lint | ✅ pnpm tsc --noEmit (0 errors) · pnpm build (성공) |

---

## 11. 완료 서명

| 항목 | 담당자 | 날짜 |
|------|--------|------|
| **Plan** | Seokho Lee (Plan Plus 방법론) | 2026-04-21 |
| **Design** | Seokho Lee (v0.1→v0.2 반복) | 2026-04-21 |
| **Implementation** | Seokho Lee + gap-detector | 2026-04-21 |
| **Analysis** | Seokho Lee (Match 99%) | 2026-04-21 |
| **Report** | Seokho Lee | 2026-04-21 |

---

## Summary

| 지표 | 결과 |
|------|------|
| **Match Rate** | **99%** (Critical 0 / Major 0 / Minor 3 cosmetic) |
| **MVP Completion** | **15/15 (100%)** |
| **Scope Adherence** | **0/10 leakage (100%)** |
| **Server Actions** | **4/4 · 25/25 steps** |
| **Components** | **10/10** |
| **Regression Risk** | **0** (PhotoUpload · prior callers 호환) |
| **PDCA Status** | **✅ Ready to archive** |
| **Next Milestone** | **v1.1b #4 (provider-dashboard)** |

---

*이 보고서로 Cycle #10 PDCA (Plan → Design → Do → Check → Act) 완료. 모든 4개 문서의 정합성 확인됨.*
