---
template: design
version: 1.2
feature: promo-page
date: 2026-04-19
author: Seokho Lee
project: cheonggwang (firebase-next-app)
version-proj: 0.1.0
---

# promo-page Design Document

> **Summary**: 청광 청소 서비스 이용 고객(건물주/상가)이 자신의 매장을 홍보하는 공개 랜딩페이지를 LLM으로 자동 생성·발행하는 기능.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Author**: Seokho Lee
> **Date**: 2026-04-19
> **Status**: Draft
> **Planning Doc**: [promo-page.plan.md](../../01-plan/features/promo-page.plan.md)
> **Sibling Doc**: [content-research-pipeline.plan.md](../../01-plan/features/content-research-pipeline.plan.md) — 본 기능이 소비하는 트렌드 키워드/템플릿 공급원

---

## 0. Next.js 16 Breaking Changes — 본 설계 반영 요약

`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` 직접 검토 결과, 본 설계에 반영된 주요 변경사항:

| 변경사항 | 본 설계 적용 |
|---------|-------------|
| **Async Request APIs** (`params`, `searchParams`, `cookies`, `headers` 전부 Promise) | `/p/[slug]/page.tsx`, `/editor/[pageId]/page.tsx`, Route Handler `context.params` 모두 `await` |
| **`revalidateTag(tag, profile)` 2-arg 필수** | publish/업데이트 시 `revalidateTag('page:{slug}', 'max')` |
| **`updateTag` 신규** (Server Actions 전용, read-your-writes) | 편집 저장 Server Action에서 `updateTag('page:${pageId}')` 사용해 편집자가 즉시 반영된 결과 확인 |
| **`cacheLife` / `cacheTag` 안정화** (`unstable_` prefix 제거) | `'use cache'` + `cacheTag` + `cacheLife('days')`로 `/p/[slug]` ISR 구현 |
| **Cache Components (`cacheComponents: true`)** PPR 대체 | `next.config.ts`에 활성화 |
| **`middleware` → `proxy`** | `proxy.ts`로 작성 (auth guard, Node.js runtime) |
| **`images.domains` 제거 → `remotePatterns`** | Firebase Storage 도메인 `firebasestorage.googleapis.com` remotePatterns에 등록 |
| **Turbopack default** | package.json scripts 기본값 유지 (`next dev` / `next build`) |
| **`next lint` 제거** | ESLint CLI 직접 사용 (`eslint .`) |
| **Parallel route `default.js` 필수** | 현재 설계는 parallel routes 미사용 |
| **React 19.2 canary** | `useEffectEvent`·`Activity` 등 필요 시 활용 (현 설계는 기본 기능만) |

---

## 1. Overview

### 1.1 Design Goals

- 업종 선택 1회 + 업체 정보 + 사진 → 10분 내 공개 URL 발행
- LLM 생성 품질 80%+ 그대로 사용 가능, 인라인 편집은 미세조정용
- Firebase 스택 네이티브로 운영 부담 최소화
- 공개 페이지는 CDN/ISR 캐시로 외부 방문 폭증 대응

### 1.2 Design Principles

- **Server-first**: mutation은 Server Actions(Firebase Admin), 공개 페이지는 서버 렌더 + `'use cache'`
- **Thin client**: 편집 UI만 Client Component, 나머지는 Server Component
- **Clean layering**: UI / services / Firebase infra 분리 (§9)
- **Single source of truth**: `slugs/{slug}` → `pages/{pageId}` 역인덱스. 편집 중엔 pageId로, 공개 시엔 slug로 접근
- **Fail-closed security**: Firestore 규칙은 기본 deny. 공개 읽기가 필요한 것만 명시 허용
- **Next.js 16 네이티브**: 프로젝트 AGENTS.md 지시 — breaking changes 전면 적용
- **🧹 Hygiene 콘텐츠 격리 원칙 (2026-04-19 피벗 핵심 규약)**:
  - **청결·위생·방역 관련 어휘는 오직 `sections.hygiene`에서만 등장해야 한다**
  - `hero`, `intro`, `highlights`, `location`, `cta` 섹션은 일반 마케팅 톤만 (업종 표준)
  - `sections.hygiene`은 **`user.isCheonggwangPartner === true`일 때만 생성·렌더**. 비파트너는 `hygiene: null`
  - `promptBuilder`는 비파트너 경로에서 hygiene 관련 프롬프트 자체를 skip하고, 파트너 경로에서도 hygiene prompt만이 청결 어휘를 포함할 수 있음
  - 이 규약 위반은 CRITICAL 버그 — `/pdca analyze` 시 반드시 검증

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────┐      ┌──────────────────────────┐      ┌────────────────┐
│  Browser       │      │ Next.js 16 (Vercel)      │      │ Firebase       │
│                │─────▶│                          │─────▶│                │
│  editor (CSR)  │      │ Server Components        │      │  Firestore     │
│  public page   │      │  + Server Actions        │      │  Storage       │
│  (hydrated)    │◀─────│  + Route Handlers        │◀─────│  Auth          │
│                │      │                          │      │                │
└────────────────┘      │ Firebase Admin SDK       │      └────────────────┘
                        │  (session cookie verify) │              │
                        └──────────────────────────┘              │
                                   │                              │
                                   │ Vertex AI SDK                │
                                   ▼                              │
                        ┌──────────────────────────┐              │
                        │ Google Vertex AI         │              │
                        │  Gemini 1.5 Flash        │              │
                        └──────────────────────────┘              │
                                                                  │
                        ┌──────────────────────────┐              │
                        │ content-research-pipeline│──── writes ──┘
                        │ (Firebase Functions)     │  trendKeywords/{category}
                        └──────────────────────────┘
```

### 2.2 Data Flow

#### 2.2.1 편집·발행 흐름 (auth 필요)
```
[Client] 업체 정보 폼 입력
   → Server Action `savePage(formData)`
       → Firebase Admin: 세션 쿠키 검증 → uid 획득
       → Firestore write: pages/{pageId} (ownerUid = uid)
       → updateTag(`page:${pageId}`)  (편집자 즉시 반영)
       → return { ok, pageId }
   ← Client 상태 갱신

[Client] "AI 글 생성" 버튼
   → Route Handler `POST /api/generate`
       → auth verify
       → load page + template + trendKeywords
       → Gemini 섹션별 호출 (병렬)
       → pages/{pageId}.sections 업데이트
       → updateTag(`page:${pageId}`)
       → return { sections }
   ← Client 에디터에 주입

[Client] "발행" 버튼
   → Server Action `publishPage(pageId)`
       → auth verify + owner 검사
       → slug 생성 (businessName slug화 + nanoid 6자)
       → slugs/{slug} 중복 검사 후 생성
       → pages/{pageId}.slug, published=true
       → revalidateTag(`page:${slug}`, 'max')
       → redirect(`/p/${slug}`)
