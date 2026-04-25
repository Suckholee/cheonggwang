# Design · admin-console

**Feature**: 청광 운영진 admin 콘솔 — 시연·일상 운영 통합 도구
**Version**: v0.2 (design-validator 응답 반영 — C1·C2 정정 + H1–H7 결의 + 일부 Medium·Low 반영)
**Level**: Dynamic
**Cycle**: #20 (Marketplace v1.8 · admin-console)
**Based on**: `docs/01-plan/features/admin-console.plan.md`
**Inherits constraints from**: `partner-promo.design.md` (Next 16 cacheComponents 패턴, AutoPublishSettings 재활용 등)
**Created**: 2026-04-25

---

## 0. Plan vs Design Reconciliation

Plan 문서를 현재 코드/프레임워크 제약과 맞추기 위한 보정.

| # | Plan 지점 | Plan 표현 | Design 실제 | 이유 |
|---|---|---|---|---|
| R1 | Plan §7 컴포넌트 — AutoPublishSettings 재활용 | "AutoPublishSettings 재활용" | **수정 필요** — 현재 `initial: AutoPublishConfig` props만 받고 자체적으로 `PATCH /api/partner/settings` 호출. admin이 다른 partner를 편집하려면 prop으로 endpoint 주입 또는 onSave 콜백을 받도록 수정 | `src/components/partner/AutoPublishSettings.tsx`의 `save()` 함수가 자기 partner 가정 |
| R2 | Plan §7 수정 — provider-repository 메서드 추가 | "`setVerified` · `setInsured` 추가" | 그대로 — 현재 메서드 없음 확인 (`grep -n setVerified` 결과 0건). 필드 자체는 `toProvider`에 매핑 됨 | 신규 메서드만 작성하면 됨 |
| R3 | Plan §7 의존성 — `bcryptjs` + `jsonwebtoken` | bcryptjs OK, jsonwebtoken은 Node 전용 → **Vercel Edge runtime 비호환** | **`bcryptjs` + `jose` 사용** (jose는 Edge·Node 모두 호환). jsonwebtoken 대신 jose의 SignJWT/jwtVerify | Vercel가 향후 Edge로 라우트를 이전할 가능성 대비. jose가 표준 Web Crypto 기반 |
| R4 | Plan §6 Architecture — admin layout requireAdminPage | layout이 await | **`connection()` + Suspense 자식에서 `requireAdminPage` 호출** (community-feed-3panel R10 / partner-promo §3.4 패턴) | Next 16 cacheComponents가 layout level uncached IO를 거부 |
| R5 | Plan §8.1 — `crypto.timingSafeEqual` for username | Buffer.from(...padEnd) | 그대로. 단 padEnd 길이를 충분히 크게 (64 bytes) — 일반적으로 username이 짧음 | timingSafeEqual은 동일 길이 Buffer 요구 |
| R6 | Plan §8.1 — bcrypt cost | "bcrypt cost 10" | **cost 10 유지**. Vercel Node runtime에서 ~100ms (cold start 1회). Edge runtime이면 cost 8 검토. v1은 Node 가정 | brute-force 비용 vs latency 균형 |
| R7 | Plan §8 — Session JWT (8h) | iat·exp만 | `iat`, `exp`, `kid: 'admin-v1'`(키 회전 대비), `iss: 'cheonggwang-admin'`(다른 JWT와 격리) 추가 | session token 유출 시 v2에서 강제 무효화 가능 (kid 변경) |
| R8 | Plan §6 — `/api/admin/users/lookup` | GET ?email | 그대로. `adminAuth.getUserByEmail`은 not-found 시 throw — 404로 변환 | UI에서 명확한 에러 표시 가능 |
| R9 | Plan §7 — `partnerRepository.appendEvent` | by:'admin' | **partnerId가 있는 액션만 events 기록**. providers·posts admin 액션은 partner와 무관하면 events 미기록 (감사 한계 인지). v2에 별도 `auditLogs` 컬렉션 검토 | partners/{id}/events는 partner 한정 서브컬렉션 |
| R10 | Plan §7 — Posts 강제 철회 | publishStatus → 'withdrawn' | `postRepository.setPublishStatus(id, 'withdrawn')` 그대로 사용 (트랜잭션 CAS · publishedAt 보존, partner-promo §6.4 H1과 동일). 단 admin은 **본인 검증을 우회** — 라우트 핸들러에서 admin claim만 확인 후 호출 | 본인 검증 로직은 partner 라우트 한정 |
| R11 | Plan §6 — admin entry redirect | `/admin/login?next=...` | next 파라미터에 `/admin/...` 외 외부 URL 거부 — `next.startsWith('/admin')` 검증 | open redirect 방어 |
| R12 | Plan § 없음 | — | **`requireAdminApi`/`requireAdminPage`가 모두 동일 `verifyAdminToken(cookie)` 헬퍼 사용**. 차이는 실패 처리만 (throw vs redirect) | DRY · 검증 로직 단일 |
| R13 | Plan §8 — IP rate-limit key | `admin-login:${ip}` | `request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()` — Vercel은 x-forwarded-for 첫 IP 신뢰. ipv6 지원 | 정확한 IP 추출 |

**모든 변경은 실제 코드/프레임워크와의 정합 목적 · Plan의 의도 왜곡 없음.**

---

## 1. File Inventory

### 1.1 신규 파일 (27 — H6 결의: login/logout을 API Routes에 흡수, Components 8개로 정정)

