# Plan · admin-console

**Feature**: 청광 운영진 admin 콘솔 — 시연·일상 운영 통합 도구
**Level**: Dynamic
**Cycle**: #20 (Marketplace v1.8 · admin-console)
**Method**: Plan Plus (brainstorming-enhanced)
**Started**: 2026-04-25

---

## 1. User Intent Discovery

### 1.1 Core Purpose
시연(영업·고객 데모)과 일상 운영을 하나의 admin 콘솔에서 처리한다.

- **시연 입구**: 고객·영업 면담 자리에서 즉석 partner 발급 → AI 초고 생성 → 공개 설득까지 30초 내 완성
- **일상 운영**: partners·providers·posts 상태 일괄 파악·조치, 부적절 콘텐츠 강제 철회, 주요 지표 모니터링

이전 cycle #19(partner-promo)에서 만든 자산(partnerRepository, postRepository, AutoPublishSettings)을 그대로 admin이 사용한다.

### 1.2 Target Users
- **Primary**: 청광 운영진 1–2명 (의뢰자 포함, 동일 권한)
- 권한 세분화 X — 모두 동일한 admin claim
- 일반 사용자(client·provider·partner)와 명확히 분리

### 1.3 Success Criteria
- 시연 자리에서 ID/PW 입력 → 30초 내 partner 발급 완료
- 발급된 partner로 즉시 `/partner/posts/new` 진입해 AI 시연 가능
- 일상 운영: 파트너·청명·게시글 상태를 30분 안에 파악·조치
- 자동발행 윈도우를 운영자가 즉석 변경할 수 있어 데모 환경 통제 가능

### 1.4 Constraints
- **권한 모델**: 별도 admin 계정(`admin/test6274`) + bcrypt 해시 + httpOnly session cookie (Firebase Auth와 분리)
- **세션**: JWT(8h, ADMIN_SESSION_SECRET 서명)
- **Brute-force 방어**: `/api/admin/login` rate-limit 5회/15분/IP
- **검색 차단**: `robots.txt`에 `/admin/` disallow + 모든 admin 페이지 metadata `noindex,nofollow`
- 모든 admin write는 Route Handler 경유 (Firestore rules `allow write: if false` 정책 유지, defense-in-depth)
- 첫 admin은 env 설정만으로 즉시 활성 (CLI 부트스트랩 불필요)

---

## 2. Alternatives Explored

### Approach A — `/admin` 단일 entry · Firebase custom claim · 시연 우선 (초기 채택)
- 권한: Firebase Auth custom claim `admin: true`
- 부트스트랩: `scripts/grant-admin.ts` CLI
- Pros: firestore.rules와 자연 연동
- Cons: 첫 admin 부트스트랩 절차 + Firebase Auth 가입 필요

### Approach B — `/admin/*` 라우트 분산 · users.roles += 'admin'
- 기존 UserRole 확장
- Cons: 시연 동선 끊김, YAGNI 위반

### Approach C — 미니멀 단일 폼
- env whitelist
- Cons: 일상 운영 부족