```

#### 2.2.2 공개 페이지 조회 흐름 (no auth)
```
GET /p/[slug]
   → Server Component page.tsx
       → await params
       → getPublicPageBySlug(slug)       // 'use cache' + cacheTag(`page:${slug}`) + cacheLife('days')
           → slugs/{slug} 조회 → pageId
           → pages/{pageId} 조회 (Admin SDK)
       → PromoPage 렌더 (category별 템플릿)
   → HTML 응답 (캐시 가능)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `/editor/[pageId]` (Presentation) | `pageService` (Application) | 편집 상태 관리 |
| `/p/[slug]` (Presentation) | `pageService.getPublicBySlug` | 공개 렌더 |
| `pageService` | `pageRepository` (Infrastructure) | 도메인 로직 |
| `pageRepository` | Firebase Admin SDK | Firestore 접근 |
| `promptBuilder` | `trendKeywordsRepository`, `templates/[category]` | LLM 입력 조립 |
| `geminiClient` | `@google/generative-ai` SDK (AI Studio API) | LLM 호출 — 2026-04-19 Vertex AI에서 전환 |
| `authHelper` | Firebase Admin SDK | 세션 쿠키 검증 |

---

## 3. Data Model

### 3.1 Entity Definition (TypeScript, Domain layer)

```typescript
// src/types/page.ts

export type Category = 'restaurant' | 'salon' | 'cafe'

export type SectionType = 'hero' | 'intro' | 'highlights' | 'hygiene' | 'location' | 'cta'

export interface HeroSection     { title: string; subtitle: string }
export interface IntroSection    { body: string }
export interface HighlightsSection  { items: string[] }
export interface HygieneSection  { body: string }          // 🧹 청광 파트너일 때만 렌더
export interface LocationSection { mapEmbed: string }      // Naver Map iframe URL
export interface CtaSection      { label: string; link: string }

export interface Sections {
  hero: HeroSection
  intro: IntroSection
  highlights: HighlightsSection
  hygiene: HygieneSection | null
  location: LocationSection
  cta: CtaSection
}

export interface Photo {
  url: string        // Firebase Storage download URL
  path: string       // storage path: photos/{uid}/{pageId}/{fileName}
  order: number
}

export interface Page {
  id: string                  // Firestore doc id
  ownerUid: string
  category: Category
  businessName: string
  address: string
  phone: string
  keyPoints: string[]         // 3~5개
  photos: Photo[]             // 1~3장
  sections: Sections
  slug: string | null
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  isCheonggwangPartner: boolean             // 청광 파트너 여부 (운영자가 Firestore 콘솔에서 수동 설정)
  partnerCleaningFrequency?: string          // "주 2회" 등
  createdAt: Date
}

export interface TrendKeywords {
  keywords: string[]          // TOP30 (파이프라인이 주간 갱신)
  updatedAt: Date
  sourceWeek: string          // "2026-W17"
}
```

### 3.2 Entity Relationships

```
[UserProfile] 1 ──── N [Page]
                        │
                        └── 1 ──── 1 [Slug]   (역인덱스)
                        └── N ──── 1 [TrendKeywords(category)]
```

### 3.3 Firestore Collection Schema

#### `users/{uid}`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | ✓ | Auth provider 제공 |
| displayName | string | ✓ | 기본값: 이메일 local-part |
| isCheonggwangPartner | bool | ✓ | **서버/관리자만 쓰기 가능** — Admin SDK 전용 |
| partnerCleaningFrequency | string | — | 예: "주 2회". **서버/관리자만 쓰기 가능** — Admin SDK 전용 |
| createdAt | timestamp | auto | |

#### `pages/{pageId}`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| ownerUid | string | ✓ | request.auth.uid와 일치해야 쓰기 허용 |
| category | string | ✓ | 'restaurant'\|'salon'\|'cafe' |
| businessName | string | ✓ | 최대 40자 |
| address | string | ✓ | 최대 120자 |
| phone | string | ✓ | 숫자/하이픈만 (정규식 검증) |
| keyPoints | string[] | ✓ | 3~5개, 각 최대 60자 |
| photos | Photo[] | ✓ | 1~3장 |
| sections | map | ✓ | 위 `Sections` 타입 |
| slug | string\|null | — | 발행 후에만 존재 |
| published | bool | ✓ | default false |
| createdAt | timestamp | auto | |
| updatedAt | timestamp | auto | |

#### `slugs/{slug}` (역인덱스)

| Field | Type | Notes |
|-------|------|-------|
| pageId | string | |
| createdAt | timestamp | |

#### `trendKeywords/{category}` (파이프라인이 쓰기, promo-page가 읽기)

| Field | Type | Notes |
|-------|------|-------|
| keywords | string[] | TOP30 |
| updatedAt | timestamp | |
| sourceWeek | string | "2026-W17" |

### 3.4 Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // ─── users ────────────────────────────────────────────
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && !('isCheonggwangPartner' in request.resource.data  // 초기값은 서버에서만
                         && request.resource.data.isCheonggwangPartner == true);
      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['isCheonggwangPartner', 'partnerCleaningFrequency']);
      allow delete: if false;
    }

    // ─── pages ────────────────────────────────────────────
    match /pages/{pageId} {
      allow read: if request.auth != null
                  && resource.data.ownerUid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.ownerUid == request.auth.uid
                    && request.resource.data.published == false;
      allow update: if request.auth != null
                    && resource.data.ownerUid == request.auth.uid
                    && request.resource.data.ownerUid == request.auth.uid;  // ownerUid 변경 금지
      allow delete: if request.auth != null
                    && resource.data.ownerUid == request.auth.uid;
    }

    // ─── slugs (공개 읽기) ────────────────────────────────
    match /slugs/{slug} {
      allow read: if true;            // 공개 페이지 SSR 및 혹시 모를 클라 fallback
      allow write: if false;           // Admin SDK만
    }

    // ─── trendKeywords (서버 전용) ────────────────────────
    // v1 기준: 읽기도 클라이언트에서 불필요 (promo-page는 Admin SDK로만 접근)
    match /trendKeywords/{category} {
      allow read: if false;
      allow write: if false;           // 연구 파이프라인 Admin만
    }

    // ─── rateLimits (서버 전용) — §7.1 ────────────────────
    match /rateLimits/{bucket} {
      allow read: if false;
      allow write: if false;           // /api/generate 서버 Admin만
    }
  }
}
```

> **Note**: 공개 페이지 `/p/[slug]` 렌더은 Admin SDK 사용 → 보안 규칙 영향 없음. `slugs`는 공개 읽기만 허용해 SSR 실패 시 클라 fallback 여지를 남김. `trendKeywords`와 `rateLimits`는 v1에서 클라 접근 일체 불필요하므로 closed.

### 3.5 Firebase Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{uid}/{pageId}/{fileName} {
      allow read: if true;                                   // 공개 페이지 렌더 시 필요
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/(jpeg|png|webp)');
    }
  }
}
```

