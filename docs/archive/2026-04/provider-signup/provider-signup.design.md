---
template: design
version: 0.1
feature: provider-signup
date: 2026-04-20
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-signup Design Document

> **Summary**: Marketplace Track v1.1 첫 feature. 청명이 self-serve로 회원가입 + 업체 프로필 생성하는 single-page signup 플로우. `/signup-provider` 라우트, Firebase Auth + Firestore transaction + Resend (welcome + admin alert) 통합.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Status**: Draft
> **Plan**: [provider-signup.plan.md](../../01-plan/features/provider-signup.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** `/provider/profile` stub 컨텐츠 | 헤더(환영 {companyName}!) + TODO 3 체크리스트 (프로필 사진·priceBook·Before/After — 모두 비활성, "곧 추가됩니다" 안내) + 로그아웃 버튼 + discover/홈 링크 |
| **Q2** Welcome 이메일 copy | §8.1 HTML 템플릿 (환영 + 첫 3 단계 안내 + 프로필 완성 CTA). Plain text fallback 포함. |
| **Q3** providerId 생성 방식 | **Firestore auto doc().id** (기존 `pageRepository.create` 패턴 일치). nanoid 불필요 — 업로드된 파일 경로 의존성 없음 (프로필 사진은 v1.1 editor에서). |
| **Q4** users doc merge 시 legacy 필드 보존 | `adminDb.collection('users').doc(uid).set({...addedFields}, {merge:true})` — diff만 업데이트. `isCheonggwangPartner`는 signup 흐름에서 건드리지 않음. |
| **Q5** 약관 링크 실제 문서 | `/terms`, `/privacy` placeholder 페이지 (신규) — 간단한 "준비 중" 문구 + 운영자 연락처. 실제 법무 문서는 별도 작업 (본 feature 밖). 체크박스는 여전히 blocking (submit 차단). |
| **Q6** proxy.ts matcher | `/signup-provider`는 `(auth)` 그룹이므로 **matcher에 추가하지 않음** (비인증 접근 허용). `/provider/*` matcher는 추가 (인증 필요 — 직접 URL 입력으로 프로필 진입 차단). |
| **Q7** Self-heal 라우트 | **v1 MVP 생략**. Firestore transaction의 atomicity에 의존. TX 실패 시 에러 반환 → client 재시도 유도. `/complete-provider-signup`은 v1.1b 이후 고려. |

---

## 1. Overview

### 1.1 Design Goals
- 5분 이내 가입 완료 (폼 체감 속도 P95 < 3초)
- 기존 archived 자산(promo-page `signInWithEmail`, LoginForm, PhotoUpload 패턴)과 **일관된 Server Action 구조**
- Firestore transaction으로 **users+providers 동시 쓰기 atomicity 보장**
- Email 발송 실패가 signup 실패를 야기하지 않음 (graceful via `Promise.allSettled`)
- v1.1 나머지 feature의 테스트 provider 계정 확보

### 1.2 Design Principles
- **Client-first auth**: Firebase Auth는 client SDK로 직접 호출 (기존 `signInWithEmail` 패턴), Server는 idToken 검증만
- **Server-atomic data**: users·providers·role 3-write는 Firestore TX로 묶음
- **Reuse over rewrite**: `sendViaResend`, `quote-email-template` escapeHtml, `AppError`·`ActionResult`, `checkAndIncrement` 전부 재활용
- **Role-aware redirect**: `users.providerId` 존재 여부로 post-login 라우팅 분기
- **Defense in depth**: Firestore rules도 `ownerUid == auth.uid` 강제 (Admin SDK 우회 대비)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│  / (MarketplaceHome)                                 │
└──────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│  /login (기존)                                        │
│  + "아직 청명이 아니신가요? 청명으로 가입 →" 링크        │
└──────────────────────────────────────────────────────┘
              │ 클릭
              ▼
┌──────────────────────────────────────────────────────┐
│  /signup-provider (새 페이지)                          │
│  └─ ProviderSignupForm (Client)                      │
│      RHF + zodResolver + firebase/auth client        │
└──────────────────────────────────────────────────────┘
              │ submit
              ▼
┌──────────────────────────────────────────────────────┐
│  Client:                                             │
│   1. createUserWithEmailAndPassword(email, pw)       │
│   2. sendEmailVerification(user) (fire-and-forget)   │
│   3. getIdToken()                                    │
└──────────────────────────────────────────────────────┘
              │ Server Action
              ▼
┌──────────────────────────────────────────────────────┐
│ [Server Action: registerProvider(input)]             │
│   1. zod parse (registerProviderInputSchema)         │
│   2. adminAuth.verifyIdToken → {uid, email}          │
│   3. rateLimit.checkAndIncrement('signup:'+email,3,  │
│        60*60*1000)                                   │
│   4. 중복 provider 체크 (providers where ownerUid=uid) │
│   5. Firestore transaction:                          │
│      • providers/{newId}.create(...)                 │
│      • users/{uid}.set(merge):                       │
│          roles arrayUnion 'provider',                │
│          providerId: newId,                          │
│          contactPhone                                │
│   6. Promise.allSettled:                             │
│      • sendWelcomeEmail(email, companyName)          │
│      • sendAdminAlert(OPERATOR_EMAIL, payload)       │
│   7. createSessionCookie(idToken) + cookies().set    │
│   8. return { ok: true, data: { providerId } }       │
└──────────────────────────────────────────────────────┘
              │ success
              ▼
┌──────────────────────────────────────────────────────┐
│  /provider/profile (stub)                            │
│  - "환영합니다 {companyName}!"                         │
│  - TODO 3 체크리스트 (disabled)                        │
│  - "로그아웃" / "홈으로" 링크                           │
└──────────────────────────────────────────────────────┘
```

### 2.2 Flow 다이어그램 (sequence)

```
Client               Firebase Auth        Server Action        Firestore           Resend       Browser
  │                       │                     │                  │                  │            │
  │─createUser(...)──────▶│                     │                  │                  │            │
  │◀──user+idToken────────│                     │                  │                  │            │
  │─sendEmailVerif.──────▶│                     │                  │                  │            │
  │  (fire-and-forget)    │                     │                  │                  │            │
  │─registerProvider(idT,data)────────────────▶│                  │                  │            │
  │                                              │─verifyIdToken───▶│                  │            │
  │                                              │◀───{uid,email}──│                  │            │
  │                                              │─rate check─────▶│                  │            │
  │                                              │─TX(providers.cr + users.upd)─▶│     │            │
  │                                              │◀──committed─────│                  │            │
  │                                              │─Promise.allSettled([welcome,alert])────▶│       │
  │                                              │◀───both sent or warn───────────│    │            │
  │                                              │─createSessionCookie────────▶   │    │            │
  │                                              │─cookies().set──────────────────│    │            │
  │◀──{ok:true,data:{providerId}}───────────────│                  │                  │            │
  │─router.push('/provider/profile')──────────────────────────────────────────────────────────▶│
  │                                                                                              │
```

---

## 3. Data Model

### 3.1 `users/{uid}` (기존 확장)

```typescript
// src/types/page.ts — UserProfile 확장
export type UserRole = 'client' | 'provider';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isCheonggwangPartner: boolean;              // legacy
  partnerCleaningFrequency?: string;           // legacy
  roles?: UserRole[];                          // quote-request에서 추가됨
  // ↓ provider-signup v1.1 신규 ↓
  providerId?: string;                         // 1:1 링크 (provider role 있을 때만)
  contactPhone?: string;                       // 본인 연락처 (청명 전용 노출 정책은 profile-editor에서)
  createdAt: Date;
}
```

### 3.2 `providers/{providerId}` (기존 + Master Plan 확장 일부)

```typescript
// src/types/provider.ts — Provider 확장
export interface Provider {
  id: string;
  ownerUid: string;                            // users.uid 링크 (1:1)
  companyName: string;
  categories: QuoteCategory[];                 // signup 시 [1]
  regions: ProviderRegion[];                   // signup 시 []
  contactEmail: string;                        // = auth email
  contactPhone?: string;                       // signup 시 필수
  description?: string;                        // signup 시 null
  isCheonggwangOwned: boolean;                 // self-signup = false
  insured: boolean;                            // 초기 false
  insuranceAmount?: number;                    // ← 신규 optional
  pageId: string | null;
  rating: number | null;
  reviewCount?: number | null;                 // ← 신규 optional
  responseTimeHours: number | null;
  verified?: boolean;                          // ← 신규 self-signup = false
  yearsOfExperience?: number;                  // ← 신규 optional
  isAvailable?: boolean;                       // ← 신규 optional (v1.1b provider-dashboard)
  priceBook?: Array<{ ... }>;                  // v1.1 provider-profile-editor
  profileImage?: string;
  profileImagePath?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Firestore Rules 업데이트

**기존 quote-request가 추가한 블록 수정**:

```javascript
// ─── providers ─────────────────────────────────────────
match /providers/{providerId} {
  allow read: if true;

  // v1.1 signup — owner self-create 허용, 단 특정 필드 강제
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid
                && request.resource.data.isCheonggwangOwned == false    // self = false
                && request.resource.data.verified == false               // admin 이전 false
                && request.resource.data.insured == false                // 초기 false
                && request.resource.data.categories.size() >= 1          // 최소 1개
                && request.resource.data.categories.size() <= 6;

  // v1.1 provider-profile-editor에서 확장. 지금은 false.
  allow update: if false;
  allow delete: if false;
}
```

**users 블록 업데이트** (기존 legacy 제약 유지 + 신규 필드 허용):

```javascript
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;

  allow create: if request.auth != null
                && request.auth.uid == uid
                && (
                  !('isCheonggwangPartner' in request.resource.data)
                  || request.resource.data.isCheonggwangPartner == false
                );

  // legacy partner 필드 변경 금지 유지 + 자기 자신 update
  // roles/providerId/contactPhone은 Admin SDK(Server Action)에서만 쓰는 정책.
  // 여기서는 defense-in-depth로 client 변조만 차단.
  allow update: if request.auth != null
                && request.auth.uid == uid
                && !request.resource.data.diff(resource.data).affectedKeys()
                     .hasAny(['isCheonggwangPartner', 'partnerCleaningFrequency', 'email']);

  allow delete: if false;
}
```

---

## 4. API Specification

### 4.1 Server Action `registerProvider`

```ts
// src/app/actions/provider-signup-actions.ts
'use server';

export interface RegisterProviderServerInput {
  idToken: string;
  companyName: string;
  primaryCategory: QuoteCategory;
  contactPhone: string;
  marketingAgreed?: boolean;
}

export async function registerProvider(
  input: RegisterProviderServerInput,
): Promise<ActionResult<{ providerId: string }>>;
```

**Processing (10 steps)**:
1. `registerProviderInputSchema.parse(input)` — Zod validation (throws on invalid)
2. `adminAuth.verifyIdToken(input.idToken)` → `{ uid, email }`
3. `checkAndIncrement('signup:' + email, 3, 60 * 60 * 1000)` — 1시간 3건
4. 중복 체크: `providers where ownerUid == uid limit 1` — 이미 있으면 `AppError('ALREADY_REGISTERED')`
5. Firestore transaction:
   - `const providerRef = adminDb.collection('providers').doc();`
   - `providers/{providerRef.id}.create({...})`
   - `users/{uid}.set({
        email, displayName: companyName,
        roles: FieldValue.arrayUnion('provider'),
        providerId: providerRef.id,
        contactPhone,
        isCheonggwangPartner: false,   // legacy 기본값 (merge 시 없으면만)
        createdAt: FieldValue.serverTimestamp(),  // users 신규인 경우만 실질 반영 (merge)
      }, { merge: true })`
6. `Promise.allSettled([sendWelcomeEmail(...), sendAdminAlert(...)])` — 실패 warn log
7. `const session = await createSessionCookie(input.idToken); cookies().set(...)` 
8. Return `{ ok: true, data: { providerId: providerRef.id } }`

**Error mapping**:
| Code | HTTP 시맨틱 | 조건 |
|------|-------------|------|
| `INVALID_INPUT` | 400 | Zod 실패 |
| `UNAUTHORIZED` | 401 | verifyIdToken 실패 |
| `RATE_LIMITED` | 429 | signup 1hr 3건 초과 |
| `ALREADY_REGISTERED` | 409 | 이미 providers.ownerUid 존재 (신규 AppErrorCode 추가) |
| `INTERNAL_ERROR` | 500 | Firestore TX 실패 |

**신규 `AppErrorCode` 추가**: `ALREADY_REGISTERED`

### 4.2 Zod Schema

```ts
// src/domain/provider-signup-schema.ts (신규)
import { z } from 'zod';
import { QUOTE_CATEGORIES, type QuoteCategory } from './quote-category';

// ─── Client form schema ─────────────────
export const providerSignupFormSchema = z
  .object({
    email: z.string().email('이메일 형식이 올바르지 않습니다'),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상')
      .max(64, '비밀번호는 64자 이하'),
    passwordConfirm: z.string(),
    companyName: z.string().min(2, '업체명은 2자 이상').max(40),
    primaryCategory: z.enum(
      QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
    ),
    contactPhone: z.string().regex(
      /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
      '전화번호 형식이 올바르지 않습니다',
    ),
    termsAgreed: z.literal(true, {
      errorMap: () => ({ message: '약관 동의가 필요합니다' }),
    }),
    marketingAgreed: z.boolean().optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  });

export type ProviderSignupFormInput = z.infer<typeof providerSignupFormSchema>;

// ─── Server Action schema (idToken + 비번 제외 필드) ─────
export const registerProviderInputSchema = z.object({
  idToken: z.string().min(10),
  companyName: z.string().min(2).max(40),
  primaryCategory: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  contactPhone: z.string().regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/),
  marketingAgreed: z.boolean().optional(),
});

export type RegisterProviderInput = z.infer<
  typeof registerProviderInputSchema
>;
```

### 4.3 에러 확장 (`src/lib/errors.ts`)

```ts
export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PAGE_NOT_FOUND'
  | 'SLUG_CONFLICT'
  | 'RATE_LIMITED'
  | 'LLM_FAILURE'
  | 'STORAGE_ERROR'
  | 'APP_CHECK_FAILED'
  | 'ALREADY_REGISTERED'                   // ← 신규
  | 'INTERNAL_ERROR';
```

---

## 5. UI / UX Design

### 5.1 `/login` (기존 수정)

하단에 링크 추가:

```tsx
// src/app/(auth)/login/page.tsx 내부 or LoginForm 하단에 추가
<div className="mt-6 border-t border-zinc-200 pt-4 text-center text-sm dark:border-zinc-800">
  <span className="text-zinc-600 dark:text-zinc-400">청소 업체를 운영하시나요?</span>{' '}
  <Link
    href="/signup-provider"
    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
  >
    청명으로 가입 →
  </Link>
</div>
```

### 5.2 `/signup-provider` (신규 페이지)

```
┌─────────────────────────────────────────────┐
│  ← 로그인                                    │  헤더 (← Link to /login)
├─────────────────────────────────────────────┤
│  청명 가입                                   │  h1
│  청소 업체를 청광에 등록하세요                 │  subtitle
│                                             │
│  이메일                                      │
│  [______________________________]          │
│                                             │
│  비밀번호 (8자 이상)                          │
│  [______________________________]          │
│                                             │
│  비밀번호 확인                                │
│  [______________________________]          │
│                                             │
│  업체명                                      │
│  [______________________________]          │
│                                             │
│  대표 카테고리                                │
│  [🏠 입주청소 ▾]                            │  (6종 select)
│                                             │
│  전화번호                                    │
│  [010-1234-5678_______________]             │
│                                             │
│  [x] 서비스 이용약관 · 개인정보 처리방침 동의  │  (blocking)
│  [ ] 마케팅 정보 수신 동의 (선택)             │
│                                             │
│  [        청명으로 가입하기        ]         │  primary button
│                                             │
│  ────────────                               │
│  이미 가입하셨나요? 로그인 →                   │
└─────────────────────────────────────────────┘
```

### 5.3 `/provider/profile` (신규 stub)

```
┌─────────────────────────────────────────────┐
│  청명 프로필                        [로그아웃] │  
├─────────────────────────────────────────────┤
│                                             │
│  🎉 {companyName}님, 가입을 환영합니다!        │  h1
│                                             │
│  프로필을 완성해 첫 견적을 받아보세요            │  subtitle
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 프로필 완성 체크리스트                    │   │
│  │                                     │   │
│  │  ☐ 프로필 사진 추가                   │   │  (disabled, 곧)
│  │  ☐ 서비스 단가 작성                   │   │  (disabled, 곧)
│  │  ☐ Before/After 포트폴리오 업로드     │   │  (disabled, 곧)
│  │                                     │   │
│  │  편집 기능은 곧 추가됩니다              │   │  (작은 안내)
│  └─────────────────────────────────────┘   │
│                                             │
│  [ 받은 요청 확인하기 ]  [ 홈으로 ]           │  (2nd button은 /provider/requests — v1.1에서 생김)
│                                             │
└─────────────────────────────────────────────┘
```

### 5.4 `/terms`, `/privacy` (placeholder)

```tsx
// src/app/terms/page.tsx, src/app/privacy/page.tsx
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-bold">서비스 이용약관</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        현재 약관 문서를 준비 중입니다. 문의는{' '}
        <a className="underline" href="mailto:peter15975345@gmail.com">
          peter15975345@gmail.com
        </a>
        으로 주세요.
      </p>
    </main>
  );
}
```

### 5.5 Component List

| Component | Type | Location | Role |
|-----------|------|----------|------|
| `SignupProviderPage` | Server | `app/(auth)/signup-provider/page.tsx` | shell |
| `ProviderSignupForm` | Client | `components/auth/ProviderSignupForm.tsx` | RHF + zodResolver + firebase/auth client + Server Action dispatch |
| `LoginForm` | Client | 기존 | `/signup-provider` 링크 추가 |
| `ProviderProfilePage` | Server | `app/provider/profile/page.tsx` | stub (Suspense wrapped) |
| `TermsPage` / `PrivacyPage` | Server | `app/terms/page.tsx`, `app/privacy/page.tsx` | placeholder |

### 5.6 User Flow (전체)

```
1. 고객이 홈 → /login → "청명으로 가입" 링크 클릭 → /signup-provider
2. ProviderSignupForm 입력 (email, pw, pw확인, 업체명, 카테고리, 전화번호, 약관 ✓)
3. submit → 
   3a. Client: createUserWithEmailAndPassword → {user, idToken}
   3b. Client: sendEmailVerification (fire-and-forget)
   3c. Client: Server Action registerProvider(idToken, data)
4. Server: verify → rate limit → 중복 check → TX (providers+users) → Resend 2건 → cookie set
5. Success → router.push('/provider/profile')
6. /provider/profile에서 환영 메시지 + TODO 체크리스트 표시
```

---

## 6. Error Handling

| Code | User Message | Recovery |
|------|-------------|----------|
| `INVALID_INPUT` | 필드별 zod 메시지 | 폼 유지 + 에러 inline 표시 |
| `UNAUTHORIZED` | "인증에 실패했습니다. 다시 시도해주세요" | 토큰 재발급 retry |
| `RATE_LIMITED` | "요청이 많습니다. 1시간 후 다시 시도해주세요" | disabled |
| `ALREADY_REGISTERED` | "이미 청명으로 가입된 계정입니다. 로그인으로 이동하세요" | `/login?next=/provider/profile` |
| `INTERNAL_ERROR` | "일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요" | retry 버튼 |

### 6.1 Firebase Auth client 에러 (client-side)

| code | message |
|------|---------|
| `auth/email-already-in-use` | "이미 가입된 이메일입니다" + "로그인" 링크 |
| `auth/invalid-email` | "이메일 형식이 올바르지 않습니다" |
| `auth/weak-password` | "비밀번호는 8자 이상이어야 합니다" |
| `auth/too-many-requests` | "잠시 후 다시 시도해주세요" |
| `auth/network-request-failed` | "네트워크 오류입니다. 다시 시도해주세요" |

---

## 7. Security Considerations

- **비밀번호**: Firebase Auth가 hash + salt로 처리 (client 전달 직후 메모리에서 사라짐)
- **이메일 인증**: 가입 직후 Firebase 자체 이메일 발송 (fire-and-forget, blocking 아님)
- **Rate limit**: `signup:{email}` 1시간 3건 (기존 `checkAndIncrement` 재활용)
- **Session**: httpOnly + secure(prod) + SameSite=lax + 5일 expiry (기존 `SESSION_COOKIE_MAX_AGE_SEC`)
- **Firestore rules**: `providers.create` owner + required fields, `users.update` legacy 필드 보호
- **Admin SDK bypass**: rules는 defense-in-depth. Server Action이 실제 쓰기 담당 (atomic TX)
- **CSRF**: Next.js Server Action 내장 보호 (same-origin + action ID verification)
- **PII**: contactPhone은 server-only read (rules로 공개 차단), 가입 시점부터 이후 exposure는 provider-profile-editor에서 visible 토글 (v1.1)

---

## 8. Email Template

### 8.1 Welcome 이메일 (`src/lib/email/welcome-email.ts`)

```ts
import 'server-only';
import { sendViaResend, requireEmailEnv } from './resend';
import { escapeHtml } from './quote-email-template';

export async function sendWelcomeEmail(
  email: string,
  companyName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = requireEmailEnv();

  const subject = `[청광] ${companyName}님, 가입을 환영합니다`;
  const html = renderWelcomeHtml(companyName);

  const result = await sendViaResend(apiKey, {
    from,
    to: email,
    subject,
    html,
  });

  if (!result.ok) return { ok: false, error: `Resend ${result.status}: ${result.error}` };
  return { ok: true };
}

function renderWelcomeHtml(companyName: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">🎉 가입을 환영합니다, ${escapeHtml(companyName)}님!</h1>
  <p>청광 청소 마켓플레이스에 ${escapeHtml(companyName)}이(가) 정식 청명으로 등록되었습니다.</p>

  <h3 style="margin-top:24px">첫 3 단계</h3>
  <ol>
    <li>프로필 사진·단가·포트폴리오 추가 (곧 편집 페이지 제공)</li>
    <li>의뢰인의 신규 견적 요청 수신 → 빠른 응답</li>
    <li>거래 성사 → 리뷰·재계약으로 매출 성장</li>
  </ol>

  <div style="margin-top:32px">
    <a href="${process.env.APP_URL ?? 'http://localhost:3000'}/provider/profile"
       style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:600">
      프로필 완성하러 가기
    </a>
  </div>

  <p style="margin-top:32px;color:#999;font-size:12px">
    이 이메일은 청광 마켓플레이스에서 자동 발송됩니다.<br>
    문의: <a href="mailto:peter15975345@gmail.com">peter15975345@gmail.com</a>
  </p>
</body></html>`;
}
```

### 8.2 admin 알림 이메일 (`src/lib/email/admin-alert-email.ts`)

```ts
import 'server-only';
import { sendViaResend, requireEmailEnv } from './resend';
import { escapeHtml } from './quote-email-template';
import { QUOTE_CATEGORY_LABELS, type QuoteCategory } from '@/domain/quote-category';

