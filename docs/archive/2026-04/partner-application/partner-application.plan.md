# Plan · partner-application

**Feature**: 의뢰업체 등록 신청 흐름 (공개 채널) — admin-console에 신청자 명단 통합
**Level**: Dynamic
**Cycle**: #21 (Marketplace v1.9 · partner-application)
**Method**: Plan Plus (brainstorming-enhanced)
**Started**: 2026-04-25
**Depends on**: cycle #19 (partner-promo) · cycle #20 (admin-console) — 둘 다 deployed

---

## 1. User Intent Discovery

### 1.1 Core Purpose
청광 홈에 **공개된 의뢰업체 입점(등록) 채널**을 신설한다. 누구나 신청 가능한 폼을 제공하고, 운영진이 검토·승인 시 partner 발급. 신청자는 가입과 동시에 신청이 접수되며, 진행 상태는 본인 로그인 시 인앱으로 실시간 확인.

이로써 cycle #20 admin-console의 발급 채널이 **운영자 수동 입력 only → 신청자 자가 제출 + 운영자 1-click 승인**으로 진화. 운영진의 시간 부담을 줄이면서 잠재 의뢰업체에게 명확한 진입 경로를 제공.

### 1.2 Target Users
- **Primary 신청자**: 매장 사장·소상공인 (식당·카페·상가 등). B2C 서비스 이용 경험 있을 수 있음
- **Operator**: 청광 운영진 (admin-console 사용자)
- **System**: Firebase Auth + Firestore + 청광 admin

### 1.3 Success Criteria
이중 목표:
- **신청자 측**: 폼 제출 → 자동 가입 + 신청 접수가 매끄럽게 (1분 이내 완료)
- **운영자 측**: admin-console에서 신청자 목록 조회 → 1-click 승인까지 1분 이내

성공 측정:
- 신청 폼 완료율 (홈 CTA → 제출까지)
- 운영자 평균 검토 시간 (제출 → 승인 결정)
- 승인된 partner의 첫 글 발행률 (전환)

### 1.4 Constraints
- **공개 채널**: 비로그인 사용자도 폼 접근 가능. 단 제출 = 가입이라 결국 로그인 상태로 전환
- **이메일 알림 X**: v1은 인앱 알림(onSnapshot 실시간 상태)만 사용 — 외부 인프라 의존 회피
- **거절 시 user 계정·doc 보존**: 일반 client로는 사용 가능, 재신청 가능
- **별도 가입 폼**: provider 가입(`/signup-provider`) 패턴 모방. 일반 로그인(`/login`)과 분리
- Firebase Auth + Firestore 스택 고정

---

## 2. Alternatives Explored

### Approach A — 신청 = 가입 (signup-partner) ✅ 채택
- `/signup-partner` 신규 페이지에서 Email/Password + 매장 정보 동시 제출
- 제출 → Auth 가입 + `users/{uid}` + `partnerApplicants/{id}` 동시 생성 + auto sign-in
- admin이 `/admin/partners`에서 신청자 목록 → 1-click 승인 → `partnerRepository.create`
- **Pros**: provider 가입 패턴 모방으로 코드·UX 일관 · 메일 인프라 불필요 · 신청자 즉시 일반 client로 사용 가능
- **Cons**: 거절 시 user 계정 잔존 (일반 client로 사용 가능하므로 무해)

### Approach B — 비로그인 신청 + invitation 메일
- `/apply-partner` 공개 폼 + 비로그인 가능 + 메일 invitation
- **Cons**: 메일 인프라 + 임시 비번 + 보안 고려 — v1에는 과한 분량

### Approach C — 기존 가입자 only + 별도 신청 폼
- 일반 가입 후 → `/partner/apply`에서 매장 정보 제출
- **Cons**: 두 단계 진입으로 이탈률 ↑

**결정**: Approach A. provider 가입 패턴 모방 + 단순함.

---

## 3. YAGNI Review

### Included (v1, 11 items)

