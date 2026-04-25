# Plan: 견적 요청 (quote-request)

> 생성: 2026-04-20
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 소속 Track: **Marketplace** ([Vision](../../00-vision/marketplace.md))
> 선행 사이클: promo-page · content-research-pipeline · promo-feed (모두 archived)
> 다음 단계: `/pdca design quote-request`

---

## 1. User Intent Discovery

### 1.1 배경
청광 제품이 두 개 Track으로 병행됨을 확정 (Vision 문서 참조):
- **Track A (archived 매체)**: promo-page/feed — 업체별 홍보
- **Track B (본 사이클 시작)**: 의뢰인이 청소 업체를 찾고 견적받고 결제하는 마켓플레이스

본 feature는 **Track B의 첫 조각** — 의뢰인이 마켓 진입 후 가장 먼저 하는 행동인 "견적 요청"을 구현한다.

### 1.2 핵심 목적
- **의뢰인이 청소 서비스 견적을 요청하는 최단 경로** 구축
- **닭-계란 문제 우회**: 첫 청명은 청광 자체 운영 업체를 Firestore 수동 시드 → 의뢰인 체험 가능
- **수작업 응답 전제**: 청명 admin은 이메일로 요청을 수신해 전화/이메일로 직접 응답. 청명 응답 작성 UI는 v1.1
- **데이터 토대**: `quoteRequests`, `providers` 컬렉션 정의 → 향후 모든 마켓 기능의 기반

### 1.3 타겟 사용자
- **1차**: 의뢰인 (B2C 소비자) — 로그인 후 견적 제출
- **2차**: 청명 운영자 (수신 이메일 처리)
- **3차**: 청광 운영자 (수집 요청 수 모니터링, Firestore 콘솔)

### 1.4 MVP 경계
- ✅ 견적 **제출(submit)** 플로우 전용
- ✅ 청명에게 **이메일 알림** (Resend)
- ❌ 의뢰인용 "내 견적 목록" UI (v1.1)
- ❌ 청명 admin 응답 작성 UI (v1.1)
- ❌ 채팅·결제·리뷰 (별도 사이클)

### 1.5 성공 기준
- 의뢰인이 홈 → 카테고리 선택 → 제출까지 평균 2분 이내
- 제출 성공률 95%+ (입력 검증 실패 제외)
- 이메일 발송 성공률 90%+ (Resend 기준)
- 첫 청명 시드 후 2주 내 최소 10건 견적 요청 접수

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **Server Action + Resend 동기** | **채택** |
| B | Firestore Trigger + Cloud Functions 비동기 이메일 | 기각 (인프라 복잡·MVP 오버) |
| C | 외부 폼 서비스 (Tally/Typeform) + webhook | 기각 (자체 플랫폼 철학에 반) |

### 2.1 채택 근거
- **패턴 재사용**: content-research-pipeline에서 검증된 Resend 연동 그대로
- **배포 단순**: Next.js 앱 범위 내, Cloud Functions 추가 배포 불필요
- **MVP 적합**: 첫 청명 1건·초기 발송량 소규모 — 동기 발송 지연 체감 없음
- **이관 경로 명확**: v2에 발송량 증가 시 Firestore Trigger로 이관 용이

### 2.2 인증 정책 — 로그인 강제
- **이유**: 기존 Firebase Auth 인프라 재활용, 중복·남용 방지, 의뢰인 이력 추적
- **손실**: 전환율 소폭 ↓ (익명 Tally 대비)
- **수용 이유**: MVP 우선순위는 "데이터 토대" — 익명 받아봐야 tracking 불가하면 무의미

