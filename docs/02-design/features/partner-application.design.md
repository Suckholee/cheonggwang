# Design · partner-application

**Feature**: 의뢰업체 등록 신청 흐름 (공개 채널)
**Version**: v0.2 (design-validator 응답 반영 — C1·C2·C3 + H1–H8 + M1·M3·M4 + L1·L3 결의 + OQ-1·4·6 결정)
**Level**: Dynamic
**Cycle**: #21 (Marketplace v1.9 · partner-application)
**Based on**: `docs/01-plan/features/partner-application.plan.md`
**Inherits from**: cycle #19 (partner-promo) · cycle #20 (admin-console)
**Created**: 2026-04-26

---

## 0. Plan vs Design Reconciliation

| # | Plan 지점 | Plan 표현 | Design 실제 | 이유 |
|---|---|---|---|---|
| **R1** | Plan §6 / §10 — Auth 가입 | "adminAuth.createUser" | **client-first 패턴** — `provider-signup` 흐름과 동일: client에서 `createUserWithEmailAndPassword` → `getIdToken()` → server action에 idToken 전달 → server `verifyIdToken` → Firestore TX → `createSessionCookie + cookies().set` | `provider-signup-actions.ts:42-173` 검증된 패턴 그대로 차용. server-side createUser는 client 자동 sign-in 처리 까다로움 |
| **R2** | Plan §1.1 — 이메일 정책 | (미명시) | **real email 강제** — `isSyntheticEmail`(`@cheonggwang.auth`) reject. partner-application은 외부 신청자만 사용 (C2 결의 — 실제 도메인은 `cheonggwang.auth`이며 `username.ts:17 SYNTHETIC_EMAIL_DOMAIN` 상수 사용) | provider-signup은 synthetic 허용(데모용)이지만 partner-application은 외부 채널 |
| **R3** | Plan §3 A4 — `/partner/*` 진입 redirect | "applicant 조회 후 분기" | `loadActivePartner()`에 applicant 조회 추가하여 `loadActivePartnerOrApplicant()` 헬퍼 신설 또는 `requirePartnerPage` 내부에서 처리. 기존 reason enum에 `'applicant-pending'`·`'applicant-rejected'` 추가 | 기존 흐름(no-partner → '/')을 깨지 않으면서 applicant 분기만 추가 |
| **R4** | Plan §7 — repository 파일명 | `partner-applicant-repository.ts` | 그대로. 명명 규칙 `partner-repository.ts`(cycle #19)와 일관 | — |
| **R5** | Plan §3 A3 — 홈 CTA 위치 | "홈 푸터 또는 적절 위치" | `src/app/page.tsx`의 "더 많은 청명 보기 → 청명찾기" 라인 근처 또는 새 섹션. **하단 별도 카드 형식 권장** ("매장이세요? 의뢰업체 등록") | 메인 흐름(견적 요청)을 가리지 않으면서 잠재 사용자에게 노출 |
| **R6** | Plan §10 — 동시 신청 race | "기존 pending 있으면 409" | API 진입 시 `partnerApplicantRepository.getByOwnerUid(uid)` → 기존 doc 있으면: `pending` → 409 / `approved` → 409 (이미 partner) / `rejected` → 신청 status를 `pending`으로 reopen (재신청) | 거절 후 재신청 케이스 명확화 — 새 doc 만들지 않고 기존 doc 갱신 |
| **R7** | Plan §5.4 — auto sign-in | "createCustomToken 또는 2-step" | **2-step 명시** — 1) client createUser+getIdToken, 2) server `createSessionCookie(idToken)` + cookies().set. createCustomToken 불필요 | `provider-signup-actions.ts` 동일 패턴 |
| **R8** | Plan §10 — rate-limit key | `signup-partner:${ip}` (3건/h) | **email key 단일 — H8 결의** — `signup-partner:e:${email}` 1h 3건 (provider-signup과 동일 패턴). server action은 IP 추출이 어려워 IP key는 v1 OOS. v2에 API route handler 분리 시 IP key 추가 검토 (OQ-1 = email-only로 결정) | server action context 한계 + provider-signup 일관성 |
| **R9** | Plan §5 — onSnapshot client SDK | (단순 "subscribe") | Firebase JS SDK `firestore` import → `query(collection, where(ownerUid))` + `onSnapshot`. 기존 `src/lib/firebase/client.ts` 또는 동등한 client init 활용. unsubscribe in cleanup | rules read 본인만 분기 검증 + 컴포넌트 cleanup 누락 시 메모리 누수 |
| **R10** | Plan §7 — `pendingApplicantsCount()` | "stats.ts 추가" | 그대로. `count()` aggregate query 사용 | partners status별 counts와 동일 패턴 |
| **R11** | Plan §3 C3 — 승인 트랜잭션 | "1-click" | 명시적 **단일 트랜잭션** — `partnerRepository.create + applicants.setStatus`을 두 개 별도 호출하면 race 가능. **`adminDb.runTransaction`으로 wrap** + 진입 시 `applicant.status === 'pending'` 검증 | 두 admin 동시 승인 시 partners 두 개 생성 방지 |
| **R12** | Plan §6 — admin partner 미발급 흐름 | "applicant 없음 → /" | 동일. cycle #20 admin이 partner 없는 상태로 /partner/* 진입 시 / redirect (이미 같은 동작) — A4 변경 영향 없음 | admin claim 보유자는 partner 없는 게 정상 |
| **R13** | Plan §10 — onSnapshot Firestore rules | "본인 ownerUid only" | rules에서 `request.auth.uid == resource.data.ownerUid` 분기. 단 `where('ownerUid', '==', currentUid)` 쿼리는 client에서 수행 → rules도 query 시점에 read 권한 검증 (Firestore rules 특성) | client query에 `where` 누락하면 collection 전체 read 시도하다 권한 거부 |
| **R14** | Plan § 없음 | — | **거절 후 재신청 기존 doc 갱신** — R6와 연결. `applicants.{rejectReason: null, reviewedAt: null, reviewedBy: null, status: 'pending', appliedAt: serverTimestamp}`로 reset | "재신청 횟수" 추적은 v2 (`reapplyCount` 필드 추가 검토) |

