# Gap Analysis — partner-application (cycle #21)

| Field | Value |
|---|---|
| **Feature** | partner-application — 의뢰업체 공개 가입/심사 채널 |
| **PDCA Cycle** | #21 |
| **Project** | cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level) |
| **Design Source** | `docs/02-design/features/partner-application.design.md` (v0.2 — design-validator 응답 반영) |
| **Plan Source** | `docs/01-plan/features/partner-application.plan.md` (v1.0 Plan Plus) |
| **Analysis Date** | 2026-04-26 |
| **Analyst** | bkit:gap-detector |
| **Implementation Commit** | `2ec61f8` (push 완료, Vercel auto-deploy 트리거됨) |

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 99% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 100% | ✅ |
| **Overall Match Rate** | **99%** | **✅ (≥ 90% threshold)** |

---

## 2. Plan Reconciliation Compliance (R1–R14)

| # | 항목 | 결과 | 증거 |
|---|---|:---:|---|
| R1 | client-first auth pattern | ✅ | `PartnerSignupForm.tsx:58-63` (createUserWithEmailAndPassword + getIdToken → submitPartnerApplication) |
| R2 | synthetic email reject | ✅ | `partner-application-actions.ts:60-65` (`isSyntheticEmail(email)` → INVALID_INPUT) |
| R3 | applicant-pending / applicant-rejected reason | ✅ | `require-partner.ts:36-37, 49-54, 73-75` |
| R4 | repository 명명 (`partner-applicant-repository.ts`) | ✅ | 파일 경로 일치 |
| R5 | 홈 CTA 별도 카드 | ✅ | `app/page.tsx:65` (`PartnerApplyCTA`, CommunityPreviewSection 다음) |
| R6 | pending/approved 409 + rejected reopen | ✅ | `actions.ts:90-119` |
| R7 | 2-step session 발급 | ✅ | `actions.ts:155-164` (createSessionCookie + cookies().set) |
| R8 | email-only rate-limit | ✅ | `actions.ts:67-72` (`signup-partner:e:${email}` 3건/h) |
| R9 | client onSnapshot + cleanup | ✅ | `PartnerApplicationStatus.tsx:73-99` (`where('ownerUid','==',uid)` + unsubscribe) |
| R10 | pendingCount aggregate | ✅ | `partner-applicant-repository.ts:85-99` (`count().get()`) |
| R11 | approve TX wrap | ✅ | `approve/route.ts:51-89` (partnerRef create + applicantRef update 단일 runTransaction) |
| R12 | reject TX wrap with `status==='pending'` check | ✅ | `reject/route.ts:60-79` |
| R13 | onSnapshot rules where + ownerUid | ✅ | `Status.tsx:75-79` + `firestore.rules:170-175` |
| R14 | rejected reopen — 기존 doc reset | ✅ | `actions.ts:107-119` (status·rejectReason·reviewedAt·reviewedBy·partnerId reset + appliedAt 갱신) |

**14 / 14 → 100%.**

---

## 3. Design-Validator 결의 반영 (C / H / M / L)

### Critical (3 / 3 ✅)
| ID | 항목 | 증거 |
|---|---|---|
| C1 | `import { clientDb }` (not `db`) | `lib/firebase/client.ts:21` exports `clientDb`; `Status.tsx:15` import |
| C2 | synthetic 도메인 차단 (`@cheonggwang.auth`) | `username.ts:17` `SYNTHETIC_EMAIL_DOMAIN = 'cheonggwang.auth'` + `actions.ts:60-65` |
| C3 | reject TX wrap | `reject/route.ts:60-79` runTransaction + `status==='pending'` check |

### High (8 / 8 ✅)
| ID | 항목 | 증거 |
|---|---|---|
| H1 | Admin 파일 카운트 (5) | applicants page + approve route + reject route + ApplicantsList + ApplicantDetail |
| H2 | `tx.get(userRef)` `userSnap.exists` | `actions.ts:87-88, 148-152` |
| H3 | TX 내 race-safe query | `actions.ts:82-84` `tx.get(applicantsCol.where(...).limit(1))` |
| H4 | helper bypass + `updatedAt: serverTimestamp` 명시 | `approve/route.ts:80` |
| H5 | `PartnerApplicant.partnerId` 필드 | `types/partner-applicant.ts:33` + repo:49 + approve TX:87 |
| H6 | `AdminStats.pendingApplicantsCount` | `stats.ts:33` 인터페이스 + 162-170 Promise.all + StatsWidgets:90-95 7번째 카드 |
| H7 | 7-card layout grid 호환 | `StatsWidgets.tsx:43` `grid-cols-2 sm:grid-cols-3` |
| H8 | email-only rate-limit (IP key 미사용) | `actions.ts:67-72` |