### 2.3 폼 구조 — 공통 필드 + 자유 텍스트
- **공통**: 카테고리, 지역, 평수(optional), 희망일(optional), 연락처(필수), 사진(0~5), 특이사항(max 500자)
- **근거**: 6 카테고리별 구조화 폼은 UI 복잡도 6배. 자유 텍스트로 LLM 기반 파싱·분류는 v1.1
- **사진 허용 근거**: 입주/특수/이사청소는 현 상태 사진이 견적 정확도에 결정적

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (11개)
1. **홈 `/` 재배치**: promo-feed → `/discover`, `/` 는 마켓플레이스 홈
2. **새 `/` 홈 shell**: 상단 바(위치 표시 + 알림 벨 placeholder) + "오늘의 할 일" 카드 (내 견적 요청 count — 실데이터) + CTA + 카테고리 6개 그리드 (lucide 아이콘 + 파스텔 tile)
3. `/quote/new?category=X` **견적 요청 폼** (공통 필드 + 자유 텍스트 + 사진 업로드)
4. Firestore **`quoteRequests/{id}`** 신규 컬렉션 + 보안 규칙
5. Firestore **`providers/{id}`** 신규 컬렉션 + 보안 규칙
6. **첫 청명 시드 스크립트** (`scripts/seed-first-provider.mjs`) — 청광 자체 업체
7. `users.roles: ('client' | 'provider')[]` 필드 + 최초 제출 시 `client` 자동 추가
8. Server Action **`submitQuoteRequest`** + Zod + Resend 이메일 발송
9. `/quote/thanks?id={requestId}` **감사 페이지** (요약 + 안내)
10. Firestore 인덱스 2개 + Storage 규칙 추가
11. **Home dashboard shell** — "오늘의 할 일" card (로그인 시 `listForClient` count 표시, 비로그인 시 숨김), 알림 벨은 비기능 placeholder

### 3.2 Out of Scope → v1.1 이상
| 항목 | 이동 이유 |
|------|----------|
| 오늘의 할 일 — "새 견적 N건 도착" (청명 응답) · 방문 일정 · 결제 요청 | 각각 quote-response(v1.1) · booking(v1.2) · payment(v2) 의존 |
| 하단 5탭 (청명찾기·받은견적·채팅·커뮤니티) | 각 대상 페이지 부재 |
| 내 견적 요청 목록 상세 페이지 | 청명 응답 작성 UI와 묶여야 의미 (v1.1) — 홈 shell에 count만 표시 |
| 위치 선택기 동작 (드롭다운, 주소 변경) | 전국 static 표시만. dynamic selector는 v1.1 |
| 알림 벨 — 실제 알림 목록 | v2+ 알림 시스템 필요 |
| 청명 admin 응답 작성 UI | v1.1 핵심 |
| 지역 평균가 · 재계약률 Top 5 · Before/After | 거래·리뷰 데이터 필요 |
| 카테고리별 맞춤 폼 필드 | 자유 텍스트로 충분, v1.2+ |
| 카테고리별 맞춤 이메일 템플릿 | 단일 템플릿 충분 |
| 알림 시스템 (앱 내 벨) | 별도 인프라 |
| 토스페이먼츠 결제 | v2 |
| 리뷰·평점·재계약률 | v2 |
| 채팅 시스템 | v1.2 |
| 카카오 로그인 | 기존 방침 v1.1 |
| App Check 강제 | promo-page follow-up과 동일 타이밍 |
| LLM 자동 매칭 (카테고리 + 지역) | v1.2 (데이터·청명 수 확보 후) |

### 3.3 기존 기능 영향
- **홈 `/`**: promo-feed가 소유 → `/discover`로 라우트 이동. 기존 북마크는 404 (수용)
- **proxy.ts**: matcher에 `/quote/:path*` 추가
- **users 컬렉션**: `roles` 필드 신규. 기존 `isCheonggwangPartner`와는 별개 개념 (partner는 promo-page용 신뢰 배지)
- **Storage**: `quote-photos/{uid}/{requestId}/` 신규 path
- **환경변수**: `RESEND_API_KEY`·`EMAIL_FROM`·`OPERATOR_EMAIL` — `.env.local`에 추가 필요

---

## 4. Architecture

### 4.1 스택
- Next.js 16 App Router + React 19 + Tailwind 4 (기존)
- Firebase Auth + Firestore + Storage (기존)
- Server Action + Firebase Admin (기존 패턴 재사용)
- **Resend API** (신규) — content-research-pipeline에서 검증된 SDK-less fetch 호출

### 4.2 파일 구조 (신규 + 수정)

