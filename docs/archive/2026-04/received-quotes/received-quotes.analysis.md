---
template: analysis
version: 1.0
feature: received-quotes
date: 2026-04-21
author: gap-detector (bkit v1.5.8)
---

# received-quotes Gap Analysis

> **Project**: cheonggwang (v0.1.0) · Marketplace Track v1.1 3번째 feature (PDCA cycle #7)
> **Plan**: [received-quotes.plan.md](../01-plan/features/received-quotes.plan.md) (v0.1, 12 MVP)
> **Design**: [received-quotes.design.md](../02-design/features/received-quotes.design.md) (v0.1, validator 97% GO)
> **Master Plan**: [marketplace-master-plan.md](../00-vision/marketplace-master-plan.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP Completeness:   100%  (12/12)           │
│  Out-of-Scope 누수:    0%  (0/10)            │
│  Design §4 API:      100%  (11/11)           │
│  Design §5 UI:       100%  (7/7)             │
│  Design §10 Files:   100%  (10/10)           │
│  Verify 15-check:    100%  (15/15)           │
│  Architecture·Convention·Security: 100%     │
│  Minor: 1 (formatWon 중복 · v1.2 backlog)   │
└─────────────────────────────────────────────┘
```

**Critical**: 0 / **Major**: 0 / **Minor**: 1 (informational)
**Status**: ✅ >= 90% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP 12 Items — 12/12 (100%)

| # | 항목 | 구현 위치 |
|---|------|-----------|
| 1 | `/received` Server shell + Suspense | `app/received/page.tsx` |
| 2 | 진행중/완료 2-tab URL state | `?tab=active\|completed` + `TabBar.tsx` |
| 3 | RequestStatusCard (진행중) | `components/received/RequestStatusCard.tsx` |
| 4 | CompletedCard (완료) | `components/received/CompletedCard.tsx` |
| 5 | QuoteStepper 4단계 + cancelled=-1 | `QuoteStepper.tsx` + `STEPPER_LABELS` |
| 6 | 가격 범위 min/max 집계 | `page.tsx:83-91` |
| 7 | `/received/{requestId}` 상세 비교 | `[requestId]/page.tsx` |
| 8 | QuoteCompareCard + AcceptButton | `QuoteCompareCard.tsx` Client + toast + router.refresh |
| 9 | acceptQuote Server Action 9-step TX | `quote-response-actions.ts:197-265` |
| 10 | 청명 stub `/providers/{id}` | `providers/[providerId]/page.tsx` |
| 11 | TodayCard → /received Link | `TodayCard.tsx:50-71` (M1 fix: latestCategory drop) |
| 12 | 빈 상태 empty state | `ReceivedEmptyState.tsx` |

---

## 2. Out-of-scope 누수 — 0/10 (0%)

- 거절(reject) UI ❌ · 거래완료 수동 버튼 ❌ · 채팅 진입 ❌ · 리뷰 실동작 ❌ · onSnapshot ❌ · provider-profile 풀 ❌ · PDF ❌ · 필터·정렬 ❌ · 하단 5탭 ❌ · 자동 rejected ❌

---

## 3. Validator Fix Verification

| ID | 항목 | 반영 |
|----|------|:---:|
| **M1** TodayCard latestCategory prop drop | signature 변경 + Link wrapping | ✅ |
| **M2** TabBar counts placeholder | activeCount/completedCount 명시 props | ✅ |
| **M3** proxy.ts matcher 변경 | `/received/:path*` + isProtected 추가 | ✅ |

---

## 4. acceptQuote 9-step TX Flow

| Step | 내용 |
|------|------|
| 1 | `acceptQuoteInputSchema.parse` (quoteId min 10) |
| 2 | `verifySessionCookie` → clientUid |
| 3 | TX: `tx.get(quoteRef)` → status='sent' guard (ALREADY_ACCEPTED) |
| 4 | TX: `tx.get(requestRef)` → clientUid 일치 (FORBIDDEN) + canAcceptQuote (INVALID_STATE) |
| 5 | TX: `tx.update(quoteRef, {status:'accepted', acceptedAt})` |
| 6 | TX: `tx.update(requestRef, {status:'negotiating'})` |
| 7 | post-TX: `providerRepository.get(providerId)` for companyName |
| 8 | return `{ok:true, data:{providerId, companyName}}` |
| 9 | 에러 매핑 (Zod→INVALID_INPUT, AppError→toActionError, 기타→INTERNAL_ERROR) |

**Race-safe**: tx.get × 2 inside TX. 두 번째 accept는 `quote.status !== 'sent'` guard로 차단.

---

## 5. 15-Check Verify

| # | 항목 | Status |
|---|------|:---:|
| 1 | Plan §3.1 12 MVP traceability | ✅ 12/12 |
| 2 | Plan §3.2 10 out-of-scope 누수 | ✅ 0/10 |
| 3 | acceptQuote 9-step flow | ✅ |
| 4 | Race condition handling (tx.get × 2) | ✅ |
| 5 | Owner guard 2-tier (Server Action + page notFound) | ✅ |
| 6 | listByRequest backward compat | ✅ |
| 7 | 2-tab URL state filter (ACTIVE/COMPLETED_STATUSES) | ✅ |
| 8 | statusToStepIndex cancelled=-1 | ✅ |
| 9 | Cache Components compliance (cookies in Suspense) | ✅ |
| 10 | AppErrorCode naming (ALREADY_ACCEPTED) | ✅ |
| 11 | Validator M1/M2/M3 반영 | ✅ |
| 12 | QuoteCompareCard sentAt asc (FIFO) | ✅ |
| 13 | TodayCard Link wrapping + badge 유지 | ✅ |
| 14 | proxy.ts matcher + isProtected | ✅ |
| 15 | Figma fidelity (2-tab · 스텝퍼 · 가격 범위 · 비교 · 청명 배지 · 평점 완료) | ✅ |

---

## 6. Security

| 항목 | 검증 |
|------|:---:|
| Owner guard 2-tier (Server Action + page) | ✅ |
| Admin SDK bypass · Firestore rules unchanged | ✅ |
| TX atomicity (tx.get × 2 + tx.update × 2) | ✅ |
| Zod input validation | ✅ |
| notFound vs error (정보 누설 없음) | ✅ |
| proxy.ts redirect `/login?next=...` | ✅ |

---

## 7. Minor Gap — 1건 (informational · v1.2 backlog)

| # | 항목 | 위치 | Impact |
|---|------|------|--------|
| m1 | `formatWon` util 중복 | RequestStatusCard / CompletedCard / QuoteCompareCard 3 파일 | 무해 — v1.2 chat 카드에도 가격 표시 예정이므로 `lib/format.ts` 추출 권장 |

**코드 수정 불필요**. v1.2에서 formatWon 통합 시 함께 정리.

---

## 8. Build & Deploy Status

- ✅ `next build` — 22 routes (19 → 22)
- ✅ Firestore rules unchanged (재배포 불필요)
- ✅ proxy.ts matcher `/received/:path*` 추가
- ⏳ Smoke test: 사용자 수동

---

## 9. Marketplace v1.1 Loop Closure ✨

```
v1.1 마켓 루프 완결 — Cycle #2 ~ #7 전부 99%+ 유지:
  #2 quote-request  (99%) → 의뢰인 제출 ✅
  #5 provider-signup (99%) → 청명 온보딩 ✅
  #6 quote-response (99%) → 청명 응답 ✅
  #7 received-quotes (99%) → 의뢰인 비교·수락 ← 본 사이클 ✨

End-to-end: 제출 → 청명 응답 → 의뢰인 수락 → negotiating 전이
다음 의존: v1.2 chat (negotiating 상태에서 chatThreads 생성)
```

---

## 10. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report received-quotes` (v1.1 루프 폐쇄 마일스톤)
3. → `/pdca archive received-quotes --summary`
4. → 다음 feature 결정:
   - v1.1b `bottom-tab-nav` (공통 5탭 shell — Figma 의뢰인 홈 완성)
   - v1.1b `provider-profile` reader (청명 상세 풀 페이지 — /providers/{id} stub 대체)
   - v1.1b `provider-dashboard` (청명 홈 대시보드)
   - v1.1b `client-dashboard` (평균가·Top5 shell)
   - v1.2 `chat` (1:1 메시징 + 거래 협의)

---

## Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 1.0 | 2026-04-21 | Gap analysis 완료 · Match Rate 99% · Critical 0 · Major 0 · Minor 1 (formatWon v1.2) · v1.1 마켓 루프 폐쇄 마일스톤 | gap-detector |
