---
template: design
version: 0.1
feature: provider-profile
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-profile (reader) Design Document

> **Summary**: Figma 청명 프로필 상세 페이지 1:1 구현. `/providers/{id}` stub 대체. 7 섹션 (Hero·Name·Stats·PriceBook·WorkGallery·Reviews·CTA) + ♡ 즐겨찾기 + OG image + /quote/new?providerId= 통합. workCases + reviews 신규 top-level 컬렉션 (public read, admin write).
>
> **Plan**: [provider-profile.plan.md](../../01-plan/features/provider-profile.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** 히어로 이미지 없을 때 fallback | 업체명 이니셜 (한글 1글자) 큰 원형 배경. profileImage 있으면 `<Image>` 사용. 없으면 gradient 원형 + 이니셜 (Tailwind `from-indigo-500 to-indigo-700`) |
| **Q2** Before/After 1/4 indicator | v1 MVP는 **2-col grid simple** (Figma 대비 축소). horizontal scroll · dots indicator 는 v1.1c. Figma와 완벽 일치는 X지만 핵심 정보 (Before/After 쌍) 노출 충족 |
| **Q3** 리뷰 mask 로직 | `reviews.clientUid` 저장 · `maskClientName(uid, displayName)` util에서 `이*희` 형식 (2자 이름 → 가운데 1자 `*`). server-side `review-repository` 가 이미 mask 처리된 `clientMask` 필드 병합해 반환 |
| **Q4** OG image runtime | `nodejs` (Edge 미사용 · `firebase-admin` 호출 가능) |
| **Q5** Empty state 디자인 | 통일: 섹션 상단 제목 + 회색 박스 "아직 {항목}이 없어요 · 곧 추가됩니다" (중앙 정렬, py-8) |
| **Q6** Stats placeholder 형식 | 숫자 있으면: `78%` / `23분` / `412건`. 없으면: `—` (em-dash) 그리고 소제목에 "집계 준비중". 구조 유지 |
| **Q7** FavoriteButton 비로그인 허용 | YES · localStorage only · 로그인 유도 안 함 (UX 간결) |
| **Q8** providerId 없는 /quote/new 호출 | 기존 flow 유지 — searchParam 없으면 일반 폼, 있으면 category lock 모드 |

---

## 1. Overview

### 1.1 Design Goals
- Figma 1:1 7 섹션 렌더링 (빈 섹션도 empty state로 통일)
- 공개 URL `/providers/{id}` · SNS 공유 · OG image
- 견적 요청 전 신뢰성 평가에 필요한 모든 정보 한 페이지에 노출
- v1.1b #3 provider-profile-editor 가 데이터 채우면 자연스럽게 활성화

### 1.2 Design Principles
- **Public-first**: 로그인 없이도 읽기 가능 (receiver + SNS 공유)
- **Empty state UI 일관**: 섹션 구조 유지 · 데이터 없을 뿐
- **Server-first**: Hero·Stats·Price·Works·Reviews 전부 Server · Favorite·CTA만 Client
- **Seed-demo**: 청광 직영 청명 seed 확장으로 Figma 수준 데모 화면 즉시 확보
- **Reuse**: providerRepository · Next.js Image · lucide-react · Tailwind

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────┐
│ /providers/{id}  (Server shell + Suspense)             │
│  <ProviderProfileBody providerId=...>                  │
│   ├─ providerRepository.get(id) → notFound             │
│   ├─ workCaseRepository.listByProvider(id, 4) (parallel)│
│   ├─ reviewRepository.listByProvider(id, 3) (parallel)  │
│   └─ render:                                           │
│        <BackLink />                                    │
│        <ProviderHero provider={p} />         (Client)  │
│        <ProviderMeta provider={p} />         (Server)  │
│        <ProviderStats provider={p} />        (Server)  │
│        <PriceBookList entries={p.priceBook} />(Server)│
│        <WorkGallery cases={works} />         (Server)  │
│        <ReviewList reviews={reviews}         (Server)  │
│                    totalCount={p.reviewCount} />       │
│        <BottomCTA providerId={p.id} />       (Client)  │
└────────────────────────────────────────────────────────┘
                       │ 견적 요청하기 클릭
                       ▼
[/quote/new?providerId=X]
  QuoteForm에 provider 정보 prefetch + 상단 배지
  category lock (provider.categories[0])
  submit 시 notifiedProviderIds에 X 강제 포함
```

### 2.2 Data fetching 병렬

```ts
const [provider, workCases, reviews] = await Promise.all([
  providerRepository.get(providerId),
  workCaseRepository.listByProvider(providerId, 4),
  reviewRepository.listByProvider(providerId, 3),
]);
if (!provider) notFound();
```

provider 없으면 다른 쿼리도 의미 없지만 Promise.all로 총 레이턴시 축소. 실제로 Firestore에서 세 쿼리 병렬 ≈ max(get, list, list) ≈ 150~200ms P95.

### 2.3 Empty State 통일 컴포넌트

```tsx
// components/provider-profile/EmptySection.tsx
export function EmptySection({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-8 text-center dark:bg-zinc-900">
      <span className="mb-2 block text-3xl" aria-hidden>{icon}</span>
      <p className="text-sm text-zinc-500">아직 {title}이 없어요 · 곧 추가됩니다</p>
    </div>
  );
}
```

### 2.4 Server → Client boundary

- Server components 대부분
- Client: `ProviderHero` (♡ 상태 hydration), `BottomCTA` (router.push)
- Data는 Server에서 fetch → Server components로 전달 → `<ProviderHero>` `<BottomCTA>` 에는 primitive props (providerId string · 필요한 plain fields)만 전달

---

## 3. Data Model

### 3.1 신규 컬렉션: `workCases/{id}`

```ts
// src/types/work-case.ts (신규)
import type { QuoteCategory } from "@/domain/quote-category";
import type { Photo } from "@/types/page";

export interface WorkCase {
  id: string;
  providerId: string;
  category: QuoteCategory;
  sizeLabel: string;          // "32평" · "벽걸이 2" · "곰팡이"
  beforePhoto: Photo;
  afterPhoto: Photo;
  memo?: string;
  completedAt: Date;
  bookingId?: string;         // v1.3+ booking 자동 연결
  createdAt: Date;
}
```

### 3.2 신규 컬렉션: `reviews/{id}`

```ts
// src/types/review.ts (신규)
export interface Review {
  id: string;
  providerId: string;
  clientUid: string;          // Firebase Auth uid (또는 seed 값)
  bookingId?: string;
  rating: number;             // 1~5
  text: string;
  createdAt: Date;
  providerReply?: string;     // v2+ 답변
}

/** UI 노출용 — clientUid를 name mask 로 변환 */
export interface ReviewView extends Omit<Review, "clientUid"> {
  clientMask: string;         // "이*희", "박*수"
}
```

### 3.3 provider 확장 (기존 타입 재활용)

`providers` 문서에 기존 optional 필드 활용:
- `profileImage?`, `description?`, `yearsOfExperience?`, `verified?`, `insured`, `insuranceAmount?`, `rating?`, `reviewCount?`, `priceBook?`, `responseTimeHours?`

신규 시드 값:
- Stats 3지표용: `completedWorkCount?: number`, `repeatRate?: number`, `responseTimeMinutes?: number` (기존 `responseTimeHours` 대신 분 단위 권장 — 기존 미사용이므로 호환 OK)

### 3.4 Firestore Rules

```javascript
// workCases — 공개 read, admin write (v1.1b #3 provider-profile-editor가 Admin SDK로 write)
match /workCases/{id} {
  allow read: if true;
  allow write: if false;
}

// reviews — 공개 read, admin write (v2 review feature · 지금은 seed만)
match /reviews/{id} {
  allow read: if true;
  allow write: if false;
}
```

### 3.5 Firestore Indexes

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

## 4. Repositories

### 4.1 `work-case-repository.ts` (신규 · read-only)

```ts
import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { WorkCase } from "@/types/work-case";

const COLLECTION = "workCases";
const col = () => adminDb.collection(COLLECTION);

function toWorkCase(id: string, d: DocumentData): WorkCase {
  return {
    id,
    providerId: String(d.providerId),
    category: d.category,
    sizeLabel: String(d.sizeLabel),
    beforePhoto: d.beforePhoto,
    afterPhoto: d.afterPhoto,
    memo: d.memo,
    completedAt: (d.completedAt as Timestamp).toDate(),
    bookingId: d.bookingId,
    createdAt: (d.createdAt as Timestamp).toDate(),
  };
}

export const workCaseRepository = {
  async listByProvider(providerId: string, limit = 8): Promise<WorkCase[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toWorkCase(d.id, d.data()));
  },
};
```

### 4.2 `review-repository.ts` (신규 · read-only + mask util)

```ts
import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { ReviewView } from "@/types/review";

