---
template: analysis
version: 1.0
feature: provider-signup
date: 2026-04-20
author: gap-detector (bkit v1.5.8)
---

# provider-signup Gap Analysis

> **Project**: cheonggwang (firebase-next-app v0.1.0) · Marketplace Track v1.1 첫 feature (PDCA cycle #5)
> **Plan**: [provider-signup.plan.md](../01-plan/features/provider-signup.plan.md) (v0.1, 14 MVP)
> **Design**: [provider-signup.design.md](../02-design/features/provider-signup.design.md) (v0.1, validator 96% → 구현 99%)
> **Master Plan**: [marketplace-master-plan.md](../00-vision/marketplace-master-plan.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP Completeness:   100%  (14/14)           │
│  Out-of-Scope 준수:  100%  (12/12)           │
│  M1-M4 Fix 반영:     100%  (4/4)             │
│  Server Action 10-step: 100% (11/11)         │
│  Reuse Accuracy:     100%  (10/10)           │
│  Rules Correctness:  100%                   │
│  Next.js 16 Patterns: 100%                  │
│  Minor Deviations:     2  (informational)   │
└─────────────────────────────────────────────┘
```

**Critical**: 0 / **Major**: 0 / **Minor**: 2 (informational, 비차단)
**Status**: ✅ Match Rate >= 90% · **no `[Act]` iteration required** · `/pdca report` 대기

---

## 1. MVP Item Coverage (Plan §3.1) — 14/14 (100%)

| # | 항목 | 구현 위치 | Status |
|---|------|-----------|--------|
| 1 | Firebase Auth 회원가입 | `ProviderSignupForm.tsx:53` `createUserWithEmailAndPassword` | ✅ |
| 2 | users doc 생성·업데이트 | `provider-signup-actions.ts:103-114` roles arrayUnion + providerId + contactPhone | ✅ |
| 3 | providers doc 생성 | `provider-signup-actions.ts:79-100` `tx.create` | ✅ |
| 4 | Session cookie | `provider-signup-actions.ts:151-159` `createSessionCookie` + cookies().set | ✅ |
| 5 | `/signup-provider` 라우트 + 폼 | `app/(auth)/signup-provider/page.tsx` + `ProviderSignupForm.tsx` | ✅ |
| 6 | Server Action `registerProvider` | `app/actions/provider-signup-actions.ts` 10-step | ✅ |
| 7 | 이메일 인증 (fire-and-forget) | `ProviderSignupForm.tsx:60` `void sendEmailVerification(...)` | ✅ |
| 8 | 약관 동의 체크박스 | `ProviderSignupForm.tsx:169-196` + zod `termsAgreed: z.literal(true)` | ✅ |
| 9 | `/login` '청명 가입' 링크 | `LoginForm.tsx:129-139` Link to `/signup-provider` | ✅ |
| 10 | Rate limit | `provider-signup-actions.ts:43-47` `checkAndIncrement('signup:'+email, 3, 3600000)` | ✅ |
| 11 | Welcome 이메일 | `lib/email/welcome-email.ts` | ✅ |
| 12 | admin 알림 이메일 | `lib/email/admin-alert-email.ts` + Firestore Console 링크 | ✅ |
| 13 | 전화번호 필드 | schema regex + users.contactPhone + providers.contactPhone | ✅ |
| 14 | `/provider/profile` stub | `app/provider/profile/page.tsx` Suspense + 환영 + TODO 3 + 등록정보 + 로그아웃 | ✅ |

---

## 2. Out-of-Scope Compliance (Plan §3.2) — 12/12 (100%)

| 항목 | Leak Check | Status |
|------|-----------|:------:|
| 소셜 로그인 | form에 social button 없음 | ✅ |
| 프로필 사진 업로드 | TODO disabled only | ✅ |
| 지역 다중 선택 | signup schema no regions; TX sets `regions: []` | ✅ |
| priceBook 편집 UI | TODO disabled only | ✅ |
| description·소개글 | TX sets `description: null` | ✅ |
| Before/After workCases | TODO disabled only | ✅ |
| admin 승인 flow | `verified: false`, rules enforce | ✅ |
| Upgrade flow | 별도 라우트 없음 | ✅ |
| 1:N 관계 | M2 duplicate check로 1:1 강제 | ✅ |
| reCAPTCHA / App Check 강제 | 호출 없음 | ✅ |
| 카테고리 복수 at signup | `primaryCategory` singular + TX `categories: [..]` | ✅ |
| 이메일 인증 required (blocking) | fire-and-forget, gating 없음 | ✅ |

---

## 3. Validation Fix Verification (design-validator 94%→Match 99%)

| ID | 이슈 | 반영 위치 | Status |
|----|------|-----------|:------:|
| **M1** | TX closure `globalThis` 안티패턴 | `provider-signup-actions.ts:56` `let providerId = ""` 외부 선언, `:77` TX 내부 assign | ✅ |
| **M2** | ALREADY_REGISTERED race (pre-TX check) | `:57-69` `tx.get(ownerQuery)` TX 내부 이동 | ✅ |
| **M3** | createdAt 덮어쓰기 | `:72-113` `tx.get(userRef)` + `!userSnap.exists` 조건부 set | ✅ |
| **M4** | users.update rules 미차단 | `firestore.rules:22-29` `['isCheonggwangPartner','partnerCleaningFrequency','email','roles','providerId','contactPhone']` blocked | ✅ |

---

## 4. Server Action 10-step Flow — 11/11 (100%)

| Step | 내용 | 위치 |
|------|------|------|
| 1 | Zod parse | `:33` `registerProviderInputSchema.parse` |
| 2 | `verifyIdToken(idToken, true)` (revocation check) | `:36` |
| 3 | Rate limit `signup:{email}` 3/1hr | `:43-47` |
| 4 | TX 중복 check `tx.get(ownerQuery)` | `:63-69` |
| 5a | `tx.create(providerRef, {...})` (verified/insured/isCheonggwangOwned false + categories=1) | `:79-100` |
| 5b | `tx.set(userRef, {...}, {merge:true})` roles arrayUnion | `:102-114` |
| 6 | `Promise.allSettled([welcome, adminAlert])` + warn log | `:120-148` |
| 7 | `createSessionCookie` + cookies().set | `:151-159` |
| 8 | `return {ok:true, data:{providerId}}` | `:162` |
| 9 | Zod issues → INVALID_INPUT / 기타 → toActionError | `:165-169` |
| 10 | Client `router.replace('/provider/profile')` | `ProviderSignupForm.tsx:78-79` |

OPERATOR_EMAIL 부재 시 admin alert 조건부 skip (line 123-134) — design에 명시적이진 않지만 graceful degradation, 이슈 아님.

---

## 5. Firestore Rules Correctness

| Rule | Check |
|------|-------|
| `providers.create` owner + isCheonggwangOwned/verified/insured false + categories 1~6 | ✅ `firestore.rules:74-80` |
| `providers.update/delete` false | ✅ |
| `users.update` 차단 필드: `['isCheonggwangPartner','partnerCleaningFrequency','email','roles','providerId','contactPhone']` | ✅ M4 fully applied |

---

## 6. Cache Components / Next.js 16

| Pattern | Status |
|---------|--------|
| `/provider/profile` cookies() in Suspense | ✅ |
| `/dashboard` role-aware router in Suspense | ✅ |
| `proxy.ts` function name `proxy` + matcher array | ✅ |
| Server Actions `'use server'` + ActionResult<T> | ✅ |

Build: 17 routes. /signup-provider static, /provider/profile Partial Prerender (streaming ProfileBody).

---

## 7. Reuse Accuracy — 10/10 (100%)

- `sendViaResend` + `requireEmailEnv` (lib/email/resend.ts) ✅
- `escapeHtml` (lib/email/quote-email-template.ts) ✅
- `QUOTE_CATEGORY_LABELS` (domain/quote-category.ts) ✅
- `AppError` + `toActionError` + `ActionResult` (lib/errors.ts) ✅
- `checkAndIncrement` 3-arg (lib/firebase/rate-limit.ts) ✅
- `createSessionCookie` + `SESSION_COOKIE_NAME` (lib/firebase/auth-admin.ts) ✅
- `verifySessionCookie` ✅
- `clientAuth` (lib/firebase/client.ts) ✅
- `adminAuth.verifyIdToken(idToken, true)` ✅
- `FieldValue.arrayUnion('provider')` ✅

중복 구현 없음. 전 사이클(promo-page, quote-request) 자산 전부 재활용.

---

## 8. Additive Improvements (설계 이상)

- **Role-aware `/dashboard` router** (design에 없음, 사용자 요청 반영) — 기존 promo-page legacy 대시보드를 제거하고 role 기반 redirect 추가. UX 개선.
- **OPERATOR_EMAIL 조건부 admin alert** — env 없을 때 welcome만 발송, signup 자체는 성공. graceful degradation.
- **`/provider/profile` self-heal redirect** — providerId 없거나 provider doc 없으면 /signup-provider로 유도. Design에서 v1.1b 이연된 self-heal 경량 구현.

---

## 9. Minor Gaps (2건, 비차단)

| # | 항목 | 위치 | 비고 |
|---|------|------|------|
| m1 | TX가 `isAvailable: true` 즉시 set | `provider-signup-actions.ts:96` | Design §3.2는 optional 명시 · v1.1b provider-dashboard 토글 예정. 현재 구현은 "기본 활성"으로 선제 set. 사용 의도 OK, Design v0.2에서 "signup 기본값" 명시 권장 |
| m2 | `.env.local` 4 env 미설정 | 배포 tier | RESEND_API_KEY, EMAIL_FROM, OPERATOR_EMAIL, APP_URL. `requireEmailEnv()` throw 가능. 사용자 수동 작업 대기 |

**코드 수정 불필요**. Design 문서 cosmetic 업데이트 + env setup만 남음.

---

## 10. Pre-production 체크리스트

| 항목 | Status |
|------|:------:|
| `firebase deploy --only firestore:rules` | ✅ 완료 (2026-04-20) |
| `next build` 17 routes 성공 | ✅ |
| `.env.local` RESEND_API_KEY, EMAIL_FROM, OPERATOR_EMAIL, APP_URL | ⏳ 사용자 작업 |
| Test 가입 smoke test (welcome + admin alert 전달 확인) | ⏳ env 완료 후 |
| Firebase Console 신규 Auth user + providers doc 확인 | ⏳ |

---

## 11. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report provider-signup`
3. → `/pdca archive provider-signup --summary`
4. → Master Plan v1.1 다음 feature: `quote-response` (청명 intake + 견적 작성)

---

## Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 1.0 | 2026-04-20 | Gap analysis 완료 · Match Rate 99% · Critical 0 · Major 0 · Minor 2 (informational only) · M1-M4 전부 반영 확인 | gap-detector |
