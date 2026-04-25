---
template: design
version: 1.2
feature: quote-request
date: 2026-04-20
author: Seokho Lee
project: cheonggwang (firebase-next-app)
version-proj: 0.1.0
---

# quote-request Design Document

> **Summary**: 의뢰인이 카테고리별 청소 견적을 요청해 청광 매칭 청명에게 이메일로 전달되는 MVP submit 플로우. Marketplace Track의 첫 feature.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Author**: Seokho Lee
> **Date**: 2026-04-20
> **Status**: Draft
> **Planning Doc**: [quote-request.plan.md](../../01-plan/features/quote-request.plan.md)
> **Vision**: [marketplace.md](../../00-vision/marketplace.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **OQ1 이메일 HTML 템플릿** | Resend inline-CSS HTML. 헤더 · 요약표 · 사진 링크 리스트 · 전화/이메일 CTA. §8.3 전체 HTML 명세 |
| **OQ2 사진 Storage path** | **Pre-issued requestId**: 폼 마운트 시 `nanoid()`로 선발급 → `quote-photos/{uid}/{requestId}/...`에 업로드 → 제출 시 같은 ID로 Firestore doc create |
| **OQ3 지역 드롭다운 preset** | **promo-feed의 `RegionSelect.tsx` 그대로 재사용**. 14개 프리셋 (서울 6·부산 2·대구 1·인천 1·경기 3·기타) |
| **OQ4 카테고리 아이콘** | **이모지** (🏠 🏢 ❄️ 🚚 ✨ 📆) — MVP 빠른 구현. v1.1에 lucide-react 도입 시 통일 |
| **OQ5 `/discover` redirect** | `next.config.ts` `redirects()` 에 `/` → `/discover` **없음** (현재 홈은 / 교체, 기존 URL은 404 수용 — 프리프로덕션이라 사용자 영향 0) |

---

## 1. Overview

### 1.1 Design Goals
- 2분 내 견적 제출 완료 (홈 → 카테고리 → 제출)
- 기존 자산(PhotoUpload, RegionSelect, Server Action 패턴) 최대 재사용
- 첫 청명 시드 1건만으로 전체 루프 동작 검증 가능
- Next.js 16 네이티브 패턴 유지

### 1.2 Design Principles
- **Server-first**: 폼 검증·저장·이메일 발송 전부 Server Action
- **Graceful email failure**: 이메일 발송 실패가 Firestore 저장을 막지 않음 (try/catch)
- **Pre-issued id**: 사진 업로드와 Firestore 저장의 id 일관성
- **Small-data-first**: providers ≤ 10, quoteRequests ≤ 500 규모 전제
- **Reuse over rewrite**: PhotoUpload·RegionSelect·errors.ts 기존 구조 그대로

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────────────┐
│ / (MarketplaceHome — Server)                              │
│  └─ Category Grid (6) — 카드 클릭 → /quote/new?category=X │
└───────────────────────────────────────────────────────────┘
                         │ (로그인 없으면 proxy가 /login으로)
                         ▼
┌───────────────────────────────────────────────────────────┐
│ /quote/new?category=X (QuoteNewPage — Server)             │
│  └─ <QuoteForm initialCategory={X} requestId={preIssued}/>│
│      (Client, RHF + zodResolver, PhotoUpload 재사용)       │
└───────────────────────────────────────────────────────────┘
                         │ form submit
                         ▼
[Server Action: submitQuoteRequest(input)]
  1. verifySessionCookie → clientUid
  2. rateLimit.checkAndIncrement(`quote:${uid}`, 5/hour)
  3. Zod 검증 (quoteRequestInputSchema)
  4. ensureClientRole(clientUid)
     → users/{uid}.roles 배열에 'client' merge
  5. providerRepository.listByCategory(category)
  6. quoteRequestRepository.create(requestId, payload)
  7. Promise.allSettled(providers.map(sendQuoteEmail))
     → 실패는 log만, 저장은 성공 유지
  8. quoteRequestRepository.update(requestId, { notifiedProviderIds })
  9. return { ok: true, requestId }
                         │
                         ▼
[redirect → /quote/thanks?id=...]
  → 요약 + "청명이 곧 연락드립니다"

                         ┆
                    (side effect)
                         ▼
┌───────────────────────────────────────────┐
│ Resend API (https://api.resend.com/emails)│
│ 청명 contactEmail → HTML 이메일 발송         │
└───────────────────────────────────────────┘
```

### 2.2 Route 배치

| 경로 | 타입 | 기존 → 변경 |
|------|------|------------|
| `/` | Server Component | **promo-feed → 마켓플레이스 홈** (교체) |
| `/discover` | Server Component | **신규** (기존 promo-feed 내용 이전) |
| `/quote/new` | Server Component | **신규** |
| `/quote/thanks` | Server Component | **신규** |
| `/p/[slug]` | 유지 | 청명 프로필 페이지 용도로 v1.1 재해석 |
| `/login`, `/dashboard`, `/editor/*` | 유지 | 변경 없음 |

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `MarketplaceHome` | `tryVerifySessionCookie` | auth-aware CTA |
| `QuoteForm` (Client) | `react-hook-form`, `@hookform/resolvers`, `zod`, `PhotoUpload`, `RegionSelect` | 폼 + 검증 + 사진 + 지역 |
| `submitQuoteRequest` | `quoteRequestRepository`, `providerRepository`, `userRoles`, `quoteEmail`, `rateLimit` | 통합 유스케이스 |
| `quoteEmail` | Resend REST (`fetch`), `QuoteEmailTemplate` | HTML 생성 + 발송 |
| `seed-first-provider.mjs` | `firebase-admin` | 첫 청명 Firestore 시드 |

### 2.4 proxy.ts 업데이트
```ts
export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*", "/quote/:path*"],
};
```

---

## 3. Data Model

### 3.1 `providers/{providerId}` (Firestore)

```typescript
// src/types/provider.ts (신규)
export interface Provider {
  id: string;
  ownerUid: string;
  companyName: string;
  categories: QuoteCategory[];
  regions: { city: string; district: string }[];
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  isCheonggwangOwned: boolean;
  insured: boolean;
  pageId: string | null;
  rating: number | null;
  responseTimeHours: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 `quoteRequests/{requestId}` (Firestore)

```typescript
// src/types/quote-request.ts (신규)
export type QuoteStatus = 'submitted' | 'responded' | 'cancelled' | 'completed';

export interface QuoteRequest {
  id: string;
  clientUid: string;
  category: QuoteCategory;
  region: { city: string; district: string };
  size: number | null;
  preferredDate: Date | null;
  contactPhone: string;
  photos: Photo[];  // 기존 promo-page Photo 타입 재사용
  note: string | null;
  notifiedProviderIds: string[];
  status: QuoteStatus;
  createdAt: Date;
}
```

### 3.3 `users` 확장

```typescript
// src/types/page.ts (기존 UserProfile에 roles 추가)
export type UserRole = 'client' | 'provider';

export interface UserProfile {
  // ... 기존 필드
  roles?: UserRole[];   // 최초 견적 제출 시 'client' 자동 추가
}
```

### 3.4 QuoteCategory enum

```typescript
// src/domain/quote-category.ts (신규)
export type QuoteCategory =
  | 'move-in'
  | 'office'
  | 'aircon'
  | 'move-out'
  | 'special'
  | 'regular';

export const QUOTE_CATEGORIES: readonly QuoteCategory[] = [
  'move-in', 'office', 'aircon', 'move-out', 'special', 'regular',
] as const;

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  'move-in':  '입주청소',
  'office':   '사무실청소',
  'aircon':   '에어컨청소',
  'move-out': '이사청소',
  'special':  '특수청소',
  'regular':  '정기청소',
};

export const QUOTE_CATEGORY_SUBTITLES: Record<QuoteCategory, string> = {
  'move-in':  '이사 전·후',
  'office':   '주1·격주·월1',
  'aircon':   '분해 청소',
  'move-out': '쓰레기 정리',
  'special':  '곰팡이·해충',
  'regular':  '월 구독',
};

export const QUOTE_CATEGORY_EMOJIS: Record<QuoteCategory, string> = {
  'move-in':  '🏠',
  'office':   '🏢',
  'aircon':   '❄️',
  'move-out': '🚚',
  'special':  '✨',
  'regular':  '📆',
};

export function isQuoteCategory(v: string): v is QuoteCategory {
  return (QUOTE_CATEGORIES as readonly string[]).includes(v);
}
```

### 3.5 Firestore 보안 규칙 (추가)

기존 `firestore.rules` 내 `service cloud.firestore > match /databases/{db}/documents` 블록에 추가:

```javascript
// ─── providers (공개 read, Admin write) ─────────────────
match /providers/{providerId} {
  allow read: if true;
  allow write: if false;
}

// ─── quoteRequests (owner read, owner create only) ─────
match /quoteRequests/{requestId} {
  allow read: if request.auth != null
              && resource.data.clientUid == request.auth.uid;
  allow create: if request.auth != null
                && request.resource.data.clientUid == request.auth.uid
                && request.resource.data.status == 'submitted';
  allow update: if false;
  allow delete: if false;
}
```

### 3.6 Storage 규칙 (추가)

기존 `storage.rules`에 추가:

```javascript
match /quote-photos/{uid}/{requestId}/{fileName} {
  allow read: if false;   // getDownloadURL 토큰으로 접근
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```

### 3.7 Firestore 인덱스 (추가)

```json
{
  "collectionGroup": "quoteRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "clientUid", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 4. API Specification

### 4.1 Server Action `submitQuoteRequest`

```ts
// src/app/actions/quote-actions.ts
'use server';

export interface SubmitQuoteRequestInput {
  requestId: string;             // pre-issued nanoid
  category: QuoteCategory;
  region: { city: string; district: string };
  size: number | null;
  preferredDate: string | null;  // ISO date (client sends string)
  contactPhone: string;
  photos: Photo[];
  note: string | null;
}

export async function submitQuoteRequest(
  input: SubmitQuoteRequestInput
): Promise<ActionResult<{ requestId: string }>>;
```

**처리 단계** (Plan §6.1 플로우 구현):
1. `verifySessionCookie` → `clientUid` (실패 시 401)
2. `rateLimit.checkAndIncrement('quote:' + clientUid, 5, 60 * 60 * 1000)` — 1시간 내 5건 제한 (기존 `rate-limit.ts` bucket 파라미터 확장)
3. `quoteRequestInputSchema.parse(input)` — Zod
4. `ensureClientRole(clientUid)` — Admin SDK로 `users/{uid}.roles` merge
5. `providerRepository.listByCategory(category)` — providers where categories array-contains
6. `quoteRequestRepository.create(input.requestId, { ...input, clientUid, notifiedProviderIds: [], status: 'submitted' })`
7. `Promise.allSettled(providers.map(p => sendQuoteEmail(p, request, photoUrls)))` — 실패는 warn log
8. `quoteRequestRepository.update(input.requestId, { notifiedProviderIds: successfulIds })`
9. `return { ok: true, data: { requestId } }`

**Error mapping**:
| Code | HTTP | 상황 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 세션 없음 |
| `RATE_LIMITED` | 429 | 5건/시간 초과 |
| `INVALID_INPUT` | 400 | Zod 실패 |
| `INTERNAL_ERROR` | 500 | Firestore 오류 |

### 4.2 Zod Schema

```ts
// src/domain/quote-schemas.ts (신규)
import { z } from 'zod';
import { QUOTE_CATEGORIES } from './quote-category';

export const regionSchema = z.object({
  city: z.string().min(1).max(20),
  district: z.string().min(1).max(30),
});

export const quoteRequestInputSchema = z.object({
  requestId: z.string().regex(/^[a-z0-9]{16}$/, '유효하지 않은 요청 ID'),
  category: z.enum(QUOTE_CATEGORIES as readonly [string, ...string[]]),
  region: regionSchema,
  size: z.number().int().positive().max(500).nullable(),
  preferredDate: z.string().datetime().nullable(),
  contactPhone: z.string().regex(
    /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
    '전화번호 형식이 올바르지 않습니다'
  ),
  photos: z.array(z.object({
    url: z.string().url(),
    path: z.string().min(1),
    order: z.number().int().min(0).max(4),
  })).max(5),
  note: z.string().max(500).nullable(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestInputSchema>;
```

### 4.3 Repository: `providerRepository`

```ts
// src/lib/firebase/provider-repository.ts (신규)
export const providerRepository = {
  async get(id: string): Promise<Provider | null> { ... },
  async listByCategory(category: QuoteCategory): Promise<Provider[]> {
    const snap = await col().where('categories', 'array-contains', category).get();
    return snap.docs.map(d => toProvider(d.id, d.data()));
  },
  async create(data: Omit<Provider, 'id'|'createdAt'|'updatedAt'>): Promise<string> { ... },
};
```

### 4.4 Repository: `quoteRequestRepository`

```ts
// src/lib/firebase/quote-request-repository.ts (신규)
export const quoteRequestRepository = {
  async create(id: string, data: Omit<QuoteRequest, 'id'|'createdAt'>): Promise<void> {
    await col().doc(id).create({ ...data, createdAt: FieldValue.serverTimestamp() });
  },
  async update(id: string, patch: Partial<Pick<QuoteRequest, 'notifiedProviderIds'|'status'>>): Promise<void> { ... },
  async listForClient(clientUid: string): Promise<QuoteRequest[]> { ... },  // v1.1 에서 UI 소비
};
```

### 4.5 `userRoles` 헬퍼

```ts
// src/lib/firebase/user-roles.ts (신규)
export async function ensureClientRole(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  // arrayUnion로 멱등 add — 이미 있으면 no-op
  await userRef.set({ roles: FieldValue.arrayUnion('client') }, { merge: true });
}
```

---

## 5. UI / UX Design

### 5.1 `/` (MarketplaceHome) — v0.2 Home Shell

Figma 기준 완성형. 오늘의 할 일은 **shell + count만** — 각 항목은 후속 feature 필요.

```
┌─────────────────────────────────────────────┐
│  전국 ▾ (static)                      🔔    │  TopBar (지역 static + 알림 placeholder)
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │ 오늘의 할 일 · {N}건    4월 20일 (월) │   │  TodayCard (로그인 시)
│  │                                     │   │
│  │  • 요청한 견적 {N}건                  │   │  실데이터 (listForClient.length)
│  │                                     │   │
│  │  [ + 새 견적 요청 ]                  │   │  CTA (primary, blue)
│  └─────────────────────────────────────┘   │
│                                             │
│  어떤 청소가 필요하세요?                     │  h2
│                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │ 🏠  │ │ 🏢  │ │ 🌀 │   ← lucide icons    │  CategoryGrid (파스텔 tile 배경)
│  │입주 │ │사무실│ │에어컨│   + soft bg       │
│  │이사전│ │주1··│ │분해 │                    │
│  └─────┘ └─────┘ └─────┘                    │
│  ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │ 🚚  │ │ ✨  │ │ 📆  │                    │
│  │이사 │ │특수 │ │정기 │                    │
│  │쓰레기│ │곰팡이│ │구독 │                    │
│  └─────┘ └─────┘ └─────┘                    │
│                                             │
│  ────────────                               │
│  홍보 피드 둘러보기 →                         │  footer link
└─────────────────────────────────────────────┘
```

**Component breakdown**:
- `TopBar` (Server): 지역 label("전국"), 알림 Bell icon (lucide, 클릭 무반응 v1 shell)
- `TodayCard` (Server, Suspense-wrapped): `quoteRequestRepository.listForClient(uid).length` → "요청한 견적 {N}건"
  - 비로그인 시: null (hide)
  - N=0 시: "아직 요청한 견적이 없어요" empty state
- `CategoryGrid` (Server): 6 카드, lucide 아이콘 + 파스텔 tile
  - 매핑: `move-in`→`Home`·blue, `office`→`Building2`·green, `aircon`→`Wind`·sky, `move-out`→`Truck`·purple, `special`→`Sparkles`·pink, `regular`→`CalendarDays`·amber
  - Tile: `bg-{color}-100 text-{color}-600 rounded-xl p-3` (Tailwind)
- 비로그인 시: TopBar + "어떤 청소가 필요하세요?" + CategoryGrid + 홈으로 이동 CTA만 (TodayCard 숨김)

**Out-of-scope 확인**: 방문 일정 / 결제 요청 / 새 견적 도착 = 후속 feature (`quote-response` v1.1, `booking` v1.2, `payment` v2)에서 TodayCard 확장.

### 5.2 `/quote/new`

```
┌─────────────────────────────────────────────┐
│  ← 홈                         [로그아웃]       │
├─────────────────────────────────────────────┤
│  견적 요청                                   │  h1
│  🏠 입주청소 · 이사 전·후                      │  categorized label
│                                             │
│  지역      [서울특별시 | 강남구 ▼]            │  RegionSelect
│  평수      [___]평 (선택)                    │
│  희망일    [날짜 선택] (선택)                  │
│  연락처    [010-1234-5678] *                │
│  사진      [+ 추가 · 0/5]                    │  PhotoUpload 재사용
│                                             │
│  특이사항 (선택)                              │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│  0 / 500                                    │
│                                             │
│  [ 견적 요청 제출 ]                           │
└─────────────────────────────────────────────┘
```

### 5.3 `/quote/thanks`

```
┌─────────────────────────────────────────────┐
│                                             │
│             ✅                              │
│                                             │
│      견적 요청이 접수됐어요!                  │
│                                             │
│  ─ 요청 요약 ─                              │
│  카테고리: 🏠 입주청소                        │
│  지역: 서울특별시 강남구                       │
│  ...                                        │
│                                             │
│  청명이 24시간 내로 {contactPhone}으로        │
│  직접 연락드립니다.                          │
│                                             │
│  [ 다른 청소도 요청하기 ] [ 홈으로 ]           │
└─────────────────────────────────────────────┘
```

### 5.4 Component List

| Component | Type | Location | Role |
|-----------|------|----------|------|
| `MarketplaceHome` | Server | `src/app/page.tsx` | 교체 |
| `CategoryGrid` | Server | `src/components/quote/CategoryGrid.tsx` | 6 카드 |
| `CategoryCard` | Server | 동일 파일 | 단일 카드 |
| `PrimaryCtaButton` | Server | 재사용 가능 (기존 Link 패턴) | "+ 새 견적 요청" |
| `QuoteNewPage` | Server | `src/app/quote/new/page.tsx` | shell, requestId 발급 |
| `QuoteForm` | Client | `src/components/quote/QuoteForm.tsx` | RHF + Zod + PhotoUpload + RegionSelect |
| `QuoteThanksPage` | Server | `src/app/quote/thanks/page.tsx` | 요약 표시 |
| `DiscoverPage` | Server | `src/app/discover/page.tsx` | 기존 FeedPage 이전 |

### 5.5 User Flow

```
비로그인 홈 → 카테고리 클릭 → proxy가 /login으로 이동 → 로그인 → /quote/new?category=X
  ↓
QuoteForm 입력 (RegionSelect·PhotoUpload 재사용) → 제출 → Server Action
  ↓
성공 → /quote/thanks?id=...   (요약 + 재요청 CTA)
실패 → toast + 폼 유지 + 에러 표시
```

---

## 6. Error Handling

| Code | User Message | Recovery |
|------|-------------|----------|
| `INVALID_INPUT` | "입력값을 확인해주세요" (필드별 메시지 inline) | 폼 유지 |
| `UNAUTHORIZED` | "로그인이 필요합니다" | `/login` redirect |
| `RATE_LIMITED` | "1시간에 최대 5건까지 요청 가능합니다" | 대기 후 재시도 |
| `INTERNAL_ERROR` | "일시적 오류가 발생했어요. 다시 시도해주세요" | 재시도 버튼 |
| 이메일 발송 실패 (내부) | 사용자에겐 성공 응답. `console.warn`으로 로깅. `notifiedProviderIds`에 미포함 | Firestore `quoteRequests`는 저장됨 → 운영자가 수동 대응 |

---

## 7. Security Considerations

- [x] **세션 쿠키 검증**: 모든 Server Action 진입점
- [x] **Zod 재검증**: 클라 검증과 별개로 서버에서 authoritative
- [x] **Rate limit**: 1시간 내 5건 per uid (기존 `rate-limit.ts` bucket 확장)
- [x] **Firestore 규칙**: quoteRequests는 owner-only create·read, Admin SDK write; providers read-all write-admin
- [x] **Storage 규칙**: 본인 uid 경로에만 업로드, image/* + 5MB 제한
- [x] **CSRF**: Next.js Server Action 내장 보호
- [x] **XSS**: React 기본 escape (note, businessName 등)
- [x] **Email injection**: Resend API가 HTML 텍스트 내 사용자 입력을 escape 처리하도록 `escapeHtml` 헬퍼 적용
- [x] **requestId 충돌**: nanoid 16자 ≈ 2.4×10^24 경우의 수. 충돌 확률 무시 가능. `.create()`가 ALREADY_EXISTS 시 400 에러
- [x] **App Check**: 기존 promo-page follow-up (MN-1)과 동일 타이밍

---

## 8. Email Template (Resend HTML)

### 8.1 구성요소
- **From**: `견적요청 <quote@{verified-domain}>` — 기존 content-research-pipeline Resend 도메인 재사용
- **To**: `provider.contactEmail`
- **Subject**: `[청광] 새 견적 요청: {카테고리 라벨} · {지역} · {평수}평`
- **HTML body**: inline-CSS (이메일 클라이언트 호환)

### 8.2 발송 로직

```ts
// src/lib/email/quote-email.ts (신규)
export interface SendQuoteEmailInput {
  provider: Provider;
  request: QuoteRequest;
  photoUrls: string[];     // getDownloadURL 이미 적용된 URL
}

export async function sendQuoteEmail(
  input: SendQuoteEmailInput,
  apiKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = buildSubject(input.request);
  const html = renderQuoteEmailHtml(input);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'quote@cheonggwang.local',
      to: input.provider.contactEmail,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `${res.status}: ${body}` };
  }
  return { ok: true };
}
```

### 8.3 HTML 템플릿

```ts
// src/lib/email/quote-email-template.ts (신규)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderQuoteEmailHtml(input: SendQuoteEmailInput): string {
  const { provider, request, photoUrls } = input;
  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const size = request.size ? `${request.size}평` : '정보 없음';
  const date = request.preferredDate
    ? new Date(request.preferredDate).toLocaleDateString('ko-KR')
    : '협의';
  const phoneDigits = request.contactPhone.replace(/-/g, '');
  const note = request.note ? escapeHtml(request.note) : '(특이사항 없음)';

  const photosHtml = photoUrls.length > 0
    ? `<h3 style="margin-top:24px">첨부 사진</h3>
       <ul style="padding-left:20px">
         ${photoUrls.map((url, i) => `<li><a href="${url}" style="color:#4f46e5">사진 ${i + 1}</a></li>`).join('')}
       </ul>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
  <div style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">${emoji} [청광] 새 견적 요청</h1>
    <p style="margin:4px 0 0;color:#666;font-size:13px">${escapeHtml(provider.companyName)} 앞</p>
  </div>

  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px 0;color:#666;width:90px">카테고리</td><td style="padding:8px 0"><strong>${escapeHtml(catLabel)}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#666">지역</td><td style="padding:8px 0">${escapeHtml(request.region.city)} ${escapeHtml(request.region.district)}</td></tr>
    <tr><td style="padding:8px 0;color:#666">평수</td><td style="padding:8px 0">${size}</td></tr>
    <tr><td style="padding:8px 0;color:#666">희망일</td><td style="padding:8px 0">${date}</td></tr>
    <tr><td style="padding:8px 0;color:#666">연락처</td><td style="padding:8px 0"><a href="tel:${phoneDigits}" style="color:#4f46e5">${escapeHtml(request.contactPhone)}</a></td></tr>
  </table>

  <h3 style="margin-top:24px">특이사항</h3>
  <p style="background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap">${note}</p>

  ${photosHtml}

  <div style="margin-top:32px;display:flex;gap:12px">
    <a href="tel:${phoneDigits}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:600">전화 걸기</a>
    <a href="mailto:?subject=${encodeURIComponent('견적 답변')}" style="display:inline-block;padding:12px 24px;background:#f4f4f4;color:#111;text-decoration:none;border-radius:8px;font-weight:600">이메일 답장</a>
  </div>

  <p style="margin-top:32px;color:#999;font-size:12px">
    요청 ID: ${request.id}<br>
    이 이메일은 청광 마켓플레이스에서 자동 발송됩니다.
  </p>
</body></html>`;
}

export function buildSubject(request: QuoteRequest): string {
  const label = QUOTE_CATEGORY_LABELS[request.category];
  const sizeStr = request.size ? `${request.size}평` : '';
  return `[청광] 새 견적 요청: ${label}${sizeStr ? ` · ${sizeStr}` : ''} · ${request.region.district}`;
}
```

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit | `quoteRequestInputSchema`, `buildSubject`, `escapeHtml`, `isQuoteCategory` | Vitest |
| Unit | `ensureClientRole` 멱등성 (FieldValue.arrayUnion 동작) | Vitest + Firebase emulator |
| Integration | `submitQuoteRequest` Server Action happy path | Vitest + Firestore mock |
| Integration | Rate limit 5/hour (6번째 요청 429) | Vitest |
| Contract | Resend API 응답 파싱 | Mock fetch |
| E2E (수동) | 홈 → 카테고리 → 로그인 → 제출 → 감사 페이지 | Playwright (v1.1) |

### 9.2 Key Test Cases

- [ ] 홈 `/` 접근 → 카테고리 6개 렌더 (이모지 + 라벨 + 서브타이틀)
- [ ] 비로그인 `/quote/new?category=X` → `/login?next=/quote/new?category=X` 리다이렉트
- [ ] 로그인 후 `/quote/new?category=aircon` → 카테고리 고정 (URL param 반영)
- [ ] 유효하지 않은 category 쿼리 (예: `?category=xxx`) → default fallback or 400
- [ ] 전화번호 포맷 오류 (`010-abc-1234`) → Zod 에러 inline
- [ ] 사진 6장 업로드 시도 → 5장 초과 reject
- [ ] 제출 성공 → Firestore `quoteRequests/{nanoid}` 생성 확인
- [ ] 제출 성공 → users/{uid}.roles에 'client' 포함 (중복 없이 arrayUnion)
- [ ] 제출 성공 → Resend 발송 성공 응답 시 notifiedProviderIds에 provider.id 포함
- [ ] Resend 500 실패 → 여전히 Firestore 저장 성공, notifiedProviderIds에 미포함, 로그 warn
- [ ] Rate limit: 동일 uid로 6번째 제출 시 429
- [ ] 다른 uid의 quoteRequest 문서 read 시도 → Firestore 규칙 reject
- [ ] 감사 페이지에서 requestId로 Firestore 읽기 → 요약 표시
- [ ] `/discover` 접근 → 기존 FeedPage 정상 렌더

---

## 10. Clean Architecture

| Layer | Responsibility | Location |
|-------|---------------|----------|
| Presentation (Server) | MarketplaceHome, QuoteNewPage, QuoteThanksPage, DiscoverPage, CategoryGrid, CategoryCard | `src/app/`, `src/components/quote/` |
| Presentation (Client) | QuoteForm (RHF+Zod), PhotoUpload(재사용), RegionSelect(재사용) | `src/components/quote/`, `src/components/editor/PhotoUpload.tsx`, `src/components/feed/RegionSelect.tsx` |
| Application | `submitQuoteRequest` Server Action, `quoteService` (있으면) | `src/app/actions/`, 없으면 Server Action 내부 |
| Domain | QuoteCategory enum, quote-schemas, region parsing | `src/domain/` |
| Infrastructure | providerRepository, quoteRequestRepository, userRoles, quoteEmail, resend client, rate-limit | `src/lib/firebase/`, `src/lib/email/` |

**Dependency direction**: Presentation → Application → Domain ← Infrastructure. Presentation (Client) can only access Server Actions (app/actions). 기존 아키텍처 규율 그대로.

---

## 11. Coding Convention (§10 Recap)

- **파일 kebab-case**: `quote-actions.ts`, `quote-email.ts`, `provider-repository.ts`
- **컴포넌트 PascalCase**: `QuoteForm.tsx`, `CategoryGrid.tsx`
- **상수 UPPER_SNAKE**: `QUOTE_CATEGORIES`, `QUOTE_CATEGORY_LABELS`, `RATE_LIMIT_QUOTE_PER_HOUR`
- **Import 순서**: Node → external → internal → type
- **환경변수 추가**:
  - `RESEND_API_KEY` (server)
  - `EMAIL_FROM` (server, default `quote@cheonggwang.local`)

---

## 12. Implementation Guide

### 12.1 File Structure

```
src/
├── app/
│   ├── page.tsx                            🔄 교체 → MarketplaceHome
│   ├── discover/page.tsx                   🆕 기존 FeedPage 이전
│   ├── quote/
│   │   ├── new/page.tsx                    🆕
│   │   └── thanks/page.tsx                 🆕
│   └── actions/
│       └── quote-actions.ts                🆕
├── components/
│   └── quote/
│       ├── CategoryGrid.tsx                🆕 (CategoryCard 포함)
│       ├── QuoteForm.tsx                   🆕 Client
│       └── QuoteSummary.tsx                🆕 thanks 페이지용
├── services/                               (Server Action이 직접 orchestrate)
├── lib/
│   ├── firebase/
│   │   ├── provider-repository.ts          🆕
│   │   ├── quote-request-repository.ts     🆕
│   │   └── user-roles.ts                   🆕
│   └── email/
│       ├── resend.ts                       🆕 Resend fetch 래퍼
│       ├── quote-email.ts                  🆕 sendQuoteEmail + buildSubject
│       └── quote-email-template.ts         🆕 renderQuoteEmailHtml + escapeHtml
├── domain/
│   ├── quote-category.ts                   🆕
│   └── quote-schemas.ts                    🆕
├── types/
│   ├── provider.ts                         🆕
│   └── quote-request.ts                    🆕
└── proxy.ts                                🔄 matcher 확장

scripts/
└── seed-first-provider.mjs                 🆕 첫 청명 시드

firestore.rules                             🔄 providers + quoteRequests 추가
firestore.indexes.json                      🔄 인덱스 2개 추가
storage.rules                               🔄 quote-photos 추가
```

### 12.2 Implementation Order (7 steps)

1. **도메인 & 타입**: `domain/quote-category.ts`, `domain/quote-schemas.ts`, `types/provider.ts`, `types/quote-request.ts` + `types/page.ts`에 `UserRole`·`UserProfile.roles` 추가
2. **Repositories**: `provider-repository.ts`, `quote-request-repository.ts`, `user-roles.ts`
3. **Email layer**: `lib/email/{resend, quote-email, quote-email-template}.ts`
4. **Server Action**: `app/actions/quote-actions.ts` + `rate-limit.ts` 확장 (bucket/limit 파라미터)
5. **UI**: `CategoryGrid`, `QuoteForm`, `QuoteSummary`
6. **Routes**: `/`, `/discover`, `/quote/new`, `/quote/thanks` + `proxy.ts` matcher 업데이트
7. **Infra**: rules + indexes 배포, `seed-first-provider.mjs` 실행

### 12.3 Pre-flight 체크리스트

배포 전 사용자가 해야 할 일:
- [ ] `.env.local`에 `RESEND_API_KEY`, `EMAIL_FROM` 추가 (기존 content-research-pipeline 값 재사용 가능)
- [ ] Resend 도메인 DNS (SPF/DKIM) 확인
- [ ] 첫 청명 Firestore seed 실행: `pnpm tsx scripts/seed-first-provider.mjs`
- [ ] `firebase deploy --only firestore:rules,firestore:indexes,storage`
- [ ] (프로덕션 전) App Check 활성화

---

## 13. Next.js 16 Specific Patterns (참고)

### 13.1 async searchParams (QuoteNewPage)

```tsx
// src/app/quote/new/page.tsx
import { customAlphabet } from 'nanoid';
const nanoRequestId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

type SearchParams = { category?: string };

export default async function QuoteNewPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const initialCategory = isQuoteCategory(sp.category ?? '') ? sp.category as QuoteCategory : null;
  const requestId = nanoRequestId();  // 매 방문마다 새 ID (새로고침 시 새 request로 취급)
  return (
    <div>
      <QuoteFormShell requestId={requestId} initialCategory={initialCategory} />
    </div>
  );
}
```

### 13.2 Server Action with `updateTag` (불필요 — quote는 캐시 대상 없음)

`revalidateTag`/`updateTag` 호출 없음. 피드 (`feed` tag)는 promo-feed가 archived 상태 — 영향 없음. 공개 페이지 캐시 태그 (`page:{slug}`)도 해당 없음.

### 13.3 rate-limit 확장

```ts
// src/lib/firebase/rate-limit.ts (확장)
export async function checkAndIncrement(
  key: string,         // 'generate:{uid}' or 'quote:{uid}' 등
  limit: number,
  windowMs: number = 60_000,
): Promise<void> {
  const bucket = Math.floor(Date.now() / windowMs);
  const docRef = adminDb.collection('rateLimits').doc(`${key}_${bucket}`);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const current = snap.exists ? ((snap.data()!.count as number) ?? 0) : 0;
    if (current >= limit) {
      throw new AppError('RATE_LIMITED', '요청이 많습니다. 잠시 후 다시 시도해주세요');
    }
    if (snap.exists) {
      tx.update(docRef, { count: FieldValue.increment(1) });
    } else {
      tx.set(docRef, {
        key,
        bucket,
        count: 1,
        firstAt: FieldValue.serverTimestamp(),
        ttlExpiresAt: Timestamp.fromMillis(Date.now() + windowMs * 2),
      });
    }
  });
}
```

기존 `/api/generate`는 `checkAndIncrement(uid)` → `checkAndIncrement(\`generate:${uid}\`, RATE_LIMIT_PER_MIN)` 로 migration. Quote는 `checkAndIncrement(\`quote:${uid}\`, 5, 60 * 60 * 1000)`.

### 13.4 첫 청명 Seed 스크립트

```ts
// scripts/seed-first-provider.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) { console.error('FIREBASE_ADMIN_SA_BASE64 not set'); process.exit(1); }
const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const providerId = 'cheonggwang-main';   // 고정 ID (환경 간 예측 가능)
await db.collection('providers').doc(providerId).set({
  ownerUid: 'MANUAL_SEED',
  companyName: '청광',
  categories: ['move-in', 'office', 'aircon', 'move-out', 'special', 'regular'],
  regions: [
    { city: '서울특별시', district: '강남구' },
    { city: '서울특별시', district: '서초구' },
    // ...전국 확장 가능
  ],
  contactEmail: process.env.OPERATOR_EMAIL ?? 'operator@cheonggwang.local',
  isCheonggwangOwned: true,
  insured: true,
  pageId: null,
  rating: null,
  responseTimeHours: null,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});
console.log(`✅ seeded providers/${providerId}`);
process.exit(0);
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Plan v0.1 기반 초안. Open Q 5개 전부 해소 (이메일 HTML 전문, pre-issued requestId, RegionSelect 재사용, 이모지 아이콘, /discover 단순 교체·redirect 없음). 7 스텝 구현 순서·rate-limit 확장·seed 스크립트 명세 포함 | Seokho Lee |
