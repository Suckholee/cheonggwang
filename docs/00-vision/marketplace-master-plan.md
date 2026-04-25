# Marketplace Master Plan

> 작성: 2026-04-20
> 출처: Figma 목업 15장 분석 (고객 10 + 청명 5) + [marketplace.md](./marketplace.md) Vision
> 상태: Draft v1 — 확정 후 feature 순차 실행 시작

---

## 0. 요약

본 문서는 청광 마켓플레이스 전체 실행 계획이다. 총 **14개 feature** (v1.0 완료 1 + v1.1~v2+ 13)를 의존 관계로 정렬하고, 각 feature의 scope·데이터 모델 델타·archived 자산 재활용을 명세한다.

**현재 상태**: `quote-request` (v1.0) 99% 완료, report/archive 대기.

**크리티컬 패스** (마켓 루프 폐쇄 최단):
```
quote-request → provider-signup → quote-response → received-quotes → chat → booking → payment → review
       ✅          v1.1           v1.1       v1.1        v1.2     v1.3    v2     v2
```

---

## 1. Feature Inventory (14개)

| # | Feature | Role | 목업 | 우선순위 |
|---|---------|------|------|----------|
| 0 | `quote-request` | 고객: 견적 요청 제출 | 홈(shell) · 요청폼 · thanks | ✅ v1.0 |
| 1 | `provider-signup` | 청명: 가입·업체 등록 (onboarding) | (미확정 — Plan 단계에서 설계) | 🔴 v1.1 |
| 2 | `provider-profile-editor` | 청명: 자기 프로필 편집 (포트폴리오·단가·후기) | 청명 프로필 편집 (포트폴리오 탭) | 🔴 v1.1 |
| 3 | `quote-response` | 청명: 요청 intake + 견적 작성 | 받은 요청 페이지 | 🔴 v1.1 |
| 4 | `received-quotes` | 고객: 응답 받은 견적 목록·비교 | 받은견적 탭 | 🔴 v1.1 |
| 5 | `provider-dashboard` | 청명: 홈 대시보드 | 청명 홈 (오늘 현황·방문·성과·매출) | 🟠 v1.1b |
| 6 | `bottom-tab-nav` | 공통: 5탭 하단 nav (role-aware) | 고객: 홈/청명찾기/받은견적/채팅/커뮤니티 / 청명: 홈/요청/채팅/작업관리/설정 | 🟠 v1.1b |
| 7 | `provider-profile` (reader) | 고객: 청명 상세 페이지 | 청명 프로필 상세 | 🟠 v1.1b |
| 8 | `chat` | 공통: 1:1 메시징 (role-aware + rich types) | 고객 채팅 상세 · 청명 채팅 상세 · 청명 채팅 목록 | 🟡 v1.2 |
| 9 | `provider-search` | 고객: 청명찾기 (리스트+지도+필터) | 리스트 뷰 · 지도 뷰 | 🟡 v1.2 |
| 10 | `client-dashboard` | 고객: 홈 확장 (평균가·Top5 shell) | 평균가·Top5 섹션 (홈 확장) | 🟢 v1.2b |
| 11 | `booking` | 공통: 일정 확정·방문 체크인/체크아웃·작업 완료 | (미확정 — chat의 일정확정 버튼에서 도출) | 🔵 v1.3 |
| 12 | `payment` | 공통: 토스페이먼츠 + 정산 | (미확정 — chat의 결제요청 버튼에서 도출) | 🟣 v2 |
| 13 | `review` | 공통: 리뷰·평점 작성/관리 | 청명 프로필 리뷰 섹션 · 고객 평점완료 배지 | 🟣 v2 |
| 14 | `analytics-batch` | 서버: 재계약률·평균가·응답시간 주간 집계 | 각 feature의 "KPI 카드"에 populate | ⚪ v2+ |

---

## 2. 의존성 그래프