**모든 변경은 실제 코드/프레임워크 정합 목적 · Plan 의도 유지.**

---

## 1. File Inventory

### 1.1 신규 파일 (15)

**Visitor·Signup (5)**
| 경로 | Role |
|---|---|
| `src/app/(auth)/signup-partner/page.tsx` | A1 — 가입+신청 폼 페이지 (Suspense + form client) |
| `src/app/(auth)/signup-partner/submitted/page.tsx` | A2 — 영수증 + onSnapshot 실시간 상태 |
| `src/components/auth/PartnerSignupForm.tsx` | client form (Email/PW + 매장 정보) |
| `src/components/auth/PartnerApplicationStatus.tsx` | client onSnapshot 구독 + 3 상태 분기 (pending/approved/rejected) |
| `src/app/actions/partner-application-actions.ts` | server action `submitPartnerApplication({idToken, ...formData})` — provider-signup 패턴 |

**Repository & Domain (3)**
| 경로 | Role |
|---|---|
| `src/types/partner-applicant.ts` | `PartnerApplicant` interface + `PartnerApplicantStatus` enum |
| `src/domain/partner-application-schema.ts` | `partnerApplicationFormSchema` (client form, password 포함) + `submitPartnerApplicationInputSchema` (server action, idToken 포함) |
| `src/lib/firebase/partner-applicant-repository.ts` | `create` · `getById` · `getByOwnerUid` · `listPending` · `setStatus` · `reopenAsRejected` (R14) · `pendingCount` |

**Admin (5)** (H1 결의 — 카운트 정정)
| 경로 | Role |
|---|---|
| `src/app/admin/partners/applicants/[applicantId]/page.tsx` | B2 신청자 상세 + 승인/거절 액션 |
| `src/app/api/admin/partners/applicants/[applicantId]/approve/route.ts` | POST — 트랜잭션 wrap (R11) |
| `src/app/api/admin/partners/applicants/[applicantId]/reject/route.ts` | POST — 트랜잭션 wrap (C3) + reason |
| `src/components/admin/ApplicantsList.tsx` | server — 카드 형 목록 (admin/partners 페이지 임베드) |
| `src/components/admin/ApplicantDetail.tsx` | client — 상세 + 승인/거절 액션 (모달 포함) |

**Public (1)**
| 경로 | Role |
|---|---|
| `src/components/landing/PartnerApplyCTA.tsx` | A3 — 홈 카드/배너 |

**(이메일 인프라 모두 제외 — 인앱 onSnapshot으로 충당)**

### 1.2 수정 파일 (7)

| 경로 | 변경 |
|---|---|
| `src/app/page.tsx` | A3 `PartnerApplyCTA` 삽입 (R5: 청명찾기 라인 근처 별도 카드) |
| `src/app/admin/partners/page.tsx` | "⏳ 대기 신청" 섹션 추가 (B1, `ApplicantsList` 임베드) |
| `src/lib/auth/require-partner.ts` | A4·R3 — `loadActivePartner()` 결과에 따라 `/signup-partner/submitted` 분기. 신규 reason `'applicant-pending'`·`'applicant-rejected'` 추가 |
| `src/lib/admin/stats.ts` | **H6 결의**: (1) `AdminStats` 인터페이스에 `pendingApplicantsCount: number` 필드 추가, (2) 신규 `pendingApplicantsCount()` aggregate query helper, (3) `loadAdminStats`의 `Promise.all`에 6번째 entry 추가. 미반영 시 `pnpm tsc` 실패 — 컴파일 차단 항목 |
| `src/components/admin/StatsWidgets.tsx` | 7번째 카드 "⏳ 대기 신청" 추가 |
| `firestore.rules` | `partnerApplicants` 분기 + dry-run 검증 |
| `firestore.indexes.json` | `(status, appliedAt DESC)`, `(ownerUid, appliedAt DESC)` 추가 |

### 1.3 환경 변수 추가
**없음** (인앱 알림으로 충당)

### 1.4 의존성 추가
**없음** (Firebase Admin SDK + zod + 기존 client SDK)

