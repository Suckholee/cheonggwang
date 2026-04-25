---
template: plan-plus
version: 0.1
feature: quote-response
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 견적 응답 (quote-response)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #6 (v1.1 2번째 feature)
> 선행 사이클: provider-signup (v1.1 #1 · Match 99% archived)
> 다음 단계: `/pdca design quote-response`

---

## 1. User Intent Discovery

### 1.1 배경
Marketplace Track v1.1 의 2번째 feature. `provider-signup` 완료로 실제 청명 계정 다수 확보 가능 → 이제 청명이 의뢰인 요청을 받고 견적을 작성·전송하는 플로우 구현. v1.0 `quote-request` (의뢰인 제출) 완료 후, 청명 측 응답 경로가 수동(이메일)에만 머물러 있었음. 본 feature가 **v1.1 마켓 핵심 루프**의 청명 절반.

### 1.2 핵심 목적
**청명이 요청 받고 견적서 작성·전송까지 앱 내에서 완료** (Recommended 선택)
- Figma Tinder-like triage 화면 구현 (1-by-1, 3-action bar)
- 항목별 분해 견적 작성 폼 (기본 + 옵션 여러 줄 + 합계)
- quotes 컬렉션 + providerResponses 컬렉션 신규 정의
- QuoteStatus 확장으로 상태 전이 체계 확립

### 1.3 타겟 사용자
- **1차**: 청명 (provider-signup 완료 후 실제 가입한 청소업체)
- **2차**: 의뢰인 (받은 견적을 received-quotes 페이지 — v1.1 3번째 feature — 에서 확인, 본 feature가 선행)
- **3차**: 청광 운영자 (quotes 컬렉션 모니터링, Firestore 콘솔)

### 1.4 MVP 경계
- ✅ `/provider/requests` — Figma Tinder-like 1-by-1 triage (pagination 1/N)
- ✅ 3-action bar: 관심없음 (pass) / 문의 (v1.2 예정 · **비활성**) / 제안하기 (primary)
- ✅ `/provider/requests/{id}/propose` — 항목별 분해 견적 작성 폼
- ✅ quotes/{id} 컬렉션 신규 · items[] + scheduledAt + estimatedWorkHours + totalAmount
- ✅ providerResponses/{providerId_requestId} 컬렉션 신규 · status: 'passed'|'quoted'
- ✅ QuoteStatus 확장 ('submitted'|'quoted'|'negotiating'|'booked'|'completed'|'cancelled')
- ✅ roomType 필드 추가 (quoteRequests 확장)
- ✅ 거리 근사 표시 (provider.regions ↔ quoteRequest.region district match → "동네" 라벨 or "다른 지역")
- ✅ `/provider/profile`에 "받은 요청" 진입 링크
- ❌ 문의 (chat) — v1.2
- ❌ 경쟁 청명 수 실시간 카운트 (notifiedProviderIds.length 단순 표시는 OK · 실시간 업데이트 X)
- ❌ 견적 수정·철회 — v1.1b
- ❌ 의뢰인에게 견적 도착 이메일 — v1.1b (received-quotes 페이지가 나오면 불필요)
- ❌ 표준 견적 범위 집계 배치 — v2+
- ❌ 지도 기반 거리(km) — v1.1b (Geocoding API 도입 후)
- ❌ Auto-draft 저장 / Preview 모드 / 견적 템플릿 저장
- ❌ 의뢰인 즉시 알림 (push/in-app)

### 1.5 성공 기준
- 청명이 요청 본 후 견적 제출까지 평균 5분 이내
- Pass rate 30% 미만 (요청 관련성 ≥ 70%)
- 제안 성공 → quoteRequests.status = 'quoted' 전이 100%
- 첫 주 실제 제안 5건 이상 발생 (seed + 신규 가입자 합계)
- received-quotes (v1.1 3번째) 구현 시 즉시 소비 가능한 데이터 구조

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **Figma Tinder-like 1-by-1 triage** | **채택** |
| B | List view + detail page | 기각 |
| C | Dashboard 위젯 통합만 (v1.1b 대기) | 기각 |

### 2.1 채택 사유 (A)
- **Figma 1:1 일치**: 목업 충실 반영 → 청명 UX 의도 그대로
- **포커스 강화**: 한 번에 한 요청만 보여줘 결정 속도 ↑
- **모바일 중심**: 청명이 현장·이동 중 확인하는 시나리오 최적화
- **pagination 명시적**: "1/3 역삼 주변" 라벨로 대기 큐 투명성

### 2.2 기각 사유

**B List + detail page**
- Figma 디자인 미일치 (사용자 승인받은 목업 이탈)
- 목록 스캔 → 상세 진입 2-step으로 UX 길어짐

**C Dashboard 위젯 대기**
- v1.1 마켓 루프 완결 지연
- 청명이 견적 응답할 수단 없음 → quote-request flow 무의미
- provider-dashboard (v1.1b) 나올 때까지 blocker

### 2.3 큐 필터 전략
- **채택**: `categories array-contains-any [provider.categories]` + `status='submitted'` + NOT 내가 이미 응답(passed/quoted)한 요청
- **기각**: 지역 기반 필터 (v1.1b · provider.regions district match → 추천 정렬만 적용 예정)
- **기각**: Geohash 기반 정밀 매칭 (Geocoding API 부재)

### 2.4 큐 정렬
- createdAt desc (최신 요청 우선)
- 향후: 매칭 점수 (categories 중 겹치는 수 × 지역 match × freshness) — v1.1b

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (13개)
1. **`/provider/requests`** Tinder-like triage 페이지 (pagination 1/N)
2. **pagination 내비게이션**: index state 유지, "다음" 버튼 클릭 = pass or skip
3. **요청 카드** (Figma 기반): 카테고리 칩 · 서비스타입 · 지역/평수/거리근사 · 고객 사진 · 희망일정·공간·경쟁청명 · 고객 요청사항 · 표준 견적 범위
4. **3-action bottom bar**: ✗ 관심없음 / 💬 문의 (비활성) / ✓ 제안하기
5. **"관심없음" Server Action**: `providerResponses/{providerId}_{requestId}.set({status:'passed'})`
6. **`/provider/requests/{id}/propose`** 견적 작성 폼
7. **항목 분해 UI**: 기본 항목 + 옵션 여러 줄 (add/remove) + 실시간 합계 계산
8. **`submitQuote` Server Action**: Firestore TX로 quotes.create + providerResponses.set('quoted') + quoteRequests.update({status:'quoted'})
9. **quotes 컬렉션** 신규 (items/scheduledAt/estimatedWorkHours/totalAmount/insured/status)
10. **providerResponses 컬렉션** 신규 (composite id · status 'passed'|'quoted')
11. **QuoteStatus enum 확장**: 'submitted'|'quoted'|'negotiating'|'booked'|'completed'|'cancelled'
12. **roomType 필드** quote-request 확장 + **Figma "32평 · 투룸" 표시**
13. **`/provider/profile`에 "받은 요청" 링크 추가** (진입점)

### 3.2 Out of Scope → v1.1b 이상
| 항목 | 이동 이유 |
|------|----------|
| 문의 버튼 동작 (채팅 생성) | chat feature (v1.2) 의존 |
| 견적 수정·철회 | quotes.update rules + UI 복잡도, v1.1b |
| 의뢰인 이메일 알림 (견적 도착) | received-quotes (v1.1 #3) 페이지에서 자체 확인 가능 |
| 표준 견적 범위 집계 (22~32만원 ↓ trend) | 주간 배치 집계 (v2+ analytics-batch) |
| 지도 기반 km 거리 표시 | Geocoding API 미도입, 현재는 district match "동네" 수준 |
| auto-draft 저장 | localStorage or Firestore draft 컬렉션 필요 |
| 견적 템플릿 저장/재사용 | provider-profile-editor priceBook 통합 (v1.1b) |
| Preview 모드 | 추가 라우트 또는 modal |
| 매칭 점수 기반 정렬 | 알고리즘 정교화 필요 (v1.1b) |
| 의뢰인 실시간 알림 (push/in-app) | FCM 도입 필요 (v2+) |
| 경쟁 청명 실시간 카운트 업데이트 | onSnapshot 필요, 현재는 단순 표시 |
| 빈 상태 정교한 디자인 | 기본 텍스트 수준 표시 (implicit MVP) |

### 3.3 기존 기능 영향
- **quoteRequests 확장**: `roomType?` optional 필드 추가 (기존 데이터 영향 없음, 신규 요청부터 수집)
- **QuoteStatus enum 확장**: 기존 4개 → 6개. `submitted|responded|cancelled|completed` 중 `responded` 제거 + `quoted|negotiating|booked` 추가. **Migration**: 기존 데이터 `responded` → `quoted` 매핑 (Firestore 콘솔 배치 or on-read lazy 변환)
- **Firestore rules**: quotes + providerResponses 블록 신규 · quoteRequests.update는 status 전이에 한해 제한적 허용 (서버 Admin SDK는 bypass이나 rule 명시화)
- **Firestore indexes**: quotes by requestId (received-quotes 준비) + providerResponses by providerId+status (triage 필터) + quoteRequests by categories/status/createdAt (triage 큐)
- **provider-signup 수정 최소**: providers 확장 필드 (priceBook 활용) — 이미 optional이므로 추가 영향 없음

---

## 4. Architecture

### 4.1 스택
- Next.js 16 App Router + React 19 + Tailwind 4 (기존)
- Firebase Auth + Firestore (기존)
- Server Actions + `ActionResult` 패턴 (기존 errors.ts 재활용)
- react-hook-form + @hookform/resolvers/zod + zod (기존)
- lucide-react (provider-signup 이후 도입된 icons)

### 4.2 파일 구조 (신규 + 수정)

```
src/
├── app/
│   ├── provider/
│   │   ├── profile/page.tsx            🔄 "받은 요청" 링크 추가
│   │   └── requests/
│   │       ├── page.tsx                🆕 Tinder-like triage
│   │       └── [id]/
│   │           └── propose/page.tsx    🆕 견적 작성 폼
│   └── actions/
│       └── quote-response-actions.ts   🆕 passRequest + submitQuote
├── components/provider/                🆕 폴더
│   ├── RequestCard.tsx                 🆕 Figma 카드 (Server-compatible, Client only for image carousel)
│   ├── TriageNav.tsx                   🆕 pagination + action bar (Client)
│   └── QuoteProposalForm.tsx           🆕 항목 분해 폼 (Client, RHF + zod + useFieldArray)
├── lib/firebase/
│   ├── quote-repository.ts             🆕 quotes CRUD
│   ├── provider-response-repository.ts 🆕 providerResponses CRUD
│   └── quote-request-repository.ts     🔄 listForTriage 쿼리 추가
├── domain/
│   ├── quote-status.ts                 🆕 enum 확장 (types/quote-request.ts에서 분리)
│   ├── quote-proposal-schema.ts        🆕 Zod (propose form + submitQuote action)
│   └── room-type.ts                    🆕 enum (원룸/투룸/...)
├── types/
│   ├── quote.ts                        🆕 Quote (견적서)
│   ├── provider-response.ts            🆕 ProviderResponse
│   └── quote-request.ts                🔄 QuoteStatus 확장, roomType 추가
└── proxy.ts                            (이미 /provider/:path* 확장됨, 변경 없음)

firestore.rules                         🔄 quotes + providerResponses 블록 추가
firestore.indexes.json                  🔄 인덱스 3개 추가
```

### 4.3 라우팅·데이터 흐름

```
[/provider/profile] → "받은 요청 보기" 링크
                              │
                              ▼
[/provider/requests] Server shell → Suspense (TriageBody)
  │ TriageBody:
  │   verifySessionCookie → uid
  │   userRepository.get(uid) → providerId (없으면 /signup-provider redirect)
  │   providerRepository.get(providerId) → categories
  │   quoteRequestRepository.listForTriage({ providerId, categories }) → QuoteRequest[]
  │   (이미 passed/quoted 한 요청 제외: providerResponseRepository.getPassedOrQuoted(providerId))
  │
  └─ TriageNav (Client): currentIndex state, 3-action bar
        │
        ├─ ✗ 관심없음 → passRequest Server Action
        │     providerResponses/{providerId}_{requestId}.set({status:'passed'})
        │     → currentIndex++ (다음 요청)
        │
        ├─ 💬 문의 → toast "v1.2 예정" (비활성 UI)
        │
        └─ ✓ 제안하기 → router.push(`/provider/requests/${id}/propose`)
                │
                ▼
          [/provider/requests/{id}/propose] Server shell
            │ verifySessionCookie + providerId check
            │ quoteRequestRepository.get(id)
            │ → <QuoteProposalForm request={...} providerId={...} />
            │
            └─ QuoteProposalForm (Client): RHF + zodResolver + useFieldArray
                  │ 필드: items[{label, price, note?}]+, scheduledAt, estimatedWorkHours, insured
                  │ 자동 계산: totalAmount = sum(items.price)
                  │
                  └─ submit → submitQuote Server Action
                         │ Firestore TX:
                         │   quotes/{newId}.create(...)
                         │   providerResponses/{providerId}_{requestId}.set({status:'quoted'})
                         │   quoteRequests/{requestId}.update({status:'quoted'})
                         │
                         └─ success → router.replace('/provider/requests') (다음 요청 큐로)
```

### 4.4 거리 근사 로직 (간이)

```ts
function approxDistanceLabel(
  providerRegions: ProviderRegion[],
  requestRegion: Region,
): string {
  const exactMatch = providerRegions.some(
    r => r.city === requestRegion.city && r.district === requestRegion.district
  );
  if (exactMatch) return '동네';

  const sameCityMatch = providerRegions.some(r => r.city === requestRegion.city);
  if (sameCityMatch) return '같은 시';

  return '다른 지역';
}
```

MVP는 이 수준. km 단위 숫자는 Geocoding 후 v1.1b.

### 4.5 에러 시나리오

| 시나리오 | 처리 |
|----------|------|
| provider role 없음 | `/provider/*` matcher + profile stub에서 redirect 처리 (proxy.ts + 페이지 레벨) |
| Pass 중복 (이미 passed된 요청) | providerResponses.set merge · no-op (rules도 allow update 허용) |
| Propose 중복 (이미 quoted) | providerResponses.status === 'quoted' 검사 → 에러 ALREADY_QUOTED |
| 다른 청명이 이미 booked/completed | quoteRequests.status 전이 검사 → 에러 INVALID_STATE |
| Firestore TX 실패 | ActionResult error → 재시도 |
| 빈 큐 | "아직 들어온 요청이 없어요" empty state |

---

## 5. Data Model 델타

### 5.1 신규 `quotes/{quoteId}`
```typescript
export interface QuoteItem {
  label: string;          // "기본 입주청소", "에어컨 1대"
  price: number;          // 240000
  note?: string | null;   // "추가 없음"
}

export interface Quote {
  id: string;
  requestId: string;      // quoteRequests FK
  providerId: string;
  clientUid: string;      // denormalized (received-quotes 쿼리 용)
  items: QuoteItem[];
  scheduledAt: Date | null;
  estimatedWorkHours: number | null;
  totalAmount: number;
  insured: boolean;
  insuranceAmount?: number | null;
  status: 'sent' | 'accepted' | 'rejected';
  sentAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
}
```

### 5.2 신규 `providerResponses/{providerId_requestId}`
```typescript
export interface ProviderResponse {
  id: string;              // "{providerId}_{requestId}"
  providerId: string;
  requestId: string;
  status: 'passed' | 'quoted';
  respondedAt: Date;
}
```

Composite id로 lookup 빠름 (upsert 단순화). 별도 query 없이 `get(id)` 로 확인.

### 5.3 `quoteRequests` 확장
```typescript
export type QuoteStatus =
  | 'submitted'    // 의뢰인 제출 (v1.0)
  | 'quoted'       // 청명 견적 완료 (v1.1 quote-response)
  | 'negotiating'  // 채팅 진행 (v1.2 chat)
  | 'booked'       // 일정 확정 (v1.3 booking)
  | 'completed'    // 거래 완료 (v2 payment)
  | 'cancelled';

export type RoomType = '원룸' | '투룸' | '쓰리룸' | '포룸이상' | '오피스텔' | '기타';

export interface QuoteRequest {
  // ... 기존 필드
  roomType?: RoomType;     // v1.1 quote-response 확장
  status: QuoteStatus;     // enum 확장
}
```

**Migration**: 기존 `'responded'` 상태 데이터 → `'quoted'`로 일괄 업데이트 (Firebase Console 또는 onRead lazy 변환). MVP 배포 전 0건이므로 무관.

### 5.4 Firestore Rules 추가
```javascript
// quotes (owner provider read, client read own, 서버가 create, no client update)
match /quotes/{quoteId} {
  allow read: if request.auth != null
              && (resource.data.providerId == /databases/$(database)/documents/users/$(request.auth.uid).data.providerId
                  || resource.data.clientUid == request.auth.uid);
  allow create: if request.auth != null
                && /databases/$(database)/documents/users/$(request.auth.uid).data.providerId == request.resource.data.providerId
                && request.resource.data.status == 'sent';
  allow update: if false;   // 서버 Admin SDK만
  allow delete: if false;
}

// providerResponses (owner provider read·upsert)
match /providerResponses/{docId} {
  allow read: if request.auth != null
              && resource.data.providerId == /databases/$(database)/documents/users/$(request.auth.uid).data.providerId;
  allow create, update: if request.auth != null
                        && /databases/$(database)/documents/users/$(request.auth.uid).data.providerId == request.resource.data.providerId
                        && request.resource.data.status in ['passed', 'quoted'];
  allow delete: if false;
}

// quoteRequests.update 허용 (서버 Admin SDK는 bypass, client direct write 차단)
match /quoteRequests/{requestId} {
  // 기존 read, create 유지
  allow update: if false;  // 명시 · 서버만
  // ... 기존 delete 유지
}
```

### 5.5 Firestore Indexes 추가
```json
// triage 큐: categories array-contains-any + status + createdAt desc
{
  "collectionGroup": "quoteRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
// quotes by requestId (received-quotes 준비)
{
  "collectionGroup": "quotes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "requestId", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
},
// providerResponses by providerId + status (triage 필터)
{
  "collectionGroup": "providerResponses",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**주의**: quoteRequests `categories` 필드는 배열이지만 현재 데이터는 `category` (단일). quote-request 재설계 필요? → **아니오**, 단일 `category` 유지하고 triage 쿼리는 `where('category', 'in', provider.categories)` 사용. (array-contains-any는 배열 필드일 때만)

**수정**: 위 첫 index는 `category` single field로 변경:
```json
{
  "collectionGroup": "quoteRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

provider.categories 배열이고 quoteRequest.category 단일이므로, 청명 N개 카테고리마다 `where('category', '==', c)` 쿼리 N번 or Firestore `in` 연산자 (10개 제한 내). QuoteCategory는 6개라 `in` 가능.

---

## 6. 주요 플로우 상세 (Design 단계 참고용)

### 6.1 passRequest Server Action (5-step)
1. `verifySessionCookie` → uid
2. `userRepository.get(uid).providerId` 검증 (없으면 FORBIDDEN)
3. Zod: `{ requestId: string }`
4. `providerResponses/{providerId}_{requestId}.set({status:'passed', respondedAt: serverTimestamp()}, {merge:true})`
5. return `{ok:true}`

### 6.2 submitQuote Server Action (10-step)
1. `verifySessionCookie` → uid + providerId 검증
2. Zod: `proposeQuoteInputSchema.parse(input)`
3. Rate limit: `signup` 대신 `quote:${providerId}` 1분 10건 (spam 방지)
4. `quoteRequestRepository.get(requestId)` → 존재·status 검증 (`submitted` or `quoted` 허용, `negotiating/booked/completed`는 INVALID_STATE)
5. `providerResponseRepository.get({providerId, requestId})` → 'quoted' 이미면 ALREADY_QUOTED
6. Firestore TX:
   - `quotes/{newId}.create({...input, providerId, clientUid: request.clientUid, totalAmount, status:'sent', sentAt})`
   - `providerResponses/{providerId}_{requestId}.set({status:'quoted', respondedAt})`
   - `quoteRequests/{requestId}.update({status:'quoted'})` — 이미 quoted면 no-op (다른 청명 먼저 quote 했을 수 있음)
7. return `{ok:true, data:{quoteId: newId}}`
8. 에러 mapping: ZodError → INVALID_INPUT, AppError → toActionError, 기타 → INTERNAL_ERROR

### 6.3 UI: RequestCard (Figma 일치)
- 상단: 카테고리 칩 (blue) + 서비스타입 (비정기 1회 등) + 제목 (역삼동 · 32평 · [거리 라벨])
- 사진 grid (quoteRequest.photos) — 1~3장 (quote-request MVP는 사진 없을 수도 있음, optional)
- Details: 희망 일정 · 지역 · 공간 (size평 · roomType) · 경쟁 청명 (notifiedProviderIds.length)
- 고객 요청사항 (note)
- 표준 견적 범위 (provider.priceBook 기반 해당 카테고리 entry 찾아서 `basePrice * 0.8 ~ basePrice * 1.2` 근사 or priceBook 없으면 숨김)

### 6.4 UI: QuoteProposalForm
- 헤더: "견적 작성" + 요청 요약 1줄
- items (useFieldArray):
  - 각 행: label · price · [삭제]
  - [+ 항목 추가]
  - 기본 1줄 제공 ("기본 {카테고리명}")
- scheduledAt (date + time picker) · estimatedWorkHours (number input)
- insured 체크박스
- 합계: `items.reduce((s, i) => s + i.price, 0)` 실시간
- 제출 버튼: "{totalAmount}원 견적 제출"
- cancel: `/provider/requests` 로 돌아감

---

## 7. 비용·성능

### 7.1 Firestore 비용 (가입 → 제안까지 1 cycle)
- Read: provider 1 + quoteRequests list ~20 + providerResponses by me + Existing quotes (optional) ≈ 30 reads
- Write: providerResponses.set (1) + submitQuote TX (quotes create + providerResponses set + quoteRequests update) ≈ 4 writes
- 총 비용: $0.00036 per cycle. 월 1000 cycle → $0.36 (무시할 수준)

### 7.2 성능
- triage 페이지 P95: provider.get (~50ms) + listForTriage (~150ms, 20 results) + providerResponse map (~50ms) = ~250ms
- submitQuote Server Action P95: TX (~200ms) + Resend 이메일 없음 (의뢰인 알림 v1.1b) = ~250ms
- 큰 목록 (>100 요청) 이슈 가능 시 v1.1b pagination 도입

### 7.3 확장성
- providerResponses 성장: 청명 N × 요청 M / 일 · 현재 N=10, M=50/day → 500 docs/day. 무관.
- quotes 성장: 제안 5/day × 90일 → 450. TTL 불필요.

---

## 8. Open Questions (Design 단계에서 해소)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | quoteRequests.category 단일 vs 배열? | **단일 유지** · triage 쿼리는 `where('category','in', provider.categories)` (6개 제한 OK) |
| Q2 | quoteRequests.status 'responded' 마이그레이션 | MVP 배포 전 실데이터 없음 → 무시. 안전을 위해 repository read 시 `responded` → `quoted` 매핑 alias 추가 (lazy) |
| Q3 | ProviderResponse composite id 포맷 `${providerId}_${requestId}` 충돌 가능성 | providerId·requestId 모두 nanoid/Firestore auto id — 둘 다 [a-z0-9]+ · 언더스코어 충돌 가능성 0에 수렴. 명시 separator로 OK |
| Q4 | quote items useFieldArray 최소·최대 | Design 단계에서 확정 (제안: 최소 1, 최대 10 items) |
| Q5 | Proposal 폼 제출 후 redirect | `/provider/requests` 로 이동 (다음 요청 triage 자연 연결) vs `/provider/requests/{id}` detail view · **제안: 전자** |
| Q6 | Pass 다음 요청이 0건이면? | empty state "모두 확인했어요!" · v1.1b "요청 올 때까지 기다리는 중" 상태 |
| Q7 | `.env.local` 신규 env 필요? | 없음. 기존 RESEND/APP_URL 불필요 (이메일 알림 미포함) |
| Q8 | 견적서 pdf/email 보내기 기능 | out-of-scope v1.1b |

---

## 9. Brainstorming Log

### Phase 1 결정
- 핵심: 청명 triage + 견적 작성까지 완료 (v1.2 chat 없어도 loop 반쪽 완결)
- 폼 복잡도: 항목 분해 (Figma 일치)
- 큐 필터: categories match만 (지역 필터 v1.1b)
- 문의: chat 이전까지 비활성

### Phase 2 결정
- Approach A (Tinder-like 1-by-1) 채택
- B (list+detail), C (dashboard 대기) 기각

### Phase 3 결정
- MVP 13 항목 · Out-of-scope 12 항목 확정
- Navigation entry + 빈 상태는 implicit required

### Phase 4 결정
- 아키텍처/라우팅/데이터 모델 전부 승인

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Approach A (Tinder-like). MVP 13 · Out-of-scope 12. quotes + providerResponses 컬렉션 신규. QuoteStatus 6-state. Figma 1:1. 다음: `/pdca design quote-response` | Seokho Lee |
