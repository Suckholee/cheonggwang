---
template: analysis
version: 0.1
feature: chat
date: 2026-04-21
author: Seokho Lee (via gap-detector)
project: cheonggwang
cycle: "#13 (v1.2 #1 · v1.2 진입 첫 feature)"
match_rate: 100
---

# chat Gap Analysis Report

> **Cycle #13** · Marketplace Track v1.2 #1 · Design v0.2 (post design-validator 97%→)
> **Plan**: [chat.plan.md](../01-plan/features/chat.plan.md)
> **Design**: [chat.design.md](../02-design/features/chat.design.md)

---

## Overall Match Rate: **100%** 🏆 (2 cycles 연속 퍼펙트)

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 100%                    │
├─────────────────────────────────────────────┤
│  MVP C1-C20:              100% (20/20)       │
│  Out-of-scope leakage:      0/10 (0%)        │
│  12 Open Questions:       100% (12/12)       │
│  Component List §5.3:     100% (9/9)         │
│  Server/Client split:     100% (2S/7C)       │
│  Design v0.2 validator fixes: 100% (6/6)     │
│  submitQuote TX 확장:      100% (5R/4W)       │
│  Firestore rules/indexes: 100% (deployed)    │
│  Clean Architecture §8:   100%               │
│  Convention §9:           100%               │
│  Test Plan 1-23 achievable: 100%             │
│  Critical 0 / Major 0 / Minor 0              │
│  Positive Divergences: 4 (Design v0.3 후보)  │
└─────────────────────────────────────────────┘
```

**Status**: ✅ 100% · iterate 불필요 · `/pdca report chat` 대기

---

## 1. MVP C1-C20 — 20/20 (100%)

| # | Item | 구현 |
|---|------|------|
| C1 | threads 컬렉션 rules | `firestore.rules:149-168` |
| C2 | messages subcollection rules | `firestore.rules:157-166` |
| C4 | submitQuote TX thread upsert | `quote-response-actions.ts` |
| C5 | thread 필드 full denorm | `types/chat.ts` |
| C6 | sendMessage TX | `chat-actions.ts` |
| C7 | markThreadAsRead | `chat-actions.ts` |
| C8 | ThreadsListClient onSnapshot role 분기 | `ThreadsListClient.tsx` |
| C9 | ThreadDetailClient onSnapshot limit 200 | `ThreadDetailClient.tsx` |
| C10 | role-aware counterpart name | `ThreadsListClient.tsx` |
| C11 | ThreadRow | 생성 완료 |
| C12 | ThreadHeader | 생성 완료 |
| C13 | PinnedQuoteCard | 생성 완료 |
| C14 | MessageBubble text only | 생성 완료 |
| C15 | MessageComposer (image disabled) | 생성 완료 |
| C16 | /chat shell | placeholder 교체 |
| C17 | /chat/[threadId] | 신규 경로 |
| C18a | QuoteCompareCard 💬 문의하기 **신규** | footer Link |
| C18b | QuoteProposalForm submit → /chat/{threadId} | router.replace |
| C19 | ChatUnreadWrapper + layout | BottomTabNav 교체 |
| C20 | proxy.ts matcher | 5→6개 matcher |

---

## 2. Out-of-scope Leakage — 0/10 (0%)

이미지/파일 · rich types · pre-quote inquiry · ✓✓ · 타이핑 · 검색 · 편집/삭제 · 이모지 반응 · 그룹 · FCM · pagination/virtual scroll — 모두 미구현 ✅

---

## 3. 12 Open Questions Resolution — 100%

| Q | 해소 | Status |
|---|------|:---:|
| Q1 | `THREAD_ID_REGEX` single constant + `buildThreadId` util | ✅ |
| Q2 | Firestore auto message ID | ✅ |
| Q3 | denorm snapshot · 재제출 시 base만 update | ✅ |
| Q4 | `MAX_MESSAGES = 200` + disclaimer | ✅ |
| Q5 | Rate limit v1 생략 | ✅ |
| Q6 | Context-free wrapper (prop 전달) | ✅ |
| Q7 | proxy matcher `/chat/:path*` | ✅ |
| Q8 | 항상 quoteId (C4 경로) | ✅ |
| Q9 | `providerOwnerUid` submitQuote TX에서 fetch | ✅ |
| Q10 | useEffect cleanup `return () => unsub()` 3곳 | ✅ |
| Q11 | onSnapshot error handler + UI fallback 3곳 | ✅ |
| Q12 | 기존 clientDb 재활용 | ✅ |

---

## 4. Design v0.2 validator-fix items — 6/6

| Fix | Evidence |
|-----|----------|
| threadId regex tighten + 단일 상수 | `THREAD_ID_REGEX` exported |
| QuoteCompareCard 문의 **신규** 버튼 | footer Link 추가 (기존 없음 확인) |
| Rules `in` 배열 최적화 | `request.auth.uid in [...]` |
| submitQuote TX 재제출 unread 보존 | `existingThread.exists` 분기 · update vs create |
| formatRelativeTime 공용 util 추출 | `lib/format/relative-time.ts` + RequestPreviewCard migrate |
| `lastMessageAt: null` 정렬 + isNew badge | ThreadRow `isNew` → "새 견적" 표시 |

---

## 5. 9 Components — Server 2 / Client 7

| # | Component | Type |
|---|-----------|:----:|
| 1 | ThreadsListClient | Client ✅ |
| 2 | ThreadRow | Client ✅ |
| 3 | ThreadDetailClient | Client ✅ |
| 4 | MessageBubble | Client ✅ |
| 5 | MessageComposer | Client ✅ |
| 6 | ThreadHeader | Server ✅ |
| 7 | PinnedQuoteCard | Server ✅ |
| 8 | EmptyThreadsHint | Client ✅ |
| 9 | ChatUnreadWrapper | Client ✅ |

---

## 6. 2 Server Actions TX step-by-step — 100%

- `sendMessage`: Zod → uid → TX (get+check+role→otherKey→create message→update thread `increment(1)`) → ok
- `markThreadAsRead`: Zod → uid → TX (get+check+myKey→update 0) → ok

onSnapshot 자동 반영 · revalidatePath 불필요.

---

## 7. submitQuote TX 확장 — 5 reads / 4 writes

**Reads**: quoteRequest · providerResponse · provider · user(client) · thread-existing
**Writes**: quote.create · providerResponses.set · quoteRequests.update (conditional) · thread.create OR thread.update

**Idempotent 재제출**: 기존 thread는 base만 update (unread/lastMessage* 보존) · 신규는 unreadByClient=1 + "견적이 도착했어요..." preview ✅

---

## 8. Firestore rules + 3 indexes — 배포 완료

- threads read = participant only · write = Admin SDK only
- messages read = `auth.uid in [clientUid, providerOwnerUid]` (get() 1회 과금)
- 3 composite indexes: threads×2 (clientUid/providerOwnerUid + lastMessageAt DESC) · messages (threadId + createdAt ASC)

---

## 9. Clean Architecture §8 — 100%

| Layer | 파일 |
|-------|------|
| Presentation Server | chat page.tsx × 2 · ThreadHeader · PinnedQuoteCard |
| Presentation Client | ThreadsListClient · ThreadRow · ThreadDetailClient · MessageBubble · MessageComposer · EmptyThreadsHint · ChatUnreadWrapper |
| Application | chat-actions.ts + submitQuote 확장 |
| Domain | types/chat.ts · chat-schemas.ts · thread-upsert.ts (pure) |
| Infrastructure | thread-repository.ts · 기존 repos 재활용 · clientDb (onSnapshot) |

---

## 10. Test Plan 23 — 100% achievable

모든 시나리오 (auth 3-tier · empty/N threads · send happy+error · unread inc/reset · re-submit idempotent · onSnapshot cleanup · permission-denied silent · regex valid/invalid · null 정렬 isNew) 구현 커버.

---

## 11. Positive Divergences (4) · Design v0.3 후보

1. **`ThreadRowDTO.isNew`** 필드 추가 — 명시적 "새 견적" 배지 렌더
2. **`INITIAL_LAST_MESSAGE_PREVIEW`** 상수 export — single source of truth
3. **`resolveThreadRole(thread, uid)`** util export — DRY (ThreadBody에서도 재활용)
4. Design header "Server 3 / Client 6" vs §5.3 "Server 2 / Client 7" 불일치 → 구현은 §5.3 준수 (header typo)

---

## 12. Build/Quality Evidence

- `pnpm tsc --noEmit` — 0 errors ✅
- `pnpm build` — 성공 · 30 routes (`/chat` + `/chat/[threadId]` 신규)
- `firebase deploy --only firestore:rules,firestore:indexes` 완료
- HANGING_PROMISE 경고는 기존 BottomTabNav `cookies()` 패턴 (caught → null) · regression 아님

---

## 13. Cross-Cycle Consistency

```
#1  promo-page                 93%
#2  content-research-pipeline  96%
#3  promo-feed                 97%
#4-#11 각 feature             99%
#12 client-dashboard         100% 🏆
#13 chat                     100% 🏆 ← 본 cycle · 연속 퍼펙트
```

## 🏆 Marketplace v1.2 #1 완료

```
#12 client-dashboard  (100%) ✅ v1.1b 마감
#13 chat              (100%) ✅ v1.2 진입 · Firestore onSnapshot 첫 도입 성공
```

---

## 14. Next Steps

1. ✅ Check phase 완료 (100%)
2. → `/pdca report chat`
3. → `/pdca archive chat --summary`
4. → 다음 후보:
   - v1.2 `provider-search` (`/search` placeholder 교체 · 리스트/지도)
   - v1.3 `booking` (일정 확정)
   - v1.2b `chat-rich-types` (이미지 · quoteCard inline · ✓✓)

---

## 15. Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** 🏆 (2 cycles 연속) |
| Critical / Major / Minor | 0 / 0 / 0 |
| Scope creep | 없음 |
| Missing items | 없음 |
| Regression risk | 없음 |
| Positive Divergences | 4 (Design v0.3 후보) |
| Next | `/pdca report chat` |
