---
template: design
version: 0.1
feature: chat
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# chat Design Document

> **Summary**: 1:1 견적 협의 채널. `/chat` 목록 + `/chat/{threadId}` 상세 2 routes. Firestore onSnapshot **v1.2 첫 도입**. Quote 기반 thread 자동 생성 (`submitQuote` TX 확장). 2 Server Actions (sendMessage · markThreadAsRead). 9 components (Server 3 / Client 6). Firestore rules + 3 composite indexes. BottomTabNav unread badge wrapper.
>
> **Plan**: [chat.plan.md](../../01-plan/features/chat.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** threadId 형식 | **`${requestId}_${providerId}`** · requestId = `customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16)` 확인됨 (`app/quote/new/page.tsx`) · providerId = Firestore auto ID `[A-Za-z0-9]{20}` · 합계 37자 · Firestore doc ID 1500자 제한 내 · **정규식 단일 상수**: `const THREAD_ID_REGEX = /^[a-z0-9]{16}_[A-Za-z0-9]{20}$/` (domain/chat-schemas.ts export) |
| **Q2** message ID | **Firestore auto ID** (`collection.doc()`) · client pre-issue 불필요 (이미지 없음) |
| **Q3** denormalized 필드 갱신 | **v1은 thread 생성 시점 snapshot 고정** · `companyName`/`clientDisplayName` 변경 시 반영 안 함 · v1.2b에서 stale 정책 검토 |
| **Q4** 200+ 메시지 UX | **"최신 200건"** 표기 + disclaimer · "더 보기" / pagination은 v2+ |
| **Q5** sendMessage Rate limit | **v1 생략** · v1.2b 검토 (1분 10건 권장) |
| **Q6** Unread aggregate 구조 | **Context 없이** · `ChatUnreadWrapper` (Client)가 `TabNavClient`를 직접 wrap · `chatUnreadCount` prop 전달 |
| **Q7** /chat 비로그인 | **proxy.ts matcher에 `/chat/:path*` 추가** (기존 `/provider/*` 패턴 · 로그인 유도) |
| **Q8** Quote 없는 thread | **현재는 없음** · C4로 항상 quoteId 존재 · v1.2b에서 inquiry thread 도입 시 재검토 |
| **Q9** providerOwnerUid denormalize | **submitQuote TX 내부에서 `tx.get(provider)` 추가** (기존 quote read + request read 2개 → 3개로 확장) · 변경 반영 없음 |
| **Q10** onSnapshot cleanup | **useEffect return unsub()** 필수 · Test #17로 검증 |
| **Q11** Client auth 연결 끊김 | onSnapshot `(snap, error) => { if (error) console.warn(...) }` · v1에서는 silent fail · v1.2b에서 reconnect UX |
| **Q12** Client Firebase init | **기존 `@/lib/firebase/client.ts` clientDb 재활용** · 추가 설정 없음 |

---

## 1. Overview

### 1.1 Design Goals
- v1.2 **Firestore onSnapshot 첫 도입** · 후속 feature(notifications 등) 재사용 가능한 Client listener 패턴 정립
- Quote 기반 thread 자동 생성으로 양쪽 UX 맥락 일관
- Denormalization(`companyName`, `clientDisplayName`, `providerOwnerUid`, `quoteId`)으로 join 회피 · 단순 조회
- Firestore rules **2중 방어** (Client onSnapshot read guard + Server Action participant check)
- Text only (v1) · 확장 포인트 명시 (`type: 'text' | 'image' | 'quoteCard' | ...` enum은 MessageType literal)

### 1.2 Principles
- Server component = shell + auth/participant guard
- Client component = realtime subscription + action dispatch
- Admin SDK = 모든 write (rules write:false)
- Deterministic threadId (idempotent submitQuote)
- Text sanitize = Zod 길이 + React 기본 escape

---

## 2. Architecture

### 2.1 Data Flow Overview

```
┌─────────────────────────────────────────────────────────┐
│  Thread 자동 생성 (submitQuote TX 확장)                  │
│  ├─ 기존: reqRef, prRef, quoteRef 3 write                │
│  └─ 🆕: tx.get(provider) + tx.set(threads/{threadId})   │
│       threadId = `${requestId}_${providerId}` · merge    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  /chat (Server shell + Client listener)                  │
│  ├─ Server: auth → userRepository.get → role 판별        │
│  └─ <ThreadsListClient uid role/>                        │
│       onSnapshot(threads where roleField==uid orderBy…)  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  /chat/{threadId} (Server shell + Client listener)       │
│  ├─ Server: auth + threadRepository.getWithParticipant   │
│  │     + quoteRepository.get(quoteId) → summary          │
│  └─ <ThreadDetailClient uid role threadInit quoteSummary>│
│       useEffect → markThreadAsRead + onSnapshot(messages)│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Writes (Server Actions · TX)                            │
│  sendMessage: messages.create + thread.update(…)         │
│  markThreadAsRead: thread.update({myKey:0})              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BottomTabNav unread badge                               │
│  layout.tsx <ChatUnreadWrapper/> wraps <TabNavClient/>   │
│  onSnapshot aggregate count → chatUnreadCount prop       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Route Strategy
- **신규**: `/chat` (placeholder 교체) · `/chat/{threadId}` 신설
- **proxy.ts matcher 확장**: 기존 `["/dashboard/:path*", "/editor/:path*", "/quote/:path*", "/provider/:path*", "/received/:path*"]`에 **`"/chat/:path*"` 추가** (비로그인 → `/login?next=/chat`) · 기존 5개 matcher 보존

---

## 3. Data Model

### 3.1 Firestore Collections 🆕

#### `threads/{threadId}`

| Field | Type | 비고 |
|-------|------|------|
| `clientUid` | string | 의뢰인 uid |
| `providerId` | string | 청명 id |
| `providerOwnerUid` | string | 청명 owner uid (read guard · rules + server 2중) |
| `requestId` | string | 견적 요청 id |
| `quoteId` | string \| null | 최신 quote id |
| `companyName` | string | denormalized · 생성 시점 snapshot |
| `clientDisplayName` | string | `maskName(user.displayName ?? email prefix)` · snapshot |
| `lastMessageAt` | Timestamp \| null | null이면 채팅 전 |
| `lastMessagePreview` | string \| null | `.slice(0, 80)` |
| `lastMessageSenderUid` | string \| null | |
| `unreadByClient` | number | default 1 (Quote 도착 시점) |
| `unreadByProvider` | number | default 0 |
| `createdAt` | Timestamp | |

**Document ID**: `${requestId}_${providerId}` deterministic

#### `threads/{threadId}/messages/{messageId}` subcollection

| Field | Type |
|-------|------|
| `threadId` | string (redundant for rules convenience) |
| `senderUid` | string |
| `senderRole` | `"client" \| "provider"` |
| `type` | `"text"` (v1 literal) |
| `text` | string (1~2000) |
| `createdAt` | Timestamp |

**Document ID**: Firestore auto ID (Q2)

### 3.2 Firestore Rules 🆕

```javascript
match /threads/{threadId} {
  allow read: if request.auth != null
              && (resource.data.clientUid == request.auth.uid
                  || resource.data.providerOwnerUid == request.auth.uid);
  allow write: if false;  // Admin SDK only

  match /messages/{messageId} {
    // Single get() · billed read 1건으로 최적화 (validator fix)
    allow read: if request.auth != null
                && request.auth.uid in [
                  get(/databases/$(database)/documents/threads/$(threadId))
                    .data.clientUid,
                  get(/databases/$(database)/documents/threads/$(threadId))
                    .data.providerOwnerUid
                ];
    // 실제로 Firestore는 동일 get()을 자동 캐싱하므로 2 호출 표기도 1건 과금 (보수적)
    allow write: if false;  // Admin SDK only
  }
}
```

> Firestore rules의 `get()` 결과는 동일 request 내 자동 캐시 · 동일 경로 2회 호출해도 1 read 과금 · 다만 가독성과 안전성을 위해 `in` 배열 방식으로 단순화.

**배포**: `firebase deploy --only firestore:rules`

### 3.3 Firestore Indexes 🆕 (3개)

```json
{ "collectionGroup": "threads", "fields": [
  { "fieldPath": "clientUid", "order": "ASCENDING" },
  { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "threads", "fields": [
  { "fieldPath": "providerOwnerUid", "order": "ASCENDING" },
  { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "messages", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "threadId", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "ASCENDING" }
]}
```

주의: `messages`는 subcollection이므로 `queryScope` `COLLECTION` (per-thread query · 기본값)으로 충분. 별도 `COLLECTION_GROUP` cross-subcollection 쿼리는 v1 불필요.

### 3.4 Types (`src/types/chat.ts`) 🆕

```ts
export type ThreadRole = "client" | "provider";
export type MessageType = "text"; // v1 literal

export interface Thread {
  id: string;
  clientUid: string;
  providerId: string;
  providerOwnerUid: string;
  requestId: string;
  quoteId: string | null;
  companyName: string;
  clientDisplayName: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastMessageSenderUid: string | null;
  unreadByClient: number;
  unreadByProvider: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderUid: string;
  senderRole: ThreadRole;
  type: MessageType;
  text: string;
  createdAt: Date;
}

// Client DTO (primitive)
export interface ThreadRowDTO {
  id: string;
  counterpartName: string;
  lastMessagePreview: string | null;
  lastMessageAtMs: number | null;
  unreadCount: number;
  quoteAmount: number | null;
}

export interface MessageBubbleDTO {
  id: string;
  text: string;
  mine: boolean;
  createdAtMs: number;
}
```

### 3.5 Pure helper (`src/lib/quote/thread-upsert.ts`) 🆕

```ts
export function buildThreadPayload(ctx: {
  clientUid: string;
  providerId: string;
  providerOwnerUid: string;
  requestId: string;
  quoteId: string;
  companyName: string;
  clientDisplayName: string;
}): Record<string, unknown>;
```

denormalized 필드 스냅샷 생성 · `submitQuote` TX가 호출 · pure (단위테스트 친화).

---

## 4. API Specification

### 4.1 Server Actions (신규 · `src/app/actions/chat-actions.ts`)

#### `sendMessage({threadId, text})`

```ts
export interface SendMessageInput {
  threadId: string;
  text: string;
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<ActionResult<{ messageId: string }>>;
```

**6-step TX**:
1. Zod `{threadId: regex /^[a-z0-9]{16}_[a-zA-Z0-9]{15,30}$/, text: z.string().trim().min(1).max(2000)}`
2. `verifySessionCookie` → uid
3. TX:
   - `tx.get(thread)` · 없으면 `FORBIDDEN`
   - participant check: `clientUid===uid || providerOwnerUid===uid` · 아니면 `FORBIDDEN`
   - `senderRole = uid===clientUid ? 'client' : 'provider'`
   - `otherKey = senderRole==='client' ? 'unreadByProvider' : 'unreadByClient'`
   - `tx.create(messages.doc(), {threadId, senderUid, senderRole, type:'text', text, createdAt: serverTS})`
   - `tx.update(thread, {lastMessageAt: serverTS, lastMessagePreview: text.slice(0,80), lastMessageSenderUid: uid, [otherKey]: FieldValue.increment(1)})`
4. return `{ok, data:{messageId}}` · revalidatePath 불필요 (onSnapshot이 반영)

#### `markThreadAsRead({threadId})`

```ts
export interface MarkThreadAsReadInput {
  threadId: string;
}

export async function markThreadAsRead(
  input: MarkThreadAsReadInput,
): Promise<ActionResult<{ threadId: string }>>;
```

**5-step**:
1. Zod
2. verifySessionCookie → uid
3. TX:
   - tx.get thread · participant check (동일)
   - `myKey = uid===clientUid ? 'unreadByClient' : 'unreadByProvider'`
   - `tx.update(thread, {[myKey]: 0})`
4. return `{ok, data:{threadId}}`

### 4.2 Zod Schemas (`src/domain/chat-schemas.ts`) 🆕

```ts
export const THREAD_ID_REGEX = /^[a-z0-9]{16}_[A-Za-z0-9]{20}$/;

const threadIdSchema = z
  .string()
  .regex(THREAD_ID_REGEX, "유효하지 않은 threadId");

export const sendMessageInputSchema = z.object({
  threadId: threadIdSchema,
  text: z.string().trim().min(1, "메시지를 입력해 주세요").max(2000),
});

export const markThreadAsReadInputSchema = z.object({
  threadId: threadIdSchema,
});
```

### 4.3 Repository (`src/lib/firebase/thread-repository.ts`) 🆕

```ts
export const threadRepository = {
  async getWithParticipantCheck(
    threadId: string,
    uid: string,
  ): Promise<Thread | null> {
    const snap = await adminDb.collection("threads").doc(threadId).get();
    if (!snap.exists) return null;
    const t = toThread(snap.id, snap.data()!);
    if (t.clientUid !== uid && t.providerOwnerUid !== uid) return null;
    return t;
  },
};
```

`null` 반환 시 Server shell에서 `notFound()`.

### 4.4 submitQuote TX 확장

기존 `quote-response-actions.ts` `submitQuote` TX에 **1 read + 1 write 추가**:

```ts
await adminDb.runTransaction(async (tx) => {
  const reqSnap = await tx.get(reqRef);
  // ... (기존)

  // 🆕 provider fetch for denorm
  const providerRef = adminDb.collection("providers").doc(providerId);
  const providerSnap = await tx.get(providerRef);
  if (!providerSnap.exists) throw new AppError("INTERNAL_ERROR", "청명 데이터 오류");
  const providerData = providerSnap.data()!;
  const providerOwnerUid = String(providerData.ownerUid);
  const companyName = String(providerData.companyName);

  // 🆕 client displayName fetch
  const clientRef = adminDb.collection("users").doc(clientUid);
  const clientSnap = await tx.get(clientRef);
  const clientDisplayName = maskName(
    (clientSnap.exists && (clientSnap.data()!.displayName as string)) ||
      clientUid.slice(0, 8),
  );

  // ... 기존 create quote, providerResponses, quoteRequests (3 write)

  // 🆕 thread upsert · 재제출 시 unread 중복 증가 방지
  const threadId = `${input.requestId}_${providerId}`;
  const threadRef = adminDb.collection("threads").doc(threadId);
  const existingThread = await tx.get(threadRef);

  const basePayload = {
    clientUid,
    providerId,
    providerOwnerUid,
    requestId: input.requestId,
    quoteId,
    companyName,
    clientDisplayName,
  };

  if (existingThread.exists) {
    // 재제출: quoteId 업데이트만 · 기존 unread/lastMessage* 그대로 (이미 읽었을 수 있음)
    tx.update(threadRef, {
      ...basePayload,
      // createdAt · unreadBy* · lastMessage* 미변경
    });
  } else {
    // 신규: 초기 1건 unread + "견적 도착" preview
    tx.create(threadRef, {
      ...basePayload,
      lastMessageAt: null,
      lastMessagePreview: "견적이 도착했어요 · 협의를 시작하세요",
      lastMessageSenderUid: null,
      unreadByClient: 1,
      unreadByProvider: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
});
```

**TX reads 5개 + writes 4개** (기존 2R/3W + 신규 provider/client/thread-existing read + thread create-or-update write). Firestore `runTransaction` 제한 (500 writes) 내 충분.

**`lastMessageAt: null` 정렬 동작**: Firestore `orderBy('lastMessageAt', 'desc')`에서 null은 **smallest**로 취급 → 리스트 하단. 신규 thread는 메시지 없으므로 하단 배치가 의도된 UX (이미 협의 중인 thread가 상단). ThreadRow는 `lastMessageAt===null`일 때 "새 견적" 배지 · `lastMessagePreview` "견적이 도착했어요 · 협의를 시작하세요" 그대로 노출.

### 4.5 Existing maskName 재활용
- `workCaseRepository` (v1.1b #2)에 `maskName` util 이미 존재 · import 재활용

---

## 5. UI / UX Design

### 5.1 `/chat` 목록

```
┌─────────────────────────────────────────┐
│ 채팅                          [로그아웃]     │
│                                          │
│ 전체 (N)                                 │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │  [avatar] 스마트클린               🔴 3│    │
│ │  "30평 기준 25만원 가능합니다..."     │    │
│ │  5분 전                             │    │
│ └──────────────────────────────────┘    │
│ ┌──────────────────────────────────┐    │
│ │  [avatar] 청광 직영                    │    │
│ │  "견적이 도착했어요 · 협의를…"        │    │
│ │  1시간 전                           │    │
│ └──────────────────────────────────┘    │
│                                          │
│ (empty 상태)                              │
│ 💬 아직 채팅이 없어요                      │
│ 청명의 견적이 오면 여기서 협의할 수 있어요  │
└─────────────────────────────────────────┘
```

### 5.2 `/chat/{threadId}` 상세

```
┌─────────────────────────────────────────┐
│ ← 스마트클린              견적 45만원      │  ThreadHeader
├─────────────────────────────────────────┤
│ 📎 견적: 30평 입주청소                     │  PinnedQuoteCard
│    총 45만원 · 상세보기 →                  │
├─────────────────────────────────────────┤
│                                          │
│                            안녕하세요 🙂  │  my bubble (right)
│                                  1분 전  │
│                                          │
│  네, 무엇을 도와드릴까요?                  │  counterpart (left)
│  방금 전                                  │
│                                          │
│                                          │
├─────────────────────────────────────────┤
│ [ 메시지를 입력하세요...           ] [↑]  │  MessageComposer
└─────────────────────────────────────────┘
```

### 5.3 Component List

| # | Component | Type | Location |
|---|-----------|------|----------|
| 1 | ThreadsListClient | Client · onSnapshot | `components/chat/ThreadsListClient.tsx` |
| 2 | ThreadRow | Client · Link | 동일 |
| 3 | ThreadDetailClient | Client · onSnapshot + markAsRead | 동일 |
| 4 | MessageBubble | Client · dumb | 동일 |
| 5 | MessageComposer | Client · send | 동일 |
| 6 | ThreadHeader | Server · 상대명 + quote 배지 | 동일 |
| 7 | PinnedQuoteCard | Server · quote 요약 | 동일 |
| 8 | EmptyThreadsHint | Client · placeholder | 동일 |
| 9 | ChatUnreadWrapper | Client · layout.tsx 주입 | 동일 |

**9 컴포넌트 · Server 2 / Client 7**.

> 왜 Server 2만? ThreadHeader/PinnedQuoteCard는 Server shell의 initial render에서 quote summary를 바로 표시하기 위함. 나머지 목록/메시지/composer는 realtime 구독 필요 → Client.

### 5.4 Empty State

- `/chat` threads.length === 0 → EmptyThreadsHint ("아직 채팅이 없어요" + 홈/받은견적 링크)
- `/chat/{threadId}` messages.length === 0 → "아직 주고받은 메시지가 없어요. 먼저 인사를 건네보세요" + composer 즉시 사용 가능

### 5.5 Relative time
- `MessageBubble`: `formatRelative(createdAtMs)` · 1분 이내 "방금 전" · 24시간 내 "N시간 전" · else `toLocaleDateString('ko-KR')`
- **공용 util로 추출**: `src/lib/format/relative-time.ts` 🆕 — provider-dashboard의 `RequestPreviewCard`에서 이미 같은 로직 중복 · 이번 cycle에서 추출 + 기존 caller migrate. (Phase 8 "duplicate code" 원칙 준수)

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 비로그인 /chat | proxy.ts `/chat/:path*` matcher → `/login?next=/chat` |
| 비 participant /chat/{id} | Server shell threadRepository null → `notFound()` |
| sendMessage 비 participant | Server Action TX FORBIDDEN |
| text 빈 값 | Zod 거부 + composer send 버튼 disable |
| text 2001자 | Zod 거부 + counter 표시 |
| thread 없음 (URL 직접 입력) | notFound() |
| onSnapshot 권한 오류 | Firestore rules 차단 · Client console.warn · silent fail (v1) |
| onSnapshot 네트워크 끊김 | Firestore 자동 reconnect (snap.metadata.fromCache 활용 가능 v1.2b) |
| submitQuote TX 확장 부분 실패 | 전체 rollback · 기존 동작 보존 |

---

## 7. Security

- **Firestore rules 2중 방어**: Client onSnapshot read = participant only · Write = Admin SDK only
- **Server Action participant check**: `tx.get(thread)` + uid 비교 · rules 우회 불가
- **Text sanitize**: Zod 길이 · React 기본 escape · HTML 렌더 없음
- **providerOwnerUid denormalize**: rules가 thread 문서만 읽어 참가자 판단 가능 (추가 fetch 불필요)
- **Rate limit**: v1 생략 · v1.2b 검토

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/chat/page.tsx` · `app/chat/[threadId]/page.tsx` · `ThreadHeader` · `PinnedQuoteCard` |
| Presentation Client | `ThreadsListClient` · `ThreadRow` · `ThreadDetailClient` · `MessageBubble` · `MessageComposer` · `EmptyThreadsHint` · `ChatUnreadWrapper` |
| Application | `app/actions/chat-actions.ts` (2 Server Actions) + `app/actions/quote-response-actions.ts submitQuote` 확장 |
| Domain | `types/chat.ts` · `domain/chat-schemas.ts` · `lib/quote/thread-upsert.ts` (pure) |
| Infrastructure | `lib/firebase/thread-repository.ts` · 기존 `quoteRepository` / `providerRepository` / `userRepository` 재활용 · `lib/firebase/client.ts` clientDb (onSnapshot 전용) |

---

## 9. Convention

- `"use server"` / `"use client"` 명시
- Import order: external → `@/...` → relative → type
- ARIA: thread list `role="list"` · thread row `role="listitem"` · composer `aria-label="메시지 입력"` · send button `aria-label="메시지 전송"`
- PascalCase components · camelCase utils

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── chat/page.tsx                          🔄 placeholder → shell
│   ├── chat/[threadId]/page.tsx               🆕 Server shell + guard
│   └── actions/
│       ├── chat-actions.ts                    🆕 sendMessage · markThreadAsRead
│       └── quote-response-actions.ts          🔄 submitQuote TX에 thread upsert
│
├── components/chat/                            🆕 폴더 (9 components)
│   ├── ThreadsListClient.tsx                  🆕 Client
│   ├── ThreadRow.tsx                          🆕 Client
│   ├── ThreadDetailClient.tsx                 🆕 Client
│   ├── MessageBubble.tsx                      🆕 Client
│   ├── MessageComposer.tsx                    🆕 Client
│   ├── ThreadHeader.tsx                       🆕 Server
│   ├── PinnedQuoteCard.tsx                    🆕 Server
│   ├── EmptyThreadsHint.tsx                   🆕 Client
│   └── ChatUnreadWrapper.tsx                  🆕 Client · layout.tsx 주입
│
├── types/
│   └── chat.ts                                🆕
│
├── domain/
│   └── chat-schemas.ts                        🆕
│
├── lib/firebase/
│   └── thread-repository.ts                   🆕 server-only · Admin SDK
│
├── lib/quote/
│   └── thread-upsert.ts                       🆕 pure helper (buildThreadPayload)
│
├── lib/format/
│   └── relative-time.ts                       🆕 공용 formatRelative util (provider-dashboard와 공유)
│
├── app/layout.tsx                             🔄 <ChatUnreadWrapper> 삽입
│
├── proxy.ts                                   🔄 `/chat/:path*` matcher 추가
│
├── firestore.rules                            🔄 threads · messages rules
│
└── firestore.indexes.json                     🔄 3 indexes
```

### 10.2 Implementation Order (10 steps)

1. **types/chat.ts** + **domain/chat-schemas.ts** + **firestore.rules** + **firestore.indexes.json** · `firebase deploy --only firestore:rules,firestore:indexes`
2. **proxy.ts** `/chat/:path*` matcher 추가
3. **lib/firebase/thread-repository.ts** (getWithParticipantCheck)
4. **lib/quote/thread-upsert.ts** (buildThreadPayload pure)
5. **app/actions/chat-actions.ts** (sendMessage · markThreadAsRead)
6. **quote-response-actions.ts submitQuote TX 확장** (provider + client fetch + thread upsert)
7. **components/chat/** shell: MessageBubble · MessageComposer · EmptyThreadsHint · ThreadRow
8. **ThreadsListClient** + **app/chat/page.tsx** (Server shell)
9. **ThreadHeader** + **PinnedQuoteCard** + **ThreadDetailClient** + **app/chat/[threadId]/page.tsx**
10. **ChatUnreadWrapper** + **layout.tsx 주입** + **Wiring**:
    - `QuoteCompareCard.tsx`에 **"문의하기" 버튼 신규 추가** (기존 "수락하기" 버튼 옆 secondary CTA로 · footer section)
      → Link href=`/chat/{requestId}_{providerId}` (threadId는 Client에서 구성)
      → 조건: thread는 submitQuote 시 자동 생성됐으므로 quote.status==='sent' 이면 항상 노출
    - `QuoteProposalForm.tsx` submit 성공 후 `router.push('/chat/{threadId}')` 또는 toast + CTA
    - `TriageClient.tsx` `handleAsk`의 toast "v1.2 추가됩니다" 제거 + 해당 버튼 enable + Link로 변환
    - smoke test (end-to-end quote → chat flow)

### 10.3 Pre-flight 체크리스트

- [ ] Firestore rules 배포 · 비 participant read 차단 확인
- [ ] Firestore 3 indexes 배포 · Enabled 확인
- [ ] proxy.ts matcher 포함
- [ ] 청명이 quote 제출 → 양쪽 `/chat` 목록에 thread 즉시 노출 (onSnapshot)
- [ ] Client send → counterpart 500ms 이내 수신
- [ ] BottomTabNav 채팅 탭 배지 unread 합산 정확
- [ ] 다른 uid로 URL 직접 접근 → notFound
- [ ] 200+ 메시지 · 최신 200만 표기

---

## 11. Next.js 16 Specific

### 11.1 Cache Components
- `/chat` shell은 `cookies()` 호출 → Suspense 내부 (기존 패턴)
- `/chat/{threadId}` shell은 `cookies()` + threadRepository fetch → 동적 렌더

### 11.2 `await connection()` 패턴 (client-dashboard 학습 반영)
- `/chat/*` 는 auth-required dynamic route · `cookies()` 호출이 이미 dynamic 전환 보장 → `connection()` 불필요
- Server 컴포넌트에서 Firestore fetch 전 cookies 호출만 있으면 OK

### 11.3 onSnapshot + useEffect cleanup
```ts
useEffect(() => {
  const unsub = onSnapshot(q, handle, handleError);
  return () => unsub();  // 필수
}, [deps]);
```

### 11.4 revalidatePath 불필요
- sendMessage/markThreadAsRead는 Client onSnapshot이 자동 반영 · revalidate 없음

---

## 12. Test Plan (20건 확장)

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /chat | /login?next=/chat redirect (proxy) |
| 2 | client role · threads 0 | EmptyThreadsHint |
| 3 | client role · threads 3 | 목록 + unread badge |
| 4 | provider role · 자기 thread만 | 보안 격리 |
| 5 | Quote 제출 → thread 자동 생성 | 양쪽 onSnapshot 즉시 반영 · client unread=1 |
| 6 | Client 진입 /chat/{id} | unreadByClient=0 |
| 7 | Provider 진입 /chat/{id} | unreadByProvider=0 |
| 8 | Client "안녕" send | Provider thread lastPreview/unread+1 실시간 반영 |
| 9 | Non-participant /chat/{id} | notFound |
| 10 | 비 participant sendMessage 시도 | FORBIDDEN |
| 11 | text 빈 | Zod 거부 · send disable |
| 12 | text 2001자 | Zod 거부 |
| 13 | Thread list lastMessageAt DESC 정렬 | 최신 thread 상단 |
| 14 | BottomTabNav 채팅 탭 badge | 모든 미읽음 합산 |
| 15 | Messages 200건 초과 | 최신 200건만 |
| 16 | Quote 수정 재제출 | 동일 threadId merge · 중복 없음 |
| 17 | onSnapshot unmount cleanup | memory leak 없음 (dev tools 확인) |
| 18 | Firestore rules · non-participant onSnapshot | permission-denied 로그 · UI 빈 상태 |
| 19 | 200자 초과 lastMessagePreview | `.slice(0,80)` 적용 |
| 20 | PinnedQuoteCard Link | /received/{requestId} (의뢰인) · /provider/requests/{requestId}/propose (청명) |
| 21 | Quote 재제출 unread 보존 | 기존 unreadByClient/unreadByProvider 값 불변 · lastMessage* 불변 (기존 읽음 상태 존중) |
| 22 | threadId regex 검증 | `^[a-z0-9]{16}_[A-Za-z0-9]{20}$` · 실제 requestId+providerId 결합 허용 / 잘못된 형식 거부 |
| 23 | `lastMessageAt: null` 정렬 | 신규 thread는 orderBy desc의 하단 배치 (Firestore null 최소 취급) |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 12건 해소. Firestore onSnapshot v1.2 첫 도입 · Quote 기반 thread 자동 생성 · 9 컴포넌트 (Server 2 / Client 7) · 2 Server Actions · submitQuote TX 4-read 4-write 확장 · Firestore rules + 3 indexes · BottomTabNav unread badge · proxy matcher 확장 · Test Plan 20건 · Implementation Order 10-step | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 97% 피드백 반영 (5건): (1) threadId 정규식 tighten `^[a-z0-9]{16}_[A-Za-z0-9]{20}$` + 단일 상수 (2) C18 wiring 명시: QuoteCompareCard "문의하기" 버튼 **신규 추가** (기존 disabled 아님 · grep 확인) · TriageClient handleAsk enable · QuoteProposalForm 제출 후 CTA (3) Firestore rules `get()` 최적화 (`in` 배열 · 가독성) (4) submitQuote TX thread upsert에 **re-submit 시 unread 보존** 분기 로직 (기존 increment 제거) + TX reads 5/writes 4 (5) `lastMessageAt: null` 정렬 동작 명시 (신규 thread 하단 배치 의도) · `formatRelative` 공용 util 추출 (`lib/format/relative-time.ts`) · Test #21-23 추가 · proxy matcher 기존 5개 보존 명시 | Seokho Lee |