---

## 4. API Specification

### 4.1 Endpoint List

| Type | Method/Name | Path | Auth | Purpose |
|------|-------------|------|------|---------|
| Route Handler | GET  | `/api/health` | - | Liveness check |
| Route Handler | POST | `/api/generate` | ✓ | Gemini 섹션별 글 생성 |
| Server Action | - | `savePage` | ✓ | 페이지 저장 (create/update) |
| Server Action | - | `publishPage` | ✓ | slug 발급 + 발행 |
| Server Action | - | `unpublishPage` | ✓ | 발행 취소 |
| Server Action | - | `deletePage` | ✓ | 삭제 |
| Server Action | - | `signInWithEmail` / `signOut` | - | Auth 세션 쿠키 관리 (카카오 로그인은 **v1.1로 디퍼** — Plan §3.1 수정 2026-04-19) |

### 4.2 Detailed Specification

#### `POST /api/generate` (Route Handler)

**Request:**
```json
{ "pageId": "string" }
```

**Processing:**
1. Firebase Admin: `sessionCookie` 검증 → uid 획득 (401 if fail)
2. **App Check 토큰 검증** — 헤더 `X-Firebase-AppCheck` → `admin.appCheck().verifyToken(token)` (프로덕션 강제, 개발은 debug token 허용)
3. `pages/{pageId}` 로드 → `ownerUid !== uid`이면 403
4. **Rate-limit 체크** — `rateLimits/{uid}_{minuteBucket}.count` FieldValue.increment(1) 트랜잭션, 5 초과 시 429 (자세한 스키마는 §7.1)
5. `templates/{category}` + `trendKeywords/{category}` 로드 (서버 Admin SDK 전용 읽기 — §3.4)
6. `userRepository.getPartnerFlag(uid)` → `{ isCheonggwangPartner, partnerCleaningFrequency }` 조회 (🧹①)
7. `promptBuilder(page, template, trendKeywords, { withHygiene: isCheonggwangPartner, partnerCleaningFrequency })`
   - **비파트너 경로**: hygiene 프롬프트 자체를 **skip** — Gemini 호출 수가 5개 → 4개로 줄고, 결과의 `sections.hygiene === null`
   - **파트너 경로**: hygiene 프롬프트 추가. 이 프롬프트만 청결·위생 어휘를 포함할 수 있음 (§1.2 격리 원칙)
8. `Promise.all` — Gemini 1.5 Flash 각 섹션 병렬 호출 (파트너 5~6개 / 비파트너 4~5개)
9. 결과 조립 → `pages/{pageId}.sections` 업데이트. **`sections.hygiene`은 비파트너일 때 명시적으로 `null`로 저장 (Firestore에서 fieldDelete 아닌 null값 유지)**
10. `updateTag(\`page:${pageId}\`)` (편집자 즉시 반영)

**Response (200) — 파트너 (`isCheonggwangPartner === true`):**
```json
{
  "sections": {
    "hero":       { "title": "...", "subtitle": "..." },
    "intro":      { "body": "..." },
    "highlights": { "items": ["...", "...", "..."] },
    "hygiene":    { "body": "..." },
    "location":   { "mapEmbed": "https://map.naver.com/embed/..." },
    "cta":        { "label": "예약하기", "link": "tel:010-..." }
  }
}
```

**Response (200) — 비파트너 (`hygiene` 필드가 반드시 `null`):**
```json
{
  "sections": {
    "hero":       { "title": "...", "subtitle": "..." },
    "intro":      { "body": "..." },
    "highlights": { "items": ["...", "...", "..."] },
    "hygiene":    null,
    "location":   { "mapEmbed": "https://map.naver.com/embed/..." },
    "cta":        { "label": "예약하기", "link": "tel:010-..." }
  }
}
```

