---
template: plan-plus
version: 0.1
feature: provider-signup
date: 2026-04-20
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 가입 (provider-signup)

> 생성: 2026-04-20
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #5 (v1.1 첫 feature)
> 선행 사이클: quote-request (v1.0 · Match 99% archived)
> 다음 단계: `/pdca design provider-signup`

---

## 1. User Intent Discovery

### 1.1 배경
Marketplace Track v1.0 `quote-request` 완료 후, v1.1 마켓 핵심 루프의 시작점. 현재 청명은 `scripts/seed-first-provider.mjs`로 수동 시드 1명만 존재 → 후속 feature (`quote-response`, `provider-profile-editor`, `received-quotes`) 테스트 불가. 본 feature가 v1.1 크리티컬 패스의 blocker.

### 1.2 핵심 목적
**실제 청명이 self-serve로 가입 가능하게** (Recommended 선택)
- Firebase Auth 이메일/비번 회원가입 + providers 도큐먼트 생성 one-flow
- admin 승인 없이 즉시 활성 (운영 부담 ↓, MVP 속도 ↑)
- 수동 seed 스크립트 deprecation (유지는 하되 주 경로 전환)

### 1.3 타겟 사용자
- **1차**: 실제 청소업체 사장·관리자 (자사 서비스를 마켓플레이스에 올리고 싶은 소상공인)
- **2차**: 청광 운영자 (peter) — 신규 가입 모니터링
- **3차**: 개발자 (local dev에서 테스트용 provider 계정 빠른 생성)

### 1.4 MVP 경계
- ✅ 이메일/비번 가입 (Firebase Auth)
- ✅ 최소 필드: 이메일·비번·업체명·대표 카테고리·전화번호
- ✅ 이메일 인증 (sendEmailVerification — blocking 아님)
- ✅ 약관 동의 (placeholder 링크)
- ✅ Welcome 이메일 + admin 알림 이메일
- ✅ Rate limit (bot 방지)
- ✅ /provider/profile stub (TODO 체크리스트)
- ❌ 소셜 로그인 (카카오 포함 — 기존 방침)
- ❌ 프로필 사진 업로드 (provider-profile-editor v1.1)
- ❌ 지역 선택, priceBook, description, Before/After (provider-profile-editor v1.1)
- ❌ admin 승인 flow (verified=false 초기값 유지, v1.1b 이후)
- ❌ Upgrade flow (기존 client가 provider 겸업 · v1.2+)
- ❌ 1:N 관계 (한 계정이 여러 업체 소유 · v2+)

### 1.5 성공 기준
- 가입 플로우 5분 이내 완료 (form 제출~redirect까지 P95 < 3초 동기 처리)
- 가입 성공률 85%+ (입력 검증 실패 제외, Auth/Firestore 에러 기준)
- Welcome 이메일 전달률 90%+ (Resend)
- v1.1 첫 주에 ≥3 실제 청명 가입 달성 (closed beta)
- `quote-response` 개발 시작 전까지 provider 테스트 계정 최소 5개 확보

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **Single-page signup (Client firebase/auth + Server atomic write)** | **채택** |
| B | 2-step wizard (Account → Profile 분리) | 기각 |
| C | Upgrade flow (기존 user가 provider role 추가) | 기각 (v1.2+ 별도 mini-feature로 이연) |

### 2.1 채택 사유 (A)
- **MVP 속도**: 단일 form + 1회 Server Action으로 UX 빠름
- **기존 패턴 일관**: `signInWithEmail` Server Action 구조 재활용
- **최소 필드**: 2-step wizard의 이점(복구)이 필드 수가 적어서 무의미
- **부분 실패 관리**: Auth 성공 후 Firestore 실패 시 self-heal 라우트(`/complete-provider-signup`)로 보완

### 2.2 기각 사유

**B 2-step wizard**
- 필드 5개뿐이라 분리 이득 없음
- state 관리·복구 로직 복잡도만 추가
- UX 2 페이지로 늘어남

**C Upgrade flow**
- 청소업체 특성상 겸업 케이스 드뭄 (사업자 vs 개인 구분)
- MVP 스코프 오버, 가치 불확실
- 필요 시 v1.2+에 별도 mini-feature로 (`/settings/become-provider`)

