---
template: plan-plus
version: 0.1
feature: provider-profile
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 프로필 상세 (provider-profile · reader)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #9 (v1.1b #2)
> 선행: bottom-tab-nav (v1.1b #1 · Match 99% archived)
> 다음: `/pdca design provider-profile`

---

## 1. User Intent Discovery

### 1.1 배경
v1.1 마켓 루프 폐쇄 + v1.1b bottom-tab-nav shell 완성 후 Figma 완성도 최종 조각 중 하나. 받은견적 페이지 `QuoteCompareCard` 의 "청명 이름 클릭" 링크 타겟이 현재 stub `/providers/{id}` (기본 정보만) → 제대로 된 상세 페이지로 교체. 의뢰인이 청명을 깊이 있게 평가할 수 있어야 수락 결정이 신뢰성 있게 작동.

### 1.2 핵심 목적
**Figma 청명 프로필 상세 1:1 구현 · 공개 URL**
- 히어로 + ♡ 즐겨찾기 · 업체명 + 배상보험 배지 · ★ 평점
- Stats 3지표 (재계약률·응답시간·완료 작업) — 집계 placeholder
- 서비스 & 단가 (priceBook)
- Before/After 갤러리 (workCases)
- 리뷰 (reviews)
- Bottom CTA: 문의 (v1.2 disabled) · 견적 요청하기 (providerId 우선 매칭)

### 1.3 타겟 사용자
- **1차**: 의뢰인 (받은견적 카드에서 청명 평가)
- **2차**: 청명 (자기 공개 프로필 미리보기 · "내 프로필 보기" 링크)
- **3차**: 공개 링크 (SNS 공유 · OG 카드)

### 1.4 MVP 경계
- ✅ 7 섹션 (Hero · Name+Badge · Stats · Price · Works · Reviews · CTA)
- ✅ Figma 충실 · 빈 섹션도 empty state UI 렌더 (Recommended 선택)
- ✅ ♡ 즐겨찾기 (localStorage only · Firestore 추후 동기화)
- ✅ `scripts/seed-first-provider.mjs` 확장 (priceBook 3~5 · workCases 3~4 · reviews 2~3 · rating 4.9 등)
- ✅ `opengraph-image.tsx` 선드 (업체명·평점 기반 동적 OG)
- ✅ 청명 `/provider/profile` 에 "내 공개 프로필 보기 →" 링크 추가
- ✅ `/quote/new?providerId=X` 처리 (폼이 해당 청명 category 추천 + notifiedProviderIds 우선 포함)
- ❌ 실시간 onSnapshot
- ❌ 리뷰 작성 (v2 review)
- ❌ workCases 업로드 (provider-profile-editor v1.1b #3)
- ❌ 문의 버튼 실 동작 (chat v1.2)
- ❌ 즐겨찾기 Firestore 동기화 (v2+ 선호 시)
- ❌ Stats 실 집계 (v2+ batch)
- ❌ 청명찾기 리스트/지도 (provider-search v1.2)
- ❌ Before/After 모달 확대 보기 (v1.1c)

### 1.5 성공 기준
- 받은견적 비교 페이지 → 청명 이름 클릭 → 상세 페이지 3초 내 로딩
- `/providers/{id}` 공개 URL SNS 공유 시 OG 카드 정상 노출
- 청명 자기 프로필 URL 복사 → 외부 공유 가능
- 견적 요청하기 → /quote/new 이동 시 청명 category 우선 매칭 확인
- 첫 청명 seed 확장 후 Figma 완성도 ≥ 85% (숫자 데이터 주요 섹션 채워짐)

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **Figma 전체 7 섹션 + 빈 섹션 empty state** | **채택** |
| B | 데이터 있는 섹션만 | 기각 (Figma 명부종) |
| C | 기본정보 + CTA (stub 수준) | 기각 (가치 낮음) |

A의 이점: Figma 1:1 · empty state UI 구현 후 데이터 채워지면 자연스럽게 활성 · 신뢰감 일관. workCases/reviews 비어도 "청명이 곧 추가할 예정" 안내 가능.

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (13개)
1. `/providers/{id}/page.tsx` — 7 섹션 Server 컴포넌트
2. `ProviderHero` (히어로 + ♡ 즐겨찾기 Client)
3. `ProviderStats` (3 지표 카드 · placeholder dash)
4. `PriceBookList` (서비스 & 단가)
5. `WorkGallery` (Before/After 갤러리 · workCases subcollection)
6. `ReviewList` (리뷰 · reviews subcollection)
7. `BottomCTA` (문의 disabled · 견적 요청하기)
8. `FavoriteButton` (localStorage)
9. `/providers/{id}/opengraph-image.tsx` (동적 OG · Figma 유사 · 업체명 + 평점)
10. `/provider/profile` 에 "내 공개 프로필 보기 →" 링크
11. `/quote/new?providerId=X` URL param 처리 + provider 배지 + category 추천
12. `work-case-repository.ts`, `review-repository.ts` read-only
13. `seed-first-provider.mjs` 확장 (priceBook 3·workCases 3·reviews 2·rating 4.9 + 필드)

### 3.2 Out of Scope → v1.1c+
| 항목 | 이동 이유 |
|------|----------|
| workCases 업로드 UI | provider-profile-editor (v1.1b #3) |
| 리뷰 작성 | v2 review |
| 문의 실 동작 | chat (v1.2) |
| 즐겨찾기 Firestore sync | v2+ preferences |
| Stats 실 집계 (재계약률·응답시간·완료) | v2+ analytics-batch |
| Before/After 확대 모달 | v1.1c |
| 청명 프로필 `/p/{slug}` merge | 별도 migration |
| 공유 URL 단축 | v2+ |

### 3.3 기존 기능 영향
- `/providers/{id}/page.tsx` 기존 stub **완전 대체**
- `/provider/profile` 페이지에 링크 1줄 추가
- `/quote/new` 페이지 **providerId searchParam 추가** · QuoteForm에 provider 배지 + category 우선 매칭 로직
- seed-first-provider.mjs 확장 (추가 필드 · 서브컬렉션 create)
- Firestore rules: `workCases`, `reviews` public read + admin-only write 추가
- Firestore indexes: 2 신규 (workCases by providerId+completedAt · reviews by providerId+createdAt)
- 즐겨찾기는 localStorage만 (스키마 변경 X)

---

## 4. Architecture

### 4.1 스택
- Next.js 16 (async params + Cache Components)
- Firestore Admin SDK (repository)
- lucide-react · Tailwind
- localStorage (favorite · Client)

### 4.2 파일 구조

```
src/
├── app/
│   ├── providers/[providerId]/
│   │   ├── page.tsx                    🔄 stub 대체
│   │   └── opengraph-image.tsx         🆕 동적 OG
│   ├── provider/profile/page.tsx       🔄 "내 공개 프로필" 링크
│   └── quote/new/page.tsx              🔄 providerId searchParam 처리
├── components/provider-profile/        🆕
│   ├── ProviderHero.tsx                🆕 Client (♡ 즐겨찾기 포함)
│   ├── ProviderStats.tsx               🆕 Server
│   ├── PriceBookList.tsx               🆕 Server
│   ├── WorkGallery.tsx                 🆕 Server (Before/After)
│   ├── ReviewList.tsx                  🆕 Server
│   ├── BottomCTA.tsx                   🆕 Client
│   └── FavoriteButton.tsx              🆕 Client (localStorage)
├── components/quote/
│   └── QuoteForm.tsx                   🔄 providerId prop + 배지 + category lock
├── lib/firebase/
│   ├── work-case-repository.ts         🆕 read-only
│   └── review-repository.ts            🆕 read-only (v1 seed 용)
├── types/
│   ├── work-case.ts                    🆕
│   └── review.ts                       🆕
└── scripts/
    └── seed-first-provider.mjs         🔄 priceBook·workCases·reviews 확장

firestore.rules                         🔄 workCases + reviews public read
firestore.indexes.json                  🔄 2 신규 indexes
```

### 4.3 라우팅 · 데이터 흐름

```
받은견적 상세 → "새봄홈서비스 →" 클릭
     ↓
/providers/{providerId} (Server shell + Suspense)
     ↓
ProviderBody:
  providerRepository.get(id) → notFound if null
  workCaseRepository.listByProvider(id, limit=4)
  reviewRepository.listByProvider(id, limit=3)
  → Hero (image · ♡) · Name+Badge · ★Rating · Stats · PriceBookList · WorkGallery · ReviewList · BottomCTA
  
BottomCTA "견적 요청하기" → /quote/new?providerId={id}
     ↓
QuoteForm:
  providerId searchParam 있으면 providerRepository.get(id)
  → 청명 배지 "이 청명에게 우선 전달" 표시
  → category select default = provider.categories[0]
  → submit 시 notifiedProviderIds에 id 강제 포함
```

### 4.4 데이터 모델

```ts
// types/work-case.ts (신규)
export interface WorkCase {
  id: string;
  providerId: string;
  category: QuoteCategory;
  sizeLabel: string;           // "32평", "벽걸이 2"
  beforePhoto: Photo;
  afterPhoto: Photo;
  memo?: string;
  completedAt: Date;
  bookingId?: string;          // v1.3+ 자동 링크
  createdAt: Date;
}

// types/review.ts (신규)
export interface Review {
  id: string;
  providerId: string;
  clientUid: string;           // mask로 표시 (이*희)
  bookingId?: string;          // v1.3+
  rating: number;              // 1-5
  text: string;
  createdAt: Date;
  providerReply?: string;      // v2+ 답변
}
```

### 4.5 Firestore 구조 결정

**Option A**: `workCases/{id}`, `reviews/{id}` top-level 컬렉션
**Option B**: `providers/{id}/workCases/{id}`, `providers/{id}/reviews/{id}` subcollection

**채택: A (top-level)**
- 이유: 향후 cross-provider 쿼리 (예: "전체 플랫폼 최근 작업 N건") 용이 · collectionGroup 쿼리 복잡 회피
- providerId 필드로 필터링

---

## 5. Firestore 추가 Rules/Indexes

### 5.1 Rules

```javascript
match /workCases/{id} {
  allow read: if true;      // 공개 — 프로필에서 노출
  allow write: if false;    // Admin SDK (provider-profile-editor v1.1b #3)
}

match /reviews/{id} {
  allow read: if true;      // 공개
  allow write: if false;    // Admin SDK (v2 review feature)
}
```

### 5.2 Indexes

```json
[
  {
    "collectionGroup": "workCases",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "providerId", "order": "ASCENDING" },
      { "fieldPath": "completedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "reviews",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "providerId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
]
```

---

## 6. 주요 플로우

### 6.1 상세 페이지 로딩 (/providers/{id})
1. async params → providerId
2. Server fetch: provider + workCases (limit 4) + reviews (limit 3) → Promise.all
3. provider null → notFound
4. 7 섹션 렌더 (각 섹션 데이터 없으면 empty state)
5. Client hydration: FavoriteButton (localStorage 읽기)
6. BottomCTA: 견적 요청하기 → router.push(`/quote/new?providerId=${id}`)

### 6.2 /quote/new providerId 파라미터 처리
1. searchParam `providerId` 읽기
2. `providerRepository.get(providerId)` → null이면 무시 (일반 폼으로)
3. 있으면 QuoteForm에 provider 정보 prop 전달
4. 폼 상단 배지: `🎯 새봄홈서비스에게 우선 전달`
5. category default = provider.categories[0]
6. submit 시 `submitQuoteRequest` input에 `preferredProviderId` 필드 → Server Action에서 notifiedProviderIds에 강제 포함

### 6.3 OG 이미지 (opengraph-image.tsx)
```tsx
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }) {
  const { providerId } = await params;
  const provider = await providerRepository.get(providerId);
  return new ImageResponse(
    <div style={{...}}>
      <h1>{provider?.companyName ?? '청광'}</h1>
      <p>★ {provider?.rating ?? '-'} · {provider?.regions[0]?.district}</p>
    </div>,
    { ...size }
  );
}
```

### 6.4 즐겨찾기 (localStorage)
- key: `cheonggwang:favorites`
- value: `JSON.stringify(string[])` (providerId 배열)
- FavoriteButton hydration 시 localStorage 읽어 active 상태 결정
- 클릭 시 배열에 add/remove + localStorage.setItem

---

## 7. Seed Data 확장 (scripts/seed-first-provider.mjs)

```js
// 기존 provider + 아래 필드 추가
rating: 4.9,
reviewCount: 127,
yearsOfExperience: 4,
insured: true,
insuranceAmount: 300_000_000,  // 3억
verified: true,
profileImage: null,
description: '친환경 약품·꼼꼼한 마무리로 4년간 역삼·논현 지역 고객분들께 신뢰받고 있습니다.',
priceBook: [
  { category: 'move-in', unit: 'per_visit', unitLabel: '회당', basePrice: 200000 },
  { category: 'office', unit: 'per_month', unitLabel: '주 1회', basePrice: 420000 },
  { category: 'aircon', unit: 'per_unit', unitLabel: '1대 기준', basePrice: 90000 },
],

// workCases 서브데이터 seed
const workCases = [
  { category: 'move-in', sizeLabel: '32평', completedAt: <7 days ago>, memo: '이사 전 입주청소' },
  { category: 'aircon', sizeLabel: '벽걸이 2', completedAt: <10 days ago> },
  { category: 'office', sizeLabel: '50평', completedAt: <14 days ago> },
];
// 각각 workCases 컬렉션에 create (before/after photos는 plausible URL or placeholder)

// reviews seed
const reviews = [
  { rating: 5, text: '약속 시간 정확, 마무리 꼼꼼. 베란다 물때까지 다 없어져서 깜짝 놀랐어요.', createdAt: <3 days ago>, clientMask: '이*희' },
  { rating: 5, text: '에어컨 분해청소 2대 맡겼는데 물이 시커멓게 나오더라고요 😅 설치도 깔끔히 해주셨습니다.', createdAt: <10 days ago>, clientMask: '박*수' },
];
```

### 7.1 주의
- clientUid는 실제 Firebase Auth UID가 아닌 `demo-client-1`, `demo-client-2` 같은 문자열 (seed 전용)
- clientMask는 UI 표시용 · 실제 review entity에는 clientUid만 저장하고 UI에서 mask 처리 (v2에서 mask util 추출)

---

## 8. Open Questions (Design 단계)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | 히어로 이미지 없을 때 fallback | 업체명 이니셜 큰 원형 (FavoriteButton 영역 유지) |
| Q2 | Before/After 1/4 indicator (Figma) | dots · horizontal scroll snap + 썸네일 4개 (v1 MVP는 2-col grid로 단순화) |
| Q3 | 리뷰 mask 로직 | UI 레벨에서 `clientMask` prop · 서버는 clientUid 저장 |
| Q4 | OG image runtime | nodejs (기존 quote-request pattern 일관) |
| Q5 | empty state 디자인 | 섹션별 통일 (아이콘 + "아직 X가 없어요 · 곧 추가됩니다") |
| Q6 | Stats 3지표 placeholder 형식 | "- / 지표 준비중" or "—" (Design에서 확정) |
| Q7 | FavoriteButton 비로그인 허용 | YES · localStorage만 · 로그인 유도 없음 (UX 간결) |
| Q8 | providerId 없는 /quote/new 호출 | 기존 flow 유지 (searchParam 없으면 일반 폼) |

---

## 9. Brainstorming Log

### Phase 1
- 스코프 A (전체 섹션) 채택
- Seed 확장 (Figma 유사 demo 데이터)
- CTA: 견적 요청하기 → providerId param

### Phase 2
- 전체 섹션 + empty state 채택

### Phase 3 YAGNI
- MVP 13 항목 확정
- ♡·Stats placeholder·OG·청명 프로필 링크 전부 포함

### Phase 4
- 아키텍처 · 파일 구조 · TX 없음 (read-only) 승인

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. 7 섹션 전체 구현. MVP 13 / Out-of-scope 8. workCases + reviews top-level 컬렉션 · public read · admin-only write. seed-first-provider 확장. providerId param quote-new 통합. OG image. 즐겨찾기 localStorage | Seokho Lee |