### Medium (4 / 4 ✅)
| ID | 항목 | 증거 |
|---|---|---|
| M1 | empty submitted state | `Status.tsx:153-177` `kind: 'no-application'` 분기 |
| M2 | `users.roles` arrayUnion('client') | `actions.ts:146` |
| M3 | orphan Auth user 자동 복구 | `PartnerSignupForm.tsx:64-78` `auth/email-already-in-use` 안내 + 재시도 시 TX의 getByOwnerUid가 자동 복구 |
| M4 | appendEvent best-effort post-TX | `approve/route.ts:91-98` (TX 외부 호출, 주석 명시) |

### Low (2 / 2 ✅)
| ID | 항목 | 증거 |
|---|---|---|
| L1 | per-route metadata robots noindex | `submitted/page.tsx:7` + applicants detail page:15 |
| L3 | event `from: 'invited'` 통일 | `approve/route.ts:94` |

**총 17 / 17 결의 항목 100% 반영.**

---

## 4. Section-by-Section Match

### §3 Data Model (PartnerApplicant) — 14 / 14 필드 ✅
`id, ownerUid, businessName, email, phone, category, regionLabel, intro(≤500), status, appliedAt, reviewedAt, reviewedBy, rejectReason(≤200), partnerId(H5)`

### §4 require-partner.ts 갱신 — ✅
- `LoadResult.reason` union에 `'applicant-pending'`, `'applicant-rejected'` 추가
- `loadActivePartner()` partner 미존재 시 applicant 조회 후 분기
- `requirePartnerPage` switch에서 `/signup-partner/submitted` redirect
- `requirePartnerApi` 동일 분기 (FORBIDDEN throw)

### §5 API Contracts — 7 / 7 ✅
- `submitPartnerApplicationInputSchema` (idToken + business)
- `partnerApplicationFormSchema` (email/pw + business + refine)
- Server action error codes: VALIDATION_ERROR, UNAUTHORIZED, INVALID_INPUT, RATE_LIMITED, ALREADY_REGISTERED, INTERNAL_ERROR
- Approve response 201 `{partnerId, redirectTo}` + `STATUS_BY_CODE` 완전 매핑
- Reject body `{reason}` 1-200자 + TX `status==='pending'` check

### §6 UI Wireframes — 8 / 8 ✅
- §6.1 `/signup-partner` form: 이메일·비번·매장명·연락처·카테고리·지역·소개 모두 구현
- §6.2 pending: `Status.tsx:181-194`
- §6.2 approved (5초 자동 redirect): `Status.tsx:101-118, 197-220`
- §6.2 rejected (재신청 CTA): `Status.tsx:222-251`
- §6.2 no-application (M1): `Status.tsx:153-177`
- §6.3 admin partners 페이지: 대기 신청 Suspense 섹션 임베드
- §6.4 applicant detail: dl/dt + 승인 confirm + 거절 modal ≤200자
- §6.5 홈 CTA: 청광 톤 (For Business eyebrow)

### §7 Firestore Rules — ✅
`firestore.rules:170-175` `partnerApplicants` 컬렉션:
- `read: (auth.uid == resource.ownerUid) || (token.admin == true)`
- `write: false` (Admin SDK only)

### §8 Implementation Order — S1 ~ S8 모두 ✅

### §11 Acceptance Criteria — 15 / 15 검증 가능 ✅

---

## 5. Out-of-Scope 역검증 (12 / 12 ✅)

| OOS 항목 | 의도적 미구현 |
|---|:---:|
| O1 이메일 알림 | ✅ (Resend·Sendgrid 의존성 없음) |
| O2 SMS 알림 | ✅ (NCP·Twilio 호출 없음) |
| O3 사업자등록번호 검증 | ✅ (schema에 businessRegNo 없음) |
| O4 로고 이미지 업로드 | ✅ (form file input 없음, approve 시 logoUrl=null) |
| O5 `/my/application` dashboard | ✅ (submitted 페이지로 충당) |
| O6 자동 승인 (도메인 화이트리스트) | ✅ (TX 항상 status:'pending' 시작) |
| O7 다국어 | ✅ (한국어 단일) |
| O8 거절 후 N일 재신청 제한 | ✅ (rate-limit만) |
| O9 신청자 정보 수정 | ✅ |
| O10 A/B 테스트 | ✅ |
| O11 글로벌 banner | ✅ (submitted 페이지에 한정) |
| OQ-1 IP rate-limit | ✅ (email key 단일, v2 OOS) |