---

## 2. Data Model

### 2.1 `PartnerApplicant` 스키마 (`src/types/partner-applicant.ts`)

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export type PartnerApplicantStatus = "pending" | "approved" | "rejected";

export interface PartnerApplicant {
  id: string;
  ownerUid: string;             // Firebase Auth uid
  businessName: string;
  email: string;                // Auth email 사본 (검색용)
  phone: string | null;
  category: QuoteCategory | null;
  regionLabel: string | null;
  intro: string | null;         // ≤500자
  status: PartnerApplicantStatus;
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;    // 'admin'
  rejectReason: string | null;  // ≤200자
  partnerId: string | null;     // H5 결의 — 승인 시 발급된 partnerId back-link, 그 외 null
}
```

### 2.2 Firestore 인덱스 (`firestore.indexes.json`)

```
partnerApplicants:
  + (status ASC, appliedAt DESC)         // 운영자 대기 목록
  + (ownerUid ASC, appliedAt DESC)        // 본인 onSnapshot
```

### 2.3 Firestore Rules

```
match /partnerApplicants/{applicantId} {
  allow read:
       (request.auth != null && request.auth.uid == resource.data.ownerUid)
    || (request.auth != null && request.auth.token.admin == true);
  allow write: if false;   // Admin SDK only (route handler 또는 server action)
}
```

⚠️ admin-console은 별도 admin session(쿠키)을 쓰므로 rules의 `admin` claim 분기는 미사용 (모든 admin 액션은 Route Handler 경유, Admin SDK가 rules 우회). 향후 client-side admin 흐름 대비 명시.

### 2.4 onSnapshot 클라이언트 (R9·R13)

```ts
// PartnerApplicationStatus.tsx
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase/client';   // C1 결의 — exported as `clientDb` (not `db`)

useEffect(() => {
  if (!uid) return;
  const q = query(
    collection(clientDb, 'partnerApplicants'),
    where('ownerUid', '==', uid),
    limit(1),
  );
  const unsub = onSnapshot(q, (snap) => {
    if (snap.empty) setApplicant(null);   // M1 — 빈 상태는 아래 §6.2 4번째 케이스에서 처리
    else setApplicant(toClientShape(snap.docs[0]));
  });
  return () => unsub();
}, [uid]);
```

**중요**: `where('ownerUid', '==', uid)`이 없으면 rules가 collection 전체 read 시도로 판단해 거부. query에 반드시 `where` 포함.

---

## 3. Auth Flow 상세 (R1·R7)

```
[Client] /signup-partner
  PartnerSignupForm 폼 제출
    1. firebaseAuth.createUserWithEmailAndPassword(email, password)
        → User credential
    2. await user.getIdToken()
        → idToken (1h 유효)
    3. await submitPartnerApplication({
         idToken,
         businessName, phone?, category?, regionLabel?, intro?
       })
        → ActionResult<{ applicantId, redirectTo }>
    4. 성공 시 router.push(redirectTo)

[Server] submitPartnerApplication action ('use server')
  ├─ zod validate (submitPartnerApplicationInputSchema)
  ├─ adminAuth.verifyIdToken(idToken, true) → uid, email
  │     실패 → 'UNAUTHORIZED'
  ├─ if isSyntheticEmail(email) → 'INVALID_INPUT' (R2)
  ├─ rate-limit (R8 / H8 결의 — email key 단일, OQ-1 resolved):
  │     checkAndIncrement(`signup-partner:e:${email}`, 3, 60*60_000)
  │     // IP key는 server action에서 추출 어려워 v1 OOS. v2에 API 분리 시 추가 검토.
  ├─ Firestore Transaction:
  │     // H3 결의 — TX 내부 query로 race-safe lookup
  │     const applicantsCol = adminDb.collection('partnerApplicants');
  │     const existingSnap = await tx.get(
  │       applicantsCol.where('ownerUid', '==', uid).limit(1)
  │     );
  │
  │     // H2 결의 — userSnap.exists로 createdAt·isCheonggwangPartner gating
  │     const userRef = adminDb.collection('users').doc(uid);
  │     const userSnap = await tx.get(userRef);
  │
  │     if (!existingSnap.empty) {
  │       const existing = existingSnap.docs[0];
  │       const existingData = existing.data();
  │       if (existingData.status === 'pending')   throw 'ALREADY_REGISTERED' 409 (R6);
  │       if (existingData.status === 'approved')  throw 'ALREADY_REGISTERED' 409;
  │       // rejected 인 경우만 reopen (R14)
  │       tx.update(existing.ref, {
  │         status: 'pending',
  │         reviewedAt: null,
  │         reviewedBy: null,
  │         rejectReason: null,
  │         appliedAt: FieldValue.serverTimestamp(),
  │         businessName, phone, category, regionLabel, intro,  // 입력값 갱신
  │       });
  │       applicantId = existing.id;
  │     } else {
  │       applicantId = nanoid(12);
  │       tx.create(applicantsCol.doc(applicantId), {
  │         ownerUid: uid, businessName, email, phone, category,
  │         regionLabel, intro, status: 'pending',
  │         appliedAt: FieldValue.serverTimestamp(),
  │         reviewedAt: null, reviewedBy: null, rejectReason: null,
  │         partnerId: null,                       // H5 결의 — back-link, 승인 시 채움
  │       });
  │     }
  │
  │     // users doc 갱신 (provider-signup-actions.ts:82-124 패턴, merge)
  │     const userPayload: Record<string, unknown> = {
  │       email, displayName: businessName,
  │       roles: FieldValue.arrayUnion('client'),  // M2 — applicant signal은 partnerApplicants doc에 보존
  │     };
  │     if (!userSnap.exists) {
  │       userPayload.isCheonggwangPartner = false;
  │       userPayload.createdAt = FieldValue.serverTimestamp();
  │     }
  │     tx.set(userRef, userPayload, { merge: true });
  ├─ session cookie set:
  │     const sessionCookie = await createSessionCookie(idToken);
  │     cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
  │       httpOnly: true, secure: prod, sameSite: 'lax', path: '/',
  │       maxAge: SESSION_COOKIE_MAX_AGE_SEC,
  │     });
  └─ return { ok: true, data: { applicantId, redirectTo: '/signup-partner/submitted' } }
