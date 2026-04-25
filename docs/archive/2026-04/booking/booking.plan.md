---
template: plan-plus
version: 0.1
feature: booking
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 일정 확정 + 작업 관리 (booking)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #15 (**v1.3 #1 · v1.3 진입 · 마켓 루프 종결 feature**)
> 선행: provider-search (v1.2 #2 · Match 100% archived · 3 cycles 연속 퍼펙트)
> 다음: `/pdca design booking`

---

## 1. User Intent Discovery

### 1.1 배경
v1.2 `chat` + `provider-search` 완료로 **탐색 + 협의** 축 구축. 이제 **일정 확정 단계 부재**가 마지막 병목. quote 수락 후 chat에서 세부 협의는 가능하나, **실제 방문 날짜 확정 · 청명의 작업 일정 관리 수단 없음**. 청명 "작업" 탭 placeholder 상태. 본 feature가 마켓 루프를 **"제출 → 응답 → 비교 → 수락 → 협의 → 일정 확정"** 으로 완성.

### 1.2 핵심 목적 — 일정 확정 + 작업 관리 (Q1=A)
**chat에서 청명이 일정 제시 → booking 문서 생성 → 양쪽 view**:
- chat thread: BookingStatusBanner · 시스템 메시지 · Header 배지
- 청명 `/provider/works`: 시간순 예정 일정 목록 (오늘/내일/이번주/지난)
- 고객 `/received/{requestId}`: QuoteCompareCard에 "✅ 일정 확정 · 4/22(월) 14:00" 배지

### 1.3 Booking 생성 방식 (Q2=A · 1-step)
- **청명 one-click**: chat thread의 "📅 일정 확정" 버튼 → Modal → `confirmBooking` Server Action
- 2-step 협의/수락은 v1.3b YAGNI
- v1 상태 `confirmed` 단일 · v1.3b `in_progress / completed / cancelled` 전이

### 1.4 View Structure (Phase 2=A · chat-centric)
- chat thread 상단 **BookingStatusBanner** (booking 있을 때)
- `/provider/works` placeholder 교체 · **single time-ordered list** + **4 group headers** (today/tomorrow/thisWeek/past)
- `/received/{requestId}` QuoteCompareCard **BookingBadge** 주입
- **chat에서만 생성** · standalone booking page v1 제외

### 1.5 MVP 경계
- ✅ `bookings/{id}` 컬렉션 + denormalized 필드 (companyName · clientDisplayName · category · regionLabel · totalAmount)
- ✅ `confirmBooking` Server Action TX (3 reads / 4 writes)
- ✅ chat thread UI: "📅 일정 확정" 버튼 (청명만) + BookingConfirmModal (datetime-local + memo)
- ✅ chat system message (`type: 'system'`) · MessageBubble 중앙 정렬 gray 렌더링
- ✅ BookingStatusBanner (chat 상단 · booking 있을 때)
- ✅ ThreadHeader booking 배지 (quote 금액 옆 "✅ 4/22(월)")
- ✅ `/provider/works` placeholder 교체 · BookingListSection group headers + BookingCard
- ✅ WorksEmptyState
- ✅ `/received/{requestId}` QuoteCompareCard BookingBadge 주입
- ✅ `bookingRepository` 신규 (create · listForProvider · findByQuoteId · getWithParticipantCheck · existsForQuote)
- ✅ Firestore rules bookings · indexes 1개 추가 (`providerId + scheduledAt DESC`)
- ✅ messages type 확장 `"text" | "system"` · 기존 호환
- ❌ 상태 전이 (in_progress / completed / cancelled) — v1.3b
- ❌ 체크인/체크아웃 GPS · 방문 타임스탬프 — v1.3b
- ❌ 작업 완료 보고서 · 사진 — v1.3b
- ❌ 일정 변경 · 2-step 협의 워크플로 — v1.3b
- ❌ 캘린더 view · month/week — v2+
- ❌ 이메일/push 알림 — v2+
- ❌ 반복 일정 (구독 청소) — v2+
- ❌ payment 연동 — v2
- ❌ review request 자동화 — v2

### 1.6 성공 기준
- 청명 chat thread에서 일정 확정 클릭 → bookings 생성 <500ms
- 고객 쪽 onSnapshot으로 chat 시스템 메시지 + BookingStatusBanner 500ms 이내 반영
- `/provider/works` bucket 정확 (오늘/내일/이번주/지난)
- `/received/{requestId}` 배지 자동 업데이트 (revalidatePath 또는 재방문 시)
- 비 participant 접근 차단 (rules + Server Action 2중)
- 재확정 시도 거부 (quote.status='booked' 확인)
- 14 cycles 연속 99%+ · 3 cycles 연속 100% 기록 유지

---

## 2. Alternatives Explored

### 2.1 Core Purpose (Q1)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **일정 확정 + 작업 관리 MVP** | **채택** |
| B | Full booking system (일정 + 방문 + 체크인/체크아웃) | 기각 · offline flow 복잡도 · v1.3b |
| C | Payment 통합 | 기각 · v2 scope |
| D | Minimal placeholder (chat metadata만) | 기각 · bookings 컬렉션 없이는 /provider/works 불가 |

### 2.2 Booking 생성 트리거 (Q2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Chat Server Action + 1-step 청명 one-click** | **채택** · chat 맥락 유지 · 간결 |
| B | received-quotes 수락 시 자동 생성 | 기각 · 일정 협의 여지 없음 |
| C | 청명 작업 탭 수동 생성 | 기각 · 고객 참여 없음 일방적 |

### 2.3 View 구조 (Phase 2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Chat-centric (banner + header badge + action button)** | **채택** · 사용자 맥락 유지 · realtime onSnapshot 자동 반영 |
| B | Standalone /booking/{id} 경로 | 기각 · chat 분리 · complexity |
| C | Modal-only (view 없이) | 기각 · 일정 확정 이력 소실 |

### 2.4 Booking 상태 모델
| # | 접근 | 결과 |
|---|------|------|
| **v1** | **`confirmed` 단일 상태** | **채택** · 생성 = 확정 |
| v1.3b | `confirmed / in_progress / completed / cancelled` 전이 | 분리 |

---

## 3. YAGNI Review — 권장 20개 확정

### 3.1 v1 MVP 포함 (20개)

**데이터 모델**
| # | 항목 | 위치 |
|---|------|------|
| C1 | `bookings/{bookingId}` 컬렉션 (status: 'confirmed' 단일) | Firestore root |
| C2 | Booking 필드 full denorm (quoteId · requestId · threadId · providerId · providerOwnerUid · clientUid · companyName · clientDisplayName · category · regionLabel · scheduledAt · totalAmount · memo · createdBy) | `types/booking.ts` |

**Server Actions**
| # | 항목 | 위치 |
|---|------|------|
| C3 | `confirmBooking({threadId, scheduledAt, memo})` | `app/actions/booking-actions.ts` |
| C4 | TX 3R/4W (thread + quote + request read · bookings.create + quote.update + request.update + message.create + thread.update) | 동 파일 |

**Chat 확장**
| # | 항목 | 위치 |
|---|------|------|
| C5 | ThreadActionButtons "📅 일정 확정" (청명 only · booking 없을 때) | `components/chat/ThreadActionButtons.tsx` |
| C6 | BookingConfirmModal (datetime-local + memo + submit) | `components/booking/BookingConfirmModal.tsx` |
| C7 | BookingStatusBanner (chat 상단 고정) | `components/booking/BookingStatusBanner.tsx` |
| C8 | 시스템 메시지 (senderRole: 'provider' · type: 'system') | chat-actions.ts 외부 · booking-actions 내부 TX |
| C9 | ThreadHeader booking 배지 ("✅ 4/22(월) 14:00") | `components/chat/ThreadHeader.tsx` 확장 |

**Provider 작업 탭**
| # | 항목 | 위치 |
|---|------|------|
| C10 | `/provider/works/page.tsx` placeholder → 실제 목록 | `app/provider/works/page.tsx` |
| C11 | `bookingRepository.listForProvider(providerId)` orderBy scheduledAt DESC limit 100 | `lib/firebase/booking-repository.ts` |
| C12 | BookingCard (상대명 · 카테고리 · scheduledAt · chat Link) | `components/booking/BookingCard.tsx` |
| C13 | Group header (오늘 / 내일 / 이번주 / 지난) · 빈 섹션 숨김 | `components/booking/BookingListSection.tsx` |
| C14 | WorksEmptyState ("아직 확정된 일정이 없어요") | `components/booking/WorksEmptyState.tsx` |

**Client side**
| # | 항목 | 위치 |
|---|------|------|
| C15 | `/received/{requestId}` QuoteCompareCard에 BookingBadge 주입 | `components/received/QuoteCompareCard.tsx` 확장 |
| C16 | `bookingRepository.findByQuoteId(quoteId)` | booking-repository.ts |

**Infra**
| # | 항목 | 위치 |
|---|------|------|
| C17 | `bookingRepository` 전체 helper · Admin SDK | booking-repository.ts |
| C18 | Firestore rules `bookings` participant only read · write:false | firestore.rules |
| C19 | Firestore index `providerId + scheduledAt DESC` | firestore.indexes.json |
| C20 | MessageType 확장 `"text" | "system"` · MessageBubble 중앙 gray 렌더 | types/chat.ts · MessageBubble.tsx |

### 3.2 Out of Scope → v1.3b+ / v2+

| 항목 | 이동 이유 |
|------|----------|
| 상태 전이 (`in_progress/completed/cancelled`) | v1.3b |
| 체크인/체크아웃 GPS · 타임스탬프 | v1.3b |
| 작업 완료 보고서 · 사진 업로드 | v1.3b |
| 일정 변경 · 2-step 협의 | v1.3b |
| 캘린더 view (month/week) | v2+ |
| bookings export / iCal | v2+ |
| 반복 일정 (구독 청소) | v2+ |
| 이메일/FCM push 알림 | v2+ |
| payment 연동 | v2 |
| review request 자동화 | v2 review |

---

## 4. Architecture Sketch (Phase 4.1 승인)

### 4.1 confirmBooking TX (3R/4W)
```
tx.get(thread)
  · 없음 → FORBIDDEN
  · providerOwnerUid !== uid → FORBIDDEN (청명 only)
tx.get(quote) via thread.quoteId
  · null → FORBIDDEN
  · status ∈ ['sent','accepted'] 만 허용
tx.get(request) via thread.requestId
  · status 체크 (booked 재확정 거부)
---
tx.create(bookings/{newId}, {...denorm, status:'confirmed', createdAt})
tx.update(quote, {status:'booked', acceptedAt if null})
tx.update(request, {status:'booked'})
tx.create(messages/{newId}, {type:'system', ..., text:"🗓️ {label} 일정 확정됐어요"})
tx.update(thread, {lastMessage*, unreadByClient: increment(1)})
```

### 4.2 chat thread 확장 fetch
```
기존: thread + [quote, request] fetch
🆕: + booking = bookingRepository.findByQuoteId(thread.quoteId)
→ BookingStatusBanner 조건부 렌더 · ThreadActionButtons canConfirmBooking={!booking}
```

### 4.3 /provider/works
```
Server shell: auth + providerId + bookingRepository.listForProvider(id)
→ computeDayBucket grouping → 4 BookingListSection
빈 전체 → WorksEmptyState
```

### 4.4 /received 확장
```
기존 quotes fetch + 🆕 Promise.all(quotes.map(findByQuoteId))
→ bookingByQuoteId Map → QuoteCompareCard booking prop
```

---

## 5. Component Tree (Phase 4.2 승인)

```
src/
├── app/
│   ├── actions/booking-actions.ts              🆕 confirmBooking
│   └── provider/works/page.tsx                 🔄 placeholder 교체
│
├── components/booking/                          🆕 폴더 (7 components)
│   ├── BookingConfirmButton.tsx                🆕 Client (ThreadActionButtons가 감싸 호출)
│   ├── BookingConfirmModal.tsx                 🆕 Client · form + submit
│   ├── BookingStatusBanner.tsx                 🆕 Server
│   ├── BookingBadge.tsx                        🆕 Server
│   ├── BookingListSection.tsx                  🆕 Server · group header
│   ├── BookingCard.tsx                         🆕 Client · Link
│   └── WorksEmptyState.tsx                     🆕 Client
│
├── components/chat/
│   ├── ThreadActionButtons.tsx                 🆕 Client · 청명 전용
│   └── MessageBubble.tsx                       🔄 system type 지원
│
├── app/chat/[threadId]/page.tsx                🔄 booking fetch + Banner + ActionButtons
├── components/received/QuoteCompareCard.tsx    🔄 BookingBadge prop
│
├── types/booking.ts                            🆕 Booking + DTOs
├── types/chat.ts                               🔄 MessageType 확장
│
├── domain/
│   ├── booking-schemas.ts                      🆕 Zod
│   └── booking-day-bucket.ts                   🆕 pure helper
│
├── lib/firebase/booking-repository.ts          🆕 Admin SDK
├── firestore.rules                             🔄 bookings
└── firestore.indexes.json                      🔄 1 index
```

**12 신규 components + 3 helper + 1 repo · 3 기존 파일 수정**.

---

## 6. Data Flow (Phase 4.3 승인)

6 flows 명세 (confirmBooking TX · chat thread booking 조회 · /provider/works grouping · /received badge · ThreadActionButtons 분기 · BookingConfirmModal submit).

---

## 7. Firestore Rules / Indexes

### 7.1 Rules (신규)
```
bookings/{bookingId}:
  allow read: if auth != null
              && (resource.data.clientUid == uid
                  || resource.data.providerOwnerUid == uid);
  allow write: if false;   // Admin SDK only
```

### 7.2 Indexes (신규 1개)
```
bookings: providerId(ASC) + scheduledAt(DESC)
```

### 7.3 Messages · 변경 없음
- 기존 messages rules 유지 (Admin SDK only write)
- system 메시지도 동일 rules 적용

---

## 8. Open Questions (Design 단계 해소)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | BookingStatusBanner 위치 (Pinned QuoteCard 위 vs 아래) | 위 (가장 최신 상태 · quote는 참조용) |
| Q2 | 고객이 일정 변경 요청 (chat 메시지로?) | v1 text 메시지로만 · v1.3b에서 rich type |
| Q3 | scheduledAt 과거 시각 제출 | Zod min=now server-side check (client min도 now) |
| Q4 | confirmBooking 실패 (quote.status='cancelled') | INVALID_STATE error |
| Q5 | 재확정 시도 (quote.status='booked') | INVALID_STATE error (1 quote → 1 booking 보장) |
| Q6 | booking delete (admin 전용) | v1 제외 · v2+ admin dashboard |
| Q7 | 청명 /provider/works 100+ 결과 | console.warn + 최신 100만 |
| Q8 | BookingListSection 빈 bucket | section 숨김 (제목 미노출) |
| Q9 | ThreadHeader badge 위치 (quoteAmount 옆) | quoteAmount는 booking 있을 때 숨기고 booking 배지만 |
| Q10 | system 메시지 senderUid | 청명 uid (createdBy) · avatar는 중앙정렬로 숨김 |

---

## 9. Implementation Order (예상 Do 단계 · 10 steps)

1. **types/booking.ts + types/chat.ts 확장 + firestore.rules + firestore.indexes.json** · `firebase deploy`
2. **domain/booking-schemas.ts + booking-day-bucket.ts** (pure)
3. **lib/firebase/booking-repository.ts** (Admin SDK · 4 메서드)
4. **app/actions/booking-actions.ts** (confirmBooking TX)
5. **booking components 공용**: BookingBadge · BookingStatusBanner · BookingCard · WorksEmptyState
6. **BookingConfirmModal + BookingConfirmButton**
7. **MessageBubble 확장** (system type)
8. **ThreadActionButtons** + **/chat/[threadId]/page.tsx** 확장 (booking fetch + Banner + ActionButtons)
9. **BookingListSection** + **/provider/works/page.tsx** placeholder 교체
10. **QuoteCompareCard BookingBadge prop 주입** + **/received/[requestId]/page.tsx** booking fetch wiring + smoke test

---

## 10. Brainstorming Log

| Phase | 결정 |
|-------|------|
| Phase 0 | v1.2 완결 · v1.3 진입 · chat의 일정 확정 공백 해소 · /provider/works placeholder 교체 |
| Phase 1 Q1 | A = 일정 확정 + 작업 관리 MVP |
| Phase 1 Q2 | A + 1-step 청명 one-click · confirmed 단일 상태 |
| Phase 2 | A = chat-centric + 단일 시간 리스트 + 고객 별도 경로 없음 |
| Phase 3 | 권장 20개 full scope · out-of-scope 10개 분리 |
| Phase 4.1 | TX 3R/4W · chat thread fetch 확장 · /works grouping · /received badge |
| Phase 4.2 | 12 컴포넌트 (Server 4 / Client 5 / shared helper 3) · data model full denorm · MessageType 확장 |
| Phase 4.3 | 6 flows · Test Plan 20건 · idempotent state 체크 |

---

## 11. Next Steps

- [ ] `/pdca design booking` — Design 문서 작성 (Open Q 10건 해소)
- [ ] design-validator 호출
- [ ] `/pdca do booking` — 10-step 구현
- [ ] `/pdca analyze booking` — Gap detection (≥99%)
- [ ] `/pdca report + archive booking` — **v1.3 #1 · 🏆 마켓 루프 종결**

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 20 MVP · out-of-scope 10 · 10 Open Questions · 10-step implementation order. Approach: chat-centric · 1-step 청명 one-click · confirmed 단일 상태 · TX 3R/4W · system 메시지 확장 · group header provider works · received badge · Firestore 1 index 추가 | Seokho Lee |