const COLLECTION = "reviews";
const col = () => adminDb.collection(COLLECTION);

/**
 * 이름 mask: 성 + 가운데 `*` + 마지막 글자 (3자)
 *           성 + `*` (2자)
 *           이름 없으면 `익명`
 */
function maskName(displayName: string | undefined): string {
  if (!displayName) return "익명";
  const s = displayName.trim();
  if (s.length === 0) return "익명";
  if (s.length === 2) return `${s[0]}*`;
  if (s.length === 1) return s;
  return `${s[0]}*${s[s.length - 1]}`;
}

async function resolveDisplayName(clientUid: string): Promise<string | undefined> {
  // v1 MVP: seed 값 (demo-client-1 같은 가짜 uid)은 별도 map으로 표시
  // 실제 Firebase Auth 사용자는 users 컬렉션 displayName 참조
  const snap = await adminDb.collection("users").doc(clientUid).get();
  const n = (snap.data()?.displayName as string | undefined) ?? undefined;
  return n;
}

export const reviewRepository = {
  async listByProvider(providerId: string, limit = 10): Promise<ReviewView[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    const names = await Promise.all(
      rows.map((r) => resolveDisplayName(String(r.data.clientUid))),
    );
    return rows.map(({ id, data }, i) => ({
      id,
      providerId: String(data.providerId),
      rating: Number(data.rating),
      text: String(data.text),
      bookingId: data.bookingId,
      createdAt: (data.createdAt as Timestamp).toDate(),
      providerReply: data.providerReply,
      clientMask: maskName(names[i]),
    }));
  },
};
```

### 4.3 Seed 전용 `displayName` 맵

seed-first-provider.mjs 에 `demoClient1`, `demoClient2` 같은 임시 uid 사용 + `users/{demoClient1}` doc 에 `displayName: '이희'` 같이 seed → `maskName` 이 `이*희` 로 변환. 실 uid와 분리되므로 안전.

---

## 5. UI / UX Design

### 5.1 페이지 레이아웃

```
┌────────────────────────────────────────────┐
│ ← 돌아가기                                   │
├────────────────────────────────────────────┤
│ ┌────────────────────┐ ♡                  │
│ │     히어로 이미지     │                   │  ProviderHero
│ │  (profileImage or   │                   │
│ │   이니셜 gradient)   │                   │
│ └────────────────────┘                    │
│                                             │
│ 새봄홈서비스  ✓ 배상보험 3억                 │  ProviderMeta
│ ★ 4.9 (127) · 서울 강남·서초 · 경력 4년     │
│                                             │
│ ┌──────┬──────┬──────┐                     │
│ │ 78%  │ 23분 │ 412건│                      │  ProviderStats
│ │재계약률│평균응답│완료작업│                   │
│ └──────┴──────┴──────┘                     │
│                                             │
│ 서비스 & 단가                                │  PriceBookList
│   입주청소 25평     20만~                    │
│   사무실 정기 주1    월 42만~                 │
│   에어컨 분해 1대    9만~                    │
│                                             │
│ Before · After     1 / 4                    │  WorkGallery
│ ┌────┬────┐   ┌────┬────┐                 │
│ │ B  │ A  │   │ B  │ A  │                 │
│ └────┴────┘   └────┴────┘                 │
│                                             │
│ 리뷰 127                                    │  ReviewList
│ 이*희 ⭐⭐⭐⭐⭐ "약속 시간 정확..."           │
│ 박*수 ⭐⭐⭐⭐⭐ "에어컨 분해청소..."          │
│                                             │
├────────────────────────────────────────────┤
│  💬 문의 (v1.2)     [ 견적 요청하기 → ]      │  BottomCTA (sticky)
└────────────────────────────────────────────┘
```

Note: 하단 bottom-tab-nav (v1.1b #1) 와 충돌 방지 — BottomCTA는 `sticky` 가 아닌 섹션 마지막에 inline 배치. `pb-[var(--bottom-nav-height)]` 이미 layout에서 적용됨.

### 5.2 ProviderHero (Client)

```tsx
"use client";
import Image from "next/image";
import { FavoriteButton } from "./FavoriteButton";
import type { Provider } from "@/types/provider";