### 2.3 Atomicity 전략
```
Auth createUser (client)
  └─ 성공 → getIdToken + sendEmailVerification
       └─ Server Action registerProvider(idToken, form)
            ├─ verifyIdToken
            ├─ Firestore transaction:
            │   • users/{uid}.set (email, displayName, roles:['provider'], providerId, contactPhone)
            │   • providers/{newId}.create (ownerUid, companyName, category, ...)
            │   • users/{uid}.update { providerId: newId }  // 생성 후 링크 back-fill
            ├─ Resend welcome + admin alert (Promise.allSettled, 실패는 warn)
            └─ session cookie 생성 → redirect /provider/profile

부분 실패:
  • Auth 성공 + Server Action 호출 실패 → 재시도 가능 (client user session 유지)
  • Firestore 부분 실패 (users 성공, providers 실패) → transaction으로 방지
  • Firestore 전체 실패 → 사용자는 Auth 계정은 있고 providers 없음
      → 다음 로그인 시 users.providerId=null 감지 → /complete-provider-signup redirect (self-heal)
```

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (14개)
1. **Firebase Auth 회원가입** (client `createUserWithEmailAndPassword`)
2. **users doc 생성·업데이트** (email, displayName, roles:['provider'], providerId, contactPhone, createdAt)
3. **providers doc 생성** (ownerUid, companyName, categories[1], contactEmail, contactPhone, isCheonggwangOwned:false, insured:false, verified:false, null 나머지)
4. **Session cookie 생성** (기존 `createSessionCookie` 재활용)
5. **`/signup-provider` 라우트 + 폼 UI** (RHF + zod)
6. **Server Action `registerProvider`** (verifyIdToken + Firestore TX + email 발송 + cookie)
7. **이메일 인증** (`sendEmailVerification` — blocking 아님, 나중에 언제든 확인)
8. **약관 동의 체크박스** (placeholder 링크 `/terms`, `/privacy` — 문서는 v1.1에서)
9. **`/login`에 '청명 가입' 링크 추가**
10. **Rate limit** (기존 `rate-limit.ts` 재활용 — `signup:{email}` key, 1시간 3건)
11. **Welcome 이메일** (Resend — quote-request 재활용, 가입 축하 + 다음 단계 안내)
12. **admin 알림 이메일** (peter@…로 신규 가입 notification)
13. **전화번호 필드** (signup 폼 필수, `users` + `providers` 양쪽 저장)
14. **`/provider/profile` stub** (TODO 체크리스트 — "프로필 사진 추가", "priceBook 작성", "Before/After 업로드")

### 3.2 Out of Scope → v1.1b 이상

| 항목 | 이동 이유 |
|------|----------|
| 소셜 로그인 (카카오 등) | 기존 방침 (promo-page archived에서 v1.1+로 이연) |
| 프로필 사진 업로드 | provider-profile-editor (v1.1) 의 책임 |
| 지역 다중 선택 | provider-profile-editor에서 `regions[]` 편집 |
| priceBook 편집 | provider-profile-editor 의 '서비스 단가' 탭 |
| description·소개글 | provider-profile-editor |
| Before/After workCases | provider-profile-editor '포트폴리오' 탭 |
| admin 승인 flow (`verified=true`) | 운영 정책 확정 후 v1.1b 이상 별도 admin-panel |
| Upgrade flow (기존 client → provider) | v1.2+ `/settings/become-provider` mini-feature |
| 1:N 관계 (복수 업체 소유) | v2+ 프랜차이즈·체인 대응 |
| reCAPTCHA / App Check 강제 | 기존 방침 (APP_CHECK_ENFORCE env, 프로덕션 전환 시) |
| 카테고리 복수 선택 at signup | 1개만 받고 profile-editor에서 추가 |
| 이메일 인증 required (verification 후에만 활성) | UX 허들 증가, v1.1b 이상 검토 |

