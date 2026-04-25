---
template: plan-plus
version: 0.1
feature: provider-profile-editor
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 프로필 편집기 (provider-profile-editor)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #10 (v1.1b #3)
> 선행: provider-profile (v1.1b #2 · Match 99% archived)
> 다음: `/pdca design provider-profile-editor`

---

## 1. User Intent Discovery

### 1.1 배경
provider-profile reader(v1.1b #2)가 완성됐지만, **데이터 공급은 현재 seed 스크립트에만 의존**. 실제 가입한 청명이 자기 workCases/priceBook/기본 정보를 채울 수단 부재. 이번 feature가 editor 쪽 짝 → Figma 완성도를 seed 없이도 확보.

### 1.2 핵심 목적
**청명이 자기 공개 프로필을 직접 편집할 수 있도록** (Approach A · 3-tab 전체)
- 기본 정보 탭: profileImage·description·regions·categories·contactPhone
- 서비스 단가 탭: priceBook CRUD (유연한 추가/삭제/수정)
- 포트폴리오 탭: workCases Before/After 업로드 + 삭제 (수정은 v1.1c)
- provider-profile reader에 실시간 반영

### 1.3 타겟 사용자
- **1차**: 실제 가입한 청명 (첫 가입 후 프로필 완성)
- **2차**: 기존 청명 (priceBook 업데이트, 새 작업 추가)
- **3차**: 청광 운영자 (데이터 품질 모니터링)

### 1.4 MVP 경계
- ✅ `/provider/profile` 현 stub을 3-tab 편집 UI로 **완전 교체**
- ✅ **BasicInfoTab** — profileImage 업로드 · description · regions 멀티 선택 · categories 멀티 선택 · contactPhone
- ✅ **PriceBookTab** — CRUD (추가 · 삭제 · 수정)
- ✅ **PortfolioTab** — workCase 업로드 (Before+After + category + sizeLabel + memo) + 삭제
- ✅ URL state `?tab=basic|price|portfolio` (default basic)
- ✅ PhotoUpload 재활용 (pathPrefix=`work-photos` + `profile-images`)
- ✅ Server Actions 4개 (updateProfileBasic · upsertPriceBook · createWorkCase · deleteWorkCase)
- ✅ Firestore rules: workCases · providers.update 여전히 write:false · Admin SDK 독점
- ✅ Storage rules: `profile-images/{uid}/**`, `work-photos/{providerId}/**` owner write 허용
- ❌ 리뷰 답변 작성 (v2 review)
- ❌ workCase 수정 (v1.1c)
- ❌ priceBook options 배열 편집 (v1.1c)
- ❌ 프로필 사진 crop/resize
- ❌ workCase 순서 변경 (drag-drop)
- ❌ 프로필 미리보기 side-by-side (← /providers/{id}) — 현재는 "공개 프로필 보기" 링크만
- ❌ Stats (재계약률·응답시간·완료 작업) 편집 (v2+ batch)
- ❌ verified toggle (admin-only)

### 1.5 성공 기준
- 청명이 3-tab 모두 5분 내 채울 수 있음
- 편집 후 `/providers/{id}` 에 즉시 반영
- workCase 업로드 성공률 95%+ (Storage 연동)
- priceBook CRUD idempotent (잘못 저장돼도 수정 가능)
- seed 없이도 Figma 완성도 ≥ 85%

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **3-tab 전체 (basic + price + portfolio)** | **채택** |
| B | 포트폴리오만 (workCases Before/After) | 기각 (priceBook·기본 정보 공백 지속) |
| C | 기본 정보 + 사진만 (description + profileImage + regions) | 기각 (priceBook/workCases 없음 — v1.1b #2 완성도 낮음) |

A의 이점: Figma 1:1 3-tab · 한 feature로 Figma 완성 · provider-profile reader가 전체 섹션 활성화.

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (15개)
1. `/provider/profile` 현 stub → 3-tab shell + header
2. **ProfileEditorTabs** (Client · URL state)
3. **BasicInfoTab** (RHF + zodResolver)
4. profileImage 업로드 (PhotoUpload pathPrefix="profile-images")
5. description textarea (max 500)
6. regions 멀티 선택 (FORM_REGION_OPTIONS 재활용 · 1~5개)
7. categories 멀티 선택 (QUOTE_CATEGORIES 6종 · 1~6개)
8. contactPhone 편집
9. `updateProfileBasic` Server Action
10. **PriceBookTab** (RHF + useFieldArray)
11. priceBook 전체 CRUD (entry: category+unit+unitLabel+basePrice)
12. `upsertPriceBook` Server Action (provider.priceBook 전체 교체)
13. **PortfolioTab** (workCases grid + 업로드 폼)
14. workCase 업로드 (Before+After 2 업로드 + 메타 입력)
15. workCase 삭제 (`deleteWorkCase` Server Action · Storage 파일도 삭제)

### 3.2 Out of Scope → v1.1c+
| 항목 | 이동 이유 |
|------|----------|
| 리뷰 답변 작성 | v2 review write |
| workCase 수정 (memo/sizeLabel 변경) | 복잡도 → v1.1c |
| priceBook options 배열 편집 | 복잡도 · UI 공간 → v1.1c |
| 프로필 사진 crop / resize | 이미지 처리 pipeline → v1.1c |
| workCase 순서 변경 (drag-drop) | dnd 라이브러리 · v1.1c |
| side-by-side 프로필 미리보기 | layout 복잡도 · v1.1c |
| Stats 편집 | admin-batch · v2+ |
| verified toggle | admin 전용 · 별도 admin-panel (v2+) |
| 변경 이력 · undo | v2+ |
| 일괄 업로드 (multi-workCase zip) | v2+ |

### 3.3 기존 기능 영향
- `/provider/profile` stub 완전 대체 (환영 배너 + TODO 체크리스트 → 3-tab editor)
- 청명 TopBar / "내 공개 프로필 보기" 링크 유지 (header 섹션)
- providerRepository.get(id) 확장 없음 (편집 대상 필드는 이미 포함)
- Firestore rules 변경 없음 (Admin SDK 독점 유지)
- Storage rules `profile-images/{uid}/**` + `work-photos/{providerId}/**` owner write 추가
- Firestore indexes 변경 없음 (기존 workCases by providerId+completedAt 재활용)

---

## 4. Architecture

### 4.1 스택
- Next.js 16 + React 19 + Tailwind 4
- react-hook-form + zodResolver (기존)
- PhotoUpload 컴포넌트 재활용
- Firebase Storage (client-side upload)
- Firestore Admin SDK (Server Action)

### 4.2 파일 구조

```
src/
├── app/
│   ├── provider/profile/page.tsx            🔄 stub 완전 교체 (3-tab editor)
│   └── actions/
│       └── provider-editor-actions.ts       🆕 4개 Server Action
├── components/provider-profile-editor/      🆕 폴더
│   ├── ProfileEditorTabs.tsx                🆕 Client · ?tab= URL state
│   ├── BasicInfoTab.tsx                     🆕 Client · RHF + PhotoUpload
│   ├── PriceBookTab.tsx                     🆕 Client · useFieldArray CRUD
│   ├── PortfolioTab.tsx                     🆕 Client · grid + 업로드 모드
│   ├── WorkCaseUploadForm.tsx               🆕 Client · PhotoUpload × 2 + 폼
│   └── WorkCaseCard.tsx                     🆕 Client · grid card + 삭제 버튼
├── domain/
│   └── provider-editor-schema.ts            🆕 Zod 4개 (basic · priceBook · workCase · delete)
├── components/editor/PhotoUpload.tsx        (변경 없음 · pathPrefix 이미 지원)
└── firestore.rules                          (변경 없음)

storage.rules                                🔄 profile-images + work-photos owner write
firestore.indexes.json                       (변경 없음)
```

### 4.3 라우팅·데이터 흐름

```
[/provider/profile?tab=basic|price|portfolio] Server shell + Suspense
  verifySessionCookie → uid
  userRepository.get(uid) → providerId guard
  providerRepository.get(providerId) → provider
  if tab==portfolio: workCaseRepository.listByProvider(providerId, 20)

  → <header>
     청명 {companyName} · "내 공개 프로필 보기 →"
  → <ProfileEditorTabs tabSetKey={tab} />  (Client)
       ├─ <BasicInfoTab provider={...} /> (basic default)
       ├─ <PriceBookTab entries={...} />
       └─ <PortfolioTab cases={...} providerId={...} />

[Server Actions]
  updateProfileBasic({profileImage·description·regions·categories·contactPhone})
    → providerRepository.update via Admin SDK
  upsertPriceBook(entries)
    → providers.priceBook 전체 교체
  createWorkCase({category, sizeLabel, memo, beforePhoto, afterPhoto})
    → workCases.add
  deleteWorkCase(workCaseId)
    → workCases.delete + Storage file delete (Admin SDK)
```

### 4.4 업로드 흐름 (workCase · PhotoUpload 재활용)

```
Client PhotoUpload:
  newWorkCaseId = nanoid() (pre-issued)
  pathPrefix="work-photos"
  pageId=newWorkCaseId
  → Firebase Storage: work-photos/{providerId}/{newWorkCaseId}/before.jpg (upload 1)
  → Firebase Storage: work-photos/{providerId}/{newWorkCaseId}/after.jpg  (upload 2)
  → onChange([beforePhoto, afterPhoto])

Client Submit:
  Server Action createWorkCase({workCaseId, category, sizeLabel, memo, beforePhoto, afterPhoto})

Server Action:
  1. verifySessionCookie → uid
  2. userRepository.get(uid).providerId guard
  3. Zod
  4. workCases.doc(workCaseId).create({providerId, ...})
  5. return ok
```

**Note**: PhotoUpload 기본 uid 기반 path 사용. `work-photos/{uid}/...`로 저장됨 (providerId와 다름). 해결: PhotoUpload 인자 `customPathBase` 옵션 추가 or provider와 uid 별도 매칭 — Design 단계에서 확정.

### 4.5 삭제 흐름 (workCase)

Server Action `deleteWorkCase`:
1. auth + providerId guard
2. workCase.get → ownership verify (providerId === my providerId)
3. Storage `beforePhoto.path` + `afterPhoto.path` delete (best-effort)
4. workCases.doc(id).delete

---

## 5. Data Model

변경 없음. 기존 필드 사용:
- `providers.{profileImage, profileImagePath, description, regions, categories, contactPhone, priceBook}`
- `workCases.{providerId, category, sizeLabel, beforePhoto, afterPhoto, memo, completedAt, createdAt}`

### 5.1 Storage Rules 확장

```javascript
// 프로필 사진: 청명 본인 uid 기반 (providerId 아님 — PhotoUpload 기본 path)
match /profile-images/{uid}/{fileName=**} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}

// workCase Before/After: uid 또는 providerId 기반 — Plan에서 uid 기반 유지 (PhotoUpload 기본 유지)
match /work-photos/{uid}/{workCaseId}/{fileName=**} {
  allow read: if true;  // reader에서 URL 노출
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```

**중요 결정**: Storage path를 `{uid}` 기반으로 유지 (PhotoUpload 재활용 위해). `workCases.providerId` 는 Firestore 문서에만 기록. `providerId ≠ uid` (provider-signup에서 1:1 링크이나 path 기준은 uid).

---

## 6. 주요 플로우 상세

### 6.1 updateProfileBasic Server Action (7-step)
1. Zod parse `basicInfoSchema`
2. verifySessionCookie → uid
3. userRepository.get(uid).providerId guard (FORBIDDEN if missing)
4. `providers.doc(providerId).update({profileImage, profileImagePath, description, regions, categories, contactPhone, updatedAt})`
5. 기존 profileImage 교체 시 old Storage file 삭제 (best-effort)
6. revalidatePath(`/provider/profile`) + `/providers/${providerId}`
7. return ok

### 6.2 upsertPriceBook Server Action
1. Zod array `z.array(priceBookEntrySchema).min(0).max(10)`
2. auth + providerId guard
3. `providers.doc(providerId).update({priceBook: entries, updatedAt})`
4. revalidatePath
5. return ok

### 6.3 createWorkCase Server Action
1. Zod parse `workCaseCreateSchema` (workCaseId pre-issued nanoid · category · sizeLabel · memo · beforePhoto · afterPhoto)
2. auth + providerId guard
3. `workCases.doc(workCaseId).create({providerId, ...input, completedAt: now, createdAt})`
4. revalidatePath(`/provider/profile?tab=portfolio`) + `/providers/${providerId}`
5. return ok

### 6.4 deleteWorkCase Server Action
1. Zod `{ workCaseId: z.string().min(10) }`
2. auth + providerId guard
3. workCase fetch → ownership verify (workCase.providerId === myProviderId)
4. Storage delete: adminStorage.bucket().file(beforePhoto.path).delete() (try/catch)
5. `workCases.doc(workCaseId).delete()`
6. revalidatePath
7. return ok

### 6.5 Tab URL state (Client)
- 초기: `searchParams.get('tab') ?? 'basic'`
- 클릭 시 `router.push('/provider/profile?tab=XXX')` + shallow
- 3개 탭 (basic / price / portfolio) · tab id validation · 알 수 없으면 basic fallback

---

## 7. 비용·성능

### 7.1 Firestore 비용
- 페이지 로드: providers.get (1) + workCases list (1) ≈ 2 reads
- updateBasic: providers.update (1 write)
- upsertPriceBook: providers.update (1 write)
- createWorkCase: workCases.create (1 write)
- deleteWorkCase: workCase.get + delete (1 read + 1 write) + Storage delete × 2 (무료)
- 월 청명 100명 × 편집 3회/월 = 300 cycles ≈ $0.01 (무시 수준)

### 7.2 성능
- Server Action P95: 150~200ms (Firestore write · Storage 연동 client-side)
- PhotoUpload: Storage 업로드 ~1~3초 (file size 의존)
- Submit 폼 P95: <500ms (upload 후 submit만)

---

## 8. Open Questions (Design 단계)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | workCase workCaseId pre-issue vs auto? | pre-issue nanoid (Storage 일관성) |
| Q2 | PhotoUpload `pageId` prop을 workCaseId로 쓸 때 `photos[]` 동기화 | before/after 각각 state 분리 (photos[0]=before · photos[1]=after) |
| Q3 | upsertPriceBook — partial update vs 전체 replace? | **전체 replace** (UI에서 entries 배열 전체 제출) |
| Q4 | profileImage 교체 시 기존 Storage 파일 삭제 | best-effort · 실패 시 warn log (orphan 허용) |
| Q5 | tab 전환 시 unsaved changes 경고 | v1 MVP는 생략 · v1.1c confirm dialog |
| Q6 | categories 멀티 선택 min 1 / max 6 | Zod `.min(1).max(6)` |
| Q7 | regions 멀티 선택 min/max | Zod `.min(1).max(5)` · FORM_REGION_OPTIONS 14개 중 |
| Q8 | profileImage 기본값 (Storage 없음) | null · provider-profile reader에서 이니셜 fallback (이미 구현) |

---

## 9. Brainstorming Log

### Phase 1
- 3-tab 전체 채택 · /provider/profile 교체

### Phase 2
- A 채택 · B/C 기각 (완성도)

### Phase 3 YAGNI
- MVP 15 · Out-of-scope 10 확정
- workCase 수정은 v1.1c (upload + delete만)

### Phase 4
- 파일 구조 승인
- PhotoUpload 재활용 (pathPrefix "profile-images" / "work-photos")
- Server Action 4개 (updateBasic · upsertPriceBook · createWorkCase · deleteWorkCase)

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. 3-tab 전체 · MVP 15 · Out-of-scope 10. /provider/profile 완전 교체. 4 Server Actions. Storage rules 확장. PhotoUpload 재활용 | Seokho Lee |