**신청자 경험 (4)**
1. **A1** — `/signup-partner` 신규 페이지 + `PartnerSignupForm` (이메일·비번·매장명·연락처·카테고리·지역·소개)
2. **A2** — `/signup-partner/submitted` 영수증·진행 상태 페이지 (onSnapshot 실시간 상태)
3. **A3** — 청광 홈에 "🏢 의뢰업체 등록" CTA 버튼 (`PartnerApplyCTA`)
4. **A4** — `/partner/*` 진입 시 partner 미존재 + applicant pending → `/signup-partner/submitted` redirect

**운영자 경험 (4)**
5. **B1** — `/admin/partners` 상단에 "⏳ 대기 신청" 섹션 (ApplicantsList)
6. **B2** — `/admin/partners/applicants/[id]` 상세 + ✓ 승인 액션
7. **B3** — `/admin` 홈 StatsWidgets에 "⏳ 대기 신청 m건" 7번째 카드
8. **B4** — ✗ 거절 액션 + 사유 메모 모달 (사유 ≤200자)

**데이터·권한·처리 (3)**
9. **C1** — `partnerApplicants` 컬렉션 신설 + repository
10. **C2** — `firestore.rules`: applicants read = 본인 ownerUid + admin SDK only write
11. **C3** — 승인 = `partnerRepository.create` + `applicants.status='approved'` + events 'status-changed' (1-click)

### Out of Scope (v2 이후 이연)

- **O1** 이메일 알림 (Resend·Sendgrid 등) — 인앱 알림으로 v1 충당
- **O2** SMS 알림 (제공자 계약 + 비용)
- **O3** 사업자등록번호 검증
- **O4** 로고 이미지 업로드
- **O5** 신청자 본인 dashboard (`/my/application` 등) — submitted 페이지로 충당
- **O6** 자동 승인 (예: 특정 도메인 화이트리스트)
- **O7** 다국어
- **O8** 거절 후 N일 재신청 제한
- **O9** 신청자 본인 정보 수정 (제출 후 변경 X)
- **O10** A/B 테스트 (랜딩 카피)
- **O11** 일반 영역(/community 등)에서 신청자 알림 노출 (글로벌 banner) — submitted 페이지에 한정

---

## 4. Scope

### In scope
- `/signup-partner` 가입+신청 페이지 + `/signup-partner/submitted` 진행 페이지
- `partnerApplicants/{id}` 컬렉션 + `partner-applicant-repository.ts`
- `POST /api/partner-application` (Auth 가입 + applicants 생성 + auto sign-in)
- admin: 신청자 목록·상세·승인·거절 — 4개 신규 라우트 + 2개 컴포넌트
- 홈 입구점 CTA 버튼
- `requirePartnerPage` 갱신 (applicant pending → submitted redirect, A4)
- `firestore.rules` 갱신 (`partnerApplicants` 분기)

### Out of scope
- O1–O11 (위 YAGNI Out of Scope)
- 이메일·SMS 알림
- 자동 승인 정책

---

## 5. Data Model

### 5.1 `PartnerApplicant` 스키마 (`src/types/partner-applicant.ts`, 신규)

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export type PartnerApplicantStatus = 'pending' | 'approved' | 'rejected';

export interface PartnerApplicant {
  id: string;
  ownerUid: string;            // Firebase Auth uid (가입과 동시 생성)
  businessName: string;        // 매장명 (필수)
  email: string;               // Auth user 이메일 사본 (검색·표시용)
  phone: string | null;        // 연락처 (선택)
  category: QuoteCategory | null;  // 예상 카테고리 (선택)
  regionLabel: string | null;  // 지역 (선택)
  intro: string | null;        // 짧은 소개 (≤500자, 선택)
  status: PartnerApplicantStatus;
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;   // 'admin'
  rejectReason: string | null; // 거절 시 (≤200자)
}
```

### 5.2 Firestore 인덱스 (`firestore.indexes.json`)

```
partnerApplicants:
  + (status ASC, appliedAt DESC) — 운영자 대기 목록
  + (ownerUid ASC, appliedAt DESC) — 본인 조회 (onSnapshot)
