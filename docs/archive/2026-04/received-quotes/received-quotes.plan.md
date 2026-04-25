---
template: plan-plus
version: 0.1
feature: received-quotes
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 의뢰인 받은견적 (received-quotes)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #7 (v1.1 3번째 feature)
> 선행 사이클: quote-response (v1.1 #2 · Match 99% archived)
> 다음 단계: `/pdca design received-quotes`

---

## 1. User Intent Discovery

### 1.1 배경
v1.1 마켓 핵심 루프의 **의뢰인 측 절반**을 완성하는 feature. v1.0 `quote-request` (의뢰인 제출) → v1.1 `quote-response` (청명 응답) 완료 후, 의뢰인이 자기 요청의 상태·받은 견적을 앱 내에서 조회하는 loop closure. Figma 받은견적 탭 (진행중/완료 2-tab + 스텝퍼 + 비교하기) 1:1 구현.

### 1.2 핵심 목적
**의뢰인이 자기 요청 목록과 청명별 견적서를 비교·수락 할 수 있도록** (Approach A 채택)
- 진행중/완료 2-tab 리스트 (Figma 일치)
- 4-step 스텝퍼 시각화 (요청/견적수신/협의진행/거래완료)
- 상세 페이지에서 청명별 견적서 카드 나열
- 수락 Server Action (quote.status='accepted' + quoteRequest.status='negotiating')
- 홈 TodayCard → 받은견적 진입 링크

### 1.3 타겟 사용자
- **1차**: 의뢰인 (quote-request로 요청 제출한 후, 청명 응답을 기다리는 사용자)
- **2차**: 청광 운영자 (의뢰인 활동 모니터링)
- **3차**: 청명 (수락 알림 — v1.2 chat 이후 자동화)

### 1.4 MVP 경계
- ✅ `/received` 목록 페이지 (진행중/완료 2-tab)
- ✅ RequestStatusCard (진행중) · CompletedCard (완료) 분기 렌더
- ✅ QuoteStepper 4단계 시각화
- ✅ 가격 범위 (quotes.min/max totalAmount 집계)
- ✅ `/received/{requestId}` 상세 비교 페이지
- ✅ 청명별 견적서 카드 나열 (금액·일정·항목 요약·배상보험)
- ✅ acceptQuote Server Action (TX: quote.accepted + quoteRequest.negotiating)
- ✅ 수락 후 toast + 목록 리프레시
- ✅ 청명 이름 클릭 → 청명 상세 stub (`/providers/{providerId}`)
- ✅ 홈(`/`) TodayCard에 '받은견적' 링크 추가
- ✅ 빈 상태 ("아직 요청한 견적이 없어요 → 새 견적 요청")
- ❌ 거절(reject) 기능 — Figma에 없음, 경쟁 유지
- ❌ 거래 완료 버튼 (booking v1.3 + payment v2에서 자동 전이)
- ❌ 채팅 진입 (chat v1.2에서 추가)
- ❌ 리뷰 작성·평점 완료 실제 동작 — v2 review
- ❌ 실시간 업데이트 (onSnapshot) — v1.2+
- ❌ 청명 프로필 상세 풀 페이지 — v1.1b `provider-profile` (reader). 지금은 stub만
- ❌ 견적서 PDF / 이메일 재전송
- ❌ 비교 필터·정렬 (최저가·가장 빠른 일정 등) — v1.2
- ❌ 하단 5탭 네비게이션 — v1.1b `bottom-tab-nav`

### 1.5 성공 기준
- 의뢰인이 홈 → 받은견적 → 비교하기 → 수락까지 평균 2분 이내
- 수락 성공 시 quoteRequest.status='negotiating' 전이 100%
- 상세 페이지 로딩 P95 < 800ms (quotes.listByRequest 단일 쿼리)
- v1.2 chat feature 구현 시 "수락 후 채팅 진입" 링크 추가만으로 바로 연결 가능한 데이터 구조

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **Server shell + Suspense + Client accept 버튼** | **채택** |
| B | Client-only + fetch API | 기각 (Next.js 16 Cache Components·Server Actions 패턴 불일치) |
| C | Pure SSR no-client (인터랙션 없음) | 기각 (수락 버튼 필요) |

A는 quote-request·quote-response와 동일 패턴. 기존 repository·Server Action 인프라 직접 재활용.

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (12개)
1. `/received` 목록 페이지 (Server shell + Suspense)
2. **진행중/완료 2-tab** 네비게이션 (URL search param `?tab=active|completed`)
3. **RequestStatusCard** (진행중 카드: 카테고리·크기·시각·스텝퍼·가격범위·비교하기 버튼)
4. **CompletedCard** (완료 카드: 청명 배지·스텝퍼·평점완료 badge placeholder)
5. **QuoteStepper 4단계** 시각화 컴포넌트 (요청/견적수신/협의진행/거래완료)
6. 가격 범위 계산 (`quotes.listByRequest` 집계: min/max)
7. `/received/{requestId}` 상세 비교 페이지
8. **QuoteCompareCard** (청명별 견적서: 금액·일정·항목 요약·배상보험 배지 + 수락 버튼)
9. **acceptQuote Server Action** (TX · `quote.status='accepted'` + `quoteRequest.status='negotiating'`)
10. 청명 상세 stub 페이지 `/providers/{providerId}` (기본 정보 + "상세 준비 중")
11. 홈(`/`) TodayCard에 '받은견적 N건 · 보기' 링크 추가
12. 빈 상태 empty state ("아직 요청한 견적이 없어요" + "새 견적 요청" CTA)

### 3.2 Out of Scope → v1.1b 이상
| 항목 | 이동 이유 |
|------|----------|
| 거절(reject) UI | Figma 부재 · 경쟁 유지 관점에서 의도적 생략 |
| 거래완료 수동 전이 | booking(v1.3) + payment(v2)에서 자동 전이 |
| 채팅 진입 버튼 | chat(v1.2) 의존 · 현재 "비교하기"만 |
| 리뷰 작성·평점완료 badge 실동작 | v2 review |
| 실시간 업데이트 (onSnapshot) | v1.2+ 성능·비용 검토 |
| 청명 프로필 풀 상세 페이지 | v1.1b `provider-profile` (reader) · 지금은 stub |
| 견적서 PDF / 이메일 재전송 | v1.1b+ |
| 비교 필터·정렬 | v1.2 |
| 하단 5탭 네비 | v1.1b `bottom-tab-nav` |
| 수락 후 자동 채팅 thread 생성 | chat(v1.2)와 함께 |

### 3.3 기존 기능 영향
- **`quote-response-actions.ts`**: `acceptQuote(quoteId)` Server Action 추가
- **홈 `src/app/page.tsx` TodayCard**: "요청한 견적 {N}건" 영역을 `/received` 링크 wrapping
- **`lib/errors.ts`**: `ALREADY_ACCEPTED` AppErrorCode 추가
- **Firestore rules**: quotes.update 제한적 완화 — `status: 'sent' → 'accepted'` 전이는 Server Action만 (Admin SDK bypass · defense in depth rule은 `false` 유지)
- **Firestore indexes**: 변경 없음 (기존 `quotes by requestId + sentAt` 재활용, `quoteRequests by clientUid + createdAt` 재활용)
- **환경변수**: 신규 없음

---

## 4. Architecture

### 4.1 스택
- Next.js 16 App Router + React 19 + Tailwind 4
- Firebase Firestore + Admin SDK (기존)
- Server Actions + ActionResult (기존)
- lucide-react (provider-signup 도입 이후)

### 4.2 파일 구조 (신규 + 수정)

```
src/
├── app/
│   ├── received/
│   │   ├── page.tsx                      🆕 목록 (2-tab)
│   │   └── [requestId]/page.tsx          🆕 상세 (비교)
│   ├── providers/
│   │   └── [providerId]/page.tsx         🆕 청명 상세 stub
│   ├── page.tsx                          🔄 TodayCard '받은견적' 링크
│   └── actions/
│       └── quote-response-actions.ts     🔄 acceptQuote 추가
├── components/received/                  🆕 폴더
│   ├── RequestStatusCard.tsx             🆕 진행중 카드 (Server)
│   ├── CompletedCard.tsx                 🆕 완료 카드 (Server)
│   ├── QuoteStepper.tsx                  🆕 4단계 시각화 (Server)
│   ├── QuoteCompareCard.tsx              🆕 상세 견적서 비교 카드 (Client: 수락 버튼)
│   └── ReceivedEmptyState.tsx            🆕 빈 상태 (Server)
├── components/quote/
│   └── TodayCard.tsx                     🔄 '받은견적 N건' 링크 wrapper
├── lib/firebase/
│   └── quote-repository.ts               (재활용 · listByRequest 이미 있음)
└── lib/errors.ts                         🔄 ALREADY_ACCEPTED 추가

firestore.rules                           (변경 없음 — update는 여전히 false, server만)
firestore.indexes.json                    (변경 없음)
```

### 4.3 라우팅·데이터 흐름

```
[홈 `/` TodayCard]
  "요청한 견적 N건" 카드 = `<Link href="/received">`
             │
             ▼
[/received?tab=active] Server shell + Suspense
  TriageBody:
    verifySessionCookie → uid
    quoteRequestRepository.listForClient(uid)
    분기: tab === 'active' → status ∈ {submitted, quoted, negotiating}
         tab === 'completed' → status ∈ {booked, completed}
    각 request에 대해 quoteRepository.listByRequest(requestId) 병렬
    min/max 집계
    → <TabBar> + <RequestStatusCard>[] or <CompletedCard>[]
             │ 비교하기 클릭
             ▼
[/received/{requestId}] Server shell + Suspense
  verifySessionCookie + owner check
  quoteRequestRepository.get(requestId) + clientUid 검증 (404 if mismatch)
  quoteRepository.listByRequest(requestId) → Quote[]
  for each quote: providerRepository.get(providerId) → Provider
  → <QuoteCompareCard>[] 청명별 (이름 클릭 → /providers/{providerId})
                        수락 버튼 클릭 → acceptQuote Server Action
             │
             ▼
[Server Action: acceptQuote(quoteId)] 9-step
  1. verifySessionCookie → clientUid
  2. Zod parse
  3. Firestore TX:
     - tx.get(quoteRef) → status='sent' 검증
     - tx.get(quoteRequestRef) → clientUid 일치 + status ∈ {submitted, quoted} 검증
     - tx.update(quoteRef, {status:'accepted', acceptedAt: serverTs})
     - tx.update(quoteRequestRef, {status:'negotiating'})
     (다른 quote들은 'sent' 유지 · 경쟁 보존)
  4. return {ok:true, data:{providerId}} (chat deeplink 대비)
  5. 에러: ALREADY_ACCEPTED · INVALID_STATE
             │
             ▼
Client: router.refresh() + toast("견적 수락 · {청명명}과 협의 시작") + 목록 리턴 / 그대로 유지
```

### 4.4 에러 시나리오

| 시나리오 | 처리 |
|----------|------|
| 다른 사용자 요청 상세 접근 | 404 notFound |
| 이미 accept된 quote | `ALREADY_ACCEPTED` (friendly message + 상세 새로고침) |
| quoteRequest가 이미 negotiating/booked 상태 | `INVALID_STATE` (다른 청명 먼저 수락됨, 목록으로) |
| 동시 수락 (race) | 첫 TX 성공, 두 번째 TX는 status mismatch → `INVALID_STATE` |
| quote 부재 | 404 notFound |

---

## 5. Data Model 델타

### 5.1 신규 컬렉션 없음
- `quoteRequests`, `quotes` 모두 기존 사용
- `quote.status` 전이: 'sent' → 'accepted'
- `quoteRequest.status` 전이: {'submitted', 'quoted'} → 'negotiating'

### 5.2 `lib/errors.ts` 확장
```typescript
export type AppErrorCode =
  | ... // 기존
  | "ALREADY_ACCEPTED"   // 이번 feature
  | ... ;
```

### 5.3 Firestore Rules 변경 없음
`quotes.update: if false` 유지. Admin SDK bypass로 Server Action만 쓰기. Defense-in-depth.

---

## 6. 주요 플로우 상세 (Design 참고용)

### 6.1 acceptQuote Server Action 9-step
1. Zod parse `{ quoteId: string }`
2. `verifySessionCookie` → clientUid
3. Firestore TX (quotes + quoteRequests):
   - `tx.get(quoteRef)` → 없으면 `INVALID_INPUT`. `quote.status !== 'sent'` → `ALREADY_ACCEPTED` (accepted/rejected는 재진입 불가)
   - `tx.get(quoteRef.data.requestId)` quoteRequest → clientUid ≠ auth.uid → `FORBIDDEN`. status ∉ {submitted, quoted} → `INVALID_STATE`
   - `tx.update(quoteRef, {status: 'accepted', acceptedAt: serverTimestamp})`
   - `tx.update(quoteRequestRef, {status: 'negotiating'})`
4. return `{ok: true, data: {providerId: quote.providerId}}`
5. 에러 매핑 (INVALID_INPUT · ALREADY_ACCEPTED · FORBIDDEN · INVALID_STATE · INTERNAL_ERROR)

### 6.2 목록 페이지 쿼리·분기
- `quoteRequestRepository.listForClient(uid)` → QuoteRequest[]
- 진행중 탭: `status in {'submitted', 'quoted', 'negotiating'}`
- 완료 탭: `status in {'booked', 'completed'}`
- 각 request.id에 대해 `quoteRepository.listByRequest(id)` 병렬 (Promise.all)
- 집계: totalCount, min/max totalAmount

### 6.3 상세 페이지 데이터 조립
- quoteRequest fetch + owner guard
- quotes fetch
- 각 quote.providerId에 대해 provider fetch (병렬)
- QuoteCompareCard 렌더 (3개 제공자면 3장)

### 6.4 청명 상세 stub (v1.1 최소)
`/providers/{providerId}`:
- 업체명, 지역(첫 번째), 전화, 배상보험 배지
- "프로필 상세 페이지는 곧 추가됩니다" 안내
- ← 돌아가기 (history back)
- v1.1b `provider-profile` (reader)에서 이 stub 대체

---

## 7. 비용·성능

### 7.1 Firestore 비용 per /received load
- quoteRequests.listForClient (1 query, ~5 docs)
- quotes.listByRequest × 5 (5 queries, ~15 docs)
- providers.get × 15 (cached within request) ≈ 15 reads
- 총 ~35 reads. $0.00042 per load

### 7.2 성능
- /received P95: ~500ms (parallel Promise.all)
- /received/{id} P95: ~400ms
- acceptQuote TX: ~150ms

### 7.3 확장성
- 의뢰인당 요청 수 1000+ 시 pagination 필요 (v1.1b)
- 현재는 limit 50 default (listForClient)

---

## 8. Open Questions (Design 단계에서 해소)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | 탭 URL 상태 유지 (`?tab=completed`) vs Client state | URL state (back button 친화, Server 렌더링 친화) |
| Q2 | 빈 상태 탭별 (진행중 0건 vs 완료 0건) | 두 경우 모두 같은 empty state (`/quote/new` CTA) |
| Q3 | QuoteStepper 현재 단계 하이라이트 | status 기반 index 계산 (submitted=0, quoted=1, negotiating=2, booked=3, completed=3 또는 전체 complete) |
| Q4 | 수락 후 redirect vs 목록 유지 | 목록 유지 + toast (quote.status 즉시 반영돼 UI 갱신) |
| Q5 | 청명 이름 클릭 target (새 창 vs 같은 창) | 같은 창 (UX 일관성) |
| Q6 | `/providers/{providerId}` stub 디자인 | 최소: 업체명·지역·전화·배상보험 · "상세 준비 중" |
| Q7 | 청명별 카드 순서 | sentAt asc (먼저 보낸 청명 우선) 또는 totalAmount asc (가성비 우선) — Design에서 확정 |
| Q8 | 수락 후 다른 quote들 자동 rejected 전이? | **No** (Plan에서 경쟁 유지 · 다른 청명 기록 보존) |

---

## 9. Brainstorming Log

### Phase 1 결정
- 스코프: 목록 + 상세(비교) 페이지 모두 (A)
- Accept/Reject: 수락만 (경쟁 유지)
- 거래완료 전이: v1.1은 'completed' 진입 안 함 (booking/payment 대기)
- 가격 범위 소스: quotes min/max 집계 (실 가격)

### Phase 2
- Server shell + Client accept 채택 (B·C 기각)

### Phase 3 YAGNI
- MVP 12 / Out-of-scope 10 확정
- 청명 프로필 링크는 stub 방식으로 구현

### Phase 4
- 파일 구조 · TX 구조 전부 승인

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Approach A. MVP 12 / Out-of-scope 10. acceptQuote 9-step TX. 홈 TodayCard 링크 wrapper. 청명 상세 stub. 다음: `/pdca design received-quotes` | Seokho Lee |