interface Props { provider: Provider }

export function ProviderHero({ provider }: Props) {
  const initial = provider.companyName[0] ?? "?";
  return (
    <section className="relative aspect-[4/3] overflow-hidden rounded-2xl">
      {provider.profileImage ? (
        <Image
          src={provider.profileImage}
          alt={provider.companyName}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-7xl font-bold text-white">
          {initial}
        </div>
      )}
      <div className="absolute right-3 top-3">
        <FavoriteButton providerId={provider.id} />
      </div>
    </section>
  );
}
```

### 5.3 ProviderMeta (Server)

```tsx
// companyName + ✓ 배상보험 배지 · ★ rating (N) · region · 경력
// 2-line layout · insuranceAmount 억 단위 포맷
```

### 5.4 ProviderStats (Server)

```tsx
// 3 carto 카드 · 값 없으면 "—"
// 재계약률: Math.round(provider.repeatRate * 100) + "%"
// 평균 응답: provider.responseTimeMinutes + "분"
// 완료 작업: provider.completedWorkCount + "건"
// 각 카드 하단 caption "재계약률 / 평균 응답 / 완료 작업"
```

### 5.5 PriceBookList (Server)

```tsx
// provider.priceBook 빈 배열이면 EmptySection
// 각 row: category 라벨 (QUOTE_CATEGORY_LABELS) + unitLabel + basePrice + "만~"
// price 만원 단위 표기: 200000 → "20만"
```

### 5.6 WorkGallery (Server)

```tsx
// workCases 빈 배열이면 EmptySection
// 2-col grid · 각 카드 = before/after 2-col mini grid + category label + sizeLabel + date
// v1.1c: 클릭 시 확대 모달
```

### 5.7 ReviewList (Server)

```tsx
// reviews 빈 배열이면 EmptySection
// totalCount header · 3개 row · 각 row: clientMask + ★N + text (line-clamp 2) + date
// "더보기" 링크: v1.1c까지 생략 or "{totalCount}개 모두 보기" 링크 disabled
```

### 5.8 BottomCTA (Client)

```tsx
"use client";
import { MessageCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props { providerId: string }

export function BottomCTA({ providerId }: Props) {
  const router = useRouter();
  return (
    <div className="mt-8 flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-400 dark:border-zinc-700"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        문의
      </button>
      <button
        type="button"
        onClick={() => router.push(`/quote/new?providerId=${providerId}`)}
        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        견적 요청하기
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
```

### 5.9 FavoriteButton (Client · localStorage)

```tsx
"use client";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cheonggwang:favorites";

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function FavoriteButton({ providerId }: { providerId: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(readFavorites().includes(providerId));
  }, [providerId]);

  function toggle() {
    const list = readFavorites();
    const next = active
      ? list.filter((id) => id !== providerId)
      : [...list, providerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(!active);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur hover:bg-white"
    >
      <Heart
        className={`h-5 w-5 ${
          active ? "fill-rose-500 text-rose-500" : "text-zinc-700"
        }`}
        aria-hidden
      />
    </button>
  );
}
```

### 5.10 /quote/new providerId param 처리 (기존 페이지 수정)

```tsx
// src/app/quote/new/page.tsx
// SearchParams 확장: { category?: string; providerId?: string }
// providerId 있으면 providerRepository.get(providerId) 시도
// QuoteForm에 preferredProvider prop 추가 (optional)
```

`QuoteForm`:
- `preferredProvider` prop이 있으면:
  - 상단 배지 `🎯 {companyName}에게 우선 전달` (indigo 강조)
  - category default = `preferredProvider.categories[0]`
  - 다른 카테고리 선택 시 배지 disappears (토스트: "다른 카테고리 선택 시 다른 청명도 자동 매칭됩니다")
  - submit 시 input에 `preferredProviderId` 필드 포함

Server Action `submitQuoteRequest`:
- `preferredProviderId` 받으면 `listByCategory` 결과에 해당 providerId 강제 포함 (중복 dedup)
- `notifiedProviderIds`에 해당 id 맨 앞 배치 (우선 순위 시그널)

### 5.11 OG Image (`/providers/{id}/opengraph-image.tsx`)

```tsx
import { ImageResponse } from "next/og";
import { providerRepository } from "@/lib/firebase/provider-repository";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { providerId: string };

export default async function OG(props: { params: Promise<Params> }) {
  const { providerId } = await props.params;
  const provider = await providerRepository.get(providerId);
  const name = provider?.companyName ?? "청광 청명";
  const rating = provider?.rating ?? null;
  const region = provider?.regions?.[0]
    ? `${provider.regions[0].city} ${provider.regions[0].district}`
    : "전국";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: "#111" }}>
          {name}
        </div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#666" }}>
          {rating ? `★ ${rating}` : ""} · {region}
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#4f46e5" }}>
          청광 마켓플레이스
        </div>
      </div>
    ),
    { ...size },
  );
}
```

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| provider 없음 | notFound (Next.js 404) |
| workCases/reviews 쿼리 실패 | try/catch · 빈 배열로 fallback · EmptySection 렌더 |
| profileImage URL 만료 | Next.js Image fallback · onError → 이니셜 표시 (선택적 client handler) |
| providerId 잘못된 형식 | notFound (Firestore doc().get() 실패 시) |
| /quote/new?providerId=INVALID | providerRepository.get null → 일반 폼 fallback · 배지 없이 |

---

## 7. Security & Privacy

- **공개 페이지**: 로그인 없이 읽기 가능 · SEO 허용
- **contactPhone 노출 정책**: provider 입력 시 공개/비공개 선택 (v1.1b #3 profile-editor에서 toggle). v1 MVP는 일단 비공개 (표시 안 함). 견적 요청 flow가 연락처 수집
- **리뷰 clientUid masking**: UI 노출은 `이*희` mask · 원본 uid 유출 X
- **profileImage Storage**: 공개 URL (getDownloadURL 이미 public) — 전용 path `profile-images/{providerId}/...`
- **workCases Before/After 사진**: 고객이 허락한 케이스만 공개 · 업로드 시 동의 체크 (v1.1b #3)
- **리뷰 text 검열**: 현재 미구현 · 악성 리뷰는 v2+ 신고 시스템
- **OG image**: 공개 정보만 사용 (companyName · rating · region) · 내부 데이터 노출 없음

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation Server** | `app/providers/[providerId]/page.tsx` · `opengraph-image.tsx` · ProviderMeta · ProviderStats · PriceBookList · WorkGallery · ReviewList · EmptySection |
| **Presentation Client** | ProviderHero (FavoriteButton 포함) · BottomCTA · FavoriteButton |
| **Domain** | 기존 QUOTE_CATEGORY_LABELS · maskName util (review-repository 내부) |
| **Infrastructure** | work-case-repository (신규) · review-repository (신규) · providerRepository (기존) · userRepository (기존, cache된 것 재활용) |

의존 방향 정상 · Client 컴포넌트는 Domain 의존 X (purely UI).

---

## 9. Convention

- 컴포넌트 PascalCase · utility kebab-case
- Server-only: `import "server-only"` (repository)
- Client: `"use client"` (FavoriteButton · BottomCTA · ProviderHero)
- `components/provider-profile/` 폴더 응집
- ARIA: `aria-label`, `aria-pressed` (♡), `aria-hidden` (decorative icons)

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── providers/[providerId]/
│   │   ├── page.tsx                    🔄 stub 대체 (7 섹션)
│   │   └── opengraph-image.tsx         🆕 동적 OG
│   ├── provider/profile/page.tsx       🔄 "내 공개 프로필 보기" 링크 1줄
│   └── quote/new/page.tsx              🔄 providerId searchParam 처리 (3-4줄)
├── components/provider-profile/        🆕 폴더
│   ├── ProviderHero.tsx                🆕 Client
│   ├── ProviderMeta.tsx                🆕 Server
│   ├── ProviderStats.tsx               🆕 Server
│   ├── PriceBookList.tsx               🆕 Server
│   ├── WorkGallery.tsx                 🆕 Server
│   ├── ReviewList.tsx                  🆕 Server
│   ├── BottomCTA.tsx                   🆕 Client
│   ├── FavoriteButton.tsx              🆕 Client
│   └── EmptySection.tsx                🆕 Server (공용)
├── components/quote/
│   └── QuoteForm.tsx                   🔄 preferredProvider prop + 배지 + category lock
├── lib/firebase/
│   ├── work-case-repository.ts         🆕 read-only
│   └── review-repository.ts            🆕 read-only + maskName util
├── types/
│   ├── work-case.ts                    🆕
│   └── review.ts                       🆕
├── app/actions/
│   └── quote-actions.ts                🔄 submitQuoteRequest input에 preferredProviderId 추가
└── scripts/
    └── seed-first-provider.mjs         🔄 priceBook·workCases·reviews 확장 + users demo docs

firestore.rules                         🔄 workCases + reviews 공개 read 추가
firestore.indexes.json                  🔄 2 신규 indexes
proxy.ts                                (변경 없음 — /providers/* 는 public)
```