```
          ┌────────────────────────────────────────────────────┐
          │                   quote-request ✅                 │
          │                  (clients, quoteRequests)          │
          └─────────┬──────────────────────────┬───────────────┘
                    │                          │
           ┌────────▼────────┐        ┌────────▼────────┐
           │ provider-signup │        │                 │
           │  (providers)    │        │                 │
           └────────┬────────┘        │                 │
                    │                 │                 │
         ┌──────────▼──────────┐      │                 │
         │provider-profile-    │      │                 │
         │editor (workCases,   │      │                 │
         │priceBook)           │      │                 │
         └──────────┬──────────┘      │                 │
                    │                 │                 │
                    ├──► quote-response ◄──────────────┘
                    │    (quotes, providerResponses)
                    │           │
                    │           ├──► received-quotes (고객 view)
                    │           │
                    │           ├──► provider-dashboard (청명 view)
                    │           │
                    └───────────┴──► bottom-tab-nav (role-aware shell)
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            provider-profile         chat (threads,          provider-search
            (reader · 상세)          messages · rich types)  (filters · map)
                    │                       │                       │
                    │                       ├──► client-dashboard (평균가·Top5 shell)
                    │                       │
                    │                       ▼
                    │                  booking (bookings, scheduled visits)
                    │                       │
                    │                       ▼
                    │                  payment (payments, payouts)
                    │                       │
                    │                       ▼
                    └──────────────────► review (reviews)
                                            │
                                            ▼
                                    analytics-batch (집계 KPI)
```

---

## 3. Milestone 단계 (5단계)

### ⚪ v1.0 (완료)
`quote-request` — 견적 제출 + Resend 이메일 알림

### 🔴 v1.1 — 마켓 핵심 루프 v1
4개 feature, **이것만 완료돼도 "의뢰인이 견적 받고 비교"가 동작**.

| 순서 | Feature | 이유 |
|------|---------|------|
| 1 | `provider-signup` | 청명이 실제 가입하지 않으면 quote-response 테스트 불가 (현재는 수동 seed 1명뿐) |
| 2 | `provider-profile-editor` | 청명이 자기 정보·priceBook·workCases 입력 → received-quotes에 meta 노출 |
| 3 | `quote-response` | 청명 intake (Tinder-like) + 견적 작성 폼 → quotes 컬렉션 write |
| 4 | `received-quotes` | 고객이 받은 견적 목록·비교·스텝퍼 확인 |

**v1.1 완료 시점**: 견적 제출 → 청명 응답 → 고객 비교 까지 loop 폐쇄. 협의·결제는 수동 (전화·이메일) 유지.

### 🟠 v1.1b — 홈 shell 성숙
3개 feature, UX 완성도 향상.

| 순서 | Feature | 이유 |
|------|---------|------|
| 5 | `bottom-tab-nav` | v1.1로 탭 3개(홈·받은견적·설정) 도달, 탭 공통화 필요 |
| 6 | `provider-dashboard` | 청명 홈 = 수신 요청·매출 shell (v1.1 연장) |
| 7 | `provider-profile` (reader) | 고객이 청명 상세 볼 수 있음 (받은견적 카드 → 청명 클릭) |

### 🟡 v1.2 — 메시지·탐색
2개 feature, 수동 협의를 앱 내로 가져옴.

| 순서 | Feature | 이유 |
|------|---------|------|
| 8 | `chat` | quoteCard inline + 결제요청·일정확정 quick action 기반 |
| 9 | `provider-search` | 리스트/지도 + 필터 (전체·배상보험·재계약률·응답시간) |

### 🟢 v1.2b — 고객 홈 완성
1개 feature.

| 순서 | Feature | 이유 |
|------|---------|------|
| 10 | `client-dashboard` | 평균가·Top5 shell (analytics-batch 없어도 placeholder 동작) |

### 🔵 v1.3 — 일정 확정
| 순서 | Feature | 이유 |
|------|---------|------|
| 11 | `booking` | chat의 "일정 확정" 버튼 → bookings 생성 → provider-dashboard 방문 리스트 populate |

### 🟣 v2 — 결제·리뷰
| 순서 | Feature | 이유 |
|------|---------|------|
| 12 | `payment` | 토스페이먼츠 SDK + 정산 payouts |
| 13 | `review` | booking 완료 후 리뷰 작성 → provider-profile 후기 탭 populate |

