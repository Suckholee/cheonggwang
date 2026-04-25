---
template: design
version: 0.1
feature: booking
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# booking Design Document

> **Summary**: chat-centric 1-step 일정 확정 · `bookings` 컬렉션 신규 · Server Action 1개 TX 3R/4W · MessageType `"text"|"system"` 확장 · 12 components · `/provider/works` placeholder 교체 · 1 Firestore index · v1.3 #1 · 🏆 마켓 루프 종결.
>
> **Plan**: [booking.plan.md](../../01-plan/features/booking.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** BookingStatusBanner 위치 | **Pinned QuoteCard 위**. 최신 상태 우선 · quote는 참조용. ThreadHeader → Banner → PinnedQuoteCard → Messages 순 |
| **Q2** 고객 일정 변경 요청 | **v1은 text 메시지로만** · v1.3b에서 `type: 'scheduleChangeRequest'` rich type 도입 |
| **Q3** scheduledAt 과거 시각 | **Zod + server-side 검증** · `scheduledAt >= now - 5min` (작은 clock drift 허용) · client `<input type="datetime-local" min={nowPlus5min}/>` |
| **Q4** quote status 'cancelled' 등 불가 상태 | Server Action INVALID_STATE · quote.status ∈ `['sent', 'accepted']`만 허용 |
| **Q5** 재확정 시도 | INVALID_STATE · quote.status === 'booked' 이미 확정 · "이미 확정된 일정입니다" 메시지 |
| **Q6** booking delete | **v1 제외** · 관리자 툴에서만 · v2+ admin dashboard |
| **Q7** /provider/works 100+ 결과 | `listForProvider(providerId, 100)` · snap.size >= 100 → console.warn + `v1.3b paginate 필요` |
| **Q8** BookingListSection 빈 bucket | **section 전체 숨김** (제목+카드 전부) · 전체 0건만 WorksEmptyState 렌더 |
| **Q9** ThreadHeader badge 위치 | booking 있을 때 **quoteAmount 대체** (두 배지 중복 회피) · "✅ 4/22(월) 14:00" 단독 표시 |
| **Q10** system 메시지 senderUid | 청명 uid (createdBy) 저장 · UI는 `senderRole==='system'` 또는 `type==='system'` 기준 중앙 정렬 · avatar 숨김 |

---

## 1. Overview

### 1.1 Design Goals
- **chat-centric** · 사용자 맥락 유지 · realtime onSnapshot 자동 반영
- **1-step 단순** · v1은 상태 전이 없음 (생성 = 확정)
- Firestore rules 2중 방어 (Client onSnapshot read + Server Action participant check)
- `bookings` 컬렉션 denormalization으로 조회 시 join 회피
- MessageType 확장은 기존 chat 호환 (default "text")

### 1.2 Principles
- Server shell + Client Modal (datetime input)
- Admin SDK 독점 write
- Denormalized 필드 (companyName · clientDisplayName · category · regionLabel · totalAmount) snapshot at creation
- Pure helpers: `booking-schemas.ts` Zod, `booking-day-bucket.ts` day grouping

---

## 2. Architecture

### 2.1 confirmBooking Server Action (TX 3R/4W)

```
POST confirmBooking({threadId, scheduledAt, memo})

1. Zod parse
2. verifySessionCookie → uid
3. TX:
   a. tx.get(thread)
      · 없음 → FORBIDDEN
      · providerOwnerUid !== uid → FORBIDDEN (청명 only)
   b. tx.get(quote) via thread.quoteId
      · null → FORBIDDEN
      · quote.status === 'booked' → INVALID_STATE "이미 확정된 일정"
      · quote.status ∉ ['sent', 'accepted'] → INVALID_STATE
   c. tx.get(request) via thread.requestId
      · null → INVALID_STATE
   d. Denorm 준비:
      bookingId = adminDb.collection("bookings").doc().id
      scheduledDate = new Date(scheduledAt)
      scheduledLabel = formatScheduledLabel(scheduledDate)
      messageText = `🗓️ ${scheduledLabel} 일정이 확정됐어요`
      + (memo ? `\n${memo}` : "")
      regionLabel = `${request.region.city} ${request.region.district}`
   e. **Denorm fail-fast**: providerOwnerUid · clientUid · companyName · clientDisplayName이 thread에 없으면 `INTERNAL_ERROR` (validator #10 fix).
      tx.create(bookings/{bookingId}, {
        quoteId, requestId, threadId, providerId, providerOwnerUid,
        clientUid, companyName (thread.companyName),
        clientDisplayName (thread.clientDisplayName),
        category (request.category), regionLabel,
        scheduledAt: Timestamp.fromDate(scheduledDate),
        totalAmount (quote.totalAmount), memo: memo ?? null,
        status: 'confirmed', createdBy: uid,
        createdAt: serverTimestamp
      })
   f. tx.update(quote, {
        status: 'booked',
        acceptedAt: quote.acceptedAt ?? FieldValue.serverTimestamp(),
      })
   g. tx.update(request, { status: 'booked' })
   h. tx.create(messages/{newId}, {
        threadId, senderUid: uid, senderRole: 'provider',
        type: 'system', text: messageText,
        createdAt: serverTimestamp
      })
   i. tx.update(thread, {
        lastMessageAt: serverTimestamp,
        lastMessagePreview: messageText.slice(0, 80),
        lastMessageSenderUid: uid,
        unreadByClient: FieldValue.increment(1),
      })
4. return {ok, data: {bookingId}}
```

**TX reads 3 / writes 5**: reads = thread · quote · request · writes = booking.create + quote.update + request.update + message.create + thread.update. Plan §1.5에 "3R/4W"로 표기됐으나 chat integration thread.update 포함 시 5W가 정확. (Plan doc은 archive 시점 notation 보정 — 본 Design이 authoritative.)

### 2.2 `/chat/{threadId}` 확장

```
Server shell (기존 확장):
  1. auth + thread + quote/request + 🆕 bookingRepository.findByQuoteId(quoteId)
  2. Render:
     <ThreadHeader counterpartName role
                   quoteAmount={booking ? null : summary?.totalAmount}
                   booking={booking ? toBannerDTO(booking) : null}/>
     {booking && <BookingStatusBanner banner={toBannerDTO(booking)}/>}
     <PinnedQuoteCard summary={summary} role/>
     <ThreadDetailClient threadId uid
                         canConfirmBooking={role==='provider' && !booking}/>
```

### 2.3 `/provider/works` shell

```
Server shell:
  1. cookies → uid + userRepository.get → providerId
  2. const bookings = await bookingRepository.listForProvider(providerId)
  3. const items = bookings.map(toBookingListItemDTO)
  4. const groups = groupByDayBucket(items) // 4 buckets
  5. Render:
     {allEmpty ? <WorksEmptyState/> : (
       <>
         {groups.today && <BookingListSection bucket="today" items={groups.today}/>}
         {groups.tomorrow && ...}
         {groups.thisWeek && ...}
         {groups.past && ...}
       </>
     )}
```

### 2.4 `/received/{requestId}` 확장

```
Server (기존 확장):
  const bookings = await Promise.all(
    quotes.map(q => bookingRepository.findByQuoteId(q.id))
  );
  const bookingByQuoteId = new Map(
    bookings.filter((b): b is Booking => b !== null).map(b => [b.quoteId, b])
  );

  {quotes.map(q => (
    <QuoteCompareCard
      quote={q}
      provider={providers.get(q.providerId)}
      requestStatus={request.status}
      booking={bookingByQuoteId.get(q.id) ?? null}   // 🆕
    />
  ))}
```

---

## 3. Data Model

### 3.1 Firestore Collection 🆕

`bookings/{bookingId}`:
| Field | Type | 비고 |
|-------|------|------|
| quoteId | string | |
| requestId | string | |
| threadId | string | `${requestId}_${providerId}` (chat 링크) |
| providerId | string | |
| providerOwnerUid | string | denorm · rules 참조 |
| clientUid | string | denorm · rules 참조 |
| companyName | string | snapshot (thread에서) |
| clientDisplayName | string | snapshot masked (thread에서) |
| category | QuoteCategory | snapshot (request에서) |
| regionLabel | string | snapshot "서울 강남구" |
| scheduledAt | Timestamp | |
| totalAmount | number | snapshot (quote에서) |
| memo | string \| null | max 200 |
| status | "confirmed" | v1 literal |
| createdBy | string | 청명 uid |
| createdAt | Timestamp | serverTimestamp |

**Document ID**: Firestore auto ID (20 char alphanumeric)

### 3.2 Firestore Rules 🆕

```javascript
match /bookings/{bookingId} {
  allow read: if request.auth != null
              && (
                resource.data.clientUid == request.auth.uid
                || resource.data.providerOwnerUid == request.auth.uid
              );
  allow write: if false;  // Admin SDK only
}
```

### 3.3 Firestore Index 🆕 (1개)

```json
{ "collectionGroup": "bookings", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "providerId", "order": "ASCENDING" },
  { "fieldPath": "scheduledAt", "order": "DESCENDING" }
]}
```

### 3.4 Types (`src/types/booking.ts`) 🆕

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export type BookingStatus = "confirmed"; // v1 literal

export interface Booking {
  id: string;
  quoteId: string;
  requestId: string;
  threadId: string;
  providerId: string;
  providerOwnerUid: string;
  clientUid: string;
  companyName: string;
  clientDisplayName: string;
  category: QuoteCategory;
  regionLabel: string;
  scheduledAt: Date;
  totalAmount: number;
  memo: string | null;
  status: BookingStatus;
  createdBy: string;
  createdAt: Date;
}

// Server → Client
export interface BookingBannerDTO {
  scheduledAtMs: number;
  scheduledLabel: string;
  memo: string | null;
}

export type DayBucket = "today" | "tomorrow" | "thisWeek" | "later" | "past";

export interface BookingListItemDTO {
  id: string;
  threadId: string;
  counterpartName: string; // provider 관점: clientDisplayName
  category: QuoteCategory;
  regionLabel: string;
  scheduledAtMs: number;
  scheduledLabel: string;
  totalAmount: number;
  memo: string | null;
  bucket: DayBucket;
}
```

### 3.5 MessageType 확장 (`types/chat.ts`)

```ts
// v1.2 original
// export type MessageType = "text";

// v1.3 확장
export type MessageType = "text" | "system";
```

기존 text 메시지 그대로 호환. system은 booking 같은 서버 생성 메시지 전용.

### 3.6 Quote / QuoteRequest 기존 필드 활용
- `quote.status` → `'booked'` 전이 (기존 QuoteStatus `'booked'` 이미 존재 · quote-status.ts)
- `quote.acceptedAt` → null이면 serverTimestamp 채움 (idempotent)
- `quoteRequest.status` → `'booked'` 전이

---

## 4. API Specification

### 4.1 confirmBooking Server Action

`src/app/actions/booking-actions.ts` 🆕

```ts
"use server";

export interface ConfirmBookingInput {
  threadId: string;
  scheduledAt: string; // ISO datetime string
  memo: string | null;
}

export async function confirmBooking(
  input: ConfirmBookingInput,
): Promise<ActionResult<{ bookingId: string }>>;
```

**TX 흐름**: §2.1 참조. `resolveUid` helper 재활용 (chat-actions 패턴).

**revalidatePath**: 불필요 (chat onSnapshot 자동) · but `/provider/works`와 `/received/{requestId}`는 정적이므로 `revalidatePath('/provider/works')` + `revalidatePath(\`/received/${requestId}\`)` 추가.

### 4.2 Zod Schema (`src/domain/booking-schemas.ts`) 🆕

```ts
import { z } from "zod";
import { THREAD_ID_REGEX } from "@/domain/chat-schemas";

const FIVE_MIN_MS = 5 * 60 * 1000;

export const confirmBookingInputSchema = z.object({
  threadId: z.string().regex(THREAD_ID_REGEX, "유효하지 않은 threadId"),
  // Client는 BookingConfirmModal submit 시 `new Date(input).toISOString()`로 offset 포함 ISO 전송.
  // Zod는 loose datetime 허용 (client serialize 보장 후 server 검증).
  scheduledAt: z
    .string()
    .min(1, "일정을 선택해 주세요")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "유효하지 않은 일정")
    .refine(
      (v) => new Date(v).getTime() >= Date.now() - FIVE_MIN_MS,
      "과거 시각은 확정할 수 없어요",
    ),
  memo: z.string().trim().max(200, "200자 이하로 작성해 주세요").nullable(),
});

export type ConfirmBookingInput = z.infer<typeof confirmBookingInputSchema>;
```

### 4.3 `bookingRepository` (Admin SDK · `src/lib/firebase/booking-repository.ts`) 🆕

```ts
export const bookingRepository = {
  /** v1.3 #1 booking — provider 작업 탭 목록 (최대 100) */
  async listForProvider(
    providerId: string,
    limit = 100,
  ): Promise<Booking[]>;

  /** v1.3 #1 booking — quote당 1 booking 조회 (singleton guarantee by quote.status='booked' idempotency + .limit(1) 방어) */
  async findByQuoteId(quoteId: string): Promise<Booking | null>;

  /** v1.3 #1 booking — participant 검증 포함 조회 */
  async getWithParticipantCheck(
    bookingId: string,
    uid: string,
  ): Promise<Booking | null>;

  /** v1.3 #1 booking — 재확정 방지 check (optional · TX 외부) */
  async existsForQuote(quoteId: string): Promise<boolean>;
};
```

### 4.4 Pure helper (`src/domain/booking-day-bucket.ts`) 🆕

```ts
export type DayBucket = "today" | "tomorrow" | "thisWeek" | "past";

export type DayBucket = "today" | "tomorrow" | "thisWeek" | "later" | "past";

export function computeDayBucket(
  scheduledAtMs: number,
  now: number = Date.now(),
): DayBucket {
  // KST 기준 day 경계 · 오늘 00:00 KST (UTC에서 9h 빼기)
  const kstNow = new Date(now + 9 * 3600 * 1000);
  const startOfTodayKst =
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
    ) - 9 * 3600 * 1000;
  const startOfTomorrow = startOfTodayKst + 24 * 3600 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 3600 * 1000;
  const startOfNextWeek = startOfTodayKst + 7 * 24 * 3600 * 1000;

  if (scheduledAtMs < startOfTodayKst) return "past";
  if (scheduledAtMs < startOfTomorrow) return "today";
  if (scheduledAtMs < startOfDayAfter) return "tomorrow";
  if (scheduledAtMs < startOfNextWeek) return "thisWeek"; // 2일 후 ~ 7일 이내
  return "later"; // 7일 초과 미래 (validator fix · catch-all 버킷 분리)
}

export function formatScheduledLabel(ms: number): string {
  const kst = new Date(ms + 9 * 3600 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${m}/${d}(${dow}) ${h}:${min}`;
}
```

### 4.5 groupByDayBucket (Server helper · `provider/works/page.tsx` 내부)

```ts
function groupByDayBucket(
  items: BookingListItemDTO[],
): Record<DayBucket, BookingListItemDTO[] | null> {
  const result: Record<DayBucket, BookingListItemDTO[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    past: [],
  };
  for (const item of items) {
    result[item.bucket].push(item);
  }
  // 빈 bucket은 null로 (렌더 skip)
  return {
    today: result.today.length ? result.today : null,
    tomorrow: result.tomorrow.length ? result.tomorrow : null,
    thisWeek: result.thisWeek.length ? result.thisWeek : null,
    past: result.past.length ? result.past : null,
  };
}
```

---

## 5. UI / UX Design

### 5.1 Chat Thread (booking 있을 때)

```
┌─────────────────────────────────────────┐
│ ← 스마트클린        ✅ 4/22(월) 14:00      │  ThreadHeader (booking 배지)
├─────────────────────────────────────────┤
│ 🗓️ 일정 확정                              │  BookingStatusBanner (신규)
│    4/22(월) 14:00                         │
│    메모: 엘리베이터 이용 가능              │
├─────────────────────────────────────────┤
│ 📎 견적: 30평 입주청소                     │  PinnedQuoteCard (기존)
│    총 45만원 · 상세보기 →                  │
├─────────────────────────────────────────┤
│ [일반 메시지 버블들 · right/left]          │
│                                          │
│     🗓️ 4/22(월) 14:00 일정이 확정됐어요     │  System 메시지 (중앙 gray)
│        엘리베이터 이용 가능                 │
│                                          │
├─────────────────────────────────────────┤
│ [메시지 입력]                    [↑]      │  MessageComposer (기존)
└─────────────────────────────────────────┘
```

### 5.2 Chat Thread (booking 없음 · 청명 view)

```
┌─────────────────────────────────────────┐
│ ← 김영희 고객        견적 45만원            │  ThreadHeader
├─────────────────────────────────────────┤
│ 📎 견적: 30평 입주청소                     │  PinnedQuoteCard
├─────────────────────────────────────────┤
│ [메시지들]                               │
│                                          │
│ ⚡ 빠른 액션                              │  ThreadActionButtons (신규 · 청명 only)
│ [📅 일정 확정]                            │
├─────────────────────────────────────────┤
│ [메시지 입력]                    [↑]      │
└─────────────────────────────────────────┘
```

### 5.3 BookingConfirmModal

```
┌─────────────────────────────────────────┐
│ 일정 확정하기                    [✕]       │
│                                          │
│ 방문 일시                                │
│ [ 2026-04-22T14:00        ]               │  datetime-local
│                                          │
│ 메모 (선택 · 200자)                       │
│ ┌────────────────────────────────────┐  │
│ │ 엘리베이터 이용 가능 · 주차 가능      │  │  textarea
│ └────────────────────────────────────┘  │
│                                          │
│ 확정하시면 고객에게 알림이 갑니다 · 변경은 │
│ 현재 지원되지 않아요 (곧 추가 예정)         │
│                                          │
│ [          일정 확정          ]           │  submit button
└─────────────────────────────────────────┘
```

### 5.4 `/provider/works` 레이아웃

```
┌─────────────────────────────────────────┐
│ 작업 관리                                 │  header
│                                          │
│ 오늘                                     │  BookingListSection bucket=today
│ ┌──────────────────────────────────┐    │
│ │ 김*희 고객 · 🏠 입주청소           │    │  BookingCard
│ │ 4/22(월) 14:00 · 서울 강남구        │    │
│ │ 45만원                            │    │
│ │                         [채팅 →]  │    │
│ └──────────────────────────────────┘    │
│                                          │
│ 내일                                     │  BookingListSection bucket=tomorrow
│ ┌──────────────────────────────────┐    │
│ │ ...                              │    │
│ └──────────────────────────────────┘    │
│                                          │
│ 이번주                                   │  (비어있으면 섹션 숨김)
│                                          │
│ 지난 작업                                 │
│ ┌──────────────────────────────────┐    │
│ │ ...                              │    │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘

전체 0건:
┌─────────────────────────────────────────┐
│ 📋 아직 확정된 일정이 없어요               │
│ 고객과 채팅에서 일정을 확정해 보세요       │
│ [받은 요청 보기 →]                        │
└─────────────────────────────────────────┘
```

### 5.5 `/received/{requestId}` 카드 확장

```
기존 QuoteCompareCard 하단 footer에 추가:
┌─────────────────────────────────────────┐
│ 스마트클린                                 │
│ 45만원                                   │
│ ⏰ 4/22(화) 14:00 · 약 3시간              │
│ [항목들...]                              │
├─────────────────────────────────────────┤
│ ✅ 수락됨                                 │  (기존)
│ ✅ 일정 확정 · 4/22(월) 14:00             │  🆕 BookingBadge
│ [💬 문의하기]                             │  (기존 v1.2)
└─────────────────────────────────────────┘
```

### 5.6 System Message 렌더링 (MessageBubble 확장)

기존 `MessageBubble` (Client)에 `type === "system"` 분기 추가:

```
왼쪽/오른쪽 bubble 대신 **중앙 정렬** · **gray bg** · **icon prefix** (🔔 또는 🗓️)
- no avatar
- no left/right offset
- 좌우 max-w-xs 가운데 정렬
- padding 축소 (text-xs)
- 시각 표시: 우측 하단 `formatRelativeTime(createdAtMs)` (기존 util)
```

기존 `type === "text"` 분기는 변경 없음. 새 literal 추가는 exhaustive check 호환 (`switch` 또는 `if/else`).

### 5.7 ThreadHeader booking 배지 + PinnedQuoteCard 유지

- booking 있을 때 ThreadHeader의 `quoteAmount` 표시 자리를 **booking 배지**(`✅ 4/22(월) 14:00`)로 대체
- PinnedQuoteCard는 **그대로 유지** (총 금액 정보 보존 · 견적 상세 Link 유지)
- 두 영역은 **독립적 렌더** (Header는 상태 · Card는 내용)

### 5.8 BookingConfirmModal state mechanism

**`useActionState` (React 19 · Next.js 16)** 사용 — chat-actions 제출 패턴과 일관:

```tsx
const [state, submitAction, isPending] = useActionState(
  async (prev, formData: FormData) => {
    const scheduledAtLocal = formData.get("scheduledAt") as string;
    const memo = (formData.get("memo") as string | null) || null;
    const scheduledAtISO = new Date(scheduledAtLocal).toISOString();
    return confirmBooking({ threadId, scheduledAt: scheduledAtISO, memo });
  },
  { ok: false, code: "", message: "" } as ActionResult<...>,
);
```

datetime-local → `new Date().toISOString()` serialize로 offset 포함 ISO 전송 (Zod refine 통과).

### 5.9 Component List

| # | Component | Type | Location |
|---|-----------|:----:|----------|
| 1 | BookingConfirmButton | Client · modal trigger | `components/booking/BookingConfirmButton.tsx` |
| 2 | BookingConfirmModal | Client · form + submit | 동일 |
| 3 | BookingStatusBanner | Server | 동일 |
| 4 | BookingBadge | Server | 동일 |
| 5 | BookingListSection | Server · group header | 동일 |
| 6 | BookingCard | Client · Link to chat | 동일 |
| 7 | WorksEmptyState | Client · Link | 동일 |
| 8 | ThreadActionButtons | Client · 청명 전용 | `components/chat/ThreadActionButtons.tsx` |
| 9 | MessageBubble (확장) | Client · system type 추가 | 기존 수정 |
| 10 | ThreadHeader (확장) | Server · booking 배지 추가 | 기존 수정 |
| 11 | QuoteCompareCard (확장) | Client · booking prop 추가 | 기존 수정 |
| 12 | `/provider/works/page.tsx` | Server shell | 기존 교체 |

**12 components · 총 7 신규 + 3 기존 수정 + 1 page 교체 + 1 page 확장** (`/chat/[threadId]`).

**Server 5 / Client 7 분류** (Plan의 4/5 추정 대비 Client 7 — Modal/ActionButtons/Card 모두 Client 필요).

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 비로그인 /provider/works | `/login?next=/provider/works` (proxy · 기존) |
| 청명 role 없음 | /signup-provider redirect |
| provider record 없음 | /signup-provider redirect |
| confirmBooking · 비 청명 | FORBIDDEN |
| confirmBooking · quote.status='booked' | INVALID_STATE "이미 확정된 일정입니다" |
| confirmBooking · quote.status='cancelled' | INVALID_STATE "취소된 견적에는 일정을 확정할 수 없어요" |
| confirmBooking · scheduledAt 과거 | Zod INVALID_INPUT |
| confirmBooking · memo 201자 | Zod INVALID_INPUT |
| listForProvider 실패 (인덱스 빌드 중) | try/catch → empty + console.warn → WorksEmptyState |
| 비 participant /booking URL 접근 | bookings 컬렉션에 직접 URL 없음 (v1) · N/A |
| findByQuoteId 실패 | null return → QuoteCompareCard에 booking 표시 안 함 |
| 100+ listForProvider | `snap.size >= 100` → console.warn `[booking] paginate 필요` |

---

## 7. Security

- **Firestore rules 2중 방어**: `bookings` read = participant only · write = Admin SDK
- **Server Action participant check**: TX 내부 `thread.providerOwnerUid === uid` 확인
- **quote 상태 검증**: `status ∈ ['sent','accepted']` · race 방지 (booked 재확정 차단)
- **Denormalized 필드 변조 방지**: Client direct write 차단 · Server Action이 thread/quote/request에서 snapshot
- **Rate limit**: v1 생략 · v1.3b 검토

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/provider/works/page.tsx` · `app/chat/[threadId]/page.tsx` (확장) · BookingStatusBanner · BookingBadge · BookingListSection · ThreadHeader · app/received/[requestId]/page.tsx (확장) |
| Presentation Client | BookingConfirmButton · BookingConfirmModal · BookingCard · WorksEmptyState · ThreadActionButtons · MessageBubble (확장) · QuoteCompareCard (확장) |
| Application | `app/actions/booking-actions.ts` (confirmBooking Server Action) |
| Domain | `types/booking.ts` · `domain/booking-schemas.ts` · `domain/booking-day-bucket.ts` (pure) · `types/chat.ts` 확장 (MessageType) |
| Infrastructure | `lib/firebase/booking-repository.ts` (Admin SDK · 4 메서드) · 기존 repos 재활용 (thread · quote · quoteRequest) |

---

## 9. Convention

- `"use server"` / `"use client"` directives
- Import order: external → `@/...` → relative → type
- ARIA: BookingStatusBanner `aria-label="일정 확정 정보"` · ThreadActionButtons `role="toolbar"` · BookingConfirmModal `role="dialog"` + `aria-modal="true"` · BookingListSection heading · Card `aria-label` 복합
- PascalCase components · camelCase helpers

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── app/
│   ├── actions/booking-actions.ts              🆕 confirmBooking
│   ├── chat/[threadId]/page.tsx                🔄 booking fetch + Banner + ActionButtons
│   ├── provider/works/page.tsx                 🔄 placeholder 교체
│   └── received/[requestId]/page.tsx           🔄 booking fetch + QuoteCompareCard booking prop
│
├── components/booking/                          🆕 폴더 (7 components)
│   ├── BookingConfirmButton.tsx
│   ├── BookingConfirmModal.tsx
│   ├── BookingStatusBanner.tsx
│   ├── BookingBadge.tsx
│   ├── BookingListSection.tsx
│   ├── BookingCard.tsx
│   └── WorksEmptyState.tsx
│
├── components/chat/
│   ├── ThreadActionButtons.tsx                 🆕
│   ├── ThreadHeader.tsx                        🔄 booking 배지 추가
│   └── MessageBubble.tsx                       🔄 system type 지원
│
├── components/received/
│   └── QuoteCompareCard.tsx                    🔄 booking prop + BookingBadge
│
├── types/
│   ├── booking.ts                              🆕
│   └── chat.ts                                 🔄 MessageType 확장
│
├── domain/
│   ├── booking-schemas.ts                      🆕 Zod
│   └── booking-day-bucket.ts                   🆕 pure
│
├── lib/firebase/
│   └── booking-repository.ts                   🆕 Admin SDK
│
├── firestore.rules                             🔄 bookings
└── firestore.indexes.json                      🔄 1 index
```

### 10.2 Implementation Order (10 steps)

1. `types/booking.ts` + `types/chat.ts` MessageType 확장 + `firestore.rules` + `firestore.indexes.json` · `firebase deploy --only firestore:rules,firestore:indexes`
2. `domain/booking-schemas.ts` + `domain/booking-day-bucket.ts` (pure)
3. `lib/firebase/booking-repository.ts` (4 메서드)
4. `app/actions/booking-actions.ts` confirmBooking TX
5. `BookingBadge` + `BookingStatusBanner` + `BookingCard` + `WorksEmptyState` (단순 컴포넌트)
6. `BookingConfirmModal` + `BookingConfirmButton` + `ThreadActionButtons`
7. `MessageBubble` system type 렌더 확장
8. `/chat/[threadId]/page.tsx` 확장 (booking fetch + Banner + ActionButtons + ThreadHeader booking 배지)
9. `BookingListSection` + `/provider/works/page.tsx` 전면 교체
10. `/received/[requestId]/page.tsx` 확장 + `QuoteCompareCard` booking prop + `BookingBadge` 주입 + smoke test

### 10.3 Pre-flight 체크리스트

- [ ] Firestore rules + index 배포 Enabled 확인
- [ ] 청명 계정으로 chat thread → "일정 확정" → Modal → submit → system 메시지 반영
- [ ] 고객 계정 chat thread onSnapshot으로 system 메시지 즉시 표시
- [ ] /provider/works 4 bucket group + empty 섹션 숨김
- [ ] /received/{requestId} booking 있는 quote에 ✅ 배지
- [ ] 재확정 시도 → INVALID_STATE
- [ ] scheduledAt 과거 시각 → Zod 거부
- [ ] 비 청명 confirmBooking → FORBIDDEN
- [ ] TS 0 errors · build 성공

---

## 11. Next.js 16 Specific

### 11.1 Server shell
- `/chat/[threadId]/page.tsx` · `/provider/works/page.tsx` · `/received/[requestId]/page.tsx` 모두 Suspense + auth guards (cookies)
- `cookies()` 호출이 이미 dynamic 전환 보장 → `await connection()` 불필요

### 11.2 revalidatePath
- `/provider/works` · `/received/${requestId}` 정적 fetch이므로 confirmBooking 성공 시 revalidatePath
- `/chat/{threadId}` 는 onSnapshot 자동 반영 · revalidatePath 불필요

### 11.3 onSnapshot 기존 패턴 재활용
- `ThreadDetailClient` messages onSnapshot 이미 system 메시지 자동 반영 (type 필드만 다름)
- `ChatUnreadWrapper` thread unread 집계 이미 구현

---

## 12. Test Plan (22건)

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /provider/works | /login redirect |
| 2 | 청명 /provider/works · 0건 | WorksEmptyState |
| 3 | 청명 /provider/works · N건 | bucket grouped list |
| 4 | 청명 chat · booking 없음 | "📅 일정 확정" 버튼 노출 |
| 5 | 청명 chat · booking 있음 | 버튼 숨김 + BookingStatusBanner 노출 |
| 6 | 고객 chat thread | 버튼 노출 안 됨 (청명 only) |
| 7 | 비 participant thread | FORBIDDEN |
| 8 | confirmBooking 성공 | bookings.create + quote.status='booked' + request.status='booked' + system 메시지 + unread++ |
| 9 | 시스템 메시지 | MessageBubble 중앙 정렬 gray 렌더 |
| 10 | 재확정 시도 (quote.status='booked') | INVALID_STATE |
| 11 | quote.status='cancelled' 확정 시도 | INVALID_STATE |
| 12 | memo 201자 | Zod 거부 |
| 13 | scheduledAt 과거 | Zod 거부 |
| 14 | /received/{requestId} · booking 있는 quote | ✅ 배지 표시 |
| 15 | ThreadHeader booking 배지 | "✅ 4/22(월) 14:00" (quoteAmount 대체) |
| 16 | BookingStatusBanner 표시 | Pinned QuoteCard 위 |
| 17 | /provider/works booking card 클릭 | /chat/{threadId} 이동 |
| 18 | group header (오늘/내일/이번주/지난) 정확 | KST 기준 분류 |
| 19 | 빈 bucket 숨김 | section 전체 미렌더 |
| 20 | 100+ 결과 | console.warn · 최신 100만 |
| 21 | onSnapshot chat에 system 메시지 즉시 | 새로고침 불필요 |
| 22 | revalidatePath 동작 | /provider/works · /received/{requestId} 재방문 반영 |
| 23 | computeDayBucket edge: 오늘 23:59:59 KST | `today` |
| 24 | computeDayBucket edge: +1일 00:00 KST | `tomorrow` |
| 25 | computeDayBucket edge: +2일 00:00 KST | `thisWeek` |
| 26 | computeDayBucket edge: +7일 00:00 KST | `later` |
| 27 | computeDayBucket edge: -1분 | `past` |
| 28 | datetime-local → ISO serialize | BookingConfirmModal submit 전 `toISOString()` · Zod refine 통과 |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. 10 Open Questions 해소. Server shell + Client Modal · Admin SDK TX 3R/4W · MessageType 확장 · 12 components (Server 5 / Client 7) · Firestore rules + 1 index · booking-schemas + booking-day-bucket pure helpers · revalidatePath · Test Plan 22건 · Implementation Order 10-step | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 96% 피드백 반영 (10건): (H1) `computeDayBucket` `later` 버킷 신규 도입 · 7일 초과 catch-all 분리 · DayBucket 5종 (today/tomorrow/thisWeek/later/past) (H2) `scheduledAt` Zod loose datetime + client `toISOString()` serialize 명시 (M3) TX 3R/5W로 정정 (thread.update 포함) (M4) §5.6 MessageBubble system 렌더 스펙 추가 (중앙 gray bg · icon prefix) (M5) §5.7 ThreadHeader 배지 대체 시 PinnedQuoteCard 독립 유지 명시 (M6) §5.8 BookingConfirmModal `useActionState` 패턴 확정 + datetime-local ISO serialize (L7) findByQuoteId "singleton" 주석 (L10) TX denorm fail-fast (INTERNAL_ERROR) · Test #23-28 추가 (bucket edges + ISO serialize) | Seokho Lee |