**Hygiene 격리 검증 (§1.2 규약)**: 응답 직전, 서버에서 `hero|intro|highlights.items|location.mapEmbed|cta.label` 문자열에 청결 키워드 사전(예: `['청소','위생','방역','살균','청결']`)이 매칭되면 **해당 섹션만 재생성 1회** (최대 2회), 그래도 잔존하면 해당 섹션 값은 마지막 저장값 유지 + 경고 로깅. 이 검증 코드는 `src/lib/llm/hygiene-guard.ts`에 위치.

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 PAGE_NOT_FOUND`, `429 RATE_LIMITED` (5회/분/uid), `500 LLM_FAILURE`, `503 APP_CHECK_FAILED` (App Check 토큰 무효)

#### Server Action `savePage(formData)`

- Input: `pageId?: string`, `category`, `businessName`, `address`, `phone`, `keyPoints[]`, `photos[]` (이미 업로드된 Storage path)
- 초기 저장 시 `sections`는 모두 빈 값으로 초기화 (`''`, `[]`)
- `pageId` 있으면 update, 없으면 create → Firestore `pages/{pageId}`
- `updateTag(\`page:${pageId}\`)`
- Return: `{ pageId }`

#### Server Action `publishPage(pageId)`

```typescript
// pseudo-code
'use server'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { getFirestore } from 'firebase-admin/firestore'

const MAX_SLUG_ATTEMPTS = 5

export async function publishPage(pageId: string): Promise<{ slug: string }> {
  const session = (await cookies()).get('session')?.value
  const uid = await verifySessionCookie(session)
  const page = await pageRepo.get(pageId)
  if (!page || page.ownerUid !== uid) throw new Error('FORBIDDEN')

  let slug = page.slug
  if (!slug) {
    const base = slugify(page.businessName)
    const db = getFirestore()

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = `${base}-${nanoidShort()}`                    // nanoid 6자
      const slugRef = db.collection('slugs').doc(candidate)
      try {
        // create()는 문서가 이미 존재하면 ALREADY_EXISTS 에러 발생 — atomic 보장
        await slugRef.create({ pageId, createdAt: FieldValue.serverTimestamp() })
        slug = candidate
        break
      } catch (e) {
        if (!isAlreadyExistsError(e)) throw e
        // 충돌 → 다음 시도
      }
    }
    if (!slug) throw new AppError('SLUG_CONFLICT', '슬러그 충돌, 잠시 후 재시도')

    await pageRepo.update(pageId, { slug, published: true })
  } else {
    await pageRepo.update(pageId, { published: true })
  }
  revalidateTag(`page:${slug}`, 'max')   // Next.js 16: 2-arg 필수
  return { slug }
}
```

#### Server Action `signInWithEmail` / `signOut`

- Client에서 Firebase Auth로 이메일 로그인 → ID token 획득
- Server Action에 ID token 전달 → Firebase Admin이 세션 쿠키 발급 → `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`
- 만료: 5일
- `signOut`은 세션 쿠키 삭제
- **카카오 로그인은 v1.1로 디퍼**: Firebase Auth custom token 플로우(카카오 OAuth → 서버 검증 → Firebase custom token 발급) 별도 설계

### 4.3 Gemini Prompt Skeleton

`promptBuilder`는 섹션별 독립 프롬프트를 생성해 병렬 호출. **Structured Output(JSON)** 사용.

#### 공통 system instruction
```
당신은 한국 지역 상권의 소상공인 홍보글 작가입니다.
업종 표준 마케팅 톤으로 간결하고 매력적인 문구를 작성합니다.
다음 원칙을 지키세요:
1. 과장·허위 표현 금지
2. 존댓말 사용
3. 이모지는 섹션당 최대 1개
4. 주어진 JSON schema대로 응답
5. "청소했다/깨끗하다/위생" 등 청결 강조 어휘를 사용하지 마세요 — 이 섹션은 일반 마케팅용입니다
   (단, hygiene 섹션 프롬프트에는 이 줄이 반대로 적용되어 청결 어휘 사용을 허용)
```

#### 섹션별 user prompt 스켈레톤 (음식점 예시)

```ts
// src/lib/llm/prompt-builder.ts
const heroPrompt = (input) => ({
  responseSchema: { type: 'object', properties: {
    title: { type: 'string', maxLength: 30 },
    subtitle: { type: 'string', maxLength: 60 }
  }, required: ['title', 'subtitle'] },
  prompt: `업체명: ${input.businessName}
업종: 음식점
주요 특징: ${input.keyPoints.join(', ')}
트렌드 키워드(참고): ${input.trendKeywords.slice(0, 8).join(', ')}

위 정보로 히어로 섹션의 title(30자 이내)·subtitle(60자 이내)를 작성하세요.
title은 업체명과 핵심 가치를 결합, subtitle은 방문 동기를 자극하는 한 문장.`
})
```

| Section | output schema | 최대 길이 |
|---------|---------------|----------|
| hero | `{ title, subtitle }` | 30 / 60 자 |
| intro | `{ body }` | 180 자 |
| highlights | `{ items: string[3] }` | 각 40 자 |
| hygiene (파트너 전용) | `{ body }` | 140 자, 청결 어휘 허용 |
| cta | `{ label, link }` | 10 자 / URL 또는 `tel:` |

**location.mapEmbed는 LLM 생성 대상 아님** — 주소 텍스트를 Naver Map embed URL로 `lib/map/naver-embed.ts`에서 조립.

**Hygiene 격리 검증(§4.2 Processing 단계 10)**의 키워드 사전: `['청소', '청결', '위생', '방역', '살균', '세척', '소독']` — `src/lib/llm/hygiene-guard.ts`에서 상수로 관리.

---

## 5. UI/UX Design

### 5.1 Screen Layout

#### `/editor/[pageId]` (Client Component 주도)
```
┌───────────────────────────────────────────────────────┐
│  ← Back to Dashboard      [Preview] [Save] [Publish]  │
├────────────────────────┬──────────────────────────────┤
│                        │                              │
│  Left: Form            │  Right: Live Preview         │
│                        │                              │
│  [업종 선택]           │   <PromoPage mode="preview"> │
│  [업체명 __________]   │                              │
│  [주소 ____________]   │  (섹션별 인라인 편집 가능)     │
│  [전화 ____________]   │                              │
│  [키포인트 3~5개]      │                              │
│  [사진 1~3장 업로드]    │                              │
│                        │                              │
│  [🤖 AI 글 생성]       │                              │
│                        │                              │
└────────────────────────┴──────────────────────────────┘
```

#### `/p/[slug]` (Server Component, no auth)
```
┌───────────────────────────────────────────────────────┐
│   <Hero>                                              │
│     businessName (title)                              │
│     subtitle                                          │
│     photo[0]                                          │
├───────────────────────────────────────────────────────┤
│   <Intro>  body                                       │
├───────────────────────────────────────────────────────┤
│   <Highlights>                                         │
│     • item 1                                          │
│     • item 2                                          │
│     • item 3                                          │
├───────────────────────────────────────────────────────┤
│   <Hygiene>       (🧹 partner만, 없으면 렌더 X)        │
│     HygieneBadge + body                               │
├───────────────────────────────────────────────────────┤
│   <Location>      Naver Map embed                     │
├───────────────────────────────────────────────────────┤
│   <CTA>           버튼: [예약하기] tel: link           │
├───────────────────────────────────────────────────────┤
│   © Powered by 청광 (footer 소형 로고)                  │
└───────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Landing (/ ) → /login → /dashboard
                            │
                            ├─[새 페이지]→ /editor/new → (category 선택) → /editor/{pageId}
                            │                                    │
                            │                                    ├─ 폼 입력 + 저장
                            │                                    ├─ AI 생성
                            │                                    ├─ 인라인 편집
                            │                                    └─ 발행 → /p/{slug}
                            │
                            └─[기존 페이지 카드 클릭]→ /editor/{pageId}
```

### 5.3 Component List (Presentation Layer)

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| `LoginForm` | Client | `src/components/auth/` | 이메일 로그인 + Server Action 연결 |
| `DashboardGrid` | Server | `src/components/dashboard/` | 내 페이지 카드 리스트 |
| `EditorShell` | Client | `src/components/editor/` | 편집 화면 좌/우 분할 컨테이너 |
| `InputForm` | Client | `src/components/editor/` | 업체 정보 폼 (RHF/Zod 검증) |
| `PhotoUpload` | Client | `src/components/editor/` | Firebase Storage 직접 업로드 |
| `SectionEditor` | Client | `src/components/editor/` | 섹션별 인라인 편집 |
| `GenerateButton` | Client | `src/components/editor/` | `/api/generate` 호출 + 로딩 상태 |
| `PromoPage` | Server | `src/components/promo/` | 공개 페이지 렌더러, category 분기 |
| `HygieneBadge` | Server | `src/components/promo/` | 🧹 파트너 배지 |
| Section components | Server | `src/components/promo/sections/` | Hero, Intro, Highlights, Hygiene, Location, Cta |

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Cause | User Message | Action |
|------|-------|--------------|--------|
| `INVALID_INPUT` | Zod 검증 실패 | 필드별 메시지 inline | 재입력 |
| `UNAUTHORIZED` | 세션 없음/만료 | "로그인이 필요합니다" | `/login` 리다이렉트 |
| `FORBIDDEN` | 타 사용자 리소스 접근 | "접근 권한이 없습니다" | `/dashboard`로 |
| `PAGE_NOT_FOUND` | pageId/slug 미존재 | "페이지를 찾을 수 없어요" | 404 페이지 |
| `SLUG_CONFLICT` | 매우 희귀 | "잠시 후 다시 시도해주세요" | 자동 재시도 1회 |
| `RATE_LIMITED` | 생성 5회/분 초과 | "잠시 후 다시 시도해주세요" | backoff 안내 |
| `LLM_FAILURE` | Gemini 에러 | "AI 생성 실패. 다시 시도해주세요" | 재시도 버튼 |
| `STORAGE_ERROR` | 업로드 실패 | "업로드 실패. 파일 크기/형식 확인" | - |
| `INTERNAL_ERROR` | 예상치 못한 예외 | "일시적 오류가 발생했습니다" | 로그에 stack + request id |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "PAGE_NOT_FOUND",
    "message": "페이지를 찾을 수 없어요",
    "requestId": "req_01JKXYZ..."
  }
}
```

- Server Action은 `Result<T, AppError>` 형태 반환 (Error throw 대신)
- Route Handler는 Response.json(errorBody, { status })
- Public 페이지 에러 → `app/p/[slug]/not-found.tsx`로 커스텀 404

---

## 7. Security Considerations

### 7.0 Checklist

- [x] **Auth 세션**: Firebase Admin `createSessionCookie` (HttpOnly, Secure, SameSite=Lax, 5d 만료)
- [x] **Server-side 검증**: Server Action/Route Handler 진입점마다 세션 쿠키 검증
- [x] **Firestore 규칙**: default deny, owner-only write, `isCheonggwangPartner`·`partnerCleaningFrequency`는 클라 수정 불가 (§3.4)
- [x] **Storage 규칙**: 본인 경로에만 업로드, 5MB · image/* 타입 제한 (§3.5)
- [x] **입력 검증**: Zod schema → 모든 Server Action/Route Handler 진입점
- [x] **XSS**: 사용자 입력은 Next.js 기본 이스케이프로 처리. `dangerouslySetInnerHTML` 사용 금지
- [x] **CSRF**: Server Actions는 Next.js가 내장 보호. Route Handlers는 동일 출처 제약 + session 쿠키로 방어
- [x] **Rate Limit**: `/api/generate` 5회/분/uid (§7.1 상세)
- [x] **App Check (production)**: `/api/generate`·중요 Route Handler에 강제 (§7.2 상세)
- [x] **API Key 제한**: Vertex AI는 Firebase 프로젝트 내 IAM으로 접근. 클라이언트에 Gemini 키 노출 없음
- [x] **Web Firebase API Key**: 공개해도 안전 (identifier). Firestore 규칙·App Check가 실제 방어
- [x] **PII 노출 차단**: 공개 페이지(`/p/[slug]`)는 전화번호를 렌더하지만 업체 공개정보(사업자가 직접 홍보용으로 입력). 업로더 이메일·uid는 절대 노출 금지
- [x] **HTTPS**: Vercel/Firebase Hosting 강제

### 7.1 Rate Limit 구체 설계

**스토어**: Firestore `rateLimits/{uid}_{minuteBucket}` (minuteBucket = `Math.floor(Date.now() / 60_000)`)

**스키마**:
| Field | Type | Notes |
|-------|------|-------|
| count | number | 요청 누적 |
| firstAt | timestamp | 버킷 첫 요청 시각 |
| ttlExpiresAt | timestamp | firstAt + 2분 (Firestore TTL 정책으로 자동 삭제) |

**알고리즘** (`/api/generate` 진입점):
```ts
// src/lib/firebase/rate-limit.ts
export async function checkAndIncrement(uid: string, limit = 5): Promise<void> {
  const bucket = Math.floor(Date.now() / 60_000)
  const docRef = db.collection('rateLimits').doc(`${uid}_${bucket}`)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef)
    const current = snap.exists ? (snap.data()!.count as number) : 0
    if (current >= limit) throw new AppError('RATE_LIMITED', '잠시 후 다시 시도해주세요')
    if (snap.exists) {
      tx.update(docRef, { count: FieldValue.increment(1) })
    } else {
      const now = FieldValue.serverTimestamp()
      tx.set(docRef, {
        count: 1,
        firstAt: now,
        ttlExpiresAt: new Date(Date.now() + 120_000)
      })
    }
  })
}
```

**TTL**: Firestore 콘솔에서 `rateLimits` 컬렉션에 `ttlExpiresAt` TTL 정책 활성화 (버킷 도큐먼트 자동 삭제, 운영 비용 0 유지).

### 7.2 App Check 구체 설계

**Provider**: reCAPTCHA Enterprise (web) — Firebase Console → Project Settings → App Check에서 site key 등록.

**클라이언트 (browser)**:
```ts
// src/lib/firebase/client.ts 추가
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  // dev에서 debug token 사용: localStorage에 'FIREBASE_APPCHECK_DEBUG_TOKEN=true' 세팅
  if (process.env.NODE_ENV === 'development') {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  })
}
```

**서버 검증** (`/api/generate` 진입점):
```ts
import { getAppCheck } from 'firebase-admin/app-check'