export interface AdminAlertInput {
  providerId: string;
  companyName: string;
  email: string;
  contactPhone: string;
  primaryCategory: QuoteCategory;
  marketingAgreed: boolean;
}

export async function sendAdminAlert(
  to: string,
  input: AdminAlertInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = requireEmailEnv();
  const subject = `[청광 운영] 신규 청명 가입: ${input.companyName}`;
  const html = renderAdminAlertHtml(input);
  const result = await sendViaResend(apiKey, { from, to, subject, html });
  if (!result.ok) return { ok: false, error: `Resend ${result.status}: ${result.error}` };
  return { ok: true };
}

function renderAdminAlertHtml(i: AdminAlertInput): string {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h2>🧹 신규 청명 가입</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#666;width:120px">업체명</td><td>${escapeHtml(i.companyName)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">이메일</td><td>${escapeHtml(i.email)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">전화</td><td>${escapeHtml(i.contactPhone)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">대표 카테고리</td><td>${escapeHtml(QUOTE_CATEGORY_LABELS[i.primaryCategory])}</td></tr>
    <tr><td style="padding:6px 0;color:#666">마케팅 수신</td><td>${i.marketingAgreed ? '동의' : '미동의'}</td></tr>
    <tr><td style="padding:6px 0;color:#666">providerId</td><td><code>${escapeHtml(i.providerId)}</code></td></tr>
  </table>
  <p style="margin-top:24px">
    <a href="https://console.firebase.google.com/project/cheonggwang-e4e33/firestore/data/~2Fproviders~2F${encodeURIComponent(i.providerId)}">
      Firestore Console에서 providers/${escapeHtml(i.providerId)} 열기
    </a>
  </p>
</body></html>`;
}
```

---

## 9. Test Plan

### 9.1 필수 테스트 케이스

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| 1 | 정상 가입 | Auth 계정 생성 + providers doc + users.roles에 'provider' + session cookie + redirect `/provider/profile` |
| 2 | 이메일 이미 사용 중 | client-side `auth/email-already-in-use` 에러 + 로그인 링크 |
| 3 | 약관 미동의 | zod 검증으로 submit 차단, "약관 동의 필요" 에러 표시 |
| 4 | 비밀번호 불일치 | zod refine으로 passwordConfirm 필드 에러 |
| 5 | 비밀번호 약함 (< 8자) | zod 검증 차단 + client "8자 이상" 에러 |
| 6 | Rate limit 초과 (1hr 3건) | "요청이 많습니다" 429 |
| 7 | 중복 가입 시도 (같은 uid로 재요청) | `ALREADY_REGISTERED` 에러 |
| 8 | Welcome 이메일 발송 실패 | signup은 성공 처리, warn log |
| 9 | admin alert 발송 실패 | signup은 성공 처리, warn log |
| 10 | 가입 후 로그아웃 → 재로그인 | providers doc 그대로 유지, `/provider/profile` 접근 가능 |
| 11 | Firestore TX 실패 (네트워크) | `INTERNAL_ERROR`, Auth 계정만 남음, 재시도 가능 (self-heal은 v1.1b) |
| 12 | `/provider/profile` 직접 접근 (비로그인) | proxy가 `/login?next=/provider/profile`로 redirect |
| 13 | 가입 중 이메일 인증 링크 수신 확인 | Firebase Console / 사용자 이메일에 verification 도착 |
| 14 | users에 기존 legacy 필드(`isCheonggwangPartner=true`) 있는 경우 merge | 기존 값 보존 + roles/providerId만 추가 |

---

## 10. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation (Server)** | `app/(auth)/signup-provider/page.tsx`, `app/provider/profile/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx` |
| **Presentation (Client)** | `components/auth/ProviderSignupForm.tsx`, 기존 `LoginForm.tsx` (링크 추가만) |
| **Application** | `app/actions/provider-signup-actions.ts` |
| **Domain** | `domain/provider-signup-schema.ts`, 기존 `quote-category.ts` 재사용 |
| **Infrastructure** | `lib/firebase/auth-admin.ts` (기존), `lib/firebase/rate-limit.ts` (기존), `lib/firebase/admin.ts` (기존), `lib/email/resend.ts` (기존), `lib/email/welcome-email.ts` (신규), `lib/email/admin-alert-email.ts` (신규) |

의존 방향: Presentation → Application → Domain / Infrastructure. Domain은 외부 의존 0.

---

## 11. Coding Convention (§10 Recap)

- 파일명: 컴포넌트 PascalCase (`ProviderSignupForm.tsx`), utility/lib kebab-case (`welcome-email.ts`, `provider-signup-actions.ts`, `provider-signup-schema.ts`)
- Server-only 파일: `import 'server-only'` 첫 줄
- Server Action: `'use server';` 첫 줄
- Client: `'use client';` 첫 줄
- Import 순서: external → `@/...` → relative → type
- 에러: `AppError` + `toActionError` pattern 재활용
- 상수: `UPPER_SNAKE` (신규 상수는 domain 또는 constants.ts)

---

## 12. Implementation Guide

### 12.1 File Structure (신규 + 수정)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                  🔄 "청명 가입" 링크 섹션 추가
│   │   └── signup-provider/
│   │       └── page.tsx                    🆕
│   ├── provider/
│   │   └── profile/
│   │       └── page.tsx                    🆕 stub
│   ├── terms/page.tsx                      🆕 placeholder
│   ├── privacy/page.tsx                    🆕 placeholder
│   └── actions/
│       └── provider-signup-actions.ts      🆕
├── components/auth/
│   ├── LoginForm.tsx                       🔄 signup-provider 링크 추가 (페이지에서 추가해도 무방)
│   └── ProviderSignupForm.tsx              🆕
├── domain/
│   └── provider-signup-schema.ts           🆕
├── lib/
│   └── email/
│       ├── welcome-email.ts                🆕
│       └── admin-alert-email.ts            🆕
├── lib/errors.ts                           🔄 `ALREADY_REGISTERED` 코드 추가
├── types/page.ts                           🔄 `providerId`, `contactPhone` optional 필드 추가
├── types/provider.ts                       🔄 `insuranceAmount`, `reviewCount`, `verified`, `yearsOfExperience`, `isAvailable`, `priceBook`, `profileImage*` optional 확장
└── proxy.ts                                🔄 matcher 확장 `/provider/:path*`

firestore.rules                             🔄 providers/users 블록 업데이트
firestore.indexes.json                      (변경 없음)
storage.rules                               (변경 없음)
```

### 12.2 Implementation Order (7 steps)

1. **Domain & schemas**: `provider-signup-schema.ts` (Zod 2개) + `types/page.ts` + `types/provider.ts` + `lib/errors.ts` (`ALREADY_REGISTERED`)
2. **Email layer**: `lib/email/welcome-email.ts` + `admin-alert-email.ts` (기존 `sendViaResend`, `escapeHtml` 재활용)
3. **Server Action**: `app/actions/provider-signup-actions.ts` (10-step 플로우) + `providerRepository.listByOwner` helper (또는 one-shot query in action)
4. **UI form**: `components/auth/ProviderSignupForm.tsx` — RHF + zodResolver + firebase/auth client + submit 핸들러
5. **Routes**: `app/(auth)/signup-provider/page.tsx` (Server shell), `app/provider/profile/page.tsx` (stub, Suspense), `app/terms/page.tsx` + `app/privacy/page.tsx` (placeholder)
6. **Login 수정 + proxy 확장**: LoginForm 또는 login page.tsx에 "청명 가입" 링크 + `proxy.ts` matcher 에 `/provider/:path*`
7. **Infra**: `firestore.rules` providers·users 블록 업데이트 + 배포

### 12.3 Pre-flight 체크리스트 (배포 전)

- [ ] `.env.local`에 `OPERATOR_EMAIL=peter15975345@gmail.com` 추가 (admin 알림 수신자)
- [ ] `.env.local`에 `APP_URL=http://localhost:3000` (dev) 또는 프로덕션 URL (welcome email CTA용)
- [x] `RESEND_API_KEY`, `EMAIL_FROM` — 기존 값 재사용 (quote-request preflight에 이미 포함)
- [ ] `firebase deploy --only firestore:rules` (providers/users 블록 업데이트)
- [ ] 테스트 가입 1~2건 수행 → welcome + admin alert 이메일 도착 확인
- [ ] Firebase Console에서 신규 Auth user + providers doc 존재 확인

---

## 13. Next.js 16 Specific Patterns (참고)

### 13.1 async params/searchParams — 본 feature는 없음 (signup-provider은 정적 shell, 동적 param 없음)

### 13.2 Cache Components 준수

- `app/signup-provider/page.tsx` — `cookies()` 호출 없으면 Static 가능. 다만 **로그인 상태면 `/provider/profile`로 redirect** 로직 선택적으로 추가 가능 → 이 경우 Suspense wrapping 필요.
  - 결정: **가입 페이지는 로그인 상태에서도 노출 허용** (다른 계정으로 청명 가입 가능성). Static 유지. [또는 post-login redirect만 server에서 처리하고 client가 form에 집중]
- `app/provider/profile/page.tsx` — `cookies()` 사용 (uid 조회해 환영 메시지에 companyName 표시). **Suspense 경계 내부에 둠** (quote/new 패턴과 동일).
- `app/terms/page.tsx`, `app/privacy/page.tsx` — 완전 정적, Static prerender.

### 13.3 proxy.ts

기존:
```ts
matcher: ["/dashboard/:path*", "/editor/:path*", "/quote/:path*"]
```

수정:
```ts
matcher: ["/dashboard/:path*", "/editor/:path*", "/quote/:path*", "/provider/:path*"]
```

`/signup-provider`는 `(auth)` 그룹 비인증 허용이므로 matcher 추가 안 함. `/terms`, `/privacy`도 마찬가지.

### 13.4 Server Action atomicity

Firestore transaction을 Server Action 내부에 인라인:

```ts
await adminDb.runTransaction(async (tx) => {
  const providerRef = adminDb.collection('providers').doc();
  tx.set(providerRef, {
    ownerUid: uid,
    companyName,
    categories: [primaryCategory],
    regions: [],
    contactEmail: email,
    contactPhone,
    description: null,
    isCheonggwangOwned: false,
    insured: false,
    verified: false,
    pageId: null,
    rating: null,
    reviewCount: null,
    responseTimeHours: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  tx.set(
    adminDb.collection('users').doc(uid),
    {
      email,
      displayName: companyName,
      roles: FieldValue.arrayUnion('provider'),
      providerId: providerRef.id,
      contactPhone,
      createdAt: FieldValue.serverTimestamp(),  // 신규 user 가정; 기존 user merge 시 덮어쓰기 안 함 — 아래 note
    },
    { merge: true },
  );

  // tx 외부에서 providerRef.id 참조 — closure에 저장
  (globalThis as any).__lastProviderRefId = providerRef.id;
});
```

**note**: `createdAt`이 기존 user의 값을 덮어쓰지 않으려면 사전 read 후 조건부 merge 필요. 본 MVP에서는 기존 로그인 없는 새 계정 가정 → signUp 직후 직접 TX 쓰기가 primary use case. 문제 시 v1.1b에 개선.

---

## 14. Dependency Impact

| 기존 패키지 | 영향 |
|-------------|------|
| `firebase` | `createUserWithEmailAndPassword`, `sendEmailVerification` client method 사용 (already imported) |
| `firebase-admin` | `adminAuth.verifyIdToken`, `runTransaction`, `FieldValue.arrayUnion` |
| `react-hook-form` | 기존 |
| `@hookform/resolvers/zod` | 기존 |
| `zod` | 기존 |

**신규 패키지**: 없음.

---

## Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-20 | Design 초안. Open Questions 7건 해소. Server Action 10-step, Zod 2 schema, Firestore TX atomic, Welcome+Admin 이메일, 7-step 구현 순서, Cache Components 준수, proxy matcher 확장 | Seokho Lee |