```

### 5.3 Firestore Rules (`firestore.rules`)

```
match /partnerApplicants/{applicantId} {
  allow read:
    (request.auth != null && request.auth.uid == resource.data.ownerUid)
    || (request.auth != null && request.auth.token.admin == true);
  allow write: if false;   // Admin SDK only (route handler)
}
```

⚠️ admin-console은 별도 admin session(`admin_session` cookie)을 쓰지만, firestore.rules는 Firebase Auth `admin` claim을 분기에 사용. admin은 client에서 직접 read 안 함 (모든 admin 액션은 Route Handler 경유 — Admin SDK가 rules 우회). 따라서 rules의 admin claim 분기는 향후 client-side admin 흐름 대비.

### 5.4 자동 sign-in (가입 직후)

`POST /api/partner-application`이 가입 + applicants doc 생성 후 **session cookie를 함께 발급**:

```ts
// 의사코드
const idToken = await adminAuth.createCustomToken(uid);   // 또는 user impersonation
// 또는 client-side에서 signInWithCustomToken
// 더 단순: createSessionCookie + 클라이언트가 Firebase signin 한 후 idToken을 서버에 보내는 2단계
```

`signup-provider` 흐름이 어떻게 처리하는지 design 단계에서 정확히 매핑해 동일 패턴 사용.

---

## 6. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Visitor (비로그인)                                      │
│  / (홈)                                                  │
│    └─ "🏢 의뢰업체 등록" CTA (A3) → /signup-partner       │
│                                                            │
│  /signup-partner (A1)                                     │
│    PartnerSignupForm (Email/PW + 매장 정보)               │
│    제출 → POST /api/partner-application                   │
│         ├─ rate-limit (3/h/IP)                            │
│         ├─ adminAuth.createUser                           │
│         ├─ users/{uid} 생성                               │
│         ├─ partnerApplicants/{id} 생성 (pending)         │
│         ├─ session cookie set                             │
│         └─ 201 { redirectTo: '/signup-partner/submitted' }│
│                                                            │
│  /signup-partner/submitted (A2)                           │
│    onSnapshot으로 partnerApplicants 구독                 │
│    pending  → "🕒 검토 중"                                │
│    approved → "🎉 승인" + /partner/posts 자동 이동        │
│    rejected → "❌ 거절: {reason}" + 재신청 링크           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Logged-in user (partner 미발급)                          │
│  /partner/* 진입 (A4)                                    │
│    requirePartnerPage:                                    │
│      partner 미존재 + applicant pending → submitted redirect │
│      partner 미존재 + applicant 없음   → / redirect       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Admin                                                    │
│  /admin/partners                                          │
│    ⏳ 대기 신청 (n)  ← NEW (B1)                           │
│      ApplicantsList × n → 클릭 → applicants/[id]          │
│    ✅/✉/🚫 (기존)                                          │
│                                                            │
│  /admin/partners/applicants/[id] (B2)                     │
│    ApplicantDetail                                        │
│    [✓ 승인] → POST .../approve                            │
│      partnerRepository.create(uid 그대로)                 │
│      applicants.status='approved'                         │
│      events.add('status-changed')                         │
│    [✗ 거절] → 모달 사유 입력 → POST .../reject (B4)       │
│      applicants.status='rejected' + rejectReason          │
│                                                            │
│  /admin (홈)                                              │
│    StatsWidgets에 "⏳ 대기 m건" 카드 (B3)                 │
└──────────────────────────────────────────────────────────┘
```

### 핵심 원칙
- **신청 = 가입 + applicants doc + auto sign-in** (1-step)
- **인앱 onSnapshot 알림**으로 외부 인프라 회피
- **승인 = 1-click** (`partnerRepository.create` 그대로 사용, R10 강제 디폴트 autoPublish)
- **거절은 user 보존** (일반 client로 사용 가능, 재신청 가능)
- **모든 admin 액션은 Route Handler + Admin SDK** (firestore rules write=false 유지)

---

## 7. Key Components

### 신규 파일 (13)