---

## 6. Architecture & Convention

### Architecture Compliance — 100%
- Domain (`types/`, `domain/`): 외부 의존 없음
- Infrastructure (`lib/firebase/*-repository.ts`): `server-only` import + adminDb
- Application (`app/actions/*-actions.ts`): server action, errors·types만 의존
- Presentation (`components/auth/*`, `components/admin/*`, `components/landing/*`)
- 의존성 방향 위반: 0건

### Convention Compliance — 100%
- Components PascalCase, Functions camelCase, Constants UPPER_SNAKE_CASE
- 폴더 kebab-case (`signup-partner/submitted`, `partners/applicants/[applicantId]`)
- Import 순서 (external → @/... → relative) 준수
- Env vars `NEXT_PUBLIC_FIREBASE_*` (client-exposed, 컨벤션 준수)

---

## 7. Gap List

### 🔴 Critical (0)
없음.

### 🟠 High (0)
없음.

### 🟡 Medium (0)
없음.

### 🟢 Low (1)

#### G1 — `setStatus` 헬퍼 v1 미사용 (dead code 후보)
- **위치**: `src/lib/firebase/partner-applicant-repository.ts:105-120`
- **사실**: Design §1.1·§5.3은 reject TX 직접 update를 명시했고, 실제 reject route도 TX 직접 update를 사용 (`reject/route.ts:73-78`). repository의 `setStatus(id, next, extra)` 헬퍼는 v1 어디에서도 호출되지 않음.
- **영향**: 기능 영향 없음 — TypeScript 빌드/번들에 포함되지만 호출자 0.
- **권고**: v1은 그대로 유지 (v2 reapply count 추적·admin bulk action 시 활용 예상). 또는 design v0.3 footnote 또는 코드 주석으로 "future use, dead in v1" 명시.
- **분류**: G1 / Low / Documentation only.

---

## 8. Match Rate Calculation

```
┌─────────────────────────────────────────────────┐
│  Overall Match Rate: 99%                         │
├─────────────────────────────────────────────────┤
│  Plan↔Design Reconciliation:        14/14 (100%) │
│  Critical/High/Medium/Low 결의:     17/17 (100%) │
│  Data Model 필드:                   14/14 (100%) │
│  API Contracts:                       7/7 (100%) │
│  UI Wireframes (5종+sub):             8/8 (100%) │
│  Acceptance Criteria:               15/15 (100%) │
│  OOS 역검증:                        12/12 (100%) │
│  Implementation Order S1-S8:          8/8 (100%) │
│  Architecture Compliance:                 100%   │
│  Convention Compliance:                   100%   │
│  Documentation Gap (G1):                   -1%   │
└─────────────────────────────────────────────────┘
```

| Aggregate | Count |
|---|:---:|
| Critical Gaps | 0 |
| High Gaps | 0 |
| Medium Gaps | 0 |
| Low Gaps | 1 (G1) |

---

## 9. Recommended Actions

### Immediate
**없음** — Design ↔ Implementation 정합성 100% 달성 (Critical/High/Medium 0건). Match Rate 99% ≥ 90% threshold → 즉시 `/pdca report` 진행 가능.

### Short-term (Optional)
- G1: `setStatus` 헬퍼 v1 미사용 의도 design v0.3 또는 코드 주석에 명시 ("v2 reapply count tracking·bulk action 대비, dead in v1").

### Long-term (이미 Design §10 OQ에 기록됨)
- OQ-5 reapplyCount 추적 (v2)
- OQ-1 IP rate-limit (v2 API route 분리 시)
- L3 PartnerEvent type `'created-from-applicant'` 신규 추가 (v2)

---

## 10. Verdict

**Match Rate 99% — `/pdca iterate` 불필요. 바로 `/pdca report partner-application`로 진행 권장.**

단일 Low gap (G1, dead code)은 보고서 작성 후 archive 단계에서 design v0.3 footnote 또는 무시 가능.
