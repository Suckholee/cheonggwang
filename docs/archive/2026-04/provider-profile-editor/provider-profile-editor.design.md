---
template: design
version: 0.1
feature: provider-profile-editor
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-profile-editor Design Document

> **Summary**: `/provider/profile` stub 완전 교체 · 3-tab 청명 프로필 편집기 (기본정보 · 서비스 단가 · 포트폴리오). 4 Server Actions (updateProfileBasic · upsertPriceBook · createWorkCase · deleteWorkCase). PhotoUpload 재활용 (profile-images + work-photos). Firestore rules write:false 유지 · Admin SDK 독점 · Storage rules owner write 확장.
>
> **Plan**: [provider-profile-editor.plan.md](../../01-plan/features/provider-profile-editor.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** workCaseId pre-issue | **pre-issue nanoid(16)** · 폼 마운트 시 생성 · Storage path와 Firestore id 일관성 (quote-request의 requestId 패턴 동일) |
| **Q2** PhotoUpload pageId=workCaseId · before/after 상태 동기화 | before/after 각각 **독립 photos[] 상태** 2개 · PhotoUpload 2번 호출 (`{pageId: workCaseId}` 공유, 각기 `photos[0]` slot) |
| **Q3** upsertPriceBook 전체 replace | 전체 entries 배열로 `providers.update({priceBook: entries})` · partial update (push/splice) 하지 않음 — UI 간결 |
| **Q4** 기존 profileImage 교체 시 Storage 파일 삭제 | best-effort · Server Action에서 `adminStorage.bucket().file(oldPath).delete()` try/catch · 실패 시 warn log (orphan 허용) |
| **Q5** unsaved changes 경고 | v1 MVP는 **생략** · v1.1c confirm dialog 또는 react-hook-form `isDirty` 활용 |
| **Q6** categories min/max | Zod `.min(1).max(6)` · QUOTE_CATEGORIES 6종 모두 선택 가능 |
| **Q7** regions min/max | Zod `.min(1).max(5)` · FORM_REGION_OPTIONS (14개) 중 |
| **Q8** profileImage null 처리 | nullable · 업로드 안 하면 null · reader에서 이니셜 gradient fallback (이미 구현) |
| **Q9** `profileImage: null`의 시맨틱 | **명시적 삭제**로 확정 · "기존 유지"는 클라이언트에서 defaultValues로 기존 값을 그대로 포함 · Server Action은 단순 replace · path 변경 시 old file best-effort 삭제 |
| **Q10** workCase completedAt 소급 입력 | **v1에서 제외** · `completedAt = now` (Plan §6.3) · 과거 완료된 작업 소급 입력은 v1.1c 이후 |

---

## 1. Overview

### 1.1 Design Goals
- 3-tab 완전 편집 · seed 의존 탈피
- PhotoUpload 재활용으로 업로드 UI 공수 최소
- Server Actions 4개로 각 편집 영역 독립성
- Firestore/Storage rules 보안 패턴 일관 (write:false + owner + Admin SDK)
- URL state 탭 (`?tab=basic|price|portfolio`) — back button 친화

### 1.2 Design Principles
- **Server-first 데이터**: 페이지 shell에서 provider + workCases fetch · Client 컴포넌트에 initial data 전달
- **Client form state**: 각 탭 RHF + zodResolver · unsaved changes는 v1.1c
- **Action separation**: 기본정보 · 단가 · 작업 생성 · 작업 삭제 4개 Server Action
- **Reuse over rewrite**: PhotoUpload + PhotoUpload `pathPrefix` + providerRepository · workCaseRepository · Zod 패턴 전부 재활용
- **Atomic writes**: 각 Server Action 단일 Firestore write (TX 불필요 · 단일 문서 업데이트)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────┐
│ /provider/profile?tab=basic|price|portfolio             │
│  (Server shell + Suspense)                              │
│  └─ EditorBody:                                         │
│      verifySessionCookie → uid                          │
│      userRepository.get(uid) → providerId guard         │
│      providerRepository.get(providerId)                 │
│      tab==='portfolio'이면 workCaseRepository.list      │
│      → render:                                          │
│         <header>                                        │
│           {companyName} · "내 공개 프로필 보기 →"        │
│         <ProfileEditorTabs currentTab={tab} />          │
│           tab===basic    → <BasicInfoTab provider=... /> │
│           tab===price    → <PriceBookTab entries=... /> │
│           tab===portfolio→ <PortfolioTab cases=...      │
│                            providerId=...  uid=... />    │
└────────────────────────────────────────────────────────┘

Tab Client components:
 ┌─ BasicInfoTab (Client) — RHF + zodResolver
 │    profileImage upload (PhotoUpload pathPrefix=profile-images)
 │    description textarea (max 500)
 │    regions checkboxes (FORM_REGION_OPTIONS 14개 · 1~5)
 │    categories checkboxes (QUOTE_CATEGORIES 6개 · 1~6)
 │    contactPhone input
 │    [저장] → updateProfileBasic
 │
 ├─ PriceBookTab (Client) — RHF useFieldArray
 │    항목들 (category select · unit select · unitLabel input · basePrice number)
 │    [+ 항목 추가] · 삭제 버튼
 │    [저장] → upsertPriceBook
 │
 └─ PortfolioTab (Client)
      <WorkCaseUploadForm providerId={...} uid={...} />
        preIssuedWorkCaseId=nanoid(16) · 마운트 시 생성
        PhotoUpload before (pageId=workCaseId · photos slot 1)
        PhotoUpload after  (pageId=workCaseId · photos slot 2)
        category select · sizeLabel input · memo textarea
        [업로드] → createWorkCase
      <WorkCasesGrid cases={...}>
        각 WorkCaseCard (이미지 + 메타 + [삭제])
          [삭제] → deleteWorkCase
```

### 2.2 Tab Routing (URL state)

```tsx
// /provider/profile?tab=basic|price|portfolio
const tab = searchParams.tab ?? 'basic';
const validTabs = ['basic', 'price', 'portfolio'] as const;
type TabKey = (typeof validTabs)[number];
const currentTab: TabKey = (validTabs as readonly string[]).includes(tab)
  ? (tab as TabKey)
  : 'basic';

<ProfileEditorTabs currentTab={currentTab}>
  {/* Link 3개 */}
</ProfileEditorTabs>
```

`ProfileEditorTabs`는 TabNavClient 유사 패턴. Client 컴포넌트 · `usePathname` + `useSearchParams` 로 active 감지 · Link navigation.

---

## 3. Data Model

변경 없음. 기존 필드만 사용:
- `providers/{id}`: profileImage · profileImagePath · description · regions · categories · contactPhone · priceBook
- `workCases/{id}`: providerId · category · sizeLabel · beforePhoto · afterPhoto · memo · completedAt · createdAt

### 3.1 Firestore Rules

**변경 없음**. `providers.update: false` · `workCases.write: false` 유지. Server Action이 Admin SDK bypass로 독점.

### 3.2 Storage Rules (확장)

```javascript
// 프로필 사진 — owner uid 기반
match /profile-images/{uid}/{pageId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}

// Before/After — owner uid 기반 (providerId와 1:1 매핑, uid path 유지로 PhotoUpload 재활용)
match /work-photos/{uid}/{workCaseId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```

### 3.3 PhotoUpload Path 전략

기존 `PhotoUpload` 시그니처:
```tsx
<PhotoUpload
  pageId={...}
  photos={...}
  onChange={...}
  pathPrefix="photos" | "quote-photos" | ...
/>
```

Storage path: `${pathPrefix}/{uid}/{pageId}/${timestamp}-${nanoFile}.${ext}`

- profile-images: `profile-images/{uid}/profile/*` — pageId 고정 센티넬 `profile` (가독성 · 추후 확장 여지)
- work-photos: `work-photos/{uid}/{workCaseId}/*` — pageId=workCaseId

**note**: PhotoUpload가 `photos[]` 여러 장 지원하지만 before/after는 각각 1장씩 필요. 전략 2가지:

**A. PhotoUpload 2번 호출 · photos state 분리 (채택)**
```tsx
const [beforePhotos, setBeforePhotos] = useState<Photo[]>([]);
const [afterPhotos, setAfterPhotos] = useState<Photo[]>([]);

<PhotoUpload pageId={`${workCaseId}-before`} photos={beforePhotos} onChange={setBeforePhotos} pathPrefix="work-photos" maxPhotos={1} />
<PhotoUpload pageId={`${workCaseId}-after`} photos={afterPhotos} onChange={setAfterPhotos} pathPrefix="work-photos" maxPhotos={1} />
```

→ Storage path: `work-photos/{uid}/{workCaseId}-before/*` · `work-photos/{uid}/{workCaseId}-after/*`
→ 기존 PhotoUpload MAX_PHOTOS (3)을 상위 `maxPhotos` prop으로 override 필요 → PhotoUpload 수정 or 1장만 유지 검증 로직

**B. 단일 PhotoUpload with photos[0]=before, photos[1]=after (순서 강제)**
- UX 어색 (어느 게 Before인지 모호)

**채택: A** · PhotoUpload에 `maxPhotos` optional prop 추가 (default: MAX_PHOTOS=3).

### 3.4 PhotoUpload 확장 (M1)

```tsx
// components/editor/PhotoUpload.tsx (수정)
interface Props {
  pageId: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  pathPrefix?: string;
  /** v1.1b #3 provider-profile-editor — 단일 이미지 필드용 (before/after · profile). 기본 MAX_PHOTOS (3) */
  maxPhotos?: number;
}

// 내부에서 MAX_PHOTOS 상수 참조를 maxPhotos prop로 대체
```

---

## 4. API Specification

### 4.1 Server Actions

모두 `src/app/actions/provider-editor-actions.ts`.

#### `updateProfileBasic`

```ts
export interface UpdateProfileBasicInput {
  profileImage: Photo | null;         // null = 명시적 삭제 (기존 Storage 파일도 best-effort 제거)
  description: string | null;
  regions: ProviderRegion[];          // 1~5
  categories: QuoteCategory[];        // 1~6
  contactPhone: string | null;
}

> **null 의미 고정**: `profileImage: null`은 **명시적 삭제**를 의미한다. "기존 유지"는 클라이언트에서 폼 submit 전에 기존 값을 그대로 채워서 보내면 된다 (RHF defaultValues). 이로써 Server Action은 단순 replace 시맨틱을 유지하며, old Storage 파일은 path가 달라졌을 때 best-effort 삭제한다.

export async function updateProfileBasic(
  input: UpdateProfileBasicInput,
): Promise<ActionResult<{ providerId: string }>>;
```

**8-step**:
1. Zod `basicInfoSchema.parse(input)`
2. `verifySessionCookie` → uid
3. `userRepository.get(uid).providerId` guard → `FORBIDDEN`
4. providerRepository.get(providerId).profileImagePath (기존 path 읽기)
5. Firestore: `providers.doc(providerId).update({profileImage · profileImagePath · description · regions · categories · contactPhone · updatedAt: serverTimestamp()})`
6. 기존 profileImage와 다른 path면 old Storage file delete (try/catch)
7. `revalidatePath('/provider/profile')` + `revalidatePath(\`/providers/${providerId}\`)`
8. return `{ok:true, data:{providerId}}`

#### `upsertPriceBook`

```ts
export interface UpsertPriceBookInput {
  entries: ProviderPriceBookEntry[];  // 0~10
}

export async function upsertPriceBook(
  input: UpsertPriceBookInput,
): Promise<ActionResult<{ providerId: string; count: number }>>;
```

**5-step**:
1. Zod (entries array min 0 max 10)
2. auth + providerId guard
3. `providers.doc(providerId).update({priceBook: input.entries, updatedAt})`
4. `revalidatePath('/provider/profile')` + `revalidatePath(\`/providers/${providerId}\`)`
5. return `{ok:true, data:{providerId, count}}`

#### `createWorkCase`

```ts
export interface CreateWorkCaseInput {
  workCaseId: string;    // pre-issued nanoid
  category: QuoteCategory;
  sizeLabel: string;     // 1~40
  memo: string | null;   // max 200
  beforePhoto: Photo;
  afterPhoto: Photo;
}

export async function createWorkCase(
  input: CreateWorkCaseInput,
): Promise<ActionResult<{ workCaseId: string }>>;
```

**5-step**:
1. Zod
2. auth + providerId guard
3. `workCases.doc(workCaseId).create({providerId, category, sizeLabel, memo, beforePhoto, afterPhoto, completedAt: serverTimestamp(), createdAt: serverTimestamp()})` — `completedAt = now` (Plan §6.3 준수, 과거 소급 입력은 v1.1c 이후)
4. revalidatePath
5. return ok

#### `deleteWorkCase`

```ts
export async function deleteWorkCase(
  input: { workCaseId: string },
): Promise<ActionResult<{ workCaseId: string }>>;
```

**7-step**:
1. Zod `{workCaseId: z.string().min(10)}`
2. auth + providerId guard
3. workCase get → ownership verify (providerId === myProviderId) · 아니면 `FORBIDDEN`
4. Storage delete beforePhoto.path (try/catch)
5. Storage delete afterPhoto.path (try/catch)
6. workCases.doc(workCaseId).delete()
7. revalidatePath

### 4.2 Zod schemas (`src/domain/provider-editor-schema.ts`)

```ts
import { z } from "zod";
import { QUOTE_CATEGORIES, type QuoteCategory } from "./quote-category";
import { photoSchema } from "./quote-schemas";

const regionSchema = z.object({
  city: z.string().min(1).max(20),
  district: z.string().min(1).max(30),
});

export const basicInfoInputSchema = z.object({
  profileImage: photoSchema.nullable(),
  description: z.string().max(500).nullable(),
  regions: z.array(regionSchema).min(1, "지역 1개 이상").max(5, "최대 5개"),
  categories: z
    .array(z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]))
    .min(1, "카테고리 1개 이상")
    .max(6, "최대 6개"),
  contactPhone: z
    .string()
    .regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/, "전화번호 형식 오류")
    .nullable(),
});
export type BasicInfoInput = z.infer<typeof basicInfoInputSchema>;

export const priceBookEntrySchema = z.object({
  category: z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]),
  unit: z.enum(["per_visit", "per_month", "per_unit"]),
  unitLabel: z.string().min(1).max(40),
  basePrice: z.number().int().min(0).max(100_000_000),
});

export const upsertPriceBookInputSchema = z.object({
  entries: z.array(priceBookEntrySchema).min(0).max(10),
});
export type UpsertPriceBookInput = z.infer<typeof upsertPriceBookInputSchema>;

export const createWorkCaseInputSchema = z.object({
  workCaseId: z.string().regex(/^[a-z0-9]{16}$/, "유효하지 않은 작업 ID"),
  category: z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]),
  sizeLabel: z.string().min(1).max(40),
  memo: z.string().max(200).nullable(),
  beforePhoto: photoSchema,
  afterPhoto: photoSchema,
});
export type CreateWorkCaseInput = z.infer<typeof createWorkCaseInputSchema>;

export const deleteWorkCaseInputSchema = z.object({
  workCaseId: z.string().min(10),
});
```

### 4.3 providerRepository 확장

```ts
// src/lib/firebase/provider-repository.ts (추가)
export const providerRepository = {
  // ... 기존
  async update(
    id: string,
    patch: Partial<Provider>,
  ): Promise<void> {
    const ref = adminDb.collection("providers").doc(id);
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  },
};
```

### 4.4 workCaseRepository 확장

```ts
// src/lib/firebase/work-case-repository.ts (추가)
export const workCaseRepository = {
  // ... 기존 listByProvider
  async create(
    id: string,
    data: Omit<WorkCase, "id" | "createdAt">,
  ): Promise<void> {
    await col().doc(id).create({
      ...data,
      completedAt: Timestamp.fromDate(data.completedAt),
      createdAt: FieldValue.serverTimestamp(),
    });
  },
  async get(id: string): Promise<WorkCase | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toWorkCase(snap.id, snap.data()!);
  },
  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },
};
```

### 4.5 adminStorage helper

`src/lib/firebase/admin.ts`에 `adminStorage` export 추가 (deleteWorkCase에서 Storage file 삭제).

```ts
import { getStorage } from "firebase-admin/storage";
// ... initialize...
export const adminStorage = getStorage(app);

// 사용 예: adminStorage.bucket(bucketName).file(path).delete()
// bucketName: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 재활용
```

---

## 5. UI / UX Design

### 5.1 `/provider/profile` 전체 레이아웃

```
┌─────────────────────────────────────────────┐
│ [← 뒤로]                                     │  (optional · 현재 stub도 뒤로 없음)
│                                              │
│ 청명 프로필                     [로그아웃]      │  header (기존 stub과 유사)
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ 🎉 {companyName}                      │   │  Welcome bar (optional 유지)
│ │ 내 공개 프로필 보기 →                    │   │  /providers/{id} 링크
│ └──────────────────────────────────────┘   │
│                                              │
│ [기본정보] [서비스 단가] [포트폴리오]          │  Tabs (URL state)
│                                              │
│ ... (탭 내용) ...                             │
│                                              │
│ [받은 요청 보기 →] (옵션)                     │  기존 stub 하단 링크 유지
└─────────────────────────────────────────────┘
```

### 5.2 BasicInfoTab

```
┌─────────────────────────────────────────┐
│  프로필 사진                              │
│  ┌────┐ [+ 사진 추가]                    │  PhotoUpload maxPhotos=1
│  │    │                                 │
│  └────┘                                 │
│                                          │
│  소개글 (선택)                            │
│  ┌──────────────────────────────────┐   │
│  │ ...                              │   │  textarea max 500
│  └──────────────────────────────────┘   │
│  0 / 500                                 │
│                                          │
│  활동 지역 (1~5개)                        │
│  [x] 서울 강남구  [x] 서울 서초구           │  checkbox grid
│  [ ] 서울 마포구  [ ] 서울 종로구           │
│  ...                                     │
│                                          │
│  서비스 카테고리 (1~6개)                   │
│  [x] 🏠 입주청소  [x] 🏢 사무실청소          │
│  [x] ❄️ 에어컨    [ ] 🚚 이사                │
│  [ ] ✨ 특수      [ ] 📆 정기                │
│                                          │
│  연락처                                   │
│  [ 010-1234-5678 ]                       │
│                                          │
│  [       저장하기       ]                │
└─────────────────────────────────────────┘
```

### 5.3 PriceBookTab

```
┌─────────────────────────────────────────┐
│  서비스 단가 (최대 10개)                   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 입주청소 ▾  회당 ▾                │   │  1st entry
│  │ unitLabel: 25평 회당              │   │
│  │ basePrice: 200000 원    [삭제]    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 사무실청소 ▾ 월 구독 ▾              │   │  2nd entry
│  │ unitLabel: 50평 주 1회             │   │
│  │ basePrice: 420000 원    [삭제]    │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [ + 항목 추가 ]                         │  fields.length < 10 when enabled
│                                          │
│  [       저장하기       ]                │
└─────────────────────────────────────────┘
```

### 5.4 PortfolioTab

```
┌─────────────────────────────────────────┐
│  새 작업 업로드                           │
│  ┌──────────────────────────────────┐   │
│  │ Before                           │   │
│  │ ┌────┐ [+ 사진 추가]              │   │
│  │ │    │                           │   │
│  │ └────┘                           │   │
│  │                                  │   │
│  │ After                            │   │
│  │ ┌────┐ [+ 사진 추가]              │   │
│  │ │    │                           │   │
│  │ └────┘                           │   │
│  │                                  │   │
│  │ 카테고리 [ 입주청소 ▾ ]            │   │
│  │ 작업 설명 [ 32평 · 이사 전 ]       │   │
│  │ 메모 (선택) [ ... ]               │   │
│  │                                  │   │
│  │ [      업로드       ]            │   │
│  └──────────────────────────────────┘   │
│                                          │
│  최근 작업 3개                           │
│  ┌────┬────┐  ┌────┬────┐               │
│  │ B  │ A  │  │ B  │ A  │               │  WorkCaseCard grid
│  └────┴────┘  └────┴────┘               │
│   [삭제]       [삭제]                    │
└─────────────────────────────────────────┘
```

### 5.5 Component List

| Component | Type | Location |
|-----------|------|----------|
| `EditorBody` (Server) | Server | `app/provider/profile/page.tsx` 내부 |
| `ProfileEditorTabs` | Client | `components/provider-profile-editor/ProfileEditorTabs.tsx` |
| `BasicInfoTab` | Client | 동일 폴더 · RHF zodResolver |
| `PriceBookTab` | Client | 동일 폴더 · RHF useFieldArray |
| `PortfolioTab` | Client | 동일 폴더 · grid + upload 모드 |
| `WorkCaseUploadForm` | Client | 동일 폴더 · PhotoUpload × 2 + 폼 |
| `WorkCaseCard` | Client | 동일 폴더 · grid card + 삭제 버튼 |
| `PriceBookEntryRow` | Client | 동일 폴더 · useFieldArray row |
| `RegionCheckboxGrid` | Client | 동일 폴더 · FORM_REGION_OPTIONS |
| `CategoryCheckboxGrid` | Client | 동일 폴더 · QUOTE_CATEGORIES |

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 비로그인 /provider/profile | `/login?next=/provider/profile` redirect (proxy matcher) |
| provider role 없음 | `/signup-provider` redirect (페이지 레벨) |
| Storage 업로드 실패 | Client side 에러 · 폼 disable · retry 가능 |
| Zod 실패 | RHF inline error |
| Rate limit (없음 · v1 MVP) | — |
| deleteWorkCase 다른 provider 시도 | FORBIDDEN |
| upsertPriceBook 잘못된 entry | Zod 거부 |
| updateProfileBasic 동시 저장 (race) | Firestore last-write-wins · 무해 |

---

## 7. Security

- **Firestore rules `write:false`**: providers.update · workCases.write 유지 · Server Action Admin SDK 독점
- **Storage rules owner write**: uid 기반 (기존 PhotoUpload 패턴)
- **Ownership verify**: deleteWorkCase에서 workCase.providerId === userRepository.get(uid).providerId 검증
- **profileImage 교체 시 orphan**: best-effort 삭제 · Storage 비용 소량 증가 가능 (v1.1c cleanup job)
- **rate limit 없음**: 청명 전용 편집 · 악용 가능성 낮음 (v1.1c 검토 시 signup 패턴 재활용)
- **Zod 입력 검증**: 전 Server Action
- **CSRF**: Next.js Server Action 내장 보호

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation Server** | `app/provider/profile/page.tsx` |
| **Presentation Client** | `components/provider-profile-editor/*` (10개) · 기존 `components/editor/PhotoUpload.tsx` |
| **Application** | `app/actions/provider-editor-actions.ts` (4 Server Actions) |
| **Domain** | `domain/provider-editor-schema.ts` (Zod) · `QUOTE_CATEGORIES` · `FORM_REGION_OPTIONS` |
| **Infrastructure** | `providerRepository.update` (추가) · `workCaseRepository.create/get/delete` (추가) · `adminStorage` (신규 export) · `userRepository.get` (cache) |

---

## 9. Convention

- 컴포넌트 PascalCase
- utility kebab-case
- Server-only repositories
- Client: `"use client"`
- Import 순서: external → `@/...` → relative → type
- ARIA: form fields `label` · aria-invalid · Tab `aria-selected` · 삭제 버튼 `aria-label`

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── provider/profile/page.tsx              🔄 stub 완전 교체 (3-tab editor)
│   └── actions/
│       └── provider-editor-actions.ts         🆕 4 Server Actions
├── components/provider-profile-editor/        🆕 폴더
│   ├── ProfileEditorTabs.tsx                  🆕 Client · URL state
│   ├── BasicInfoTab.tsx                       🆕
│   ├── PriceBookTab.tsx                       🆕
│   ├── PortfolioTab.tsx                       🆕
│   ├── WorkCaseUploadForm.tsx                 🆕
│   ├── WorkCaseCard.tsx                       🆕
│   ├── PriceBookEntryRow.tsx                  🆕
│   ├── RegionCheckboxGrid.tsx                 🆕
│   └── CategoryCheckboxGrid.tsx               🆕
├── components/editor/PhotoUpload.tsx          🔄 maxPhotos prop 추가
├── domain/
│   └── provider-editor-schema.ts              🆕 Zod 4개
├── lib/firebase/
│   ├── provider-repository.ts                 🔄 `update()` 추가
│   ├── work-case-repository.ts                🔄 `create`, `get`, `delete` 추가
│   └── admin.ts                               🔄 `adminStorage` export 추가

storage.rules                                  🔄 profile-images + work-photos 블록 추가
firestore.rules                                (변경 없음)
firestore.indexes.json                         (변경 없음)
proxy.ts                                       (변경 없음 · /provider/profile 이미 인증 필요)
```

### 10.2 Implementation Order (7 steps)

1. **Storage rules 배포** + `adminStorage` export 추가
2. **Domain (Zod schemas)** + **Repositories 확장** (providerRepository.update · workCase CRUD)
3. **PhotoUpload `maxPhotos` prop 추가** (기존 파일 minor 수정)
4. **Server Actions 4개** (provider-editor-actions.ts)
5. **Tab components** (ProfileEditorTabs + BasicInfoTab + PriceBookTab + PortfolioTab shells)
6. **Form sub-components** (WorkCaseUploadForm · WorkCaseCard · PriceBookEntryRow · RegionCheckboxGrid · CategoryCheckboxGrid)
7. **`/provider/profile/page.tsx` stub 교체 + header/footer 유지 + Tab routing**

### 10.3 Pre-flight 체크리스트

- [ ] Storage rules 배포 (`profile-images` + `work-photos`)
- [ ] PhotoUpload maxPhotos prop 검증 (기존 3장 유스케이스 regression 없음)
- [ ] 청명 계정으로 /provider/profile 접속 · 3 탭 전환
- [ ] profileImage 업로드 → /providers/{id} 에 반영 확인
- [ ] priceBook 추가/삭제/수정 → reader 업데이트
- [ ] workCase 업로드 (Before+After) → WorkGallery 노출
- [ ] workCase 삭제 → grid + reader 에서 제거 · Storage 파일 확인 (삭제됨)
- [ ] 기본 정보 저장 → reader Meta/Hero 즉시 반영

---

## 11. Next.js 16 Specific

### 11.1 async searchParams

```tsx
export default function Page(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton/>}>
      <EditorBody searchParams={props.searchParams} />
    </Suspense>
  );
}
```

### 11.2 Cache Components

- page.tsx는 cookies() 호출 → Suspense 내부
- ProviderRepository.get은 cache() 아님 (editor는 최신 데이터 필요 · 매번 fresh)

### 11.3 revalidatePath

Server Action 성공 시:
- `/provider/profile` (editor shell 최신)
- `/providers/${providerId}` (reader · 공개 프로필)

```ts
import { revalidatePath } from "next/cache";
revalidatePath("/provider/profile");
revalidatePath(`/providers/${providerId}`);
```

---

## 12. Test Plan

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /provider/profile | /login redirect |
| 2 | provider role 없음 /provider/profile | /signup-provider redirect |
| 3 | BasicInfoTab · profileImage 업로드 | Storage + Firestore reflect |
| 4 | BasicInfoTab · description 500자 제한 | Zod 거부 |
| 5 | BasicInfoTab · regions 0개 선택 저장 시도 | Zod 거부 |
| 6 | PriceBookTab · 11번째 entry 추가 시도 | Zod 거부 · + 버튼 disable |
| 7 | PriceBookTab · basePrice 음수 | Zod 거부 |
| 8 | PortfolioTab · before/after 2장 + category + sizeLabel | workCases.create · WorkGallery 반영 |
| 9 | PortfolioTab · 1장만 업로드 후 submit | Zod 거부 (beforePhoto · afterPhoto 둘 다 required) |
| 10 | WorkCaseCard 삭제 | Firestore delete + Storage 파일 (best-effort) 제거 |
| 11 | 다른 provider의 workCase 삭제 URL 시도 | FORBIDDEN |
| 12 | 탭 URL `/provider/profile?tab=invalid` | basic fallback |
| 13 | revalidatePath after each action | reader + editor 최신 |
| 14 | 저장 후 새로고침 | 변경사항 유지 |
| 15 | PhotoUpload 기존 caller (quote-form, proposal-form) regression | `maxPhotos` prop 없이도 기존 MAX_PHOTOS=3 동작 유지 |
| 16 | workCase 업로드 중 Before 성공 + After 실패 | 폼 재시도 가능 · orphan Before 파일은 best-effort 허용 (v1.1c cleanup 검토) |
| 17 | profileImage 교체 시 old path | 새 path 업로드 성공 후 old Storage file delete (try/catch 실패 시 warn log) |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 8건 해소. 3-tab 완전 편집기 · 4 Server Actions · PhotoUpload maxPhotos prop 확장 · Storage rules profile-images/work-photos 블록 · revalidatePath 패턴 | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 피드백 반영: (1) `profileImage: null`을 명시적 삭제로 확정 + Q9 추가 (2) `completedDaysAgo` 필드 제거 · `completedAt = now` 고정 + Q10 추가 (3) profile-images pageId를 `profile` 센티넬로 변경 (4) tab fallback 타입 내로잉 수정 (5) `upsertPriceBook` · `updateProfileBasic`에 revalidatePath 스텝 명시 (6) Test Plan #15 (PhotoUpload regression) · #16 (orphan Before) · #17 (profileImage 교체 old path) 추가 | Seokho Lee |