### 10.2 Implementation Order (7 steps)

1. **Types + Rules + Indexes 배포**: `work-case.ts`, `review.ts`, firestore.rules, firestore.indexes.json → 배포
2. **Repositories**: `work-case-repository.ts`, `review-repository.ts` (maskName 포함)
3. **Shared component**: `EmptySection.tsx`
4. **Profile sections (7)**: ProviderHero + ProviderMeta + ProviderStats + PriceBookList + WorkGallery + ReviewList + BottomCTA + FavoriteButton
5. **Routes**: `/providers/[providerId]/page.tsx` (Server shell + Suspense + Promise.all) · `opengraph-image.tsx`
6. **Integration**:
   - `/provider/profile` 에 "내 공개 프로필 보기 →" 링크
   - `/quote/new` 에 providerId searchParam 처리 + `QuoteForm` preferredProvider prop + `submitQuoteRequest` preferredProviderId 처리
7. **Seed 확장**: `seed-first-provider.mjs` — priceBook 3개 · workCases 3개 · reviews 2개 · users demo docs · rating 필드 + 실행

### 10.3 Pre-flight 체크리스트

- [ ] Firebase rules 배포 (workCases + reviews public read)
- [ ] Firestore indexes 빌드 완료 (1~3분)
- [ ] seed-first-provider.mjs 확장 후 재실행
- [ ] /providers/{firstProviderId} 접속 · 7 섹션 정상 렌더
- [ ] /providers/{firstProviderId}/opengraph-image.png 접속 · OG 이미지 정상
- [ ] /provider/profile · "내 공개 프로필 보기 →" 링크 클릭 · 자기 프로필 이동
- [ ] /providers/{id} → "견적 요청하기" 클릭 · /quote/new?providerId=X 이동 · 배지 확인