```
src/
├── app/
│   ├── page.tsx                          🔄 교체: promo-feed → 마켓플레이스 홈
│   ├── discover/page.tsx                 🆕 (기존 FeedPage 이전)
│   ├── quote/
│   │   ├── new/page.tsx                  🆕 카테고리 기반 견적 요청 폼
│   │   └── thanks/page.tsx               🆕 제출 완료 페이지
│   └── actions/
│       └── quote-actions.ts              🆕 submitQuoteRequest Server Action
├── components/
│   └── quote/
│       ├── QuoteForm.tsx                 🆕 Client, RHF + Zod
│       ├── QuoteCategoryCard.tsx         🆕 홈 카테고리 그리드 카드
│       ├── QuoteHomeShell.tsx            🆕 마켓플레이스 홈 shell
│       └── QuotePhotoUpload.tsx          🆕 or PhotoUpload 재사용
├── services/
│   └── quote-service.ts                  🆕 submitQuoteRequest 유스케이스
├── lib/
│   ├── firebase/
│   │   ├── provider-repository.ts        🆕
│   │   ├── quote-request-repository.ts   🆕
│   │   └── user-roles.ts                 🆕 ensureClientRole 헬퍼
│   └── email/
│       ├── resend.ts                     🆕 Resend 클라이언트
│       └── quote-email.ts                🆕 이메일 템플릿 + 발송
├── domain/
│   ├── quote-category.ts                 🆕 QuoteCategory enum + labels
│   └── quote-schemas.ts                  🆕 Zod schema
└── proxy.ts                              🔄 matcher에 /quote/:path* 추가

scripts/
└── seed-first-provider.mjs               🆕 첫 청명 시드 스크립트

firestore.rules                           🔄 providers + quoteRequests 규칙 추가
firestore.indexes.json                    🔄 인덱스 2개 추가
storage.rules                             🔄 quote-photos 경로 추가
```

---

## 5. Data Model

### 5.1 Firestore — `providers/{providerId}`

| Field | Type | Notes |
|-------|------|-------|
| ownerUid | string | Firebase Auth uid (청명 운영자) |
| companyName | string | 상호 |
| categories | QuoteCategory[] | 제공 카테고리 (6종 중) |
| regions | `{city, district}[]` | 서비스 지역 (다중) |
| contactEmail | string | 견적 알림 수신 (필수) |
| contactPhone | string? | 연락처 |
| description | string? | 소개 |
| isCheonggwangOwned | boolean | 첫 청명은 true |
| insured | boolean | 배상보험 가입 |
| pageId | string? | 기존 promo-page 링크 (v1.1 연동) |
| rating | number? | v1엔 null (v2 리뷰 도입 후) |
| responseTimeHours | number? | v1엔 null |
| createdAt, updatedAt | Timestamp | |

### 5.2 Firestore — `quoteRequests/{requestId}`

| Field | Type | Notes |
|-------|------|-------|
| clientUid | string | 의뢰인 uid |
| category | QuoteCategory | 6종 enum |
| region | `{city, district}` | parseRegion 재사용 가능 |
| size | number? | 평수 (optional) |
| preferredDate | Timestamp? | 희망일 |
| contactPhone | string | 필수 |
| photos | Photo[] | 0~5장 |
| note | string? | 자유 텍스트 max 500자 |
| notifiedProviderIds | string[] | 발송된 청명 (감사 로그) |
| status | `'submitted'\|'responded'\|'cancelled'\|'completed'` | v1엔 'submitted'만 |
| createdAt | Timestamp | server |

### 5.3 `users` 확장

| Field | Type | Notes |
|-------|------|-------|
| roles | `('client'\|'provider')[]` | 최초 견적 제출 시 'client' 자동 부여 |

기존 `isCheonggwangPartner`와는 독립. 동일 유저가 의뢰인이자 청명일 수 있음 (roles 복수).

### 5.4 QuoteCategory enum

```ts
// src/domain/quote-category.ts
export type QuoteCategory =
  | 'move-in'    // 입주청소 · 이사 전·후
  | 'office'     // 사무실청소 · 주1·격주·월1
  | 'aircon'     // 에어컨청소 · 분해 청소
  | 'move-out'   // 이사청소 · 쓰레기 정리
  | 'special'    // 특수청소 · 곰팡이·해충
  | 'regular';   // 정기청소 · 월 구독
```

⚠️ promo-page의 `Category = 'restaurant'|'salon'|'cafe'`와는 **완전히 다른 축**. 이름 충돌 방지 위해 `QuoteCategory`로 분리.