### ⚪ v2+ — 데이터 성숙
| 순서 | Feature | 이유 |
|------|---------|------|
| 14 | `analytics-batch` | 재계약률·평균가·응답시간 weekly aggregation → client-dashboard·provider-profile·provider-dashboard KPI 실데이터화 |

---

## 4. 데이터 모델 Union (14개 feature 통합)

```ts
// ─── Users ──────────────────────────────────────
users/{uid} {
  email, displayName, roles: ('client'|'provider')[],
  + providerId?: string          // v1.1 signup 후 본인 providerId
  + fcmToken?: string            // v2+ push (선택)
  isCheonggwangPartner           // 기존 legacy — 마켓 v1부터 deprecated
  createdAt
}

// ─── Providers (청명) ────────────────────────────
providers/{providerId} {
  ownerUid, companyName, categories[], regions[],
  contactEmail, contactPhone?, description?,
  isCheonggwangOwned, insured, insuranceAmount,
  pageId?, rating, responseTimeHours, reviewCount,     // ← 집계 (v2+)
  verified,                                             // v1.1 manual 운영자 승인
  yearsOfExperience,                                    // v1.1 편집 필드
  isAvailable,                                          // v1.1 활동중 토글
  priceBook: [{category, unit, unitLabel, basePrice, options[]}],  // v1.1 편집 필드
  profileImage, profileImagePath,                       // v1.1
  createdAt, updatedAt
}

providers/{providerId}/workCases/{id}                   // v1.1 portfolio subcollection
  category, sizeLabel, beforePhoto, afterPhoto, memo,
  completedAt, bookingId?, createdAt

// ─── Quote Requests (고객 요청) ───────────────────
quoteRequests/{id} {
  clientUid, category, region, size, preferredDate,
  contactPhone, photos[], note, notifiedProviderIds[],
  status: 'submitted'|'quoted'|'negotiating'|'booked'|'completed'|'cancelled',
  + roomType?: '원룸'|'투룸'|'쓰리룸'|'오피스텔',        // v1.1 추가
  createdAt
}

// ─── Provider Responses (청명 응답) ───────────────
providerResponses/{providerId}_{requestId} {            // v1.1 composite ID
  providerId, requestId,
  status: 'pending'|'passed'|'asked'|'quoted',
  respondedAt
}

// ─── Quotes (견적서) ──────────────────────────────
quotes/{quoteId} {                                      // v1.1 신규
  requestId, providerId, clientUid,
  items: [{label, price, note?}],
  scheduledAt, estimatedWorkHours,
  totalAmount, insured,
  status: 'sent'|'accepted'|'rejected',
  sentAt, acceptedAt?, rejectedAt?
}

// ─── Chat ────────────────────────────────────────
chatThreads/{threadId} {                                // v1.2 신규 (threadId = requestId_providerId)
  requestId, providerId, clientUid,
  lastMessage: {text, senderType, sentAt, type},
  unreadCountByProvider, unreadCountByClient,
  latestSystemEvent?, clientTag?: 'regular',
  createdAt, lastMessageAt
}

messages/{messageId} {                                  // v1.2 신규
  threadId, senderUid, senderType: 'client'|'provider',
  type: 'text'|'photo'|'quoteCard'|'paymentRequest'|'bookingConfirmation'|'systemEvent',
  systemEventType?: 'quoteAccepted'|'bookingConfirmed'|'workCompleted'|'paymentCompleted'|...,
  payload, sentAt
}

// ─── Bookings (일정·방문) ────────────────────────
bookings/{bookingId} {                                  // v1.3 신규
  requestId, quoteId, providerId, clientUid,
  scheduledAt, address, category, size, amount,
  status: 'confirmed'|'in_progress'|'completed'|'cancelled',
  checkedInAt?, checkedOutAt?,
  createdAt
}

// ─── Payment (결제·정산) ─────────────────────────
payments/{paymentId} {                                  // v2 신규
  bookingId, clientUid, providerId,
  amount, tossPaymentKey, status, paidAt, refundedAt?
}

payouts/{payoutId} {                                    // v2 신규
  providerId, periodStart, periodEnd,
  scheduledAt, settledAmount, status, bookings[]
}

// ─── Review ─────────────────────────────────────
reviews/{reviewId} {                                    // v2 신규
  bookingId, providerId, clientUid,
  rating, text, photos[],
  providerReply?, createdAt
}

// ─── Favorites (선택) ──────────────────────────
favorites/{uid}_{providerId}                            // v1.1b 선택 (♡ 버튼)

// ─── Analytics Aggregates ───────────────────────
providerStats/{providerId} {                            // v2+ weekly batch
  responseRate, acceptanceRate, avgResponseMinutes,
  repeatRate, completedWorkCount,
  thisWeek: {...}, lastWeek: {...}, weekOverWeekDelta: {...}
}

regionBenchmarks/{regionKey} {                          // v2+ weekly batch (평균가)
  category, sizeBucket, priceRange: {min, max}, trend
}
```