**Auth & Session helpers (2)**
| 경로 | Role |
|---|---|
| `src/lib/auth/admin-session.ts` | `signAdminToken()` · `verifyAdminToken(cookie)` (jose 기반 HS256 JWT, 8h, kid:'admin-v1') |
| `src/lib/auth/require-admin.ts` | `requireAdminPage(nextPath?)` (redirect) · `requireAdminApi()` (throw) · 공통 `verifyOrNull()` |

**Pages (8)**
| 경로 | Role |
|---|---|
| `src/app/admin/login/page.tsx` | sync component → Suspense + AdminLoginForm. metadata noindex |
| `src/app/admin/layout.tsx` | sync, AdminNav 자식에서 `connection()` + `requireAdminPage()` (R4) |
| `src/app/admin/page.tsx` | 홈 — Suspense 자식 StatsWidgets |
| `src/app/admin/partners/page.tsx` | 목록 + 검색 + status 필터 |
| `src/app/admin/partners/new/page.tsx` | 발급 폼 |
| `src/app/admin/partners/[partnerId]/page.tsx` | 상세 + status 토글 + autoPublish 운영자 편집 |
| `src/app/admin/providers/page.tsx` | 청명 목록 + verified/insured 토글 |
| `src/app/admin/posts/page.tsx` | 글 목록 + 강제 철회 |

**API Routes (8)**
| 경로 | Role |
|---|---|
| `src/app/api/admin/login/route.ts` | `POST` username/password → bcrypt verify → JWT cookie set. rate-limit 5/15분/IP |
| `src/app/api/admin/logout/route.ts` | `POST` cookie clear (`cookies().set('admin_session','',{maxAge:0,path:'/',...})`, H7) |
| `src/app/api/admin/users/lookup/route.ts` | `GET ?email=...` → `adminAuth.getUserByEmail` → `{uid, displayName, email}` 또는 404 |
| `src/app/api/admin/partners/route.ts` | `POST` 발급 — `partnerRepository.create` + `appendEvent` |
| `src/app/api/admin/partners/[partnerId]/route.ts` | `PATCH` `{status?, autoPublish?}` |
| `src/app/api/admin/providers/[providerId]/route.ts` | `PATCH` `{verified?, insured?}` |
| `src/app/api/admin/posts/[postId]/withdraw/route.ts` | `POST` → `setPublishStatus(id, 'withdrawn')` + revalidatePath |
| `src/app/api/admin/stats/route.ts` | `GET` 통계 (오늘 N건, 평균 hygiene, partners status별 카운트, draft 수, auto-published 비율) |

**Components (8)**
| 경로 | Role |
|---|---|
| `src/components/admin/AdminLoginForm.tsx` | client — POST /api/admin/login, 성공 시 `next` 파라미터로 redirect |
| `src/components/admin/AdminNav.tsx` | server — sticky nav (현재 페이지 active) + 로그아웃 버튼 (form action) |
| `src/components/admin/PartnersList.tsx` | server — 목록 + 검색 query param + status별 그룹 |
| `src/components/admin/PartnerIssueForm.tsx` | client — 이메일 lookup → 추가 필드 → POST 발급 |
| `src/components/admin/PartnerEditor.tsx` | client — status 토글 + autoPublish 편집 (AutoPublishSettings를 endpoint·initial props로 주입식 재구성, R1) |
| `src/components/admin/ProvidersList.tsx` | client (토글 액션) — 카드/행 + verified·insured 스위치 |
| `src/components/admin/PostsList.tsx` | client (철회 액션) — postType·publishStatus 필터 + 강제 철회 버튼 |
| `src/components/admin/StatsWidgets.tsx` | server — 4-6 카드 (Suspense 자식) |

**Domain Helper (1)**
| 경로 | Role |
|---|---|
| `src/lib/admin/stats.ts` | `countTodayPublishedPartnerPromo()` · `avgHygieneScoreLast30d()` · `partnersByStatusCount()` · `draftPartnerPromoCount()` · `autoPublishedRatioLast72h()` |

### 1.2 수정 파일 (5)

| 경로 | 변경 |
|---|---|
| `src/app/robots.ts` | `disallow: ['/admin', '/admin/', ...]` 추가 (F4 + M7 — `/admin` no-slash와 `/admin/` 둘 다 차단) |
| `src/lib/firebase/provider-repository.ts` | `setVerified(id, bool)` · `setInsured(id, bool)` 신규 메서드 (R2). **H4 결의**: 기존 `provider-repository.ts:247-269` `create()`는 `verified`/`insured`를 payload에 포함하지 않음 → 신규 setter는 `update({verified: bool})` 단순 적용. 미설정 문서는 `toProvider`(line 93·116)에서 `false`로 폴백되므로 기존 데이터 호환. |
| `src/components/partner/AutoPublishSettings.tsx` | **시그니처 확장 (R1, C1 결의)**: `interface Props { initial: AutoPublishConfig; endpoint?: string; onSaved?: () => void }`. `endpoint` 누락 시 기존 `/api/partner/settings` 디폴트. `save()` 함수는 항상 `router.refresh()` 호출 + `onSaved?.()` 호출 (admin 부모가 admin partner detail page를 갱신할 수 있게). 기존 `/partner/settings` 호출자는 endpoint·onSaved 미전달 시 동작 그대로 유지 (백워드 호환). |
| `src/lib/errors.ts` | (선택) `ADMIN_LOGIN_FAILED` 코드 추가 — `UNAUTHENTICATED`로 묶어도 됨 |
| `package.json` | `bcryptjs` + `@types/bcryptjs` + `jose` 의존성 추가 (R3 — `jsonwebtoken` 대신 `jose`) |

