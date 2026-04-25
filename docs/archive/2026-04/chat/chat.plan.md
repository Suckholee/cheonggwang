---
template: plan-plus
version: 0.1
feature: chat
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 1:1 채팅 · 견적 협의 채널 (chat)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #13 (v1.2 #1 · **v1.2 진입 첫 feature**)
> 선행: client-dashboard (v1.1b #5 · Match 100% archived · v1.1b 마감 🏆)
> 다음: `/pdca design chat`

---

## 1. User Intent Discovery

### 1.1 배경
Marketplace v1.1b 완성 (5/5) 후 **v1.2 진입**. v1.1까지 `quote-request → provider-signup → quote-response → received-quotes` 로 "제출 → 응답 → 비교"까지 루프 폐쇄됐으나, **협상 단계는 수동**(전화/이메일). received-quotes의 "문의하기" · quote-response의 "문의" 버튼은 v1.2 대기 상태로 disabled. 이 feature가 협의 채널을 앱 안에 도입해 마켓 루프의 bottleneck 제거.

### 1.2 핵심 목적 — 협의 채널 (Q1=A)
**Quote가 이미 있는 상태에서 세부 조건을 협의** (가격 조정 · 일정 · 특수 요청 전달).
- 고객: received-quotes → "문의하기" → 해당 청명과 thread 진입
- 청명: quote-response propose 성공 → thread 자동 노출 → 답변
- Pinned QuoteCard로 견적 상태 항상 컨텍스트 유지

**Pre-quote inquiry (아직 quote 없음)는 v1.2b**로 분리 (YAGNI).

### 1.3 Realtime + Storage (Q2=A)
- **Firestore onSnapshot** (Web SDK) 첫 도입 · v1.1b까지는 모두 revalidatePath 의존
- **미읽음 카운트** `threads.unreadByClient/unreadByProvider` atomic increment
- **이미지 첨부는 v1.2b 연기** (Storage 규칙 추가 필요 · text only v1)
- BottomTabNav "채팅" 탭 `chat-unread` badge (tab-definitions에 이미 존재하는 badgeKey 활용)

### 1.4 Approach (Phase 2=A)
- **Quote 기반 thread 자동 생성**: `submitQuote` TX 내부에 thread upsert 1 write 추가
- `threadId = ${requestId}_${providerId}` deterministic (quote-response composite ID 패턴 재활용)
- 고객이 먼저 말 걸기 전에도 청명 쪽에 thread 노출 → 맥락 자동 설정

### 1.5 MVP 경계
- ✅ `/chat` 목록 · `/chat/{threadId}` 상세 2 routes
- ✅ Server shell + Client onSnapshot listener (thread list + messages)
- ✅ 2 Server Actions (`sendMessage` · `markThreadAsRead`) with TX atomic
- ✅ threads + messages subcollection · Admin SDK 독점 write
- ✅ BottomTabNav unread badge (Client onSnapshot aggregate)
- ✅ Pinned QuoteCard (상대 현재 견적 상태)
- ✅ ThreadHeader role-aware 이름 (companyName · maskName)
- ✅ received-quotes "문의하기" · quote-response 이후 CTA wiring
- ✅ Firestore rules + 3 composite indexes 추가
- ✅ submitQuote TX에 thread upsert 1 write 추가
- ❌ 이미지/파일 첨부 (v1.2b)
- ❌ Rich types (quoteCard inline · scheduleRequest · paymentRequest — v1.3+)
- ❌ Pre-quote inquiry (v1.2b)
- ❌ 읽음 표시(✓✓) · 타이핑 표시 (v1.2b)
- ❌ 메시지 검색 · 편집/삭제 · 답장 인용 · 이모지 반응
- ❌ 그룹 채팅 · FCM push notification (v2+)
- ❌ Virtual scroll / pagination (200건 한도 · v1)

### 1.6 성공 기준
- Quote 제출 → 양쪽 thread 즉시 등장 (onSnapshot)
- 메시지 전송 → 상대방 500ms 이내 수신 (Firestore latency)
- BottomTabNav 채팅 배지 unread 합산 정확
- 비 participant의 thread/message 접근 차단 (rules + Server Action 2중)
- Quote 재제출 시 threadId merge (idempotent · 중복 없음)

---

## 2. Alternatives Explored

### 2.1 Realtime Strategy (Q2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Firestore onSnapshot (Web SDK)** | **채택** · 기존 client SDK + auth 재활용 · v1.2+ 다른 기능 재사용 가능 |
| B | Polling setInterval | 기각 · UX 열등 |
| C | Server-Sent Events (SSE) | 기각 · Firebase 외 인프라 도입 부담 |
| D | Firebase Realtime Database | 기각 · Firestore와 이원화 |

### 2.2 Thread 생성 시점 (Phase 2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Quote 제출 시 자동 생성 (submitQuote TX)** | **채택** · idempotent · 양쪽 UX 일관 |
| B | 수동 (고객이 "문의하기" 클릭 시) | 기각 · 청명 UX 불균형 |
| C | Chat-first (quote 독립) | 기각 · 맥락 분리 위험 |

---

## 3. YAGNI Review (권장 20개 확정)

### 3.1 v1 MVP 포함 (20개)

**데이터 모델 / 생성**
| # | 항목 | 위치 |
|---|------|------|
| C1 | `threads/{threadId}` 컬렉션 | Firestore root |
| C2 | `threads/{threadId}/messages/{messageId}` subcollection | Firestore root |
| C4 | `submitQuote` TX에 thread upsert 자동 생성 | `app/actions/quote-response-actions.ts` |
| C5 | thread 필드 full set (clientUid · providerId · providerOwnerUid · quoteId · lastMessage* · unreadBy* · companyName · clientDisplayName 등 denormalized) | thread schema |

**Server Actions (쓰기)**
| # | 항목 | 위치 |
|---|------|------|
| C6 | `sendMessage({threadId, text})` TX (message.create + thread.update) | `app/actions/chat-actions.ts` |
| C7 | `markThreadAsRead({threadId})` update | 동 파일 |

**Read (onSnapshot)**
| # | 항목 | 위치 |
|---|------|------|
| C8 | `/chat` 목록 Client onSnapshot · role별 필드 분기 | `ThreadsListClient.tsx` |
| C9 | `/chat/{threadId}` 상세 messages onSnapshot (orderBy asc · limit 200) | `ThreadDetailClient.tsx` |
| C10 | 상대 이름 role-aware 표기 (청명 companyName · 고객 maskName) | 같은 컴포넌트 · DTO 매핑 |

**UI**
| # | 항목 | 위치 |
|---|------|------|
| C11 | Thread list row (이름 · preview · time · unread) | `ThreadRow.tsx` |
| C12 | Thread 상세 헤더 (이름 · quote 배지 · 뒤로) | `ThreadHeader.tsx` |
| C13 | Pinned QuoteCard | `PinnedQuoteCard.tsx` |
| C14 | Message bubble (text only · left/right) | `MessageBubble.tsx` |
| C15 | Composer (textarea + send · 이미지 disabled) | `MessageComposer.tsx` |

**Routing / Navigation**
| # | 항목 | 위치 |
|---|------|------|
| C16 | `/chat` page (placeholder 교체) | `app/chat/page.tsx` |
| C17 | `/chat/{threadId}` page | `app/chat/[threadId]/page.tsx` |
| C18 | received-quotes "문의하기" disabled 해제 + Link | 받은견적 카드 컴포넌트 |
| C18 | quote-response propose 완료 후 "채팅 이동" CTA | QuoteProposalForm |
| C20 | proxy.ts `/chat/:path*` matcher 확인/추가 | `proxy.ts` |

**Unread Badge**
| # | 항목 | 위치 |
|---|------|------|
| C19 | `ChatUnreadWrapper` (Client onSnapshot · aggregate) | `components/chat/ChatUnreadWrapper.tsx` · `layout.tsx` 주입 |

**총 20개** (C3 중복 제거 · C4 채택 → 실제 구현 item 20)

### 3.2 Out of Scope → v1.2b+ / v1.3+ / v2+

| 항목 | 이동 이유 |
|------|----------|
| 이미지/파일 첨부 | v1.2b (Storage 규칙 + 업로드 UI) |
| `quoteCard` inline · `scheduleRequest` · `paymentRequest` rich types | v1.3+ (booking · payment 연계) |
| Pre-quote inquiry | v1.2b |
| 읽음 표시 ✓✓ | v1.2b |
| 타이핑 표시 | v1.2b |
| 메시지 검색 | v1.3 |
| 편집/삭제 · 답장 인용 · 이모지 반응 | v1.3+ |
| 그룹 채팅 | v2+ |
| FCM push notification | v2+ |
| Virtual scroll / 메시지 pagination | v2+ (200건 한도 v1) |

---

## 4. Architecture Sketch (Phase 4.1 승인)

### 4.1 Client Listener 패턴 (v1.2 첫 도입)
- `/chat` 목록: `ThreadsListClient` — `onSnapshot(threads where role-field == uid orderBy lastMessageAt desc)`
- `/chat/{threadId}` 상세: `ThreadDetailClient` — `onSnapshot(messages orderBy createdAt asc limit 200)` + mount 시 `markThreadAsRead`
- Server 컴포넌트는 **shell + auth/participant guard**만 담당

### 4.2 Server Actions (writes)
- `sendMessage` TX: `messages.create` + `threads.update(lastMessage*, unreadByOther: increment)`
- `markThreadAsRead`: `threads.update({unreadByMe: 0})`

### 4.3 Thread 자동 생성 (submitQuote 확장)
- threadId deterministic · quote 재제출 시 `tx.set({merge:true})` 유지
- denormalized 필드 (companyName, clientDisplayName maskName)로 join 회피

### 4.4 BottomTabNav unread badge
- `ChatUnreadWrapper` (Client) → layout.tsx에서 `<BottomTabNav>` 감싸고 `chatUnreadCount` 주입

---

## 5. Component Tree (Phase 4.2 승인)

```
src/
├── app/
│   ├── chat/page.tsx                          🔄 placeholder → shell (목록)
│   ├── chat/[threadId]/page.tsx               🆕 Server shell · guard
│   └── actions/
│       └── chat-actions.ts                    🆕 sendMessage · markThreadAsRead
│
├── components/chat/                            🆕 폴더 (9 components)
│   ├── ThreadsListClient.tsx                  🆕 Client · onSnapshot · role 분기
│   ├── ThreadRow.tsx                          🆕 Client · Link
│   ├── ThreadDetailClient.tsx                 🆕 Client · onSnapshot + markAsRead on mount
│   ├── MessageBubble.tsx                      🆕 Client · dumb
│   ├── MessageComposer.tsx                    🆕 Client · textarea + send + image disabled
│   ├── ThreadHeader.tsx                       🆕 Server · 상대명 + quote 배지
│   ├── PinnedQuoteCard.tsx                    🆕 Server · quote 요약
│   ├── EmptyThreadsHint.tsx                   🆕 Client · placeholder
│   └── ChatUnreadWrapper.tsx                  🆕 Client · layout.tsx 주입
│
├── types/
│   └── chat.ts                                🆕 Thread · Message · DTOs
│
├── lib/firebase/
│   └── thread-repository.ts                   🆕 server-only · Admin SDK
│        create · getWithParticipantCheck
│
├── lib/quote/
│   └── thread-upsert.ts                       🆕 순수 helper · submitQuote TX에서 import
│
├── domain/
│   └── chat-schemas.ts                        🆕 Zod (sendMessage · markThreadAsRead)
│
├── app/actions/
│   └── quote-response-actions.ts              🔄 submitQuote TX에 thread upsert 추가
│
├── app/layout.tsx                             🔄 <ChatUnreadWrapper> 주입
│
├── firestore.rules                            🔄 threads · messages rules 추가
│
└── firestore.indexes.json                     🔄 3 composite indexes 추가
```

**9 신규 components + 4 infra 파일 + 3 기존 파일 수정**.

---

## 6. Data Flow (Phase 4.3 승인)

### 6.1 Thread 자동 생성
`submitQuote` 기존 TX에 `tx.set(threads/{threadId}, payload, {merge:true})` 1 write 추가. 재제출 시 quoteId만 업데이트 · thread 유지.

### 6.2 Thread list 구독
```
Server: verifySession → role 판별 → <ThreadsListClient role uid/>
Client: onSnapshot(query(threads, where(roleField, '==', uid), orderBy('lastMessageAt', 'desc')))
unmount cleanup
```

### 6.3 Thread 상세
```
Server: verifySession + threadRepository.getWithParticipantCheck(threadId, uid)
         · 비 participant → notFound()
         + quote summary fetch → Pinned QuoteCard
         → <ThreadDetailClient uid role threadInit/>
Client: useEffect → markThreadAsRead + onSnapshot(messages orderBy createdAt asc limit 200)
```

### 6.4 sendMessage TX
1. Zod {threadId: nanoid16-style · text: 1~2000}
2. verifySession → uid
3. TX:
   a. tx.get(thread) · participant check · else FORBIDDEN
   b. senderRole = (uid === clientUid) ? 'client' : 'provider'
   c. otherKey = senderRole==='client' ? 'unreadByProvider' : 'unreadByClient'
   d. tx.create(messages.doc(newId), {text, senderUid, senderRole, type:'text', createdAt: serverTS})
   e. tx.update(thread, {lastMessageAt: serverTS, lastMessagePreview: text.slice(0,80), lastMessageSenderUid: uid, [otherKey]: increment(1)})
4. return ok → Client onSnapshot이 자동 UI 반영 (revalidatePath 불필요)

### 6.5 markThreadAsRead
1. verifySession → uid
2. tx.get(thread) · participant check
3. myKey = uid === clientUid ? 'unreadByClient' : 'unreadByProvider'
4. update({[myKey]: 0})

### 6.6 BottomTabNav badge
`ChatUnreadWrapper` (Client): `onSnapshot(threads where myField==uid)` → `unread = docs.reduce((s,d) => s + d.data()[myUnreadKey], 0)` → `<TabNavClient chatUnreadCount={unread}/>`

---

## 7. Firestore Rules / Indexes

### 7.1 Rules (신규)
```javascript
match /threads/{threadId} {
  allow read: if request.auth != null
              && (resource.data.clientUid == request.auth.uid
                  || resource.data.providerOwnerUid == request.auth.uid);
  allow write: if false;   // Admin SDK only

  match /messages/{messageId} {
    allow read: if request.auth != null
                && (get(/databases/$(database)/documents/threads/$(threadId))
                    .data.clientUid == request.auth.uid
                    || get(/databases/$(database)/documents/threads/$(threadId))
                    .data.providerOwnerUid == request.auth.uid);
    allow write: if false;
  }
}
```

### 7.2 Indexes (신규 3개)
```json
{"collectionGroup":"threads","fields":[
  {"fieldPath":"clientUid","order":"ASCENDING"},
  {"fieldPath":"lastMessageAt","order":"DESCENDING"}
]}
{"collectionGroup":"threads","fields":[
  {"fieldPath":"providerOwnerUid","order":"ASCENDING"},
  {"fieldPath":"lastMessageAt","order":"DESCENDING"}
]}
{"collectionGroup":"messages","fields":[
  {"fieldPath":"threadId","order":"ASCENDING"},
  {"fieldPath":"createdAt","order":"ASCENDING"}
]}
```

---

## 8. Open Questions (Design 단계 해소)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | threadId 형식 (`${requestId}_${providerId}`의 길이 · Firestore doc ID 제약) | requestId 16 + "_" + providerId 20 = 37자 · Firestore 1500자 한도 내 · Design에서 확정 |
| Q2 | message ID 생성 방식 (Firestore auto ID vs nanoid) | auto ID 사용 · client pre-issue 불필요 |
| Q3 | denormalized 필드 (companyName · clientDisplayName) 갱신 정책 | v1: thread 생성 시점 snapshot · 이후 변경 반영 안 함 (YAGNI) · v1.2b에서 stale 정책 검토 |
| Q4 | 200건 초과 시 UX (older 숨김?) | v1 단순 "최신 200건" 표기 · "더 보기"는 v2+ pagination |
| Q5 | sendMessage Rate limit | v1 생략 · v1.2b 검토 (1분 10건) |
| Q6 | ChatUnreadWrapper에 Context 필요? | Context 없이 직접 `<TabNavClient>` 감싸고 prop 전달 |
| Q7 | /chat 비로그인 처리 | proxy.ts에서 auth gate (기존 `/provider/*` 패턴) |
| Q8 | Quote 없는 thread는? | 현재는 없음 (C4로 항상 quoteId 있음) · PinnedQuoteCard는 항상 렌더 가능 |
| Q9 | `providerOwnerUid` denormalize 위치 | thread 생성 시 `provider.ownerUid` 1회 fetch (submitQuote TX 내부) · 이후 변경 반영 안 함 (YAGNI) |
| Q10 | onSnapshot unmount 안 할 경우 memory leak | useEffect cleanup 필수 · Test #17로 검증 |
| Q11 | Client onSnapshot의 auth 연결 끊김 처리 | clientAuth.currentUser 갱신 · onSnapshot error handler 추가 |
| Q12 | Client용 Firebase client init | `@/lib/firebase/client.ts` 기존 · 추가 없음 |

---

## 9. Implementation Order (예상 Do 단계 · 10 steps)

1. **types/chat.ts** + **domain/chat-schemas.ts** + **firestore.rules** + **firestore.indexes.json** · `firebase deploy`
2. **lib/firebase/thread-repository.ts** (Admin SDK · getWithParticipantCheck)
3. **lib/quote/thread-upsert.ts** (pure helper · buildThreadPayload)
4. **app/actions/chat-actions.ts** (sendMessage · markThreadAsRead)
5. **app/actions/quote-response-actions.ts submitQuote TX 확장** (thread upsert)
6. **components/chat/** shell: ThreadRow · MessageBubble · MessageComposer · EmptyThreadsHint
7. **ThreadsListClient** (onSnapshot · role 분기) + **/chat/page.tsx**
8. **ThreadHeader · PinnedQuoteCard · ThreadDetailClient** + **/chat/[threadId]/page.tsx**
9. **ChatUnreadWrapper** + **layout.tsx 주입**
10. **Wiring**: received-quotes "문의하기" 활성화 · QuoteProposalForm 제출 후 CTA · proxy.ts matcher 검증 + smoke test

---

## 10. Brainstorming Log

| Phase | 결정 사항 |
|-------|----------|
| Phase 0 | v1.1b 마감 · v1.2 진입 · Master Plan "chat" #8 · received-quotes "문의하기" · quote-response "문의" 모두 v1.2 대기 상태 |
| Phase 1 Q1 | A = 협의 채널 (quote 기반 협상) |
| Phase 1 Q2 | A = onSnapshot · 미읽음 카운트 · 이미지 v1.2b 연기 |
| Phase 2 | A = Quote 기반 thread 자동 생성 (submitQuote TX 확장) |
| Phase 3 | 권장 20 MVP 확정 · out-of-scope 10+ 항목 v1.2b+/v1.3+/v2+ 분리 |
| Phase 4.1 | Client listener + Server shell + Admin SDK writes + BottomTabNav badge wrapper |
| Phase 4.2 | 9 컴포넌트 + 4 infra · denormalized 필드로 join 회피 · Firestore rules 2중 방어 |
| Phase 4.3 | 6 flow (thread 생성 · list 구독 · 상세 구독 · sendMessage TX · markAsRead · badge aggregate) · Test Plan 18건 |

---

## 11. Next Steps

- [ ] `/pdca design chat` — Design 문서 (Open Q 12건 해소 + Test Plan 확장)
- [ ] design-validator 호출
- [ ] `/pdca do chat` — 구현 (Implementation Order 10 step)
- [ ] `/pdca analyze chat` — Gap detection (≥99% 목표)
- [ ] `/pdca report + archive chat` — **v1.2 #1 완료**

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 20 MVP · out-of-scope 10+ · 12 Open Questions · 10-step implementation order. Approach: Firestore onSnapshot (v1.2 첫 도입) · Quote 기반 thread 자동 생성 · text only · 이미지 v1.2b · rich types v1.3+ · Firestore rules 2중 방어 · 3 composite indexes 추가 · BottomTabNav unread badge wrapper | Seokho Lee |
