---
template: analysis
version: 1.0
feature: quote-response
date: 2026-04-21
author: gap-detector (bkit v1.5.8)
---

# quote-response Gap Analysis

> **Project**: cheonggwang (firebase-next-app v0.1.0) · Marketplace Track v1.1 2번째 feature (PDCA cycle #6)
> **Plan**: [quote-response.plan.md](../01-plan/features/quote-response.plan.md) (v0.1 · 13 MVP)
> **Design**: [quote-response.design.md](../02-design/features/quote-response.design.md) (v0.1 · validator 95% GO)
> **Master Plan**: [marketplace-master-plan.md](../00-vision/marketplace-master-plan.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP Completeness:   100%  (13/13)           │
│  Out-of-Scope 준수:  100%  (12/12)           │
│  Validator M2·M4:    100%  (2/2)             │
│  15-check verify:    100%  (15/15)           │
│  Minor deviations:     3  (모두 무영향 doc-polish) │
└─────────────────────────────────────────────┘
```

**Critical**: 0 / **Major**: 0 / **Minor**: 3 (zero runtime impact)
**Status**: ✅ Match Rate >= 90% · no `[Act]` iteration · `/pdca report` 대기

---

## 1. MVP Item Coverage (Plan §3.1) — 13/13 (100%)

| # | 항목 | 구현 위치 |
|---|------|-----------|
| 1 | `/provider/requests` Tinder-like triage | `app/provider/requests/page.tsx` + `TriageClient.tsx` |
| 2 | Pagination 1/N | `TriageClient` currentIndex + 라벨 |
| 3 | Figma 요청 카드 | `RequestCard.tsx` (카테고리 칩·사진 grid·4-grid details·note·priceRange·distance) |
| 4 | 3-action bar | `TriageClient` fixed bottom, 문의 disabled |
| 5 | passRequest Server Action | `quote-response-actions.ts:44` 5-step |
| 6 | `/provider/requests/[id]/propose` | `app/provider/requests/[id]/propose/page.tsx` async params |
| 7 | 항목 분해 UI + 실시간 합계 | `QuoteProposalForm.tsx` useFieldArray + reduce |
| 8 | submitQuote TX 3-write | `quote-response-actions.ts:74` 10-step + `runTransaction` |
| 9 | quotes 컬렉션 신규 | `types/quote.ts` + `quote-repository.ts` |
| 10 | providerResponses composite id | `types/provider-response.ts:buildProviderResponseId` |
| 11 | QuoteStatus 6-state | `domain/quote-status.ts` |
| 12 | roomType + "32평·투룸" 표시 | `domain/room-type.ts` + `RequestCard` sizeLabel |
| 13 | `/provider/profile` 링크 | profile page:116 |

---

## 2. Out-of-Scope Compliance (Plan §3.2) — 12/12 (100%)

| 항목 | Leak check |
|------|-----------|
| 문의(chat) 동작 | TriageClient.handleAsk → toast "v1.2" + disabled ✅ |
| 견적 수정·철회 | quotes.update: false · UI 없음 ✅ |
| 의뢰인 이메일 알림 | submitQuote에 Resend 호출 없음 ✅ |
| 표준 견적 범위 집계 배치 | RequestCard는 provider.priceBook 기반 단순 계산 ✅ |
| 지도 km 거리 | approxDistanceLabel = 동네/같은시/다른지역 ✅ |
| Auto-draft / 템플릿 / Preview | 없음 ✅ |
| 매칭 점수 정렬 | orderBy createdAt desc 단순 ✅ |
| 의뢰인 실시간 알림 / 경쟁 청명 live count | 없음 ✅ |
| 화려한 빈 상태 | EmptyQueue 🎉+텍스트만 ✅ |

---

## 3. Validator Fix Verification

| ID | 항목 | 위치 | Status |
|----|------|------|:------:|
| M1 | Design positive (rules `get()` upgrade) | — (doc) | ✅ |
| **M2** | `quoteRequests.update: if false` 명시 | `firestore.rules:95` 주석 포함 | ✅ |
| M3 | 10-step labeling cosmetic | — (doc) | ✅ |
| **M4** | TX create body 12 필드 전체 명시 | `quote-response-actions.ts:131-149` + server totalAmount recalc `:92-95` | ✅ |
| M5 | Synthetic test tag | — (doc) | ✅ |

---

## 4. Server Action 10-step (submitQuote) Flow

| Step | 위치 |
|------|------|
| 1 Zod parse | `:77` `submitQuoteInputSchema.parse` |
| 2 verifySessionCookie + providerId guard | `:82` `requireProviderContext()` |
| 3 Rate limit `quote:{providerId}` 10/min | `:85-89` |
| 4 Server totalAmount 재계산 | `:92-95` `items.reduce` |
| 5 TX get quoteRequest + status guard | `:107-118` `tx.get(reqRef)` + `isRespondable` |
| 6 TX get providerResponse + already-quoted guard | `:125-128` `tx.get(prRef)` |
| 7 TX create quotes + set providerResponses + update quoteRequest | `:131-170` 3-write (status 전이 idempotent) |
| 8 ActionResult ok | `:173` |
| 9 Zod issues → INVALID_INPUT · AppError → toActionError | `:175-179` |
| 10 Client `router.replace('/provider/requests')` | `QuoteProposalForm:91-92` |

---

## 5. TX atomicity · race-safe

- `tx.get(reqRef)` + `tx.get(prRef)` 모두 TX 내부 실행 (race-safe, provider-signup M2 패턴 일관)
- providerId guard는 TX 바깥에서 `requireProviderContext()` (Admin SDK 직접 users 조회 — race 대상 아님)
- Status 전이: `currentStatus === 'submitted'` 일 때만 update → 다른 청명이 먼저 quote한 경우 status는 이미 'quoted', no-op

---

## 6. Role Guard 2-tier 검증

| Layer | 위치 |
|-------|------|
| proxy.ts matcher | `proxy.ts:36` `/provider/:path*` (provider-signup 사이클에서 추가) |
| Page verifySessionCookie | `requests/page.tsx:46` try/catch + `/login?next=` redirect |
| Page providerId guard | `requests/page.tsx:52` `redirect('/signup-provider')` if absent |
| Page provider doc existence | `requests/page.tsx:57` `providerRepository.get(providerId)` null → redirect |

---

## 7. Cache Components · Next.js 16

| Page | cookies() in Suspense |
|------|:---:|
| `/provider/requests` | ✅ `TriageBody` async 내부, `<Suspense fallback={<TriageSkeleton/>}>` |
| `/provider/requests/[id]/propose` | ✅ `ProposeBody` async 내부, Suspense 감쌈 |

async params 패턴 준수: `params: Promise<Params>` → `await props.params`.

Build: 19 routes (Partial Prerender ◐).

---

## 8. Minor Gaps (3건, 모두 무영향)

| # | 항목 | Design | Impl | Impact |
|---|------|--------|------|--------|
| G1 | `proposalFormSchema.requestId` 필드 | Design §4.3에 포함 | 구현은 request를 prop으로 전달, form schema에서 제외 | 무해 — server schema가 requestId 검증 |
| G2 | RequestCard 사진 slice | Design "1-3장" | `slice(0, 2)` 2장 grid | Figma 2장 grid 일치 · 합리적 |
| G3 | `providerResponseRepository.upsertQuoted` 메서드 | Design §4.4 명시 | 부재 — TX 내부 `tx.set` 직접 | **개선** (TX 원자성 강화, public API 축소) |

**코드 수정 불필요**. Design 문서 cosmetic 정정만.

---

## 9. Reuse Accuracy — 10/10 (100%)

- `AppError` + `ActionResult` + `actionError` + `toActionError` (lib/errors.ts)
- `checkAndIncrement` 3-arg (lib/firebase/rate-limit.ts)
- `userRepository`, `providerRepository`, `quoteRequestRepository`
- `verifySessionCookie` + `SESSION_COOKIE_NAME` (lib/firebase/auth-admin.ts)
- `adminDb` (lib/firebase/admin.ts)
- `FieldValue.serverTimestamp`, `Timestamp.fromDate`
- `QUOTE_CATEGORY_LABELS`, `QUOTE_CATEGORY_EMOJIS` (domain/quote-category.ts)
- `lucide-react` icons (Calendar, MapPin, Home, Users, X, MessageCircle, Check, Plus, Trash2)

---

## 10. Deployment Status

| 항목 | Status |
|------|:------:|
| `next build` — 19 routes | ✅ |
| `firebase deploy --only firestore:rules,firestore:indexes` | ✅ 2026-04-21 |
| Firestore 인덱스 빌드 완료 (3 신규) | ⏳ 1~3분 대기 |
| 실제 smoke test (청명 가입 → 요청 triage → 견적 제출) | ⏳ 사용자 manual |

---

## 11. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report quote-response`
3. → `/pdca archive quote-response --summary`
4. → Master Plan v1.1 3번째 feature: `received-quotes` (의뢰인의 받은견적 탭 · 하단 5탭 중 3번째 자리)

---

## Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 1.0 | 2026-04-21 | Gap analysis 완료 · Match Rate 99% · Critical 0 · Major 0 · Minor 3 (무영향 doc-polish) · M2/M4 fix 반영 확인 · 15-check 전부 통과 | gap-detector |