### 1.3 환경 변수 추가 (3)

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$...   # bcrypt('test6274', 10) 1회 생성, 시연 시작 시 회전 권장
ADMIN_SESSION_SECRET=<random 32 bytes hex>
```

`.env.local` + Vercel project env에 모두 등록. password hash 생성 (C2 결의 — bcryptjs는 CLI 없음, Node 인라인만):
```bash
# 의존성 설치 후
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'test6274'
# 결과 예: $2a$10$abc...xyz123
```

---

## 2. Data Model

### 2.1 신규 컬렉션·필드 없음

`partners`·`providers`·`posts`·`users`는 cycle #19 이전 정의 그대로. admin은 위에서 동작.

### 2.2 admin session JWT payload (R7 보강)

```ts
interface AdminSessionPayload {
  admin: true;
  iss: 'cheonggwang-admin';   // issuer 분리 (R7)
  iat: number;                 // issued at (sec, jose 자동)
  exp: number;                 // expires at (sec) — iat + 28800
  // kid는 header에 'admin-v1'
}
```

서명: HMAC-SHA256, key from `ADMIN_SESSION_SECRET` (32 bytes hex → 64 chars)

### 2.3 cookie

```
admin_session  HttpOnly · Secure (production) · SameSite=Strict · Path=/ · MaxAge=28800
```

`Path=/` 인 이유: `/api/admin/*`도 cookie를 읽어야 함 (`/admin` 경로 한정 시 API 라우트가 cookie 못 읽음).

### 2.4 events 활용 (admin 액션 감사, R9)

partners/{id}/events 서브컬렉션에 admin 액션 기록 시:
```ts
{
  type: 'status-changed' | 'publish-toggled',  // 기존 5종 중 적합한 것
  by: 'admin',
  decidedAt: serverTimestamp,
  ...관련 필드
}
```
provider·post에는 events 컬렉션이 없으므로 admin 액션이 audit 추적되지 않음. v2에 `auditLogs` 컬렉션 도입 검토.

---

## 3. Architecture & Data Flow

### 3.1 로그인 흐름

```
[Browser] /admin (보호 영역 진입)
  layout.tsx → Suspense 자식에서 await connection() → requireAdminPage('/admin')
    cookie 'admin_session' 검증
      valid    → 정상 렌더 + AdminNav
      invalid  → redirect('/admin/login?next=/admin')

[Browser] /admin/login?next=/admin/partners
  AdminLoginForm:
    POST /api/admin/login { username, password, next? }
    성공 응답 { ok: true, redirectTo: validNext }
      → router.push(redirectTo)

[Server] POST /api/admin/login
  ├─ ip = headers['x-forwarded-for']?.split(',')[0]?.trim()
  ├─ rate-limit: checkAndIncrement(`admin-login:${ip}`, 5, 15*60_000)
  ├─ zod validate body
  ├─ usernameOk = timingSafeEqual(padEnd(username, 64), padEnd(ADMIN_USERNAME, 64))
  ├─ passwordOk = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
  ├─ if !usernameOk || !passwordOk → 401 { code: 'UNAUTHENTICATED', message: '...' }
  ├─ token = await new SignJWT({ admin: true })
  │            .setProtectedHeader({ alg: 'HS256', kid: 'admin-v1' })
  │            .setIssuer('cheonggwang-admin')
  │            .setIssuedAt()
  │            .setExpirationTime('8h')
  │            .sign(secretKey)
  ├─ cookies().set('admin_session', token, {httpOnly, secure, sameSite:'strict', maxAge:28800, path:'/'})
  ├─ next 검증 (R11 강화 · H1 결의):
  │     함수 isSafeNext(s):
  │       return (s === '/admin' || s.startsWith('/admin/'))
  │              && !s.includes('//')        // protocol-relative URL 차단
  │              && !s.includes('\\')        // backslash 우회 차단
  │              && !s.startsWith('/admin/login')  // 로그인 후 다시 로그인 페이지 진입 방어
  │     redirectTo = isSafeNext(nextRaw) ? nextRaw : '/admin'
  └─ 200 { ok: true, redirectTo }
```

### 3.2 가드 (R12 — 단일 verify 헬퍼)

```ts
// src/lib/auth/admin-session.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = () => new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET ?? '');

export async function signAdminToken(): Promise<string> {
  return await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256', kid: 'admin-v1' })
    .setIssuer('cheonggwang-admin')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET(), {
      algorithms: ['HS256'],
      issuer: 'cheonggwang-admin',
    });
    return (payload as JWTPayload & { admin?: boolean }).admin === true;
  } catch {
    return false;
  }
}

// src/lib/auth/require-admin.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { verifyAdminToken } from './admin-session';

async function readToken(): Promise<string | undefined> {
  return (await cookies()).get('admin_session')?.value;
}

export async function requireAdminApi(): Promise<void> {
  const ok = await verifyAdminToken(await readToken());
  if (!ok) throw new AppError('UNAUTHENTICATED', 'admin 로그인이 필요합니다');
}

export async function requireAdminPage(nextPath = '/admin'): Promise<void> {
  const ok = await verifyAdminToken(await readToken());
  if (!ok) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}
```

**H2 결의 — layout vs page 가드 분담**
- `/admin/layout.tsx`는 `requireAdminPage('/admin')` (default fallback)으로 **접근 차단**만 책임. layout은 Next 16 server component 단에서 현재 pathname 직접 조회 불가.
- 각 `page.tsx`는 server component이므로 `headers()` API로 현재 pathname을 추출해 `requireAdminPage(currentPathname)`을 한 번 더 호출 가능. 하지만 layout이 이미 차단하므로 실용적으로 **layout 가드만으로 충분**.
- 결과: 비인증자가 `/admin/partners/[id]`에 직접 접근하면 `/admin/login?next=/admin`으로 redirect (deep-link 보존 X — 의도된 trade-off, login 후 `/admin` 홈으로 이동 후 재 navigate). v2에 middleware로 deep-link 보존 검토.

### 3.x 로그아웃 (H7 결의 — cookie 삭제 메커니즘 명시)

```
[Server] POST /api/admin/logout
  ├─ (admin 가드 불필요 — 비인증자도 호출 가능, 멱등)
  └─ cookies().set('admin_session', '', {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: 0,
       path: '/',                          // login 시 set한 path와 동일
     })
     return new Response(null, { status: 204 })
```

**`cookies().delete()` 대신 `set('', {maxAge:0})` 사용 이유**:
- `delete()`는 path 매칭 의존 — 일부 브라우저/엣지 케이스에서 path 불일치로 미삭제 가능
- 명시적 set + maxAge=0이 모든 브라우저에서 일관됨
- httpOnly·secure·sameSite를 다시 set하지 않으면 브라우저가 일관성 검증으로 거부할 수 있음

### 3.3 Partner 발급 흐름

```
[Admin] /admin/partners/new
  PartnerIssueForm (client component):
    Stage 1: 이메일 input + "조회" 버튼
       GET /api/admin/users/lookup?email=...
         200 { uid, displayName, email } → Stage 2
         404 → "Auth에 가입된 사용자가 아닙니다"
    Stage 2: 추가 필드 입력 (uid는 hidden, businessName 필수)
    Stage 3: "발급" 버튼
       POST /api/admin/partners {
         uid, businessName, regionLabel?, category?, logoUrl?, notes?
       }
       ├─ requireAdminApi()
       ├─ zod validate
       ├─ partnerRepository.create({
       │    id: nanoid(12),               // pre-allocated
       │    ownerUid,
       │    businessName,
       │    logoUrl, category, regionLabel, notes,
       │    status: 'active',
       │    issuedBy: 'admin',
       │  })
       │   // H3 결의: autoPublish는 partnerRepository.create가 항상 DEFAULT_AUTO_PUBLISH로 강제 (R10).
       │   // 입력으로 받지 않으며, 발급 form에 노출 X. 운영자가 발급 후 partner editor에서 변경.
       ├─ partnerRepository.appendEvent(partnerId, {
       │    type: 'status-changed',
       │    from: 'invited', to: 'active', by: 'admin', decidedAt: new Date()
       │  })
       └─ 201 { partnerId, redirectTo: `/admin/partners/${partnerId}` }
       
       클라이언트: router.push(redirectTo)
```

### 3.4 PATCH /api/admin/partners/[partnerId]

```
body: { status?: PartnerStatus, autoPublish?: AutoPublishConfig }

├─ requireAdminApi()
├─ zod validate
├─ if (status !== undefined):
│    partnerRepository.setStatus(partnerId, status)
│    appendEvent({ type:'status-changed', from:cur.status, to:status, by:'admin' })
├─ if (autoPublish !== undefined):
│    validateAutoPublishConfig (기존 zod) → ok or 400
│    partnerRepository.updateAutoPublish(partnerId, cfg)
│    (events 미기록 — autoPublish 변경은 일상 운영, R9)
└─ 200 { ok: true }
```

### 3.5 PATCH /api/admin/providers/[providerId]

```
body: { verified?: boolean, insured?: boolean }

├─ requireAdminApi()
├─ zod validate (둘 다 옵셔널 boolean)
├─ refine: 최소 1개 키 — Object.keys(d).length >= 1 (M1 정정)
├─ if (verified !== undefined):
│    providerRepository.setVerified(providerId, verified)
├─ if (insured !== undefined):
│    providerRepository.setInsured(providerId, insured)
└─ 200 { ok: true }
```

### 3.6 POST /api/admin/posts/[postId]/withdraw

```
├─ requireAdminApi()
├─ post = postRepository.get(postId)
├─ if (!post) → 404
├─ if (post.publishStatus !== 'published') → 409 STATUS_CONFLICT
├─ result = postRepository.setPublishStatus(postId, 'withdrawn')
│   (트랜잭션 CAS — partner-promo §6.4 그대로, publishedAt 보존)
├─ if (post.postType === 'partner-promo' && post.providerId.startsWith('partner:')):
│    partnerId = post.providerId.slice('partner:'.length)
│    partnerRepository.appendEvent({
│      type: 'publish-toggled', postId, from: 'published', to: 'withdrawn', by:'admin'
│    })
├─ revalidatePath(`/community/p/${post.slug}`, '/community/partners', '/sitemap.xml')
└─ 200 { publishStatus: 'withdrawn' }
```

### 3.7 GET /api/admin/stats

```
├─ requireAdminApi()
├─ const [today, avgHygiene, byStatus, draftCount, autoRatio] = await Promise.all([
│    countTodayPublishedPartnerPromo(),    // KST 자정 기준
│    avgHygieneScoreLast30d(),
│    partnersByStatusCount(),
│    draftPartnerPromoCount(),
│    autoPublishedRatioLast72h(),
│  ])
└─ 200 { today, avgHygiene, byStatus: {invited,active,suspended}, draftCount, autoRatio }
```

**KST 자정 계산 (H5 결의 — host timezone 무관 정확 변환)**:
```ts
// src/lib/admin/stats.ts
export function kstMidnightUtc(now: Date = new Date()): Date {
  // 'YYYY-MM-DD' part of KST date, host TZ 무관
  const kstStr = now.toLocaleString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  // 'YYYY-MM-DD' (en-CA 표준) 또는 ', ' 구분 — '2026-04-25, ...' 형태일 수 있음
  const dateOnly = kstStr.split(',')[0].trim();
  // KST 자정을 절대 시각으로 변환
  return new Date(`${dateOnly}T00:00:00+09:00`);
}

export async function countTodayPublishedPartnerPromo(): Promise<number> {
  const startUtc = kstMidnightUtc();
  const snap = await adminDb
    .collection('posts')
    .where('postType', '==', 'partner-promo')
    .where('publishStatus', '==', 'published')
    .where('publishedAt', '>=', Timestamp.fromDate(startUtc))
    .count()
    .get();
  return snap.data().count;
}
```

**검증**: host TZ를 `America/Los_Angeles`로 설정해도 KST 기준 자정 이후 발행만 카운트되는지 단위 테스트로 확인 (Acceptance Criteria #14에 명시).

### 3.8 권한 매트릭스

| Actor | /admin/login | /admin/* | /api/admin/login | /api/admin/* (login 외) |
|---|---|---|---|---|
| Anonymous | ✓ | redirect login | ✓ (rate-limit 적용) | 401 |
| 로그인 일반 사용자 (Firebase session) | ✓ | redirect login | ✓ | 401 |
| admin session 보유 | (skip) | ✓ | (재로그인 가능) | ✓ |
| Brute-force IP | ✓ → 6회째 429 | — | rate-limit 차단 | — |

---

## 4. API Contracts

### 4.1 POST /api/admin/login

**Request** (JSON):
```ts
const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  next: z.string().optional(),   // /admin 시작 검증 (R11)
});
```

**Response 200**: `{ ok: true, redirectTo: string }`

**Errors**:
| Code | HTTP | 설명 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | username/password 형식 |
| `UNAUTHENTICATED` | 401 | id/pw 불일치 (timing-safe로 동일 메시지) |
| `RATE_LIMITED` | 429 | 5회/15분 IP 초과 |

### 4.2 POST /api/admin/logout

**Request**: 빈 body
**Response 204**: cookie cleared

### 4.3 GET /api/admin/users/lookup

**Request** (query): `?email=peter@...`

**Response 200**: `{ uid, displayName, email }`

**Errors**:
| Code | HTTP |
|---|---|
| `UNAUTHENTICATED` | 401 (admin 미로그인) |
| `VALIDATION_ERROR` | 400 (email 형식) |
| `NOT_FOUND` | 404 (Auth에 미가입) |

### 4.4 POST /api/admin/partners

**Request** (JSON):
```ts
const issueSchema = z.object({
  uid: z.string().min(1),
  businessName: z.string().min(1).max(40),
  regionLabel: z.string().max(60).optional(),
  category: z.enum(QUOTE_CATEGORIES).optional(),  // domain/quote-category 의 enum 재사용
  logoUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});
```

**Response 201**: `{ partnerId, redirectTo }`

**Errors**: 401·403·400·`ALREADY_REGISTERED`(409)

### 4.5 PATCH /api/admin/partners/[partnerId]

**Request**:
```ts
const patchSchema = z.object({
  status: z.enum(['active','suspended']).optional(),
  autoPublish: autoPublishConfigSchema.optional(),  // partner-promo의 zod 재사용
}).refine((d) => d.status !== undefined || d.autoPublish !== undefined,
         '변경할 필드 1개 이상');
```
**Response 200**: `{ ok: true }`

### 4.6 PATCH /api/admin/providers/[providerId]

**Request**:
```ts
const patchSchema = z.object({
  verified: z.boolean().optional(),
  insured: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, '변경할 필드 1개 이상');
```

### 4.7 POST /api/admin/posts/[postId]/withdraw

**Request**: 빈 body
**Response 200**: `{ publishStatus: 'withdrawn' }`
**Errors**: 401·404·409

### 4.8 GET /api/admin/stats

**Response 200**:
```ts
{
  today: {
    partnerPromoPublished: number,
  },
  avgHygiene30d: number | null,        // null = 데이터 없음
  partners: { invited: n, active: n, suspended: n },
  draftPartnerPromo: number,
  autoPublishedRatio72h: number | null  // 0..1
}
```

---

## 5. UI Wireframes

### 5.1 `/admin/login`

```
┌─────────────────────────────────────────────┐
│           청광 운영자 로그인                 │
│                                              │
│   ID       [____________________]            │
│   PW       [____________________]  [👁]       │
│                                              │
│              [로그인]                        │
│                                              │
│   ⓘ 운영자 전용. 일반 로그인은 /login         │
└─────────────────────────────────────────────┘
```

- 단순 form, 회원가입 링크 X
- error 발생 시 폼 위에 빨간 banner ("아이디 또는 비밀번호가 올바르지 않습니다")
- rate-limit 시 "잠시 후 다시 시도해주세요"

### 5.2 `/admin` (홈)

```
┌─────────────────────────────────────────────────────────────┐
│ 청광 운영 콘솔                              [admin]  [로그아웃]│
│ [홈]  [Partners]  [Providers]  [Posts]                       │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│ │  오늘    │  │ 평균     │  │  Active  │  │  Draft   │      │
│ │ 발행 N건 │  │ Hygiene  │  │ Partners │  │ partner- │      │
│ │   12    │  │  0.94    │  │   8      │  │  promo  3│      │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                              │
│ ┌──────────┐  ┌──────────┐                                   │
│ │ Suspend  │  │ Auto-Pub │                                   │
│ │ Partners │  │  72h 비율│                                   │
│ │   1      │  │  37 %    │                                   │
│ └──────────┘  └──────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 `/admin/partners`

```
┌─────────────────────────────────────────────────────────────┐
│ Partners (12)                              [+ 새 발급]       │
│ [모두▼] [active] [invited] [suspended]    🔍 [검색...]      │
├─────────────────────────────────────────────────────────────┤
│ ✅ Active (8)                                                │
│   ┌──────┬──────────────┬─────────┬──────┬──────────────┐  │
│   │ logo │ businessName │ region  │ auto │ 액션          │  │
│   │  []  │ 데모 카페    │ 강남구  │ ON   │ [상세][정지]  │  │
│   │  []  │ 청광 본점    │ 서울    │ OFF  │ [상세][정지]  │  │
│   └──────┴──────────────┴─────────┴──────┴──────────────┘  │
│                                                              │
│ ✉ Invited (3)                                                │
│   ...                                                        │
│                                                              │
│ 🚫 Suspended (1)                                             │
│   ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 `/admin/partners/new`

```
┌─────────────────────────────────────────────────────────────┐
│ ← 새 partner 발급                                            │
│                                                              │
│ Step 1 · Firebase Auth 사용자 조회                           │
│   이메일 [_________________________]  [조회]                 │
│   ✓ uid: oRpQQm08SUW... · 문재희 (peter@...)                │
│                                                              │
│ Step 2 · 매장 정보                                           │
│   매장명*    [_________________________]                     │
│   지역       [______서울 강남구______]                       │
│   카테고리   [▼ 정기청소]                                    │
│   로고 URL   [_________________________]                     │
│   메모       [_________________________]                     │
│                                                              │
│                      [취소]   [✨ 발급]                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 `/admin/partners/[partnerId]`

```
┌─────────────────────────────────────────────────────────────┐
│ ← 데모 카페 (demo-001)                                       │
│   ownerUid: oRpQQm08SUW... · peter@... · 발급 2026-04-25     │
│                                                              │
│ ┌── status ─────────────────────────────────────────────────┐│
│ │  현재: ✅ active                                           ││
│ │  [active로 유지] [⚠️ suspended로 변경]                     ││
│ └───────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌── 자동발행 (운영자 강제) ───────────────────────────────────┐│
│ │  ◯ OFF    ◉ ON                                             ││
│ │  요일  [✓월][✓화][✓수][✓목][✓금][□토][□일]                ││
│ │  시간  09:00 ~ 18:00 KST                                  ││
│ │  ⓘ 다음 윈도우: 2026-04-28 09:00                           ││
│ │                                                  [💾 저장]  ││
│ └───────────────────────────────────────────────────────────┘│
│                                                              │
│ 최근 events (5)                                              │
│   2026-04-25 14:30  status-changed  invited→active  by admin │
│   ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 `/admin/providers`

```
┌─────────────────────────────────────────────────────────────┐
│ Providers (45)        [✓ verified] [✓ insured]   🔍 [검색]  │
├─────────────────────────────────────────────────────────────┤
│ ┌────┬─────────────┬─────────┬───────┬───────┬──────────┐   │
│ │logo│ companyName │ region  │ ✓ verif│ ✓ insur│ 액션    │   │
│ │ [] │ 청명1       │ 강남구  │  [O]  │  [O]  │ [상세]  │   │
│ │ [] │ 청명2       │ 마포구  │  [ ]  │  [O]  │ [상세]  │   │
│ └────┴─────────────┴─────────┴───────┴───────┴──────────┘   │
│  토글 누르면 즉시 PATCH (낙관적 UI)                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.7 `/admin/posts`

```
┌─────────────────────────────────────────────────────────────┐
│ Posts (132)  [tip|provider|partner-promo]  [published|draft│
│              | withdrawn]                  🔍 [검색]         │
├─────────────────────────────────────────────────────────────┤
│ ┌──────┬──────────────────────┬───────┬──────────┬────────┐ │
│ │ 썸네 │ 제목                 │ type  │ status   │ 액션   │ │
│ │ []   │ 새집 청소 가이드…    │ tip   │published │[열기][🚫]│ │
│ │ []   │ 우리 매장 이야기…    │partnr │published │[열기][🚫]│ │
│ │ []   │ 부적절 콘텐츠 예…    │ ...   │published │[열기][🚫]│ │
│ └──────┴──────────────────────┴───────┴──────────┴────────┘ │
│  🚫 = 강제 철회. confirm("정말 철회?")                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. SEO · Robots

- `src/app/robots.ts`에 `/admin/` 추가 (`/api/`, `/partner/`와 같은 라인에)
- `src/app/admin/layout.tsx`의 `metadata.robots = { index: false, follow: false }` (F4)
- `/admin/login/page.tsx`도 metadata noindex 명시 (path가 admin 아래라 자동 적용되지만 명시)

---

## 7. Operator/Bootstrap

### 7.1 첫 admin 활성화 (1회)

```bash
# 1) 의존성 설치 후 bcrypt hash 생성 (C2: bcryptjs CLI 없으므로 Node 인라인)
pnpm add bcryptjs @types/bcryptjs jose
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'test6274'
# 결과 예: $2a$10$abc...xyz123

# 2) .env.local 추가
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$abc...xyz123
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)

# 3) Vercel project env 등록 (Production 환경에)
pnpm dlx vercel env add ADMIN_USERNAME production
# 입력 프롬프트에 admin
pnpm dlx vercel env add ADMIN_PASSWORD_HASH production
# 입력 프롬프트에 위 hash
pnpm dlx vercel env add ADMIN_SESSION_SECRET production
# 입력 프롬프트에 위 random hex

# 4) 재배포 (env 반영)
git push origin main   # Vercel 자동
```

### 7.2 패스워드 회전 (시연 후 등)

```bash
# 위 1) 단계로 새 hash 생성
# Vercel CLI:
pnpm dlx vercel env rm ADMIN_PASSWORD_HASH production
pnpm dlx vercel env add ADMIN_PASSWORD_HASH production
# (입력 새 hash)
# 재배포 트리거 — 빈 commit 또는 vercel deploy --prod
```

### 7.3 Session 강제 만료 (긴급 회수)

```bash
pnpm dlx vercel env rm ADMIN_SESSION_SECRET production
pnpm dlx vercel env add ADMIN_SESSION_SECRET production
# (입력 새 random hex)
# 재배포 — 모든 발급된 admin_session 즉시 무효 (서명 검증 실패)
```

---

## 8. Implementation Order

| Step | 범위 | 출력 | 의존성 |
|---|---|---|---|
| **S1** | 의존성 + env 설정 | bcryptjs + jose 설치, env 3개 추가 | — |
| **S2** | admin-session helper + require-admin | 단위 테스트(스모크) — sign/verify 라운드트립 | S1 |
| **S3** | /api/admin/login + /api/admin/logout | curl로 cookie 발급 검증 | S2 |
| **S4** | /admin/login UI + AdminLoginForm | 브라우저에서 로그인 → cookie 확인 | S3 |
| **S5** | /admin layout + AdminNav + robots | 비인증자 redirect, 인증자 페이지 정상 | S2 |
| **S6 (was S10)** | AutoPublishSettings 시그니처 확장 (R1·C1) — endpoint·onSaved 옵셔널 props | `/partner/settings` 회귀 없음 (기존 호출자 props 미전달 시 기존 동작) | S5 |
| **S7 (was S6)** | /admin/partners 목록 + 발급 폼 + 상세 | 발급 → 상세 이동 → status·autoPublish 편집 (S6 의존) | S6 |
| **S8 (was S7)** | provider-repository 메서드 추가 + /admin/providers | verified·insured 토글 동작 | S5 |
| **S9 (was S8)** | /admin/posts + 강제 철회 | 강제 철회 후 /community 즉시 갱신 (revalidatePath) | S5 |
| **S10 (was S9)** | stats helper + /admin/stats route + StatsWidgets | /admin 홈에 카드 6개 노출 (KST 자정 helper, H5) | S5 |
| **S11** | 빌드·배포·smoke test | `pnpm build` + Vercel deploy + login → 발급 흐름 검증 + KST stats 단위 테스트 | All |

---

## 9. Risks & Mitigations (Plan §10 보강)

| 리스크 | 확률 | 영향 | 완화 |
|---|---|---|---|
| 단일 공유 admin 누가 무엇 했는지 추적 약함 | High (의도) | 감사 부족 | partners 액션은 events에 by:'admin' 통일 + IP/시각 로그 (Vercel Runtime Logs). v2에 multi-admin |
| `ADMIN_SESSION_SECRET` 유출 | Low | 위조 토큰 | Vercel encrypted env + 회전 = 모든 세션 만료 (의도된 동작) |
| `/api/admin/login` 응답 시간 차이로 username 추측 | Low | 정보 누출 | timing-safe compare + bcrypt는 username 무관하게 항상 실행 (early return 회피) |
| `next` 파라미터 open redirect | Medium | 피싱 | R11 — `next.startsWith('/admin')` 검증 |
| `cookies().set` Server Component에서 호출 시 Next 16 에러 | High (잘못 쓰면) | login 동작 불가 | login은 Route Handler에서만, Server Component·layout는 read만 |
| jose vs jsonwebtoken 혼용 | Low | 검증 불일치 | jose 단일 사용, jsonwebtoken 미설치 |
| AutoPublishSettings 시그니처 확장으로 /partner/settings 회귀 | Medium | 일반 파트너 설정 UI 깨짐 | endpoint·onSaved를 옵셔널로 + default 값으로 기존 동작 유지 + S10 시 회귀 검증 |
| robots noindex 누락 | Low | /admin 검색 노출 | F4 강제 + 빌드 직후 manual check (`curl /robots.txt`) |
| bcrypt cost 10이 Vercel cold start latency 증가 | Low | login 첫 요청 +100ms | 시연 자리에서 1-2초 첫 로그인 OK. cost 8 대안 검토 (R6) |
| StatsWidgets가 매 요청 5개 쿼리 → Firestore 비용 증가 | Medium | 비용 | 60s 메모리 캐시 (Next 16 'use cache' 디렉티브 또는 in-memory Map) |
| CSRF 가능성 (M4 결의) | Low | 위조 요청 | SameSite=Strict admin_session cookie + Content-Type:application/json (브라우저는 cross-site simple POST에 JSON 미전송) + login 라우트는 cookie 발급용이라 CSRF 무관. 모든 admin 라우트는 위 조합으로 보호됨 |
| JWT replay (M6 결의) | Low | 도난 토큰 8h 사용 | logout은 cookie만 clear (서버는 stateless JWT). 도난 시 v1 mitigation = `ADMIN_SESSION_SECRET` 회전 → 모든 세션 즉시 무효 (의도된 nuclear option). v2에 server-side session store 검토 |
| `/admin` (no slash) 검색 노출 (M7 결의) | Low | 인덱싱 | robots.ts에 `'/admin'` (no slash) + `'/admin/'` 둘 다 disallow 추가 |

---

## 10. Open Questions

| OQ | 질문 | 결정 시점 |
|---|---|---|
| **OQ-1** | bcrypt cost — 10 vs 8 | S2 구현 시 latency 측정 후 |
| **OQ-2** | Stats 캐싱 전략 (60s in-memory vs Next 'use cache' vs Firestore aggregation) | S9 구현 시 |
| **OQ-3** | logout 후 모든 탭 동기화 (BroadcastChannel 또는 다음 요청 시 자동) | S4 |
| **OQ-4** | provider verified/insured 변경 시 events 같은 감사 컬렉션 만들지 (auditLogs) | v2로 이연. v1은 Vercel Runtime Logs |
| **OQ-5** | /admin/posts에 검색 input — 인메모리 vs Firestore search | v2. v1은 postType·publishStatus 필터만 |

---

## 11. Acceptance Criteria

설계가 완료되었다고 보려면:

- [ ] `.env.local`(+Vercel) 3개 env 등록 후 `/admin/login`에서 admin/test6274로 로그인 성공
- [ ] 로그인 후 `/admin` 홈에 통계 6개 카드 노출, 비로그인 사용자는 `/admin/login?next=/admin`으로 redirect
- [ ] `/admin/partners/new`에서 본인 이메일 입력 → 조회 → 발급 → `/admin/partners/{id}` 자동 이동
- [ ] 발급된 partner의 status를 suspended로 변경 → 그 ownerUid로 일반 로그인 시 `/partner/posts` 진입은 redirect '/'
- [ ] `/admin/partners/{id}`의 autoPublish ON+윈도우 변경 → 그 partner로 `/partner/posts/new` 즉석 시연 시 자동 발행 동작
- [ ] `/admin/providers`에서 verified 토글 → DB 즉시 반영
- [ ] `/admin/posts`에서 published 글 강제 철회 → `/community/p/{slug}` 즉시 404 (또는 본인 preview), `/community/partners` 목록에서 사라짐
- [ ] 비로그인 사용자가 `/api/admin/partners` POST → 401
- [ ] `/api/admin/login` 6회 연속 실패 → 429 (rate-limit)
- [ ] 로그인 후 8h 경과 → cookie 만료, 다음 요청 시 redirect login
- [ ] `/robots.txt`에 `Disallow: /admin/` 라인 존재
- [ ] `pnpm build` 통과 + 신규 의존성 lint 통과
- [ ] StatsWidgets가 60s 캐싱 (OQ-2 정책 결정 후)
- [ ] **KST stats host TZ 단위 테스트** (H5) — 호스트를 `America/Los_Angeles`로 두고 `kstMidnightUtc()` + `countTodayPublishedPartnerPromo()` 동작 검증
- [ ] **logout 후 cookie 삭제 확인** (H7) — 로그아웃 후 `/admin` 진입 시 redirect login

---

## 12. Next Steps

1. `bkit:design-validator`로 본 design 검증 (cycle #19에서 4 Critical + 7 High 결의 효과 검증됨)
2. OQ-1·OQ-2 결정 (S2/S9 진입 전)
3. `/pdca do admin-console` — S1–S11 순차 구현
4. `/pdca analyze admin-console` (gap-detector) — 목표 ≥ 90%
5. ≥ 90% 도달 후 `/pdca report` → archive

---

**Approval Status**: Ready for `/pdca do admin-console` (v0.2 design-validator 응답 반영 후).
- 잔여 Open Questions: **OQ-1**(bcrypt cost 10 vs 8) — S2 진입 시 / **OQ-2**(Stats 캐싱) — S10 진입 시 / **OQ-3**(logout multi-tab) — S4 / **OQ-4**·**OQ-5**(v2 이연)

### Design-Validator v0.1 응답 반영 (2026-04-25)

| Severity | Item | Resolution |
|---|---|---|
| Critical | C1 (AutoPublishSettings backward-compat) | §1.2 — Props 시그니처 명시 (initial + endpoint? + onSaved?) + `router.refresh()` 항상 + `onSaved?.()` 호출 |
| Critical | C2 (bcryptjs CLI 부정확) | §1.3·§7.1 — `pnpm dlx bcryptjs` 제거, Node 인라인 1-liner만 |
| High | H1 (open-redirect) | §3.1 — `isSafeNext()` 함수 (`/admin` 또는 `/admin/` 시작 + `//`·`\\` 차단 + `/admin/login` 회귀 차단) |
| High | H2 (layout vs page 가드) | §3.2 — layout이 default `/admin`로 fallback, deep-link 보존은 v2 trade-off로 명시 |
| High | H3 (partnerRepository.create 시그니처) | §3.3 — id·issuedBy 명시, autoPublish 입력 X (R10에 의해 항상 DEFAULT 강제) |
| High | H4 (provider verified 폴백) | §1.2 — toProvider line 93·116 폴백 명시 (기존 데이터 호환) |
| High | H5 (KST midnight 정확 계산) | §3.7 — `kstMidnightUtc()` helper로 `toLocaleString('en-CA') + '+09:00'` ISO 사용. 단위 테스트 §11 추가 |
| High | H6 (파일 카운트) | §1.1 — 24 → 27 정정, login/logout API Routes에 흡수 |
| High | H7 (logout cookie 메커니즘) | §3.x 신설 — `cookies().set('admin_session','',{maxAge:0,path:'/',...})` 명시 |
| Medium | M1 (typo `variousNonEmpty`) | §3.5 — `Object.keys(d).length >= 1` 정정 |
| Medium | M4 (CSRF 명시) | §9 risks — SameSite=Strict + content-type 보호 명시 |
| Medium | M6 (JWT replay) | §9 risks — secret 회전 nuclear option 명시 |
| Medium | M7 (`/admin` no-slash robots) | §1.2 — `['/admin', '/admin/']` 둘 다 추가 |
| Low | L_low_5 (S10→S6 순서 조정) | §8 — AutoPublishSettings 확장(S6)을 partners(S7) 앞으로 |