**Visitor·Signup (4)**
| 경로 | Role |
|---|---|
| `src/app/(auth)/signup-partner/page.tsx` | A1 — 가입+신청 폼 페이지 |
| `src/app/(auth)/signup-partner/submitted/page.tsx` | A2 — 영수증·진행 상태 (Suspense + client onSnapshot) |
| `src/components/auth/PartnerSignupForm.tsx` | client form |
| `src/app/api/partner-application/route.ts` | POST — Auth 가입 + applicants doc + session cookie |

**Repository & Domain (2)**
| 경로 | Role |
|---|---|
| `src/types/partner-applicant.ts` | `PartnerApplicant` interface + `PartnerApplicantStatus` |
| `src/lib/firebase/partner-applicant-repository.ts` | `create` · `getById` · `getByOwnerUid` · `listPending` · `setStatus` · `pendingCount` |

**Admin (4)**
| 경로 | Role |
|---|---|
| `src/app/admin/partners/applicants/[applicantId]/page.tsx` | B2 신청자 상세 |
| `src/app/api/admin/partners/applicants/[applicantId]/approve/route.ts` | POST — 승인 |
| `src/app/api/admin/partners/applicants/[applicantId]/reject/route.ts` | POST — 거절 |
| `src/components/admin/ApplicantsList.tsx` | 카드 형 목록 (admin/partners 페이지 임베드) |
| `src/components/admin/ApplicantDetail.tsx` | 상세 + 승인/거절 액션 |

**Public (1)**
| 경로 | Role |
|---|---|
| `src/components/landing/PartnerApplyCTA.tsx` | A3 — 홈 CTA 버튼 |

**(메일 인프라 모두 제거 — 인앱 알림으로 충당)**

### 수정 파일 (5)

| 경로 | 변경 |
|---|---|
| `src/app/page.tsx` (또는 홈 컴포넌트) | A3 `PartnerApplyCTA` 삽입 |
| `src/app/admin/partners/page.tsx` | "⏳ 대기 신청" 섹션 추가 (`ApplicantsList`) |
| `src/lib/auth/require-partner.ts` | A4 — partner 미존재 시 applicant 조회 후 redirect 분기 |
| `src/lib/admin/stats.ts` | `pendingApplicantsCount()` 추가 |
| `src/components/admin/StatsWidgets.tsx` | 7번째 카드 추가 |
| `firestore.rules` | `partnerApplicants` 분기 추가 |
| `firestore.indexes.json` | (status, appliedAt DESC), (ownerUid, appliedAt DESC) 인덱스 추가 |

### 환경 변수 추가
**없음** (인앱 알림으로 충당, 외부 메일 서비스 미사용)

### 의존성 추가
**없음** (기존 Firebase Admin SDK + zod 충분)

---

## 8. UI Wireframes (간이)

### 8.1 `/signup-partner`

```
┌────────────────────────────────────────────┐
│ ← 홈으로                                   │
│                                            │
│        🏢 의뢰업체 등록 신청               │
│  매장을 청광에 등록하고 AI가 작성하는 홍보글│
│  로 신규 고객을 만나보세요                  │
│                                            │
│   이메일*    [_________________________]   │
│   비밀번호*  [_________________________]   │
│   매장명*    [_________________________]   │
│   연락처     [_________________________]   │
│   예상 카테고리 [▼ 선택]                   │
│   지역       [_________________________]   │
│   매장 소개  [                          ]   │
│                                            │
│           [신청 제출]                      │
│                                            │
│   ⓘ 영업일 1-2일 내 검토 후 안내드립니다.  │
└────────────────────────────────────────────┘
```

### 8.2 `/signup-partner/submitted`

```
┌────────────────────────────────────────────┐
│  ✅ 신청이 접수되었습니다                  │
│                                            │
│  매장명: 데모 카페                         │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🕒 검토 중입니다                      │  │
│  │                                       │  │
│  │ 영업일 1-2일 내 결과를 알려드립니다.  │  │
│  │ 이 페이지를 닫아도 괜찮아요.          │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ─────────────────────────                 │
│                                            │
│  [홈으로] [로그아웃]                       │
└────────────────────────────────────────────┘

(승인 시)
  ┌──────────────────────────────────────┐
  │ 🎉 승인되었습니다!                    │
  │                                       │
  │ 5초 후 작성 페이지로 이동합니다…      │
  │                                       │
  │ [지금 이동하기 →]                     │
  └──────────────────────────────────────┘

(거절 시)
  ┌──────────────────────────────────────┐
  │ ❌ 죄송합니다. 거절되었습니다         │
  │                                       │
  │ 사유: {rejectReason}                  │
  │                                       │
  │ [재신청하기] [홈으로]                 │
  └──────────────────────────────────────┘
```