const token = request.headers.get('x-firebase-appcheck')
if (!token) return jsonError(503, 'APP_CHECK_FAILED')
try {
  await getAppCheck().verifyToken(token)
} catch {
  return jsonError(503, 'APP_CHECK_FAILED')
}
```

**강제 대상**:
- v1: `/api/generate`만 강제 (LLM 호출이 비용 발생)
- v1.1+: Auth·Firestore·Storage 전체 강제 (Firebase Console에서 enforcement enable)

**개발 환경**: Firebase Console → App Check → Apps → Debug tokens에 로컬 debug token 등록.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit | `promptBuilder`, `slugify`, Zod 검증 스키마 | Vitest |
| Integration | Server Actions (Firebase Admin 모킹) | Vitest + Firebase Admin mocks |
| E2E | 로그인 → 생성 → 편집 → 발행 → 공개 페이지 조회 | Playwright |
| Manual | Gemini 생성 품질 평가 (업종별 30건 샘플) | 수동 리뷰 |

### 8.2 Test Cases (Key)

**Happy paths**
- [ ] 파트너 계정: 로그인 → 폼 입력 → AI 생성 → 편집 → 발행 → `/p/{slug}` 200 OK, `<HygieneBadge />` 렌더됨
- [ ] 비파트너 계정: 동일 플로우 → `sections.hygiene === null` 저장, `/p/{slug}`에 hygiene 섹션 DOM 아예 없음 (**2026-04-19 피벗 핵심 검증**)

**Hygiene 격리 (§1.2 규약)**
- [ ] 비파트너 계정 `/api/generate` 응답에서 hero/intro/highlights/location/cta 텍스트에 청결 키워드 사전 매칭 → 0건 (§4.2 hygiene-guard 재생성 후)
- [ ] 파트너 계정 `/api/generate` 응답에서 hygiene 섹션에만 청결 키워드 존재, 다른 섹션엔 없음
- [ ] Firestore 수동으로 `isCheonggwangPartner: false` 셋팅된 페이지의 `sections.hygiene`이 non-null이면 렌더러가 badge/섹션 둘 다 비표시

**Security / 규칙**
- [ ] Ownership: 다른 uid로 `/editor/{pageId}` 접근 → `FORBIDDEN`
- [ ] `isCheonggwangPartner` 클라 수정 시도 → Firestore 규칙 reject
- [ ] `partnerCleaningFrequency` 클라 수정 시도 → Firestore 규칙 reject
- [ ] 클라가 `trendKeywords/{category}` 직접 read 시도 → permission-denied (§3.4 v1 규약)
- [ ] Storage 6MB 이미지 업로드 시도 → reject
- [ ] App Check 토큰 없이 `/api/generate` → 503 `APP_CHECK_FAILED`

**Slug / 발행**
- [ ] Slug 충돌: `slugs.create` ALREADY_EXISTS 시 다음 nanoid 시도, 최대 5회 후 `SLUG_CONFLICT` 에러
- [ ] 공개 페이지 발행 후 편집·재발행 → `revalidateTag('page:{slug}', 'max')` 작동하여 ISR 갱신

**Rate-limit / LLM**
- [ ] `/api/generate` 6회 연속 호출 → 6번째 `RATE_LIMITED`, `rateLimits/{uid}_{bucket}.count === 5`
- [ ] 1분 경과 후 다시 호출 → 새 버킷에서 1회 허용
- [ ] Gemini timeout → 클라이언트에 `LLM_FAILURE` 전달, 재시도 버튼

**공개 접근**
- [ ] 비회원이 `/p/{slug}` 접근 → 200 OK, 로그인 요구 없음
- [ ] 비발행 page의 slug로 접근 → 404 (not-found.tsx)

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI 컴포넌트, pages, 폼 상태 | `src/components/`, `src/app/` |
| **Application** | use-case, 서비스(오케스트레이션) | `src/services/` |
| **Domain** | 엔티티·타입·순수 로직 (slugify, Zod) | `src/types/`, `src/domain/` |
| **Infrastructure** | Firebase Admin·Client, Vertex AI | `src/lib/firebase/`, `src/lib/llm/` |

### 9.2 Dependency Rules

```
Presentation ──→ Application ──→ Domain ←── Infrastructure
                      │
                      └──→ Infrastructure