### 기존 레거시 컬렉션 (archived feature 자산)
- `pages/` — promo-page 승격 후보 (v1.1 `provider-profile-editor`에 merge 또는 ref)
- `trendKeywords/` — content-research-pipeline 소유, 마켓 v1에서 미사용
- `rateLimits/` — 공유 infra ✅

---

## 5. Cross-cutting 설계

### 5.1 Route Group (role-based)
```
src/app/
├── page.tsx                       /            (공용 홈 — 역할에 따라 redirect)
├── (client)/                      고객 role required
│   ├── quote/new, /thanks
│   ├── received/                  v1.1 받은견적
│   ├── discover                   (archived promo-feed 이전)
│   ├── p/[slug]                   v1.1b 청명 프로필 reader
│   └── search                     v1.2 청명찾기
├── (provider)/                    청명 role required
│   ├── home                       v1.1b 청명 대시보드
│   ├── requests                   v1.1 수신 요청 triage
│   ├── works                      v1.1 포트폴리오·단가·후기
│   ├── schedule                   v1.3 일정 관리
│   └── settlements                v2 정산
├── chat/                          role-aware (v1.2)
│   ├── [threadId]
│   └── page.tsx                   목록
├── (auth)/
│   ├── login
│   ├── signup-client              일반 가입
│   └── signup-provider            v1.1 청명 가입
└── (shared)/
    └── api/*
```

### 5.2 Firestore Rules 확장 정책
- `users.roles` 기반 read/write 허용 (e.g. `providers`는 `provider` role만 자기 것 write)
- composite role check helper (Rules 함수)
- admin 승인이 필요한 필드 (`verified`, `insured`, `insuranceAmount`) → write: if false + Cloud Function

### 5.3 Storage 경로
```
photos/{uid}/{pageId}/...           legacy promo-page
quote-photos/{uid}/{requestId}/...  v1 quote-request ✅
profile-images/{providerId}/...     v1.1 provider-profile-editor
work-photos/{providerId}/{workCaseId}/before.jpg|after.jpg   v1.1
review-photos/{uid}/{reviewId}/...  v2 review
```

### 5.4 Archived 자산 재활용 map
| Archived feature | 재활용 대상 feature |
|------------------|---------------------|
| `promo-page` | `provider-profile-editor` (EditorShell 탭 패턴, PhotoUpload, HygieneBadge → 배상보험 배지로 변형) |
| `promo-page` | `provider-profile` reader (공개 페이지 구조 · slug · opengraph-image) |
| `promo-feed` | `provider-search` (within-row ranking, region filter, category tabs, feed-service cache) |
| `promo-feed` | `client-dashboard` (Top5 레일 UX) |
| `content-research-pipeline` | `analytics-batch` (Firebase Functions 2nd gen + Cloud Scheduler + Resend 주간 리포트 패턴) |

### 5.5 LLM 활용 포인트
현재 `GOOGLE_GENERATIVE_AI_API_KEY` 세팅됨 (Gemini). 다음 feature에서 활용:
- `quote-response` — 청명의 빠른 견적 drafting 도움 (제안 텍스트 생성)
- `chat` — 자동 FAQ 응답 suggestions (v1.2+)
- `review` — 리뷰 요약 (v2+)
- `provider-search` — natural language query ("오후 2시에 에어컨 분해청소") → filter 변환 (v2+)