### 5.5 Firestore 보안 규칙 추가

```javascript
match /providers/{providerId} {
  allow read: if true;                                           // 공개
  allow write: if false;                                         // Admin SDK만
}

match /quoteRequests/{requestId} {
  allow read: if request.auth != null
              && resource.data.clientUid == request.auth.uid;    // 본인만
  allow create: if request.auth != null
                && request.resource.data.clientUid == request.auth.uid
                && request.resource.data.status == 'submitted';
  allow update: if false;
  allow delete: if false;
}
```

### 5.6 Storage 규칙 추가

```javascript
match /quote-photos/{uid}/{requestId}/{fileName} {
  allow read: if false;                       // getDownloadURL 토큰으로 접근
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```

이메일에 embed되는 URL은 Firebase Storage downloadURL — 토큰 기반이라 rule 우회 가능. 청명이 로그인 없이도 이메일 클릭으로 사진 확인.

### 5.7 Firestore 인덱스 추가

```json
{
  "collectionGroup": "quoteRequests",
  "fields": [
    { "fieldPath": "clientUid", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "providers",
  "fields": [
    { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 6. Key Flow

### 6.1 의뢰인 견적 제출 (Happy Path)

```
1. / 방문
   ├─ 마켓플레이스 홈: 카테고리 6개 그리드 + "+ 새 견적 요청" CTA
   └─ 로그인 안 됐으면 헤더에 "로그인" 링크

2. 카테고리 클릭 → /quote/new?category=X
   ├─ proxy.ts: 세션 없으면 /login?next=/quote/new?category=X
   └─ 로그인 성공 시 폼 렌더

3. QuoteForm 입력
   ├─ 카테고리 (URL param, 변경 불가)
   ├─ 지역 (RegionSelect)
   ├─ 평수 (optional, 숫자)
   ├─ 희망일 (optional, date picker)
   ├─ 연락처 (필수, 검증)
   ├─ 사진 업로드 (0~5장, Storage 직접 업로드 — tempId 기반)
   └─ 특이사항 (textarea max 500자)

4. Submit → submitQuoteRequest(input) Server Action
   ├─ Auth verify (sessionCookie)
   ├─ Zod 검증
   ├─ requestId = Firestore auto-id
   ├─ tempId 경로의 사진 Storage path는 그대로 저장 (rename 안 함)
   │  or: 업로드 시 requestId를 미리 발급해 최종 path 사용
   │  → Plan 결정: 업로드 시 미리 requestId(nanoid) 발급 → 최종 path
   ├─ Firestore: quoteRequests/{requestId} create
   ├─ ensureClientRole(uid): users.roles에 'client' 병합
   ├─ matchProviders(category): providers where categories array-contains X
   ├─ 각 provider.contactEmail로 Resend 발송 (Promise.allSettled)
   ├─ quoteRequests/{requestId}.notifiedProviderIds 업데이트
   └─ return { ok, requestId }

5. 성공 → router.push('/quote/thanks?id=' + requestId)
   ├─ "견적 요청이 접수됐어요!"
   ├─ 요청 요약
   ├─ "최대한 빨리 연락드릴게요" 안내
   └─ "다른 청소도 요청하기" → /
```

### 6.2 청명 이메일 수신 → 수동 응답

```
Resend 이메일 수신 →
청명 admin이 의뢰인 연락처(전화/이메일)로 직접 응답 →
v1엔 시스템 응답 기록 없음 (v1.1에서 quoteResponses 컬렉션 + 청명 UI 도입)
```

### 6.3 Supply Seed (초기 1회)

```
pnpm tsx scripts/seed-first-provider.mjs
  ↓
Firestore Admin SDK로 providers/{id} 1건 create
  - companyName: "청광" 
  - categories: ['move-in','office','aircon','move-out','special','regular']
  - regions: [{city:'서울특별시', district:'강남구'}, ...전국]
  - contactEmail: 청광 운영 이메일
  - isCheonggwangOwned: true
  - insured: true
  - pageId: null (v1.1에 연동)