### 8.3 `/admin/partners` (갱신)

```
┌──────────────────────────────────────────────────────────┐
│ Partners (12)                       [+ 새 발급]           │
├──────────────────────────────────────────────────────────┤
│ ⏳ 대기 신청 (3)  ← NEW (B1)                              │
│   ┌──────┬──────────────┬─────────┬───────┬─────────┐    │
│   │ logo │ 매장명       │ 카테고리│ 신청일│ 액션     │    │
│   │      │ 데모 카페    │ regular │ 04-25 │ [상세]   │    │
│   │      │ 신선 식당    │ -       │ 04-25 │ [상세]   │    │
│   └──────┴──────────────┴─────────┴───────┴─────────┘    │
│                                                            │
│ ✅ Active (8) [기존]                                      │
│   ...                                                      │
└──────────────────────────────────────────────────────────┘
```

### 8.4 `/admin/partners/applicants/[id]`

```
┌──────────────────────────────────────────────────────────┐
│ ← /admin/partners                                         │
│                                                            │
│  데모 카페 (신청 #abc123)                                 │
│                                                            │
│  ┌── 신청 정보 ────────────────────────────────────────┐ │
│  │ 매장명     : 데모 카페                                │ │
│  │ 이메일     : owner@cafe.kr                            │ │
│  │ 연락처     : 010-1234-5678                            │ │
│  │ 카테고리   : 정기청소                                  │ │
│  │ 지역       : 서울 강남구                              │ │
│  │ 신청일     : 2026-04-25 14:30 KST                     │ │
│  │ ownerUid   : abc...xyz                                │ │
│  │                                                        │ │
│  │ 매장 소개:                                            │ │
│  │ "10년 운영한 브런치 카페입니다. 청광 정기청소…"       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [✓ 승인]                              [✗ 거절]           │
└──────────────────────────────────────────────────────────┘

거절 모달:
  ┌──────────────────────────────────────┐
  │ ✗ 신청 거절                           │
  │                                       │
  │ 사유 (≤200자, 신청자에게 표시됨):     │
  │ ┌────────────────────────────────┐   │
  │ │                                │   │
  │ │                                │   │
  │ └────────────────────────────────┘   │
  │                                       │
  │           [취소]   [거절 확정]       │
  └──────────────────────────────────────┘
```

---

## 9. Implementation Order (S1–S8)

| Step | 범위 | 출력 |
|---|---|---|
| **S1** | `partner-applicant-repository.ts` + `types/partner-applicant.ts` | 타입·repo 컴파일 |
| **S2** | `firestore.rules` + `firestore.indexes.json` 갱신 + dry-run + deploy | rules deploy 통과 |
| **S3** | `POST /api/partner-application` (가입 + applicant + session) | curl로 신청 동작 검증 |
| **S4** | `/signup-partner` UI + `PartnerSignupForm` | 폼 제출 → submitted 이동 |
| **S5** | `/signup-partner/submitted` + onSnapshot client 구독 | 상태 실시간 갱신 |
| **S6** | `require-partner.ts` 갱신 (A4) | partner 미존재 시 redirect 동작 |
| **S7** | admin: `ApplicantsList` + `ApplicantDetail` + approve/reject API + StatsWidgets 카드 | 1-click 승인 동작 |
| **S8** | 홈 `PartnerApplyCTA` + 빌드·배포 + smoke test | 운영 동선 완성 |

---