### 5.6 Next.js 16 패턴 준수 (모든 feature 공통)
- `cookies()` / `headers()` / `searchParams` → 모두 async + Suspense 경계
- Cache Components: `'use cache'` + `cacheTag` + `cacheLife`
- `revalidateTag(tag, 'max')` 2-arg 문법
- `middleware` → `proxy.ts`
- Server Actions + Zod + ActionResult 패턴 (기존 `errors.ts`)

---

## 6. Immediate Next Actions (3단계)

### ① quote-request 종료 (지금)
```
/pdca report quote-request       # Match 99% 보고서 생성
/pdca archive quote-request --summary
```

### ② 첫 feature 착수 — `provider-signup`
**이유**: v1.1의 다른 feature들은 전부 "실제 로그인한 청명"을 전제로 한다. 지금은 seed 1명뿐 + Firestore 수동 입력만 가능. provider-signup이 없으면 dev에서도 테스트 어려움.

```
/plan-plus provider-signup
```

**예상 Plan scope**:
- `/signup/provider` 가입 플로우: 이메일/비번 → 업체 정보 1단 → (선택) 프로필 사진 → providers.create + users.roles += 'provider'
- users → providers 1:1 링크 (`users.providerId`, `providers.ownerUid`)
- admin 승인 없이 즉시 활성 (v1.1은 self-serve), `verified=false` 초기값
- proxy.ts matcher 확장: `/signup/provider`

### ③ 병렬 준비 (Plan/Design만 선행)
v1.1 4개 feature를 parallel Plan 단계에서 설계 리뷰 (design-validator) 후, 구현은 순차 진행.

순차 명령 추천:
```
/pdca report quote-request
/pdca archive quote-request --summary
/plan-plus provider-signup
/pdca design provider-signup
```

---

## 7. 원칙·제약 (전체 Master 적용)

1. **Archived 최대 재활용**: promo-page / promo-feed / content-research-pipeline 구조 우선 검토
2. **Hygiene 격리 원칙**: 기존 방침 유지 — 청명 description / 리뷰 텍스트에 3중 방어 (LLM prompt + post filter + 수동 검수)
3. **닭-계란 회피**: provider-signup v1.1 나오기 전까지 첫 청명 수동 seed (seed-first-provider.mjs 재사용)
4. **수동 브리지**: chat·booking·payment 없는 동안은 이메일·전화 대체 허용 (v1.2까지)
5. **전국 지원**: 지역 라벨은 `region.ts` 그대로, provider 시드는 강남 중심, 운영 확장 시 서울→전국 순
6. **App Check**: v2 운영 전환 시 전면 강제 (현재는 ENV로 permissive)
7. **Next.js 16 네이티브 패턴**: async params/searchParams, Cache Components, proxy.ts
8. **Feature 경계**: 한 feature의 scope는 "하나의 PDCA 사이클 내 MatchRate 90%+"가 가능한 크기 (3-7일 예상)

---

## 8. 의존성이 아직 미정인 화면
| 화면 | 상태 |
|------|------|
| 커뮤니티 탭 | v2+ 예정 (Master Plan 범위 외) |
| 설정·결제수단·알림 | 각 feature 내부 또는 별도 `settings` mini-feature v1.2 |
| 청명 가입/업체 등록 상세 | Plan Plus에서 설계 (mockup 없어도 PDCA로 도출) |
| 청명 일정 상세 (체크인/체크아웃) | booking feature Plan에서 설계 |
| 서비스 단가 탭 · 후기 탭 (편집기) | provider-profile-editor 내 하위 탭 — Plan에서 설계 |

---

## 9. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 1.0 | 2026-04-20 | Master Plan 초안 · 14 feature 인벤토리 · 5 milestone · 의존성 그래프 · 데이터 모델 union · cross-cutting 설계 · archive 재활용 map · 원칙·제약 | Seokho Lee |