```

---

## 7. 비용·성능

| 항목 | 추정 |
|------|------|
| Firestore 쓰기 | 요청당 ~3회 (quoteRequests create + users update + quoteRequests update) |
| Firestore 읽기 | 요청당 ~2회 (providers list + users get) |
| Storage | 사진당 ~2MB 평균, 회당 최대 10MB |
| Resend | 발송당 소수 센트 (월 3,000건 무료) |
| **월 예상** | v1 기준 $0~2 (Firestore 무료 티어 내) |

---

## 8. Risks & Open Questions

| 리스크 | 완화 |
|--------|------|
| Resend 이메일 발송 실패 시 청명 통보 누락 | try/catch로 저장 성공 유지 + `notifiedProviderIds` 로깅 + 실패는 콘솔 warn. v1.1에 재시도 큐 |
| 사진 업로드 도중 이탈 → orphan Storage 파일 | requestId 미리 발급 + 7일 후 orphan 청소 스크립트 (v1.1) |
| 악의적 대량 제출 (스팸) | rate limit: per uid 5건/시간 (기존 `rate-limit.ts` 재사용) |
| Gemini는 v1에선 미사용 | 태그·매칭은 v1.2. 비용·복잡도 유보 |
| 첫 청명 시드 스크립트 SA 자격증명 요구 | 기존 `.env.local`의 `FIREBASE_ADMIN_SA_BASE64` 사용 |
| Resend 도메인 미인증 상태 이메일 | content-research-pipeline용 Resend 도메인 인증 공유 |

### Open Questions → `/pdca design`에서 해소
- 이메일 템플릿 상세 (HTML 스타일, OG 이미지)
- 사진 업로드 tempId vs pre-issued requestId (중간 결정: **pre-issued requestId**)
- 지역 드롭다운 v1 사전 목록 (promo-feed의 14개 재사용? 또는 시·도 단위만?)
- 홈 카테고리 아이콘 선택 (lucide-react? 이모지?)
- `/discover` 라우트 이전 시 기존 북마크 301 처리 여부

---

## 9. Brainstorming Log

| 단계 | 결정 | 근거 |
|------|------|------|
| Q1 MVP 경계 | Submit 전용 + 이메일 알림 | 가장 작은 가치 슬라이스 |
| Q2 인증 정책 | 로그인 강제 | Firebase Auth 재사용, 중복·남용 방지, 추적 가능 |
| Q3 폼 구조 | 공통 필드 + 자유 텍스트 | 카테고리별 6벌 UI 오버엔지니어링 |
| Q3' 사진 첨부 | 허용 (0~5장) | 입주·특수·이사 카테고리 견적 정확도 ↑ |
| Phase 2 접근 | A (Server Action + Resend 동기) | content-research-pipeline 검증된 패턴 |
| Phase 3 YAGNI | 하단 탭바·내 견적 목록·대시보드 전부 v1.1 | "submit만으로 닫힌 loop" 검증 우선 |
| Phase 4-1 proxy.ts | matcher에 `/quote/:path*` 추가 | 세션 가드 재사용 |
| Phase 4-2 QuoteCategory | 기존 `Category`(restaurant/salon/cafe)와 별개 축 | 이름 충돌 방지 |
| Phase 4-2 photos | 업로드 경로에 pre-issued requestId | orphan 최소화 |

---

## 10. Next Steps

- [ ] `/pdca design quote-request` — 상세 설계 (Open Q 5개 해소)
- [ ] Vision 문서 §4의 라우트 재배치 결정 공식 반영
- [ ] Plan 승인 후 Resend 도메인 인증 확인 (content-research-pipeline 준비물 공유)

### 🔗 관련 문서
- [Vision: 청광 마켓플레이스](../../00-vision/marketplace.md)
- [promo-page (archived)](../../archive/2026-04/promo-page/) — HygieneBadge·Photo·PhotoUpload 재사용 가능
- [promo-feed (archived)](../../archive/2026-04/promo-feed/) — RegionSelect·region 도메인 재사용
- [content-research-pipeline (archived)](../../archive/2026-04/content-research-pipeline/) — Resend 이메일 패턴

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Plan Plus 초안. MVP 경계=submit+이메일, 로그인 강제, 공통 폼+자유텍스트, Server Action+Resend, 사진 5장 허용. 10 MVP 항목·13 Out-of-Scope 확정 | Seokho Lee |