```

---

## 4. require-partner.ts 갱신 (A4·R3)

```ts
// src/lib/auth/require-partner.ts
export type LoadResult =
  | { ok: true; uid: string; partner: Partner }
  | { ok: false; reason:
      | 'no-session'
      | 'no-partner'
      | 'not-active'
      | 'applicant-pending'      // R3 신규
      | 'applicant-rejected' };   // R3 신규

export async function loadActivePartner(): Promise<LoadResult> {
  const uid = await readUid();
  if (!uid) return { ok: false, reason: 'no-session' };
  const partner = await partnerRepository.getByOwnerUid(uid);
  if (partner) {
    if (partner.status !== 'active')
      return { ok: false, reason: 'not-active' };
    return { ok: true, uid, partner };
  }
  // partner 없음 → applicant 상태 분기
  const applicant = await partnerApplicantRepository.getByOwnerUid(uid);
  if (applicant?.status === 'pending')
    return { ok: false, reason: 'applicant-pending' };
  if (applicant?.status === 'rejected')
    return { ok: false, reason: 'applicant-rejected' };
  return { ok: false, reason: 'no-partner' };
}

export async function requirePartnerPage(
  nextPath = '/partner/posts',
): Promise<{ uid: string; partner: Partner }> {
  const r = await loadActivePartner();
  if (r.ok) return { uid: r.uid, partner: r.partner };
  switch (r.reason) {
    case 'no-session':
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    case 'applicant-pending':
    case 'applicant-rejected':
      redirect('/signup-partner/submitted');
    case 'no-partner':
    case 'not-active':
    default:
      redirect('/');
  }
}

// requirePartnerApi는 변경 없음 (API에서는 redirect 불가, 같은 throw 유지)
```

---

## 5. API Contracts

### 5.1 `submitPartnerApplication` server action

**Input** (`submitPartnerApplicationInputSchema`):
```ts
{
  idToken: string,                            // ≥10 chars
  businessName: string,                       // 1-40
  phone?: string,                             // 10-13, '-' 허용
  category?: QuoteCategory,
  regionLabel?: string,                       // ≤60
  intro?: string,                             // ≤500
}
```

**Form schema (client-side)** (`partnerApplicationFormSchema`):
```ts
{
  email: string.email,
  password: string.min(8).max(64),
  passwordConfirm: string,
  businessName, phone?, category?, regionLabel?, intro?,
} + refine(password === passwordConfirm)
```

**Output**: `ActionResult<{ applicantId: string; redirectTo: '/signup-partner/submitted' }>`

**Errors**:
| Code | 의미 |
|---|---|
| `VALIDATION_ERROR` | zod 실패 |
| `UNAUTHORIZED` | idToken 검증 실패 |
| `INVALID_INPUT` | synthetic email (R2) |
| `RATE_LIMITED` | 1h 3건/email 초과 |
| `ALREADY_REGISTERED` | pending or approved applicant 존재 |
| `INTERNAL_ERROR` | 기타 |

### 5.2 `POST /api/admin/partners/applicants/[id]/approve`

**Request**: 빈 body
**Response 201**: `{ partnerId, redirectTo: '/admin/partners/{partnerId}' }`

**처리** (R11 트랜잭션 + H4·L3 결의):

> **H4 메모**: `partnerRepository.create` 헬퍼는 비-트랜잭션 (pre-check 후 `col().doc(id).create()` 별도 호출). approve 흐름은 race-safe하게 단일 TX이 필요해 헬퍼를 우회하고 직접 `tx.create(partnerRef, {...})` 사용. 페이로드 shape은 `partner-repository.ts:117-145`와 일치하며 `updatedAt: serverTimestamp` 추가 (헬퍼는 자동 set, TX는 명시 필요).

```ts
let partnerId: string;
await adminDb.runTransaction(async (tx) => {
  const applicantRef = adminDb.collection('partnerApplicants').doc(applicantId);
  const snap = await tx.get(applicantRef);
  if (!snap.exists) throw new AppError('NOT_FOUND', '신청을 찾을 수 없습니다');
  const data = snap.data()!;
  if (data.status !== 'pending') {
    throw new AppError('STATUS_CONFLICT', `신청 상태가 ${data.status}이므로 승인할 수 없습니다`);
  }
  
  partnerId = nanoid(12);
  const partnerRef = adminDb.collection('partners').doc(partnerId);
  tx.create(partnerRef, {
    ownerUid: data.ownerUid,
    businessName: data.businessName,
    logoUrl: null,
    category: data.category ?? null,
    regionLabel: data.regionLabel ?? null,
    status: 'active',
    autoPublish: { ...DEFAULT_AUTO_PUBLISH },   // R10 partner-promo 강제
    issuedAt: FieldValue.serverTimestamp(),
    issuedBy: 'admin',
    notes: data.intro ?? null,
    updatedAt: FieldValue.serverTimestamp(),   // H4 결의 — 헬퍼는 자동 set, TX는 명시 필요
  });
  tx.update(applicantRef, {
    status: 'approved',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: 'admin',
    partnerId,   // back-link (H5 결의 — PartnerApplicant.partnerId 필드 추가됨)
  });
});