- Inner layers MUST NOT depend on outer layers
- Domain은 외부 의존 없음 (pure types/logic)
```

### 9.3 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| Section components, PromoPage, InputForm | Presentation | `src/components/` |
| `/editor`, `/p/[slug]`, `/dashboard` pages | Presentation | `src/app/` |
| `pageService` (savePage, publishPage use-cases) | Application | `src/services/page-service.ts` |
| `generateService` (prompt build + gemini orchestration) | Application | `src/services/generate-service.ts` |
| `Page`, `UserProfile`, `Sections` types + `slugify` | Domain | `src/types/page.ts`, `src/domain/slugify.ts` |
| `pageSchema`, `formSchema` (Zod) | Domain | `src/domain/schemas.ts` |
| `pageRepository`, `userRepository` (incl. `getPartnerFlag(uid)`), `slugRepository`, `trendKeywordsRepository` (**read-only API — no writer method**) | Infrastructure | `src/lib/firebase/*.ts` |
| `geminiClient`, `promptBuilder`, `hygieneGuard` | Infrastructure | `src/lib/llm/` |
| `templates/[category].ts` | Infrastructure (configuration as code) | `src/lib/templates/` |
| `authHelper` (sessionCookie verify) | Infrastructure | `src/lib/firebase/auth-admin.ts` |
| `rateLimit` | Infrastructure | `src/lib/firebase/rate-limit.ts` |

### 9.4 Write-Isolation Boundary (파이프라인과의 관계)

연구 파이프라인(`content-research-pipeline`)과 본 기능은 **단방향 데이터 흐름**:

```
[content-research-pipeline]  ──writes──▶  Firestore trendKeywords/{category}, templates/*/proposals/*
                                                           │
                                                           │ reads only
                                                           ▼
[promo-page]  ── reads ──▶  trendKeywordsRepository.get(category)
              ── reads ──▶  src/lib/templates/[category].ts  (git에 커밋된 버전)
```

**규약 (위반 시 `/pdca analyze` 차단)**:
- `src/lib/firebase/trend-keywords-repository.ts`는 `get(category)` / `getAll()` 메서드만 제공. `set`·`update`·`delete` 메서드를 정의하지 않는다
- `promo-page` 코드베이스의 어느 파일에서도 Firestore `trendKeywords/**`, `templates/**/proposals/**`에 쓰기를 수행하지 않는다
- `templates/[category].ts`의 수정은 **연구 파이프라인의 proposal을 운영자가 검수한 뒤 git PR로만** 반영된다 (직접 코드 수정 금지)

### 9.5 Domain Constants

공통 상수는 `src/domain/constants.ts` 단일 소스:

```ts
export const MAX_PHOTOS = 3
export const MIN_KEY_POINTS = 3
export const MAX_KEY_POINTS = 5
export const MAX_BUSINESS_NAME = 40
export const MAX_ADDRESS = 120
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
export const SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 5
export const RATE_LIMIT_PER_MIN = 5
export const SLUG_MAX_ATTEMPTS = 5
export const HYGIENE_KEYWORDS = ['청소', '청결', '위생', '방역', '살균', '세척', '소독'] as const
```

Zod 스키마, Storage 규칙, UI 카운터 모두 이 상수를 참조.

---

## 10. Coding Convention Reference

### 10.1 Naming

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `PromoPage.tsx`, `SectionEditor.tsx` |
| Functions/Hooks | camelCase / use* | `slugify()`, `useEditorState()` |
| Constants | UPPER_SNAKE_CASE | `MAX_PHOTOS = 3` |
| Types/Interfaces | PascalCase | `Page`, `Sections` |
| Files (component) | PascalCase.tsx | `PromoPage.tsx` |
| Files (utility/service) | kebab-case.ts | `page-service.ts`, `prompt-builder.ts` |
| Folders | kebab-case | `editor/`, `promo/sections/` |

### 10.2 Import Order

```typescript
// 1. External
import { useState } from 'react'
import { nanoid } from 'nanoid'

// 2. Internal absolute
import { pageService } from '@/services/page-service'
import { Button } from '@/components/ui/button'

// 3. Relative
import { useEditorState } from './hooks/use-editor-state'

// 4. Types
import type { Page, Sections } from '@/types/page'

// 5. Styles (rare, Tailwind-first)
import './editor.css'
```

### 10.3 Environment Variables

| Prefix | Purpose | Scope |
|--------|---------|-------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config | Client |
| `FIREBASE_ADMIN_*` | Service Account JSON (base64) | Server only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini AI Studio API Key | Server only |
| `GOOGLE_GENERATIVE_AI_MODEL` | 사용할 Gemini 모델명 (예: `gemini-3-flash-preview`) | Server only |
| `GOOGLE_APPLICATION_CREDENTIALS` | (옵션) Firebase Admin ADC fallback, Vertex AI는 v1에 미사용 | Server only |
| `NEXT_PUBLIC_APP_URL` | Public absolute URL for OG | Client |

### 10.4 This Feature's Conventions

| Item | Convention |
|------|-----------|
| Server/Client boundary | 기본 Server Component. 상호작용 필요한 것만 `'use client'` |
| State management | Server state는 Server Component 재렌더 + `updateTag`. Client 로컬 state는 useState + zod-validated form (React Hook Form) |
| Async params | Next.js 16 규약대로 모든 `params`/`searchParams` await |
| Error | `Result<T, AppError>` 타입으로 Server Action 반환. Route Handler는 `Response.json` |
| Caching | Public page: `'use cache' + cacheTag + cacheLife('days')`. Mutation: `updateTag` (edit) / `revalidateTag` (publish) |
| Form | React Hook Form + Zod. Server Action에 FormData 바로 전달 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (Tailwind globals)
│   ├── page.tsx                          # / (간단한 랜딩)
│   ├── (auth)/login/page.tsx             # 이메일 로그인
│   ├── (customer)/
│   │   ├── layout.tsx                    # 로그인 가드 (서버에서 세션 검증)
│   │   ├── dashboard/page.tsx            # 페이지 목록
│   │   └── editor/
│   │       ├── new/page.tsx              # 카테고리 선택 후 pageId 생성
│   │       └── [pageId]/page.tsx         # 편집 (async params)
│   ├── p/[slug]/
│   │   ├── page.tsx                      # 공개 페이지 (async params)
│   │   ├── not-found.tsx
│   │   └── opengraph-image.tsx           # 동적 OG (async params·id)
│   ├── api/
│   │   ├── health/route.ts
│   │   └── generate/route.ts             # POST /api/generate
│   └── actions/                          # Server Actions (모두 'use server')
│       ├── auth-actions.ts               # signInWithEmail, signOut
│       └── page-actions.ts               # savePage, publishPage, unpublishPage, deletePage
├── components/
│   ├── auth/LoginForm.tsx
│   ├── dashboard/DashboardGrid.tsx
│   ├── editor/{EditorShell, InputForm, PhotoUpload, SectionEditor, GenerateButton}.tsx
│   ├── promo/
│   │   ├── PromoPage.tsx
│   │   ├── HygieneBadge.tsx
│   │   └── sections/{Hero, Intro, Highlights, Hygiene, Location, Cta}.tsx
│   └── ui/                               # button, input 등 공통
├── services/
│   ├── page-service.ts                   # savePage, publishPage 로직
│   └── generate-service.ts               # 섹션별 LLM 오케스트레이션
├── domain/
│   ├── slugify.ts
│   ├── constants.ts                      # §9.5 단일 상수 소스
│   └── schemas.ts                        # Zod 스키마 모음
├── lib/
│   ├── firebase/
│   │   ├── client.ts                     # 브라우저 SDK
│   │   ├── admin.ts                      # Admin SDK (lazy singleton)
│   │   └── auth-admin.ts                 # verifySessionCookie 등
│   ├── llm/
│   │   ├── gemini.ts                     # @google/generative-ai 클라이언트 (AI Studio API)
│   │   ├── prompt-builder.ts
│   │   └── hygiene-guard.ts              # §4.2 청결 어휘 격리 검증
│   └── templates/
│       ├── restaurant.ts
│       ├── salon.ts
│       └── cafe.ts
├── types/
│   └── page.ts
└── proxy.ts                              # middleware → proxy (Node runtime, 간단한 public route passthrough)

next.config.ts                            # cacheComponents, images.remotePatterns 등
firestore.rules                           # §3.4
storage.rules                             # §3.5
```

### 11.2 Implementation Order

1. [ ] **인프라 기반** — `src/lib/firebase/{client,admin,auth-admin}.ts`, `next.config.ts`(cacheComponents, remotePatterns), `firestore.rules`·`storage.rules` 배포
2. [ ] **도메인 타입** — `src/types/page.ts`, `src/domain/schemas.ts`, `src/domain/slugify.ts`
3. [ ] **템플릿 모듈** — `src/lib/templates/{restaurant,salon,cafe}.ts` (v1 섹션 구조 fixed)
4. [ ] **Auth 플로우** — `LoginForm`, `signInWithEmail`/`signOut` Server Actions, `(customer)/layout.tsx` 가드, `proxy.ts`
5. [ ] **Page CRUD** — `pageRepository`, `pageService`, `savePage`/`publishPage` Server Actions
6. [ ] **Editor UI** — `EditorShell`, `InputForm`, `PhotoUpload`, `SectionEditor`
7. [ ] **LLM 연동** — `gemini.ts`, `promptBuilder`, `generateService`, `/api/generate` Route Handler
8. [ ] **공개 페이지** — `app/p/[slug]/page.tsx` (async params + `'use cache'` + `cacheTag` + `cacheLife`), `PromoPage` 및 섹션 컴포넌트, `HygieneBadge`
9. [ ] **OG 이미지** — `opengraph-image.tsx` (Next.js 16: async `params`·`id`)
10. [ ] **테스트** — Vitest + Playwright 구성, §8.2 케이스 작성
11. [ ] **App Check** — 프로덕션 배포 전 활성화

---

## 12. Next.js 16 Specific Patterns (참고 코드)

### 12.1 async params (page)

```tsx
// src/app/p/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getPublicPageBySlug } from '@/services/page-service'

export default async function Page(props: PageProps<'/p/[slug]'>) {
  const { slug } = await props.params
  const page = await getPublicPageBySlug(slug)
  if (!page) notFound()
  return <PromoPage page={page} />
}

export async function generateMetadata(props: PageProps<'/p/[slug]'>) {
  const { slug } = await props.params
  const page = await getPublicPageBySlug(slug)
  return {
    title: page?.sections.hero.title ?? '',
    description: page?.sections.intro.body?.slice(0, 160) ?? '',
  }
}
```

### 12.2 'use cache' + cacheTag + cacheLife

```tsx
// src/services/page-service.ts
import { cacheLife, cacheTag } from 'next/cache'
import { pageRepository, slugRepository } from '@/lib/firebase/admin'

export async function getPublicPageBySlug(slug: string) {
  'use cache'
  cacheTag(`page:${slug}`)
  cacheLife('days')
  const { pageId } = (await slugRepository.get(slug)) ?? {}
  if (!pageId) return null
  const page = await pageRepository.get(pageId)
  return page?.published ? page : null
}
```

### 12.3 Server Action + updateTag

```tsx
// src/app/actions/page-actions.ts
'use server'
import { revalidateTag, updateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { verifySessionCookie } from '@/lib/firebase/auth-admin'
import { pageRepository, slugRepository } from '@/lib/firebase/admin'
import { slugify, nanoidShort } from '@/domain/slugify'

export async function savePage(formData: FormData) {
  const uid = await verifySessionCookie((await cookies()).get('session')?.value)
  const parsed = savePageSchema.parse(Object.fromEntries(formData))
  const pageId = await pageRepository.upsert(uid, parsed)
  updateTag(`page:${pageId}`)    // 편집자 즉시 반영
  return { ok: true, pageId }
}

export async function publishPage(pageId: string) {
  const uid = await verifySessionCookie((await cookies()).get('session')?.value)
  const page = await pageRepository.get(pageId)
  if (!page || page.ownerUid !== uid) throw new Error('FORBIDDEN')

  let slug = page.slug
  if (!slug) {
    slug = `${slugify(page.businessName)}-${nanoidShort()}`
    await slugRepository.create(slug, pageId)
    await pageRepository.update(pageId, { slug, published: true })
  } else {
    await pageRepository.update(pageId, { published: true })
  }
  revalidateTag(`page:${slug}`, 'max')  // Next.js 16: 2-arg 필수
  return { ok: true, slug }
}
```

### 12.4 next.config.ts

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
}
export default nextConfig
```

### 12.5 Firebase Admin 초기화 (HMR-safe singleton, §9.3 Infrastructure)

**환경변수 우선순위** (design.md §10.3 테이블 확정):
1. `FIREBASE_ADMIN_SA_BASE64` (base64 인코딩된 service account JSON) — **v1 채택**. Vercel env에 저장
2. `GOOGLE_APPLICATION_CREDENTIALS` (로컬 JSON 파일 경로) — 개발 환경 fallback
3. Firebase Functions 실행 시엔 ADC 자동 — 연구 파이프라인 쪽에서만 해당

```ts
// src/lib/firebase/admin.ts
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getAppCheck } from 'firebase-admin/app-check'

function buildCredential() {
  const b64 = process.env.FIREBASE_ADMIN_SA_BASE64
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    return cert(json)
  }
  // GOOGLE_APPLICATION_CREDENTIALS가 설정되어 있으면 ADC가 자동으로 사용
  return applicationDefault()
}

// Next.js dev HMR 대응: globalThis에 저장
const globalForAdmin = globalThis as unknown as { __firebaseAdminApp?: App }

export const adminApp: App =
  globalForAdmin.__firebaseAdminApp ??
  (globalForAdmin.__firebaseAdminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: buildCredential() }))

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
export const adminAppCheck = getAppCheck(adminApp)
```

### 12.6 OG 이미지 (`opengraph-image.tsx`)

Next.js 16: `params`·`id` 둘 다 Promise. `generateImageMetadata`의 `params`는 여전히 동기.

```tsx
// src/app/p/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { cacheTag, cacheLife } from 'next/cache'
import { getPublicPageBySlug } from '@/services/page-service'

export const alt = '홍보 페이지'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  'use cache'
  const { slug } = await params
  cacheTag(`page:${slug}`)                  // page와 동일한 tag 공유 → 재발행 시 OG도 무효화
  cacheLife('days')

  const page = await getPublicPageBySlug(slug)
  const title = page?.sections.hero.title ?? '홍보 페이지'
  const cover = page?.photos[0]?.url

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', color: '#fff',
        padding: 64, justifyContent: 'flex-end',
      }}>
        {cover && (
          // ImageResponse 내부에서는 next/image가 아닌 <img> 직접 사용
          <img src={cover} width={1200} height={630}
               style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.4 }} />
        )}
        <div style={{ fontSize: 72, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: 0.85 }}>청광 홍보 페이지</div>
      </div>
    ),
    size
  )
}
```

**폰트**: 한글은 ImageResponse 기본 지원 폰트로는 렌더 품질 한계. v1은 Pretendard variable 폰트를 `fetch`로 로드 — 배포 시 정적 파일에 포함. v1.1에서 font optimization.

### 12.7 HygieneSection 데이터 흐름 (§3.1 명확화)

**결정**: `sections.hygiene.body`는 **생성 시점에 `partnerCleaningFrequency`가 포함된 완성 문장**으로 저장. 렌더 시점에 동적으로 합치지 않음.

근거: (a) LLM이 문맥에 맞게 주기 표현을 자연스럽게 섞을 수 있음, (b) 공개 페이지 렌더는 순수 함수화되어 캐시 안전성 ↑, (c) 운영자가 Firestore에서 `partnerCleaningFrequency`를 변경해도 기존 발행 페이지는 재생성 전까지 과거 문구 유지 (의도적 트레이드오프).

```ts
// src/lib/llm/prompt-builder.ts — hygiene prompt (파트너 전용)
const hygienePrompt = (input) => ({
  responseSchema: { type: 'object', properties: { body: { type: 'string', maxLength: 140 } }, required: ['body'] },
  prompt: `업체명: ${input.businessName}
청광 청소 주기: ${input.partnerCleaningFrequency ?? '정기'}

위 주기를 자연스럽게 섞어 고객에게 위생·청결 신뢰감을 주는 한 문단(140자 이내)을 작성하세요.
과장 없이 담백하게, "청광 파트너"라는 표현을 1회 포함합니다.`
})
```

렌더 시에는 `<HygieneBadge cleaningFrequency={user.partnerCleaningFrequency} />`는 별도 배지 UI용으로 `users/{uid}.partnerCleaningFrequency`를 조회 — 최신값 반영.

### 12.8 proxy.ts (middleware 대체)

```ts
// proxy.ts (프로젝트 루트)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('session')?.value

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/editor')
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/editor/:path*'],
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-19 | Initial draft (Plan Plus 기반, Next.js 16 breaking changes 전면 반영) | Seokho Lee |
| 0.2 | 2026-04-19 | design-validator 리뷰 반영: CRITICAL C1/C2 (hygiene 격리 원칙 §1.2, nullable 명시 §4.2). IMPORTANT #3/#4/#6/#7/#8/#9/#10/#11/#12/#13/#15/#16. 카카오 v1.1 디퍼. §4.3/§7.1/§7.2/§9.4/§9.5/§12.5/§12.6/§12.7 신설 | Seokho Lee |
| 0.3 | 2026-04-19 | LLM 공급자 변경: Vertex AI (IAM) → Google AI Studio API (`@google/generative-ai` SDK). 사용자 제공 API 키 기반, 모델 `gemini-3-flash-preview`. §4.1/§9.3/§10.3/§11.1 업데이트 | Seokho Lee |
