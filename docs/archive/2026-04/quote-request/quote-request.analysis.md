---
template: analysis
version: 1.0
feature: quote-request
date: 2026-04-20
author: gap-detector (bkit v1.5.8)
---

# quote-request Gap Analysis

> **Project**: cheonggwang (firebase-next-app v0.1.0) · Marketplace Track v1 (첫 feature)
> **Plan**: [quote-request.plan.md](../01-plan/features/quote-request.plan.md) (v0.1, 11 MVP)
> **Design**: [quote-request.design.md](../02-design/features/quote-request.design.md) (v1.2, §5.1 v0.2 home shell)
> **Vision**: [marketplace.md](../00-vision/marketplace.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                     │
├─────────────────────────────────────────────┤
│  Design Match:        100%                   │
│  Architecture:        100%                   │
│  Convention:          100%                   │
│  Scope Discipline:    100%                   │
│  Minor Deviations:      3 (design-compatible)│
└─────────────────────────────────────────────┘
```

**Critical**: 0 / **Major**: 0 / **Minor**: 3
**Status**: ✅ Match Rate >= 90% → **no `[Act]` iteration required. Proceed to `/pdca report`.**

---

## 1. MVP Item Coverage (Plan §3.1) — 11/11 (100%)

| # | Plan Item | Implementation | Status |
|---|-----------|----------------|--------|
| 1 | `/` 재배치 (promo-feed → `/discover`) | `src/app/discover/page.tsx` FeedPage 이전 · `/` 교체 | ✅ |
| 2 | 새 `/` 홈 shell | `src/app/page.tsx`, `TopBar.tsx`, `TodayCard.tsx`, `CategoryGrid.tsx` | ✅ |
| 3 | `/quote/new?category=X` 폼 | `src/app/quote/new/page.tsx` + `QuoteForm.tsx` | ✅ |
| 4 | `quoteRequests/{id}` + 규칙 | `firestore.rules:71-79` | ✅ |
| 5 | `providers/{id}` + 규칙 | `firestore.rules:63-66` | ✅ |
| 6 | 첫 청명 시드 스크립트 | `scripts/seed-first-provider.mjs` | ✅ (⏳ 배포 후 실행 대기) |
| 7 | `users.roles` 필드 + 'client' 자동 부여 | `types/page.ts:92-102`, `user-roles.ts:21-23` | ✅ |
| 8 | `submitQuoteRequest` Server Action + Zod + Resend | `app/actions/quote-actions.ts` 9-step 완전 구현 | ✅ |
| 9 | `/quote/thanks?id=...` | `app/quote/thanks/page.tsx` | ✅ |
| 10 | Firestore 인덱스 2개 + Storage 규칙 | `firestore.indexes.json:47-62`, `storage.rules:13-19` | ✅ (deploy 완료) |
| 11 | Home dashboard shell (TodayCard) | `components/quote/TodayCard.tsx` | ✅ |

---

## 2. Out-of-Scope Discipline (Plan §3.2) — 100%

모든 scoped-out 항목 미구현 확인:
- "새 견적 N건 도착" · 방문 일정 · 결제 요청 섹션 → TodayCard shell에 없음
- 하단 5탭 → `app/page.tsx` footer에 `/discover` 링크만
- 내 견적 상세 페이지 → 부재 (count만 표시)
- 지역 드롭다운 / 알림 벨 목록 → `disabled` placeholder
- 청명 응답 UI · 평균가 · Top 5 · Before/After · 결제 · 리뷰 · 채팅 · 카카오 로그인 · App Check 강제 · LLM 매칭 → 전부 부재

---

## 3. Validation Fix Verification — 6/6 (100%)

| ID | Fix | Verified In | Status |
|----|-----|-------------|--------|
| M1 | `checkAndIncrement` 1-arg backward-compat | `rate-limit.ts:25-32` — `limit?`·`windowMs?` optional. `api/generate/route.ts:34` 기존 `checkAndIncrement(uid)` 그대로 | ✅ |
| M2 | `PhotoUpload` `pathPrefix` prop | `PhotoUpload.tsx:19-27` prop 선언 + default `"photos"`, `QuoteForm.tsx:190` `pathPrefix="quote-photos"` 전달 | ✅ |
| m1 | Zod enum cast `QuoteCategory` 타입 | `quote-schemas.ts:17-19` `as unknown as [QuoteCategory, ...QuoteCategory[]]` | ✅ |
| m2 | `preferredDate` string→Date 변환 | `quote-actions.ts:57-59` + `quote-request-repository.ts:61-63` `Timestamp.fromDate` | ✅ |
| m3 | Firestore rules defense-in-depth | `firestore.rules:68-79` + 주석 "Admin SDK는 rules bypass..." | ✅ |
| m4 | `escapeHtml` requestId 포함 전체 | `quote-email-template.ts:80` 푸터 `요청 ID: ${escapeHtml(request.id)}` | ✅ |

---

## 4. Server Action 9-step Flow — 9/9 (100%)

| Step | Design | Impl | Match |
|------|--------|------|-------|
| 1 | verifySessionCookie | `quote-actions.ts:38` | ✅ |
| 2 | rateLimit 5/hour | `:41-45` `checkAndIncrement('quote:'+uid, 5, 3600000)` | ✅ |
| 3 | Zod parse | `:48` | ✅ |
| 4 | ensureClientRole | `:51` → `user-roles.ts:18` `arrayUnion('client')` | ✅ |
| 5 | listByCategory | `:54` | ✅ |
| 6 | quoteRequestRepository.create | `:61-72` (pre-issued requestId) | ✅ |
| 7 | Promise.allSettled email | `:91-113` | ✅ |
| 8 | update notifiedProviderIds | `:116-120` | ✅ |
| 9 | ActionResult 반환 | `:123` | ✅ |

---

## 5. Cache Components / Next.js 16 Compliance — 3/3 (100%)

| Route | `cookies()` 위치 | Suspense 경계 |
|-------|-----------------|---------------|
| `/` | `TodayCardSlot` | `page.tsx:23-25` ✅ |
| `/quote/new` | `AuthedQuoteForm` | `new/page.tsx:45-47` ✅ |
| `/quote/thanks` | `ThanksBody` | `thanks/page.tsx:23-25` ✅ |

Build 결과: 13 routes, `/` = ◐ Partial Prerender with streaming TodayCard.

---

## 6. Firestore Rules Correctness — 7/7 (100%)

| Rule | Match |
|------|-------|
| `providers` read/write (public/admin) | ✅ |
| `quoteRequests` read (owner only) | ✅ |
| `quoteRequests` create (auth+uid+status check) | ✅ |
| `quoteRequests` update/delete (blocked) | ✅ |
| Storage `quote-photos/{uid}/{requestId}/` | ✅ |

---

## 7. Clean Architecture / Convention — 100%

| Layer | Match |
|-------|-------|
| Presentation / Application / Domain / Infrastructure 경계 | ✅ |
| 파일명·함수·상수 네이밍 | ✅ |
| Import 순서 | ✅ |
| `server-only` 보호 | ✅ |

---

## 8. Minor Gaps (3건 — 모두 design-compatible)

| ID | 항목 | 위치 | 내용 | 조치 |
|----|------|------|------|------|
| MN-1 | 비로그인 홈 TodayCard | `app/page.tsx:46-74` | Design §5.1은 "숨김"이나 실제는 로그인 유도 CTA 카드로 치환 (UX 개선) | Design 문서 업데이트 |
| MN-2 | CategoryGrid 파스텔 톤 | `components/quote/CategoryGrid.tsx:22-52` | Design 예시 `{color}-100`, 구현 `{color}-50` + dark mode variant | Design 문서 업데이트 |
| MN-3 | TodayCard 부가 정보 | `TodayCard.tsx:62-77` | "24시간 내 연락" 보조 문구 + red count badge 추가 | Design 문서 업데이트 |

**코드 수정 필요 없음** — 전부 design doc 쪽 미세 업데이트 항목.

---

## 9. Pre-Production Checklist (운영자 / 코드 외)

- [ ] `.env.local`에 `RESEND_API_KEY` 추가 (content-research-pipeline 값 재사용 가능)
- [ ] `.env.local`에 `EMAIL_FROM=quote@{verified-domain}` 설정
- [ ] `FIREBASE_ADMIN_SA_BASE64=... node scripts/seed-first-provider.mjs` 실행
- [x] `firebase deploy --only firestore:rules,firestore:indexes,storage` (2026-04-20 완료)
- [ ] Firestore 콘솔에서 `rateLimits.ttlExpiresAt` TTL 정책 활성화 확인

---

## 10. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report quote-request`
3. → `/pdca archive quote-request --summary`
4. → 다음 feature: `client-dashboard` (평균가·Top5·청명 카드 섹션) · `provider-search` (청명찾기 리스트/지도) — 사용자 Figma 공유 기반

---

## Version History

| Ver | Date | 변경 내용 | 작성자 |
|-----|------|-----------|-------|
| 1.0 | 2026-04-20 | Gap analysis 완료 · Match Rate 99% · Critical 0 · Major 0 · Minor 3 (design-doc 업데이트 권장) | gap-detector |