---

## 11. Next.js 16 Specific

### 11.1 async params

```tsx
// app/providers/[providerId]/page.tsx
export default function Page(props: { params: Promise<{ providerId: string }> }) {
  return (
    <Suspense fallback={<ProfileSkeleton/>}>
      <ProfileBody params={props.params} />
    </Suspense>
  );
}
```

### 11.2 OG image route

`opengraph-image.tsx` 는 Next.js 16에서 표준 metadata file convention. `ImageResponse` 사용.

### 11.3 Cache Components

provider 페이지는 dynamic (사용자별 favorite 상태 섞임 가능하지만 Client component만 localStorage 사용 · Server는 순수 public data) → **Partial Prerender 가능**. provider 데이터가 variable한 경우만 `revalidate` 설정 권장 (v1.1c).

v1 MVP는 기본 (매 요청 SSR or static + dynamic boundary 자동 결정).

---

## 12. Test Plan

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | /providers/{validId} · seed 청명 | 7 섹션 전부 데이터 채워진 상태 |
| 2 | /providers/{validId} · priceBook 빈 청명 | PriceBookList EmptySection |
| 3 | /providers/{invalidId} | notFound 404 |
| 4 | 비로그인 방문 | nav 숨김 (provider-profile reader는 공개 · bottom-tab-nav 는 role=null 시 hidden) |
| 5 | ♡ 클릭 | localStorage 저장 · 새로고침 유지 |
| 6 | 견적 요청하기 클릭 | /quote/new?providerId=X · 배지 · category default 확인 |
| 7 | /quote/new?providerId=invalid | 배지 없음 · 일반 폼 |
| 8 | /providers/{id}/opengraph-image.png | 동적 OG png 렌더 · companyName · rating |
| 9 | /provider/profile (청명 본인) | "내 공개 프로필 보기 →" 링크 확인 · 클릭 → 자기 /providers/{id} 이동 |
| 10 | 리뷰 mask | seed `이희` → `이*희` 표시 |
| 11 | workCases horizontal overflow | 2-col grid 유지 (v1 단순화) |
| 12 | Stats 없음 | "—" 표시 |
| 13 | seed 재실행 | idempotent · 중복 doc 안 생김 (seed 확장도 동일 가드) |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 8건 해소. 7 섹션 컴포넌트 · workCases/reviews 컬렉션 + maskName · OG image · providerId param quote-new 통합 · seed 확장 · 7-step 구현 순서 | Seokho Lee |
