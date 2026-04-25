# Vision: 청광 마켓플레이스 (Marketplace Track)

> 작성: 2026-04-20
> 상태: Draft v1
> 목적: 향후 모든 마켓플레이스 feature PDCA의 공통 참조 문서

---

## 1. 비즈니스 모델

### 1.1 제품 한 문장
청광은 **의뢰인이 청소 업체를 찾고 견적 받고 결제하는 로컬 청소 마켓플레이스**다.

### 1.2 벤치마크
- **숨고 · 크몽**: 견적 요청 → 매칭 → 채팅 → 결제 플로우
- **다이닝코드**: 지역 기반 UX, 재계약률/리뷰 신뢰 요소
- **당근 청소**: 로컬리티·커뮤니티 감성

### 1.3 수익 모델
- **매칭 수수료** (견적 성사 시 청명에게 과금)
- **결제 중개 수수료** (토스페이먼츠 연동 후)
- **광고 슬롯** (청명 프리미엄 노출, v2+)

---

## 2. 3자 모델

```
┌─────────────────────────────────────────────────────────────┐
│  청광 (플랫폼 운영자 · 중개)                                    │
│                                                             │
│    ┌──────────────────────┐      ┌──────────────────────┐  │
│    │ 청명 (공급자)           │      │ 의뢰인 (수요자)         │  │
│    │ - 청소업체 N개          │◀────▶│ - B2C 소비자          │  │
│    │ - 견적 작성·전송        │      │ - 견적 요청·결제         │  │
│    │ - 일정 관리            │      │ - 리뷰 작성            │  │
│    │ - 청광 운영업체 = 첫 청명  │      │                       │  │
│    │   (닭-계란 해결)        │      │                       │  │
│    └──────────────────────┘      └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 역할별 상세

**청광 (플랫폼)**
- 매칭 알고리즘 운영
- 분쟁 조정·CS
- 배상보험 5억 제공 (신뢰 요소)
- 정산·수수료 관리

**청명 (청소업체 · 청광의 고객사)**
- 자체 프로필 관리 (기존 `promo-page` 구조 재활용 가능)
- 견적 수신 → 작성 → 전송
- 일정·작업 관리
- Before/After 사진 업로드
- 평점 관리

**의뢰인 (B2C 소비자)**
- 카테고리·조건으로 견적 요청
- 여러 청명의 견적 비교
- 채팅으로 세부사항 협의
- 일정 확정 → 결제 → 작업 완료 → 리뷰

---

## 3. 청소 카테고리 (6종, Figma 기준)

| # | 카테고리 | 서브 | 노트 |
|---|---|---|---|
| 1 | 입주청소 | 이사 전·후 | 평수 기반 |
| 2 | 사무실청소 | 주1·격주·월1 | 반복 계약 |
| 3 | 에어컨청소 | 분해 청소 | 대수 기반 |
| 4 | 이사청소 | 쓰레기 정리 | 평수 기반 |
| 5 | 특수청소 | 곰팡이·해충 | 견적 맞춤 |
| 6 | 정기청소 | 월 구독 | 구독 모델 |

---

## 4. 병행 구조 (기존 Track과 공존)

현 프로젝트에는 이미 archived된 2 track의 기능이 존재:

### Track A: 홍보 매체 (archived)
- `promo-page`: 업체별 홍보 페이지 빌더
- `promo-feed`: Netflix 스타일 피드 매체
- **역할**: 청명(청소업체)이 자기 회사를 소개하는 공간

### Track B: 마켓플레이스 (NEW — 이번 방향)
- `quote-request`: 견적 요청 플로우 (첫 feature)
- `provider-profile`: 청명 프로필 (기존 `promo-page` 구조를 승격)
- `quote-response`: 청명의 견적 작성 (v1.1)
- `chat`: 의뢰인-청명 채팅 (v1.2)
- `booking`: 일정 확정 (v1.3)
- `payment`: 결제 (v2)
- `review`: 리뷰·평점 (v2)
- `admin`: 분쟁 조정 (v2+)

### 두 Track의 연결점
- **청명 프로필**: 마켓플레이스의 청명 상세 페이지 = `/p/{slug}` 재활용
- **Before/After 갤러리**: `promo-page.photos[]`를 청명 프로필로 노출
- **재계약률 Top 5**: `promo-feed`의 ranking 알고리즘 재활용 (matching + freshness + diversity)
- **신뢰 배지**: `promo-page.HygieneBadge` 구조를 "배상보험 5억" 배지로 변형
- **지역·태그**: `domain/region.ts`, `domain/tags.ts` 그대로 사용

### 라우트 재배치
```
/                    → 마켓플레이스 홈 (의뢰인 Figma)    ← 이동 대상
/discover            → 홍보 피드 (기존 promo-feed)
/p/{slug}            → 청명 프로필 상세 (기존 promo-page 구조)
/quote/new?cat=...   → 견적 요청 멀티스텝 폼
/quotes              → 받은 견적 목록 (의뢰인)
/chat                → 채팅
/provider/*          → 청명 전용 영역 (v1.1)
/admin/*             → 청광 관리자 (v2+)
```

---

## 5. 기술 스택 (공유)

- **Frontend**: Next.js 16 App Router, React 19, Tailwind 4 — 그대로
- **Auth**: Firebase Auth — 그대로. 사용자 프로필에 `roles: ('client' | 'provider')[]` 필드 추가
- **DB**: Firestore
- **LLM**: Google AI Studio (Gemini) — 매칭 추천·견적 요약·리뷰 요약에 재활용
- **Cache**: Cache Components (`'use cache' + cacheTag`)
- **결제 (v2)**: 토스페이먼츠

### Firestore 신규 컬렉션 설계 (잠정)
```
users/{uid}
  + roles: ('client' | 'provider')[]       ← 역할 플래그

providers/{providerId}
  companyName, address, categories[], 배상보험, 평점, ...
  pageId?                                     ← promo-page pageId 링크 (선택)
  slug?                                       ← 공개 URL

quoteRequests/{requestId}
  clientUid, category, ...조건들, region, requestedAt, status

quotes/{quoteId}
  requestId, providerId, 견적금액, 내용, status, submittedAt

bookings/{bookingId}
  requestId, quoteId, 일정, 주소, 결제상태, ...

reviews/{reviewId}
  bookingId, clientUid, providerId, rating, text, ...
```

---

## 6. MVP 전략 (3-step bootstrap)

### Step 1 — Supply Seed
- 청광 자체 운영 업체를 첫 청명으로 **Firestore 수동 시드**
- 현재 promo-page로 만든 홍보 페이지가 있다면 `pageId`로 링크
- 청명 등록 UI는 v1.1까지 미룸 (1개만 있으면 의뢰인 테스트 가능)

### Step 2 — Demand Entry (첫 feature = `quote-request`)
- 의뢰인이 홈에서 카테고리 선택 → 견적 요청 폼 → Firestore 저장
- 청명에게 **이메일 알림** (청명 admin이 수동 응답, 전화/이메일)
- 의뢰인 "받은견적" 탭은 placeholder

### Step 3 — Marketplace Loop Closure (v1.1~)
- 청명 응답 작성 UI → 의뢰인 견적 수신·비교 → 채팅 → 일정 → 결제 → 리뷰

---

## 7. 우선순위·로드맵

| Phase | Features | 목표 |
|-------|----------|------|
| **v1 (MVP)** | quote-request | 의뢰인 진입, 데이터 수집 시작 |
| v1.1 | provider-profile (승격), quote-response UI | 청명 workflow 디지털화 |
| v1.2 | chat, booking | 마켓 루프 폐쇄 |
| v2 | payment (토스), review | 거래 완결 |
| v2+ | admin, 분쟁 조정, 커뮤니티 | 운영 성숙 |

---

## 8. 원칙 & 제약

- **닭-계란 회피**: 청광 자체 업체가 첫 청명 (supply seeded)
- **수동 브리지 우선**: UI 없이 이메일·전화로 대체 가능한 flow는 v1에서 자동화 안 함
- **재사용 극대화**: 기존 archived 자산(promo-page, promo-feed, content-research-pipeline)의 구조·컴포넌트 최대한 활용
- **🧹 Hygiene 격리 원칙 유지**: 청광 배지로서만 유지 (기존 방침)
- **전국 지원**: 지역 라벨·필터는 전국 대응 (시드는 강남구부터)
- **Next.js 16 패턴**: async params, `'use cache' + cacheTag`, `revalidateTag(tag, 'max')` 2-arg, `updateTag`, proxy.ts

---

## 9. Related Archives (참고 자료)

- **promo-page** (Match 93%, 2026-04-19): [docs/archive/2026-04/promo-page/](../archive/2026-04/promo-page/)
  - 활용: HygieneBadge 구조, photos[] 모델, AI 생성 섹션, Hygiene 3중 방어
- **content-research-pipeline** (Match 96%, 2026-04-19): [docs/archive/2026-04/content-research-pipeline/](../archive/2026-04/content-research-pipeline/)
  - 활용: trendKeywords 공급, Firebase Functions 2nd gen 패턴
- **promo-feed** (Match 97%, 2026-04-20): [docs/archive/2026-04/promo-feed/](../archive/2026-04/promo-feed/)
  - 활용: 카드 4:3 레이아웃, within-row ranking 알고리즘, feed-service 캐시 전략, region/tags 도메인

---

## 10. Next

- [x] `/plan-plus quote-request` (2026-04-20 · Match 99% · v1.0 완료)
- [x] seed-first-provider.mjs 작성
- [x] **Master Plan 작성** → [marketplace-master-plan.md](./marketplace-master-plan.md) (14 features · 5 milestones)
- [x] `/pdca report + archive quote-request` (archived)
- [x] `/pdca plan-plus/do/analyze/report/archive provider-signup` (v1.1 #1 · Match 99% · archived)
- [x] `/pdca plan-plus/do/analyze/report/archive quote-response` (v1.1 #2 · Match 99% · archived)
- [x] `/pdca plan-plus/do/analyze/report/archive received-quotes` (v1.1 #3 · Match 99% · archived · **v1.1 루프 폐쇄** 🏆)
- [x] `/pdca plan-plus/do/analyze/report/archive bottom-tab-nav` (v1.1b #1 · Match 99% · archived · user-repository bug fix 보너스)
- [x] `/pdca plan-plus/do/analyze/report/archive provider-profile` (v1.1b #2 · Match 99% · archived · Figma 7섹션 + seed 확장)
- [x] `/pdca plan-plus/do/analyze/report/archive provider-profile-editor` (v1.1b #3 · Match 99% · archived · 3-tab · PhotoUpload maxPhotos 확장)
- [x] `/pdca plan-plus/design/do/analyze/report/archive provider-dashboard` (v1.1b #4 · Match 99% · archived · `/provider/home` + adaptive UX + .count() aggregation + DashboardHero Server + TriageClient BottomTabNav 겹침 bonus fix)
- [x] `/pdca plan-plus/design/do/analyze/report/archive client-dashboard` (v1.1b #5 · **Match 100% 🏆 첫 퍼펙트** · archived · 홈 `/` 확장 · 평균가 + Top 5 · `await connection()` Next.js 16 Cache Components 패턴 · seed 5 청명 · **v1.1b 5/5 마감 🏆**)
- [x] `/pdca plan-plus/design/do/analyze/report/archive chat` (v1.2 #1 · **Match 100% 🏆 2연속 퍼펙트** · archived · `/chat` + `/chat/{threadId}` · **Firestore onSnapshot v1.2 첫 도입** · submitQuote TX 확장 · 9 components · 3 indexes · BottomTabNav unread badge)
- [x] `/pdca plan-plus/design/do/analyze/report/archive provider-search` (v1.2 #2 · **Match 100% 🏆 3연속 퍼펙트** · archived · `/search` placeholder 교체 · Server-first URL param · 4 필터 + 2 정렬 · 12 components · Firestore 2-3 필드 + client-side 보정 · 2 composite indexes · 비로그인 public)
- [x] `/pdca plan-plus/design/do/analyze/report/archive booking` (v1.3 #1 · **Match 99% 🏆 마켓 루프 종결** · archived · chat-centric 1-step · `bookings/{id}` 컬렉션 · TX 3R/5W idempotent · MessageType 확장 `"text"|"system"` · `/provider/works` placeholder 교체 · KST 5-bucket grouping · Firestore rules + 1 index · 제출→응답→비교→수락→협의→일정확정 end-to-end 종결)
- [ ] v1.4 `provider-promo-content` (AI 블로그 커뮤니티 게시) / v2 `payment` (토스페이먼츠) · v2 `review` / v1.3b booking 상태 전이