### Approach A' — 별도 admin 계정 + 별도 로그인 페이지 (최종 채택 ✅)
사용자 결정으로 Approach A를 변형:
- 권한: env(`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) + 자체 session cookie (`admin_session` JWT)
- 부트스트랩: env 설정만 (CLI 불필요)
- `/admin/login` 별도 페이지로 일반 사용자 흐름과 명확 분리
- Firebase Auth와 완전 분리 — admin은 일반 사용자 가입 없이 동작

**결정 근거**:
- 시연 자리 편의 (그 자리에서 ID/PW로 즉시 로그인)
- 운영진 1–2명 단일 공유 계정 → 권한 세분화·감사 추적 비용 최소
- 첫 admin 부트스트랩 절차 제거 → 운영 단순

**보안 트레이드오프 인지**:
- 단일 공유 계정 → 누가 무엇을 했는지 추적 약함 (감사 로그는 partners/{id}/events에 `by:'admin'`으로 통일)
- 패스워드 회전은 env 변경 + 재배포 필요
- bcrypt hash 강제 (평문 저장 거부) + httpOnly·Secure·SameSite=Strict cookie + JWT 8h 만료 + brute-force rate-limit

---

## 3. YAGNI Review

### Included (v1, 13 items)

**Foundation (4)**
1. **F1** — `requireAdminPage` / `requireAdminApi` 가드 (admin_session cookie 검증)
2. **F2** — `/admin/login` 페이지 + 로그아웃 (`POST /api/admin/login` + `POST /api/admin/logout`)
3. **F3** — `/admin` 레이아웃 + 좌측·상단 nav (Partners · Providers · Posts · Audit는 v2)
4. **F4** — robots.txt `/admin/` disallow + 모든 admin 페이지 metadata `noindex, nofollow`

**Partners (3)**
5. **P1** — `/admin/partners` 목록 + 검색 + status 필터
6. **P2** — `/admin/partners/new` 발급 폼 (이메일 → uid 자동 lookup → 나머지 필드 → 발급)
7. **P3** — `/admin/partners/[partnerId]` 상세 + status 토글 + autoPublish 운영자 제어 (`AutoPublishSettings` 재활용)

**Providers (1)**
8. **V1** — `/admin/providers` 목록 + verified/insured 토글

**Posts (1)**
9. **PT1** — `/admin/posts` 목록 + 강제 철회 (publishStatus → 'withdrawn')

**Stats (1)**
10. **S1** — `/admin` 홈에 통계 위젯 4–6개 (오늘 발행 N건, 평균 hygiene, partners status별 카운트, draft partner-promo 수, 최근 72h auto-published 비율)

**Cross-cutting Security (3)**
11. **L1** — bcrypt 의존성 추가 (`bcryptjs` + `@types/bcryptjs`)
12. **L2** — Brute-force rate-limit (5회/15분/IP) on `/api/admin/login`
13. **L3** — JWT session helper (`src/lib/auth/admin-session.ts`)

### Out of Scope (v2 이후)

- **O1** 데모 모드 토글 (autoPublish 30분 임시 강제 ON 후 자동 복원)
- **O2** events 감사 로그 뷰 (partners/{id}/events 타임라인)
- **O3** partners/providers 풀 편집 폼 (businessName 수정, regions 변경 등)
- **O4** 일괄 액션 (bulk suspend, bulk withdraw)
- **O5** 다른 admin 부여/취소 UI (run-time)
- **O6** 권한 차등 (core admin vs assistant admin)
- **O7** in-app admin 메시징 (운영진 간 메모)
- **O8** IP 화이트리스트
- **O9** 2FA · OTP
- **O10** 사용자(고객) 관리 (users 테이블 검색·정지)
- **O11** 영업 funnel 통계 (전환율·CTR)

---

## 4. Scope

### In scope
- `/admin/login` 페이지 + bcrypt 검증 + JWT session cookie
- `/admin` 영역 6개 페이지 (홈·partners 3·providers·posts)
- 5개 API routes (`/api/admin/{login,logout,partners,partners/[id],providers/[id],posts/[id]/withdraw,stats}`)
- 신규 헬퍼: `require-admin.ts`, `admin-session.ts`, `lib/admin/stats.ts`
- 신규 컴포넌트 7종 (AdminNav, PartnersList, PartnerIssueForm, PartnerEditor, ProvidersList, PostsList, StatsWidgets)
- 환경 변수 3개 추가: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`
- robots.txt 갱신
- provider-repository에 `setVerified` · `setInsured` 메서드 추가

### Out of scope
- O1–O11 (위 YAGNI Out of Scope)
- Firebase Auth custom claim 활용 (선택했던 Approach A 전환은 v2에서 재논의 가능)
- partnerRepository 자체 수정 (이미 cycle #19에 충분, 재활용)

---

## 5. Data Model

### 5.1 신규 데이터 모델 없음

partner·provider·post·users 모두 cycle #19 이전에 정의 완료. admin은 기존 모델 위에서 동작.

### 5.2 admin session JWT payload

```ts
interface AdminSessionPayload {
  admin: true;
  iat: number;            // issued at (sec)
  exp: number;            // expires at (sec) — iat + 8*60*60
}
```

서명: HMAC-SHA256 with `ADMIN_SESSION_SECRET` (256-bit random hex)

### 5.3 cookies

```
admin_session  HttpOnly · Secure · SameSite=Strict · Path=/ · MaxAge=28800 (8h)
```

### 5.4 events 서브컬렉션 (기존, by:'admin' 활용)

cycle #19에서 정의된 `partners/{id}/events` 5종 이벤트가 그대로 사용됨. admin 액션은 모두 `by:'admin'`으로 기록 → 감사 추적.

---

## 6. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Client                                                       │
│  /admin/login                  (ID/PW 폼)                     │
│  /admin                        (홈 · StatsWidgets)            │
│    ├─ /admin/partners          (목록 + 필터)                  │
│    │   ├─ /new                 (발급 폼)                      │
│    │   └─ /[partnerId]         (상세 + status·autoPublish)   │
│    ├─ /admin/providers         (목록 + verified/insured)      │
│    └─ /admin/posts             (목록 + 강제 철회)             │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Server                                                       │
│  Auth Gate                                                    │
│    requireAdminPage()  → admin_session 검증, 미충족 시 redirect│
│    requireAdminApi()   → 미충족 시 throw FORBIDDEN            │
│                                                                │
│  API Routes                                                   │
│    POST  /api/admin/login           (bcrypt verify + JWT)     │
│    POST  /api/admin/logout          (cookie clear)            │
│    GET   /api/admin/users/lookup    (email → uid via adminAuth)│
│    POST  /api/admin/partners        (발급)                    │
│    PATCH /api/admin/partners/[id]   (status + autoPublish)    │
│    PATCH /api/admin/providers/[id]  (verified + insured)      │
│    POST  /api/admin/posts/[id]/withdraw  (강제 철회)          │
│    GET   /api/admin/stats           (대시보드 통계)           │
│                                                                │
│  Helpers                                                      │
│    src/lib/auth/require-admin.ts                              │
│    src/lib/auth/admin-session.ts (signJWT · verifyJWT)        │
│    src/lib/admin/stats.ts (집계 함수)                         │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
   Firebase Auth (adminAuth.getUserByEmail) +
   Firestore (partners·providers·posts·users 기존 컬렉션)
```

### 핵심 원칙
- admin write는 모두 Route Handler 경유 — firestore.rules `allow write: if false` 유지
- Firebase Auth와 완전 분리 — admin session cookie는 일반 `session` cookie와 별개
- 모든 admin 액션은 partners/{id}/events에 `by:'admin'`으로 감사 기록 (해당 partner면)
- v1 단일 공유 admin이라 누가 액션했는지는 IP/시각 정도만 (감사 한계 인지)

---

## 7. Key Components

### 신규 파일 (총 25)

**Auth & Session (3)**
| 경로 | 역할 |
|---|---|
| `src/lib/auth/require-admin.ts` | `requireAdminPage()` (page) + `requireAdminApi()` (route) |
| `src/lib/auth/admin-session.ts` | `signAdminToken()` · `verifyAdminToken(cookie)` JWT 헬퍼 |
| `src/app/api/admin/login/route.ts` + `logout/route.ts` | bcrypt verify + JWT cookie set/clear |

**Pages (6)**
| 경로 | 역할 |
|---|---|
| `src/app/admin/login/page.tsx` | ID/PW 폼 (client component) |
| `src/app/admin/layout.tsx` | requireAdminPage 가드 + AdminNav |
| `src/app/admin/page.tsx` | 홈 — StatsWidgets |
| `src/app/admin/partners/page.tsx` | 목록 + 검색 + status 필터 |
| `src/app/admin/partners/new/page.tsx` | 발급 폼 |
| `src/app/admin/partners/[partnerId]/page.tsx` | 상세 + 편집 |
| `src/app/admin/providers/page.tsx` | 청명 목록 + verified/insured 토글 |
| `src/app/admin/posts/page.tsx` | 글 목록 + 강제 철회 |

**API Routes (5 + login/logout)**
| 경로 | 역할 |
|---|---|
| `src/app/api/admin/users/lookup/route.ts` | `GET ?email=...` → `adminAuth.getUserByEmail` → uid 반환 |
| `src/app/api/admin/partners/route.ts` | `POST` 발급 |
| `src/app/api/admin/partners/[partnerId]/route.ts` | `PATCH` status + autoPublish |
| `src/app/api/admin/providers/[providerId]/route.ts` | `PATCH` verified + insured |
| `src/app/api/admin/posts/[postId]/withdraw/route.ts` | `POST` 강제 철회 |
| `src/app/api/admin/stats/route.ts` | `GET` 대시보드 통계 |

**Components (7)**
| 경로 | 역할 |
|---|---|
| `src/components/admin/AdminNav.tsx` | sticky 상단/좌측 탭 |
| `src/components/admin/AdminLoginForm.tsx` | ID/PW 폼 (client) |
| `src/components/admin/PartnersList.tsx` | 목록 + 필터 + status별 그룹 |
| `src/components/admin/PartnerIssueForm.tsx` | 이메일 lookup → 발급 |
| `src/components/admin/PartnerEditor.tsx` | status + autoPublish 편집 (`AutoPublishSettings` 재활용) |
| `src/components/admin/ProvidersList.tsx` | verified/insured 토글 |
| `src/components/admin/PostsList.tsx` | 강제 철회 |
| `src/components/admin/StatsWidgets.tsx` | 4–6 카드 |

**Domain Helper (1)**
| 경로 | 역할 |
|---|---|
| `src/lib/admin/stats.ts` | `countTodayPublished()` · `avgHygieneScore()` · `partnersByStatus()` |

### 수정 파일 (4)

| 경로 | 변경 |
|---|---|
| `src/app/robots.ts` | `disallow: ['/admin/', ...]` 추가 |
| `src/lib/firebase/provider-repository.ts` | `setVerified(id, bool)` · `setInsured(id, bool)` 추가 |
| `src/lib/errors.ts` | (필요 시) admin 관련 코드 추가 — 대부분 기존 코드로 충분 |
| `package.json` | `bcryptjs` + `@types/bcryptjs` + `jsonwebtoken` + `@types/jsonwebtoken` 의존성 추가 |

### 환경 변수 추가 (3)

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$...   # bcrypt('test6274', 10) — 시연 시작 시 회전 권장
ADMIN_SESSION_SECRET=<random 32 bytes hex>
```

---

## 8. Auth Flow 상세

### 8.1 로그인

```ts
// POST /api/admin/login
// body: { username, password }

const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
await checkAndIncrement(`admin-login:${ip}`, 5, 15 * 60_000);

const username = String(body.username ?? '');
const password = String(body.password ?? '');

// timing-safe username compare
const expectedUsername = process.env.ADMIN_USERNAME!;
const usernameOk = crypto.timingSafeEqual(
  Buffer.from(username.padEnd(32, '\0')),
  Buffer.from(expectedUsername.padEnd(32, '\0'))
);
if (!usernameOk) throw new AppError('UNAUTHENTICATED', '아이디 또는 비밀번호가 올바르지 않습니다');

const passwordOk = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!);
if (!passwordOk) throw new AppError('UNAUTHENTICATED', '아이디 또는 비밀번호가 올바르지 않습니다');

const token = jwt.sign(
  { admin: true },
  process.env.ADMIN_SESSION_SECRET!,
  { algorithm: 'HS256', expiresIn: '8h' }
);

(await cookies()).set('admin_session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60,
  path: '/',
});

return NextResponse.json({ ok: true });
```

### 8.2 가드

```ts
// src/lib/auth/require-admin.ts
export async function requireAdminApi(): Promise<void> {
  const cookie = (await cookies()).get('admin_session')?.value;
  if (!cookie) throw new AppError('UNAUTHENTICATED', 'admin 로그인이 필요합니다');
  try {
    const decoded = jwt.verify(cookie, process.env.ADMIN_SESSION_SECRET!) as { admin?: boolean };
    if (decoded.admin !== true) throw new AppError('FORBIDDEN', '권한이 없습니다');
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('UNAUTHENTICATED', 'admin 세션이 만료되었거나 유효하지 않습니다');
  }
}

export async function requireAdminPage(nextPath = '/admin'): Promise<void> {
  try {
    await requireAdminApi();
  } catch {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}
```

---

## 9. SEO · Robots

- `src/app/robots.ts`에 `/admin/` 추가 (이미 `/partner/`와 같은 패턴)
- `src/app/admin/layout.tsx`에 `metadata.robots = { index: false, follow: false }`

---

## 10. Risks & Mitigations

| 리스크 | 확률 | 영향 | 완화 |
|---|---|---|---|
| 단일 공유 계정 노출 (시연 중 어깨너머 등) | Medium | 시연 후 모든 admin 액션 가능 | 시연 후 즉시 패스워드 회전 (env 변경 → 재배포) · session 8h 만료 |
| `/admin/login` brute-force | Medium | 약한 패스워드 시 침투 | rate-limit 5/15분/IP + bcrypt cost 10 |
| `ADMIN_SESSION_SECRET` 유출 | Low | 위조 토큰 발급 가능 | env 32 bytes random + Vercel encrypted env · 회전 시 모든 세션 강제 만료 (의도된 동작) |
| Firestore client 직접 read 시 admin claim 미충족 | N/A | admin이 client에서 직접 read하는 흐름 없음 | 모든 admin 페이지는 server-side fetch (route handler 또는 Server Component) |
| events 서브컬렉션 by:'admin'으로 통일되어 누가 액션했는지 모름 | Medium | 감사 추적 약함 (운영진 1–2명이라 영향 제한) | v2에 multi-admin 모델 검토 |
| 강제 철회 후 partner 본인이 재발행 가능 | Low | admin 의도 우회 | 강제 철회 시 partner.status='suspended'로 함께 변경 옵션 (v2) |
| robots noindex 누락 | Low | /admin/ 검색 노출 | F4 강제 + robots.ts 검증 |

---

## 11. Success Metrics

- 시연 자리에서 ID/PW 입력 → partner 발급 완료까지 ≤ 30초
- 발급된 partner로 `/partner/posts/new` 진입 후 AI 초고 노출 ≤ 8초
- 운영자가 partners 목록·청명 목록·post 목록 각각 확인 ≤ 30분
- /admin 영역에 비로그인 사용자가 접근 시 100% redirect (검색엔진 인덱싱 0건)
- brute-force rate-limit이 6회째 차단 (수동 테스트)

---

## 12. Brainstorming Log

- **Q1 핵심 목적** → 시연 + 운영 둘 다 (Recommended)
- **Q2 Target Users** → 청광 운영진 1-2명, 동일 권한 (세분화 X)
- **Q3 Success** → 시연 30초 + 일상 30분 (둘 다 키)
- **Approach 초기 채택** → A (Firebase claim + 단일 entry + 시연 우선)
- **Approach 변경** → A' (별도 admin 계정 + bcrypt + 자체 session). 사용자 결정으로 단순함·시연 편의 우선
- **YAGNI 포함 (13)** → F1·F2·F3·F4 + P1·P2·P3 + V1 + PT1 + S1 + L1·L2·L3
- **YAGNI 제외** → 데모 모드 토글, events 뷰, 풀 편집 폼, 일괄 액션, 다중 admin 권한, 사용자 관리, 영업 통계 등 11항목
- **Section approvals** → Architecture ✓ · Components ✓ · Data Flow ✓

---

## 13. Next Steps

1. `/pdca design admin-console` — 상세 설계 문서 작성:
   - 와이어프레임 5종 (login·home·partners list·partner edit·providers list)
   - API 계약 (요청/응답 스키마 + 에러 코드)
   - bcrypt + JWT 검증 루틴 의사코드
   - rate-limit 정확한 키·윈도우 규칙
   - StatsWidgets 통계 정의 + 집계 쿼리
2. Design 완료 후 `/pdca do admin-console` — 9-step implementation:
   - Step 1: 환경변수 + 의존성 추가
   - Step 2: admin-session helper + require-admin
   - Step 3: /admin/login UI + API
   - Step 4: /admin layout + AdminNav + robots
   - Step 5: Partners (목록·발급·편집)
   - Step 6: Providers + Posts
   - Step 7: Stats
   - Step 8: 보안 검증 (rate-limit·timing-safe compare·cookie 옵션)
   - Step 9: 빌드·배포
3. `/pdca analyze admin-console` (gap-detector) → ≥ 90% 도달 후 `/pdca report` → archive

---

**Plan Plus 완료 · Approval 기록**: Architecture ✅ · Components ✅ · Data Flow ✅ · 권한 모델 변경(A→A') ✅