## 10. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|---|---|---|
| `/signup-partner` spam (자동 신청 봇) | applicants 컬렉션 비대화 | rate-limit 3건/h/IP + `recaptcha`는 v2 |
| 같은 이메일 재가입 시도 | 409 ALREADY_REGISTERED | API에서 명확한 에러 메시지 + UI에서 "이미 가입된 이메일입니다" |
| 거절 후 재신청 무한 시도 | 운영자 부담 | rate-limit + 거절 사유 노출로 자가 필터 (재신청 제한은 v2 O8) |
| onSnapshot이 partnerApplicants에 직접 접근 → rules read 분기 검증 누락 | client에서 다른 사람 신청 read | `where('ownerUid', '==', currentUid)` + rules read 본인만 |
| auto sign-in 실패 (session cookie set 실패) | 신청은 됐는데 로그인 안 됨 | API 응답에 별도 idToken 포함 → 클라이언트가 받아서 sign-in 시도 (fallback) |
| 동시 신청 race (같은 사람이 동시에 두 번 폼 제출) | 두 applicants doc 생성 | API에서 ownerUid lookup 후 기존 pending 있으면 409 (또는 현재 doc 반환) |
| admin 승인 직후 신청자 재신청 시도 | 중복 신청 | listPending에서 자동 제외 + 승인된 사용자는 `/signup-partner` redirect '/partner/posts' |
| 신청 Korean PII (전화번호) Firestore에 그대로 저장 | 개인정보 | 운영자만 접근 + 거절 시 user 보존 정책. v2 PII 마스킹 검토 |

---

## 11. Success Metrics (Post-launch)

- 폼 진입 → 제출 완료율 ≥ 60% (홈 CTA 클릭 → 가입+신청 완료)
- 운영자 평균 검토 시간 ≤ 4시간 (제출 → 승인 결정)
- 승인된 partner의 7일 내 첫 글 발행률 ≥ 50%
- 거절율 ≤ 30% (너무 높으면 신청 폼 자체에 가이드 보강)

---

## 12. Brainstorming Log

- **Q1 핵심 목적** → 공개된 의뢰업체 입점 채널
- **Q2 Target Users** → 매장 사장·소상공인 (B2C 이용 있을 수 있음)
- **Q3 Success** → 신청자 경험 + 운영자 처리 효율 둘 다
- **Approach 채택** → A (신청 = 가입, signup-partner)
- **Approach 후보** → B (비로그인 + 메일 invitation), C (기존 가입자 + 별도 신청 폼) — 둘 다 cons로 기각
- **YAGNI 포함** → A1·A2·A3·A4 + B1·B2·B3·B4 + C1·C2·C3 = 11항목
- **YAGNI 제외 (변경)** → C4 이메일 알림 → **인앱 onSnapshot 알림으로 대체** (사용자 결정으로 외부 인프라 회피)
- **YAGNI 제외 (그 외)** → SMS·사업자 검증·로고 업로드·자동 승인·다국어 등 11개 (위 §3 OOS)
- **Section approvals** → Architecture ✓ · Components ✓ · Data Flow ✓

---

## 13. Next Steps

1. `/pdca design partner-application` — 상세 설계 문서 작성:
   - `signup-provider` 자동 sign-in 흐름 정확히 reverse-engineer (idToken 핸드오버 패턴)
   - API 계약 zod 스키마 + 에러 코드
   - 와이어프레임 5종 (signup-partner·submitted·admin/partners·applicants/[id]·거절 모달)
   - Firestore rules·indexes deploy 순서
   - admin-console와의 의존성 매핑 (`requirePartnerPage` 변경 영향)
2. Design 완료 후 `bkit:design-validator` (cycle #19·#20에서 효과 검증됨)
3. `/pdca do partner-application` — S1–S8 순차 구현
4. `/pdca analyze partner-application` (gap-detector) → ≥90% 도달 후 `/pdca report` → archive
5. **admin-console (#20)도 함께 analyze 권장** — partner-application이 admin-console의 일부를 변경하므로 두 cycle 통합 검증

---

**Plan Plus 완료 · Approval 기록**: Architecture ✅ · Components ✅ (이메일 → 인앱 변경 반영) · Data Flow ✅