// L3 결의 — 트랜잭션 외부 best-effort 감사 로그.
// `from: 'invited'`은 의미상 부정확 (applicant flow는 invited 거치지 않음).
// PartnerEvent 타입 'status-changed'를 그대로 사용하되 `from: 'invited'` 대신 `from: 'invited'`를
// 유지 (invited는 partners collection의 첫 가상 상태 — applicants에서 발급된 케이스도 동일 의미로 통일).
// v2: PartnerEvent에 'created-from-applicant' 신규 type 추가 검토.
// M4 결의 — 본 호출은 best-effort. process crash 시 partner는 생성됐으나 events 누락 가능 — Plan §10 허용.
await partnerRepository.appendEvent(partnerId, {
  type: 'status-changed',
  from: 'invited',
  to: 'active',
  by: 'admin',
  decidedAt: new Date(),
});
```

**Errors**: `UNAUTHENTICATED`(401) · `NOT_FOUND`(404) · `STATUS_CONFLICT`(409)

### 5.3 `POST /api/admin/partners/applicants/[id]/reject`

**Request**:
```ts
{ reason: string }  // 1-200 chars
```

**Response 200**: `{ ok: true }`

**처리** (C3 결의 — race-safe TX. approve와 동일 패턴으로 두 admin 동시 액션 방지):
```ts
await adminDb.runTransaction(async (tx) => {
  const ref = adminDb.collection('partnerApplicants').doc(applicantId);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new AppError('NOT_FOUND', '신청을 찾을 수 없습니다');
  const data = snap.data()!;
  if (data.status !== 'pending') {
    throw new AppError(
      'STATUS_CONFLICT',
      `신청 상태가 ${data.status}이므로 거절할 수 없습니다`,
    );
  }
  tx.update(ref, {
    status: 'rejected',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: 'admin',
    rejectReason: reason,
  });
});
```

---

## 6. UI Wireframes

### 6.1 `/signup-partner` (A1)

```
┌──────────────────────────────────────────────┐
│ ← 홈으로                                      │
│                                                │
│      🏢 의뢰업체 등록 신청                     │
│  매장을 청광에 등록하고 AI가 작성하는 홍보글로 │
│  신규 고객을 만나보세요                         │
│                                                │
│   이메일*       [______________________]       │
│   비밀번호*     [______________________] [👁]  │
│   비밀번호 확인 [______________________]       │
│   ─────────────────────────                    │
│   매장명*       [______________________]       │
│   연락처        [010-1234-5678        ]        │
│   예상 카테고리 [▼ 정기청소           ]        │
│   지역          [______서울 강남구____]        │
│   매장 소개     [                       ]      │
│                  (선택, 최대 500자)             │
│                                                │
│              [신청 제출]                       │
│                                                │
│   ⓘ 영업일 1-2일 내 검토 후 안내드립니다.      │
└──────────────────────────────────────────────┘
```

### 6.2 `/signup-partner/submitted` (A2 — 3 상태)

**pending (기본):**
```
┌──────────────────────────────────────────────┐
│ ✅ 신청이 접수되었습니다                      │
│                                                │
│ 매장명: 데모 카페                             │
│                                                │
│ ┌─────────────────────────────────────────┐  │
│ │ 🕒 검토 중입니다                          │  │
│ │ 영업일 1-2일 내 결과 안내. 페이지 닫아도   │  │
│ │ 괜찮습니다 — 다시 방문하면 상태 표시.       │  │
│ └─────────────────────────────────────────┘  │
│                                                │
│ [홈으로] [로그아웃]                           │
└──────────────────────────────────────────────┘
```

**approved (onSnapshot 갱신):**
```
┌─────────────────────────────────────────┐
│ 🎉 승인되었습니다!                       │
│ 5초 후 작성 페이지로 자동 이동…          │
│ [지금 이동 →]                            │
└─────────────────────────────────────────┘
```

**rejected:**
```
┌─────────────────────────────────────────┐
│ ❌ 거절되었습니다                        │
│ 사유: {rejectReason}                     │
│                                          │
│ [재신청하기]   [홈으로]                  │
│  (재신청 = /signup-partner로 이동)       │
└─────────────────────────────────────────┘
```

**no application (M1 결의 — OQ-6 resolved):**
신청 안 한 사용자가 직접 URL 입력으로 접근 시. onSnapshot이 `applicant === null` 반환 후:
```
┌─────────────────────────────────────────┐
│ ⓘ 진행 중인 신청이 없습니다              │
│                                          │
│ 청광 의뢰업체로 등록하려면 신청을         │
│ 먼저 제출해 주세요.                       │
│                                          │
│ [의뢰업체 등록 신청하기 →]               │
│ [홈으로]                                  │
└─────────────────────────────────────────┘
```

### 6.3 `/admin/partners` (B1 추가)

```
┌──────────────────────────────────────────────────────────┐
│ Partners (12)                       [+ 새 발급]           │
├──────────────────────────────────────────────────────────┤
│ ⏳ 대기 신청 (3)  ← NEW (B1)                              │
│   ┌──────────────┬──────────┬───────┬───────┬─────────┐  │
│   │ 매장명       │ 카테고리 │ 지역  │ 신청  │ 액션    │  │
│   │ 데모 카페    │ 정기     │ 강남  │ 04-25 │ [상세]  │  │
│   │ 신선 식당    │ -        │ -     │ 04-26 │ [상세]  │  │
│   └──────────────┴──────────┴───────┴───────┴─────────┘  │
│                                                            │
│ ✅ Active (8) · ✉ Invited (1) · 🚫 Suspended (0) [기존]  │
└──────────────────────────────────────────────────────────┘
```

### 6.4 `/admin/partners/applicants/[id]` (B2)

```
┌──────────────────────────────────────────────────────────┐
│ ← /admin/partners                                         │
│                                                            │
│ 데모 카페 (신청 #abc123)                                  │
│                                                            │
│ ┌── 신청 정보 ────────────────────────────────────────┐  │
│ │ 매장명     : 데모 카페                                │  │
│ │ 이메일     : owner@cafe.kr                            │  │
│ │ 연락처     : 010-1234-5678                            │  │
│ │ 카테고리   : 정기청소                                  │  │
│ │ 지역       : 서울 강남구                              │  │
│ │ 신청일     : 2026-04-26 14:30 KST                     │  │
│ │ ownerUid   : abc...xyz                                │  │
│ │                                                        │  │
│ │ 매장 소개:                                            │  │
│ │ "10년 운영한 브런치 카페입니다…"                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [✓ 승인]                              [✗ 거절]           │
└──────────────────────────────────────────────────────────┘

거절 모달:
┌──────────────────────────────────────┐
│ ✗ 신청 거절                          │
│ 사유 (≤200자):                        │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│             [취소]   [거절 확정]     │
└──────────────────────────────────────┘
```

### 6.5 홈 CTA (A3·R5)

```
─────────────────────────
[기존 청광 홈 컨텐츠]
─────────────────────────
┌────────────────────────────────────────────┐
│ 🏢 매장을 운영하시나요?                    │
│                                            │
│ 청광에 의뢰업체로 등록하면 AI가 자동으로   │
│ 매장 홍보글을 작성하고 신규 고객을 만나는   │
│ 채널을 제공합니다.                         │
│                                            │
│ [의뢰업체 등록 신청 →] /signup-partner     │
└────────────────────────────────────────────┘
```

---

## 7. SEO · Robots

- `/signup-partner`: **검색 노출 OK** (인입 채널), `metadata.title` "의뢰업체 등록 · 청광"
- `/signup-partner/submitted`: per-route `metadata.robots = { index: false, follow: false }` (L1 결의 — 동적 `app/robots.ts` 사용 중이라 metadata-only로 충분, robots.txt 추가 불필요)

---

## 8. Implementation Order (S1–S8)

| Step | 범위 | 출력 | 의존 |
|---|---|---|---|
| **S1** | `types/partner-applicant.ts` + `partner-applicant-repository.ts` + `partner-application-schema.ts` | 컴파일 통과 | — |
| **S2** | `firestore.rules` + `indexes.json` 갱신 + `firebase deploy --dry-run` | rules·indexes deploy 통과 | S1 |
| **S3** | `submitPartnerApplication` server action (R1 client-first 패턴) | curl/스크립트로 테스트 (idToken 모의) | S1 |
| **S4** | `/signup-partner/page.tsx` + `PartnerSignupForm.tsx` | 폼 제출 → submitted 이동 | S3 |
| **S5** | `/signup-partner/submitted/page.tsx` + `PartnerApplicationStatus.tsx` (onSnapshot) | 3 상태 실시간 갱신 | S4 |
| **S6** | `require-partner.ts` 갱신 (A4·R3) | partner 미존재 시 redirect 분기 동작 | S1 |
| **S7** | admin: `ApplicantsList`·`ApplicantDetail` + approve·reject API + StatsWidgets 카드 + admin/partners 페이지 통합 | 1-click 승인 + 거절 모달 동작 | S2, S6 |
| **S8** | 홈 `PartnerApplyCTA` 삽입 + 빌드·tsc·deploy | 운영 동선 완성 | All |

---

## 9. Risks & Mitigations

| 리스크 | 확률 | 영향 | 완화 |
|---|---|---|---|
| client-side createUser 실패 (이미 가입된 이메일 등) | High | UI 에러 | client에서 Firebase 에러 코드 분기 (auth/email-already-in-use → "이미 가입") |
| idToken 만료 (1h) — 폼 작성 시간이 길어진 경우 | Low | 'UNAUTHORIZED' | client에서 user.getIdToken(true)로 force refresh 후 재시도 |
| 동시 신청 race (R6) | Low | 두 doc 생성 | TX 내부 getByOwnerUid + reopen 또는 409 |
| 거절 후 무한 재신청 | Medium | applicants 비대화 | rate-limit 1h 3건/email + v2 reapplyCount 추적 |
| onSnapshot rules 거부 (where 누락 시) | Low | 페이지 깨짐 | query에 항상 `where('ownerUid', '==', uid)` 명시 + dev 단계 검증 |
| onSnapshot 컴포넌트 unmount 시 unsubscribe 누락 | Medium | 메모리 누수 | useEffect cleanup return 강제 + ESLint react-hooks/exhaustive-deps |
| 승인 트랜잭션 내 partnerRepository.create 호출 (R11) | Low | TX 외부 호출 충돌 | partnerRepository.create는 단순 set이라 TX 내부에서 직접 set 사용 가능 (helper 우회) |
| 홈 CTA가 광고처럼 보임 | Low | 신뢰도 손실 | 카드 디자인을 정보 안내 톤으로 (할인·강조 색 X) |
| 신청자 password 보안 | Low | 가입 안전 | Firebase Auth가 자체 hash + 복잡도 검증 (zod min(8)) |
| applicant doc의 phone 필드 PII | Medium | 개인정보 보호 | 운영자만 접근 + 거절 시 doc 보존하되 v2에 PII 마스킹 검토 |
| **M3 결의** — client createUser 성공 + server action 실패 (네트워크·서버 오류) | Medium | orphan Auth user | 사용자가 같은 이메일 재시도 → `auth/email-already-in-use` → UI에서 "이미 가입된 이메일입니다, [로그인] 후 신청 계속" 안내 → /login으로 보내고, 로그인 후 idToken 재취득해 server action 재호출. TX의 `getByOwnerUid` 분기가 새 신청·재신청 모두 처리하므로 자동 복구. |
| 7번째 위젯 카드 layout 불균형 (H7) | Low | 마지막 카드가 행 단독 노출 | `grid-cols-2 sm:grid-cols-3`로 3+3+1 wrap — 기능 영향 없음. 시각적 균형 원하면 `sm:grid-cols-4` 검토 (v2) |

---

## 10. Open Questions

| OQ | 질문 | 결정 시점 |
|---|---|---|
| **OQ-1** | rate-limit IP 키 추가 여부 — server action에서는 IP 추출 어려움. API route handler로 분리할지 | S3 |
| **OQ-2** | onSnapshot 5초 후 자동 redirect (approved) — 명시적 클릭만 vs 자동 둘 다 vs 자동만 | S5 |
| **OQ-3** | 홈 CTA 위치 정확한 컴포넌트 — `MarketplaceHome` 어디 (CategoryGrid 아래 / 푸터 위 / 별도 섹션) | S8 |
| **OQ-4** | 승인 시 partnerRepository.appendEvent를 TX 내부로 옮겨야 하는가 — partners/{id}/events 서브컬렉션이 partner 문서 생성과 독립적 | S7 |
| **OQ-5** | 거절 후 재신청 횟수 추적 (`reapplyCount` 필드) — 무한 재신청 방어. v2 검토 | v2 |
| **OQ-6** | `/signup-partner/submitted`에서 신청 후 아직 가입 안 된 사용자가 직접 URL 입력 시 — 빈 상태 처리 | S5 |

---

## 11. Acceptance Criteria

- [ ] `/signup-partner` 폼에서 정상 신청 → users + partnerApplicants 동시 생성 + 자동 sign-in
- [ ] `/signup-partner/submitted`에서 onSnapshot이 정확히 작동 (pending → approved 갱신 시 즉시 UI 갱신)
- [ ] 같은 이메일 재신청 시 409 ALREADY_REGISTERED
- [ ] 거절 후 재신청 시 기존 doc reopen (status=pending, rejectReason=null) — R14
- [ ] partner 미발급 + applicant pending 사용자가 `/partner/posts` 진입 시 `/signup-partner/submitted` redirect
- [ ] partner 미발급 + applicant 없는 사용자가 `/partner/posts` 진입 시 `/` redirect
- [ ] /admin/partners 상단에 "⏳ 대기 신청 (n)" 섹션 노출 + n과 실제 일치
- [ ] /admin/partners/applicants/[id]에서 ✓ 승인 클릭 → `/admin/partners/{partnerId}` 이동 + applicants.status='approved'
- [ ] /admin/partners/applicants/[id]에서 ✗ 거절 (사유 입력) → applicants.status='rejected', 신청자 onSnapshot이 즉시 거절 화면으로 갱신
- [ ] /admin StatsWidgets에 7번째 "⏳ 대기 m건" 카드 노출
- [ ] firestore.rules dry-run 통과 (`firebase deploy --only firestore:rules --dry-run`)
- [ ] indexes.json deploy 통과
- [ ] `pnpm build` 64+routes 정상 (signup-partner·submitted·api/partner-application·admin/partners/applicants/* 추가됨)
- [ ] 홈에 `PartnerApplyCTA` 카드 노출
- [ ] **C1** `import { clientDb }` 통과, `db` 잘못된 import 0건 (M1 결의 검증)
- [ ] **C2** synthetic email (`@cheonggwang.auth`) 신청 시 INVALID_INPUT 반환
- [ ] **C3** reject API: 두 admin 동시 reject 시 첫 번째만 성공, 두 번째는 STATUS_CONFLICT
- [ ] **H6** `loadAdminStats()` 응답에 `pendingApplicantsCount` 필드 포함, StatsWidgets 7번째 카드 정상 노출
- [ ] **M1** `/signup-partner/submitted`에 직접 진입 (신청 안 한 상태) 시 "진행 중인 신청이 없습니다" 안내 표시

---

## 12. Next Steps

1. `bkit:design-validator`로 본 design 검증 (cycle #19·#20 4 Critical 발견 효과 검증됨)
2. OQ-3 결정 (홈 CTA 위치) — design-validator 응답 또는 implementation S8 시점
3. `/pdca do partner-application` — S1–S8 순차 구현
4. `/pdca analyze partner-application` — gap-detector
5. ≥ 90% 도달 후 `/pdca report` → archive
6. **권장**: admin-console (#20)도 동시 analyze — partner-application이 admin/partners 페이지·StatsWidgets·require-partner 변경

---

**Approval Status**: Ready for `/pdca do partner-application` (v0.2 design-validator 응답 반영 후).
- 잔여 Open Questions:
  - **OQ-1** ✅ resolved (email-only rate-limit, IP key는 v2)
  - **OQ-2** approved 자동 redirect — 5초 + 즉시 클릭 hybrid 권장 (S5 결정)
  - **OQ-3** 홈 CTA 위치 — S8에서 `MarketplaceHome` 컴포넌트 구조 보고 결정
  - **OQ-4** ✅ resolved (best-effort post-TX, M4 명시)
  - **OQ-5** v2 (reapplyCount 추적)
  - **OQ-6** ✅ resolved (M1 — empty state UI 명시)

### Design-Validator v0.1 응답 반영 (2026-04-26)

| Severity | Item | Resolution |
|---|---|---|
| Critical | C1 (`import { db }` 부정확) | §2.4 — `import { clientDb }` 정정 |
| Critical | C2 (synthetic 도메인) | R2 + (`@cheonggwang.auth`) 정정, `isSyntheticEmail()` 함수 사용 |
| Critical | C3 (reject 비-TX, race) | §5.3 reject 라우트도 `runTransaction` wrap (approve와 대칭) |
| High | H1 (파일 카운트) | §1.1 Admin (3) → (5) 정정 |
| High | H2 (`existsUserDoc` 미정의) | §3 `tx.get(userRef)` 명시 추가 |
| High | H3 (`tx.get(query)` 패턴) | §3 query 형태 + race-safe TX 명시 |
| High | H4 (helper bypass + updatedAt) | §5.2 메모 + `updatedAt: serverTimestamp` 추가 |
| High | H5 (`partnerId` 필드) | §2.1 `PartnerApplicant.partnerId: string \| null` 추가 |
| High | H6 (AdminStats 확장) | §1.2 — 인터페이스 확장·6번째 Promise.all entry·StatsWidgets 의존 명시 |
| High | H7 (StatsWidgets 7-card layout) | §9 risks — 무영향 flag, sm:grid-cols-4 옵션 v2 |
| High | H8 (IP rate-limit 모순) | R8 + §3 — email key 단일 결정, OQ-1 resolved |
| Medium | M1 (empty submitted state) | §6.2 4번째 케이스 + `applicant === null` UI 명시, OQ-6 resolved |
| Medium | M2 (users.roles 'client') | §3 주석 — applicant signal은 partnerApplicants doc에 보존 |
| Medium | M3 (orphan Auth user) | §9 risks — 재시도 시 자동 복구 흐름 명시 |
| Medium | M4 (appendEvent best-effort) | §5.2 주석 + Plan §10 허용 명시, OQ-4 resolved |
| Low | L1 (robots.txt) | §7 metadata-only로 충당 (`app/robots.ts` 동적 사용) |
| Low | L3 (event from='invited') | §5.2 주석 — v1은 통일 의미 유지, v2에 'created-from-applicant' 검토 |
| Low | L2 (R9 hedge) | (cosmetic, 미적용) |
| Low | L4 (build "64+routes") | (cosmetic, 매직 넘버 그대로 유지) |