### 3.3 기존 기능 영향
- **users 컬렉션**: `providerId`, `contactPhone` 필드 신규 추가 (optional — 기존 데이터 영향 없음)
- **proxy.ts**: matcher에 `/provider/:path*` 추가 (quote-request가 이미 `/quote/:path*` 추가함)
- **firestore.rules**: `providers/{id}` create 규칙 완화 (owner만) + users self-update에 `providerId`·`contactPhone`·`roles` 필드 허용
- **/login 페이지**: "청명으로 가입" 링크 추가
- **`signInWithEmail` 기존 auth-actions**: 기존 로그인 흐름에 `providers` doc 확인 추가 (user has provider role + providerId null이면 self-heal redirect)
- **환경변수**: 기존 `RESEND_API_KEY`·`EMAIL_FROM` 재활용 (신규 없음) + `OPERATOR_EMAIL=peter15975345@gmail.com` 추가 권장 (admin 알림 수신자)

---

## 4. Architecture

### 4.1 스택
- Next.js 16 App Router + React 19 + Tailwind 4 (기존)
- Firebase Auth (client `firebase/auth` email/password) + Firebase Admin SDK (server verify + Firestore TX) (기존)
- Server Action + `ActionResult<T>` 패턴 (기존 `errors.ts` 재활용)
- Resend API (SDK-less fetch — quote-request의 `lib/email/resend.ts` 재활용)
- react-hook-form + `@hookform/resolvers/zod` + zod (기존)
- nanoid (기존) — providerId 생성 (Firestore doc() 자동 id 대신 명시 ID 선호 시)

### 4.2 파일 구조 (신규 + 수정)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── signup-provider/
│   │   │   └── page.tsx                   🆕 청명 가입 폼 페이지
│   │   └── login/page.tsx                 🔄 "청명 가입" 링크 추가
│   ├── provider/                          🆕
│   │   └── profile/page.tsx               🆕 stub (TODO 체크리스트)
│   └── actions/
│       └── provider-signup-actions.ts     🆕 registerProvider Server Action
├── components/auth/
│   └── ProviderSignupForm.tsx             🆕 Client — RHF + zod + firebase/auth
├── domain/
│   └── provider-signup-schema.ts          🆕 Zod schemas + constants
├── lib/
│   ├── email/
│   │   ├── welcome-email.ts               🆕 가입 환영 이메일
│   │   └── admin-alert-email.ts           🆕 운영자 알림 이메일
│   └── firebase/
│       ├── auth-actions.ts                (기존) 경로 확인
│       └── provider-self-heal.ts          🆕 (선택) providerId null 감지 redirect
├── types/
│   └── provider.ts                        🔄 (최소 추가 · 기존 스키마 충분)
└── proxy.ts                               🔄 matcher 확장 (/provider/:path*)

firestore.rules                            🔄 providers.create owner only, users self-update
firestore.indexes.json                     (변경 없음)
storage.rules                              (변경 없음)
```

### 4.3 User Flow

```
[홈] → [로그인 페이지] → "아직 청명이 아니신가요? 청명으로 가입" 링크
                         ↓
                     [/signup-provider]
                         ↓
                     ProviderSignupForm (Client)
                      - email
                      - password (8자 이상)
                      - password 확인
                      - 업체명
                      - 대표 카테고리 (6종 select)
                      - 전화번호
                      - 약관 동의 체크박스
                      - 마케팅 수신 동의 (optional)
                         ↓
                     [제출]
                         ├─ 1. firebase/auth createUserWithEmailAndPassword(email, pw)
                         ├─ 2. sendEmailVerification(user) (fire-and-forget)
                         ├─ 3. user.getIdToken()
                         └─ 4. Server Action registerProvider(idToken, form)
                                ├─ adminAuth.verifyIdToken
                                ├─ Rate limit check (signup:{email} 1hr 3)
                                ├─ Firestore transaction:
                                │   • users/{uid}.set (merge)
                                │   • providers/{newProviderId}.create
                                │   • users/{uid}.update { providerId }
                                ├─ Resend Promise.allSettled:
                                │   • sendWelcomeEmail(email, companyName)
                                │   • sendAdminAlert(OPERATOR_EMAIL, new provider info)
                                ├─ createSessionCookie + set httpOnly cookie
                                └─ return { ok: true, data: { providerId } }
                         ↓
                     성공 → router.push('/provider/profile')
                            └─ "환영합니다! 프로필을 완성해주세요"
                                  + TODO 체크리스트 (프로필 사진·priceBook·Before/After)
                         ↓
                     실패 → form에 에러 표시 (ActionResult 패턴)
```

### 4.4 에러 시나리오

| 시나리오 | 처리 |
|----------|------|
| 이메일 이미 사용 중 | Firebase Auth에서 `auth/email-already-in-use` → form error "이미 가입된 이메일" + "/login으로 이동" 링크 |
| 비밀번호 너무 약함 | zod 클라 검증 (8자+) + Firebase `auth/weak-password` 서버 에러 |
| 네트워크 에러 | 재시도 버튼 표시, 이미 Auth 생성된 경우 재로그인으로 self-heal |
| Rate limit 초과 | 429 "요청이 많아요. 1시간 후 재시도" |
| Firestore TX 실패 | Auth는 남고 providers 없음 → 로그인 시 self-heal redirect |
| 이메일 발송 실패 | graceful (warn log) · 가입 자체는 성공 처리 |
| 약관 미동의 | zod 검증으로 submit 차단 |

### 4.5 보안·프라이버시
- **이메일 인증**: 가입 즉시 발송, 열람은 blocking 아님 (UX 허들 최소화) — 추후 중요 action (결제 요청 등) 전에 검증 강제
- **비밀번호**: Firebase Auth가 핸들링 (bcrypt 서버측 저장, 클라는 원본만 일시 보유)
- **Rate limit**: 1 email당 1시간 3회, bot 방지
- **세션**: httpOnly + secure(prod) + SameSite=lax (기존 패턴)
- **Firestore rules**: `providers.create`는 `request.auth.uid == request.resource.data.ownerUid` 강제 (client 우회 방지)
- **PII**: 전화번호는 server-only read (rules로 공개 readers 차단), providers의 contactPhone은 청명 프로필에 선택 노출 (v1.1 provider-profile-editor에서 visible 토글 추가)

---

## 5. Data Model 델타

### 5.1 users 확장
```typescript
// src/types/page.ts (기존 UserProfile 확장)
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isCheonggwangPartner: boolean;          // legacy — 마켓 v1부터 deprecated
  partnerCleaningFrequency?: string;       // legacy
  roles?: UserRole[];                      // quote-request에서 추가
  + providerId?: string;                  // v1.1 provider-signup — 1:1 링크
  + contactPhone?: string;                // v1.1 provider-signup
  createdAt: Date;
}
```

### 5.2 providers (기존 유지, 필드 확장)
```typescript
// src/types/provider.ts — 기존 Provider interface에 일부 필드 optional 확장
export interface Provider {
  id: string;
  ownerUid: string;
  companyName: string;
  categories: QuoteCategory[];             // signup에서 1개만 초기 세팅
  regions: ProviderRegion[];               // signup 시 빈 배열
  contactEmail: string;
  contactPhone?: string;                   // signup 시 입력값
  description?: string;                    // signup 시 null
  isCheonggwangOwned: boolean;             // self-signup = false
  insured: boolean;                        // 초기 false
  + insuranceAmount?: number;             // Master Plan 기준 추가 (nullable)
  pageId: string | null;
  rating: number | null;
  + reviewCount: number | null;           // Master Plan 기준 추가
  responseTimeHours: number | null;
  + verified?: boolean;                   // self-signup = false, admin 승인 시 true
  + yearsOfExperience?: number;           // Master Plan 기준 optional
  + isAvailable?: boolean;                // v1.1b provider-dashboard 활동중 토글
  + priceBook?: Array<{                   // v1.1 provider-profile-editor에서 채움
      category: QuoteCategory;
      unit: 'per_visit' | 'per_month' | 'per_unit';
      unitLabel: string;
      basePrice: number;
      options?: Array<{label: string; price: number}>;
    }>;
  + profileImage?: string;                // v1.1 provider-profile-editor
  + profileImagePath?: string;            // Storage path
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 Firestore Rules 추가
```javascript
// firestore.rules — providers 블록 확장 (기존은 read:true, write:false)
match /providers/{providerId} {
  allow read: if true;
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid
                && request.resource.data.isCheonggwangOwned == false  // self-signup은 false 강제
                && request.resource.data.verified == false;            // admin 이전엔 false
  // update는 provider-profile-editor(v1.1)에서 확장. 지금은 여전히 false.
  allow update: if false;
  allow delete: if false;
}

// users 블록 수정 — 기존 update 제약에 providerId·contactPhone·roles 필드 허용
match /users/{uid} {
  // ... (기존 read/create 유지)
  allow update: if request.auth != null
                && request.auth.uid == uid
                && !request.resource.data.diff(resource.data).affectedKeys()
                     .hasAny(['isCheonggwangPartner', 'partnerCleaningFrequency', 'email']);
  // roles·providerId·contactPhone은 서버(Admin SDK)에서만 쓰는 게 정책이지만
  // rules는 defense-in-depth. client direct write 차단은 서버 로직 신뢰.
}
```

### 5.4 Zod 스키마
```typescript
// src/domain/provider-signup-schema.ts (신규)
import { z } from 'zod';
import { QUOTE_CATEGORIES, type QuoteCategory } from './quote-category';

export const providerSignupFormSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다'),
  password: z.string().min(8, '비밀번호는 8자 이상').max(64),
  passwordConfirm: z.string(),
  companyName: z.string().min(2, '업체명은 2자 이상').max(40),
  primaryCategory: z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]),
  contactPhone: z.string().regex(
    /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
    '전화번호 형식이 올바르지 않습니다',
  ),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: '약관 동의가 필요합니다' }),
  }),
  marketingAgreed: z.boolean().optional(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['passwordConfirm'],
});

export type ProviderSignupFormInput = z.infer<typeof providerSignupFormSchema>;

// Server Action이 받는 payload (idToken + form의 비번 제외 필드)
export const registerProviderInputSchema = z.object({
  idToken: z.string().min(10),
  companyName: z.string().min(2).max(40),
  primaryCategory: z.enum(QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]]),
  contactPhone: z.string().regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/),
  marketingAgreed: z.boolean().optional(),
});

export type RegisterProviderInput = z.infer<typeof registerProviderInputSchema>;
```

---

## 6. 주요 플로우 상세 (Design 단계 참고용)

### 6.1 registerProvider Server Action 10-step
1. Parse `registerProviderInputSchema` (Zod)
2. `adminAuth.verifyIdToken(idToken)` → `{uid, email}`
3. `checkAndIncrement('signup:' + email, 3, 60*60*1000)` → rate limit
4. 기존 `providers where ownerUid == uid` 검사 (이미 등록됨 방지) → 있으면 에러
5. Firestore transaction:
   - `users/{uid}.set({...base, roles: FieldValue.arrayUnion('provider'), contactPhone, providerId: newId}, {merge: true})`
   - `providers/{newId}.create({...fields, isCheonggwangOwned:false, verified:false})`
6. `Promise.allSettled([sendWelcomeEmail(email, companyName), sendAdminAlert(OPERATOR_EMAIL, payload)])` — 실패 warn
7. `createSessionCookie(idToken)` + `cookies().set`
8. return `{ok:true, data:{providerId: newId}}`
9. 에러: AppError + `toActionError`, zod issues → INVALID_INPUT
10. Client는 성공 응답 받고 `router.push('/provider/profile')`

### 6.2 Self-heal 시나리오 (보조)
client가 로그인 후 `users.providerId == null` 이고 `roles.includes('provider')` 라면 → dashboard/home가 `/complete-provider-signup`으로 redirect하여 누락된 providers doc 생성 재시도. (v1.1에서 필요 시 구현 — MVP는 생략 가능, Out-of-Scope로 move 가능)

**결정 필요**: self-heal은 v1.1 MVP에서 구현 vs 생략. 제안: **생략**하고 대신 Firestore TX atomicity에 의존 (실패 시 그냥 에러 반환 → client가 재시도).

### 6.3 Welcome 이메일 템플릿
- **From**: `청광 <welcome@{verified-domain}>` (quote-request와 동일 도메인 재활용)
- **Subject**: `[청광] {companyName}님, 가입을 환영합니다`
- **HTML**: 간단한 환영 + 다음 단계 (프로필 완성 → 견적 요청 받기)
- **CTA**: "프로필 완성하러 가기" (→ `/provider/profile` 링크)

### 6.4 admin 알림 이메일 템플릿
- **From**: 동일 도메인
- **To**: `OPERATOR_EMAIL` (env)
- **Subject**: `[청광 운영] 신규 청명 가입: {companyName}`
- **HTML**: 가입자 정보 요약 + Firestore Console 링크 (`providers/{id}`)

---

## 7. 비용·성능

### 7.1 비용 영향
- **Firebase Auth**: 무료 (Spark plan 50k MAU 내)
- **Firestore**: signup 1회 = write 2 (users + providers) + read 1 (이미 등록 검사) ≈ 3 ops. $0.00006 / 가입
- **Resend**: 2 emails / 가입 (welcome + admin alert) = 무료 tier (3k/월) 충분
- **총 예상**: 월 1000 가입 기준 $0.06 + 이메일 2000건 (무료)

### 7.2 성능
- Server Action P95: verifyIdToken (~50ms) + TX (~100ms) + Resend (~500ms) + cookie = **~650ms**
- Resend 500ms가 병목 — `fire-and-forget` 대신 `Promise.allSettled` + 대기 (사용자 redirect 전에 이메일 큐 확실히 들어가도록)
- 대안: email 발송을 Firestore Trigger 비동기로 전환 가능 (v1.2+ 최적화)

### 7.3 확장성
- users 쿼리 없음 (direct uid access)
- providers 쿼리: `where ownerUid == uid` 중복 방지 체크 시 1 index 사용 (자동 index로 충분)
- v2+ 예상: 하루 100 가입 × Firestore $0.00006 ≈ $0.006/day (무시할 수준)

---

## 8. Open Questions (Design 단계에서 해소)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | `/provider/profile` stub 페이지 컨텐츠 구조 | "환영합니다 {companyName}!" + TODO 3개 체크리스트 + "나중에 편집" 버튼 |
| Q2 | Welcome 이메일 정확한 copy | Design 단계에서 HTML 템플릿 확정 |
| Q3 | providerId 생성 방식 (auto doc() vs nanoid 명시) | Firestore auto doc() 권장 (기존 pageRepository 패턴 일치) |
| Q4 | users doc merge 시 기존 필드 (legacy isCheonggwangPartner) 보존 방식 | `set({}, {merge:true})`로 diff만 업데이트 |
| Q5 | 약관 링크 (/terms, /privacy) 실제 문서 | placeholder 페이지 + 실제 문서는 별도 작업 (법무 필요 · 본 feature 밖) |
| Q6 | proxy.ts `/provider/:path*` 추가 시 signup-provider는 제외? | `/signup-provider`는 `(auth)` 그룹이므로 `/provider/*` matcher와 별도, signup은 비인증 허용 필요 |
| Q7 | Self-heal 라우트 `/complete-provider-signup` 구현 여부 | v1.1 MVP는 생략 (TX atomicity 신뢰) |

---

## 9. Brainstorming Log

### Phase 1 Q&A 결정 요약
| Q | 답 |
|---|---|
| 핵심 목적 | 실제 청명 self-serve 가입 (vs admin 승인 / upgrade flow) |
| 필수 정보 수준 | 최소 (email/pw/업체명/대표 카테고리) |
| User↔Provider 관계 | 1:1 |
| 가입 후 랜딩 | /provider/profile (stub) |

### Phase 2 결정
- Single-page signup 채택 (vs 2-step / Upgrade flow)
- Atomicity: Firestore transaction + self-heal 라우트(MVP 생략)

### Phase 3 YAGNI 추가 (운영·온보딩)
- 이메일 인증, 약관 동의, /login 링크, Rate limit ✅
- Welcome 이메일, admin 알림, 전화번호, /provider/profile stub ✅

### Phase 4 검증
- 아키텍처 흐름 ✅
- 파일 구조 ✅
- 데이터 모델 확장 ✅

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-20 | Plan Plus 초안. MVP=14항목, Approach A (single-page), 1:1 user-provider, /provider/profile stub. Out-of-scope 12건. 차기 단계: `/pdca design provider-signup` | Seokho Lee |
