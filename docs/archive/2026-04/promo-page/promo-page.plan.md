# Plan: 고객용 홍보 페이지 빌더 (promo-page)

> 생성: 2026-04-19
> 방법론: bkit Plan Plus (brainstorming-enhanced PDCA)
> 프로젝트 레벨: Dynamic
> 다음 단계: `/pdca design promo-page`

---

## 1. User Intent Discovery

### 1.1 핵심 목적
청광(청소 업체) 운영자가 자사의 청소 서비스 **이용 고객(건물주/상가)에게 제공하는 부가서비스**. 고객은 자신의 매장/건물을 홍보하는 공개 웹페이지를 손쉽게 생성할 수 있다.

### 1.2 타겟 사용자
- **1차 사용자(End User)**: 청광의 청소 서비스를 이용하는 건물주·상가 사업주 (IT 숙련도 낮음, B2B)
- **2차 사용자(Admin)**: 청광 운영자 (트렌드 키워드 풀 큐레이션)

### 1.3 핵심 가치
**"입력 최소, 결과 최대"** — 업체 정보 소수 입력 + 사진만으로 트렌드 워딩이 반영된 전문가 수준의 홍보 랜딩페이지를 즉시 생성·공개.

### 1.4 성공 기준(제안)
- 초회 방문부터 발행까지 평균 10분 이내
- 고객이 LLM 생성 문구를 평균 30% 미만 수정 (초안 품질이 충분히 높음)
- 발행 후 공개 URL에 외부 방문 발생 (정성적 성공)

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | 업종별 고정 템플릿 + LLM 섹션 생성 + 청소업 특화 | **채택** |
| B | 블록 드래그 에디터 + 블록별 LLM 제안 | 기각 (타겟 IT 숙련도 대비 과복잡) |
| C | 원클릭 풀오토 | 기각 (차별화 부족, 업종 간 페이지 유사) |

**채택 근거**: B2B 낮은 IT 숙련도 타겟에 맞는 최소 입력 경험 + 청소업 moat를 자연스럽게 탑재 가능 + 구현 복잡도 낮음.

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (8개)
1. 업체 정보 입력 폼 + Firestore 저장
2. 업종별 템플릿 3개 (음식점 · 미용실 · 카페)
3. Gemini(Firebase Vertex AI) 기반 섹션별 자동 글 생성
4. 트렌드 키워드 풀 (주간 수동 큐레이션) + LLM 프롬프트 주입
5. 공개 URL `/p/{slug}` 호스팅 (ISR)
6. 생성 텍스트 인라인 편집
7. Firebase Auth 이메일 로그인 (**카카오는 v1.1로 디퍼** — design-validator 2026-04-19 리뷰 반영)
8. 🧹 **청소업 특화 ①만 v1 탑재 (방향 전환 2026-04-19)**
   - ① 위생 안심 배지 ("청광 파트너 — 주 N회 전문 청소") — 신뢰 요소로만 작동
   - ~~② 청결 중시 섹션~~ → **제거**. 콘텐츠는 업종 표준 마케팅 톤으로
   - ~~⑤ 위생 키워드 LLM 가중치~~ → **제거**. 트렌드는 각 플랫폼 연구 결과 기반으로 추출

### 3.2 Out of Scope → v2 이동
- 문구 재생성 버튼 (인라인 편집으로 대체 가능)
- QR 코드 자동 생성 (외부 서비스로 대체)
- SNS 공유 버튼 (링크 공유로 대체)
- SEO 메타태그 고급 최적화 (v1은 og:image 기본값)
- 방문 통계/조회수
- 청광 운영자 어드민 대시보드 (v1은 Firestore 콘솔 수동)
- 🧹 청소업 특화 ③ (최근 청소일 자동 표시) — 청소 이력 DB 연동 필요
- 🧹 청소업 특화 ④ (Before/After 사진) — 청소사 내부 시스템 설계 후
- 블록 에디터, 색상 커스터마이징, 커스텀 도메인
- 다국어 지원

---

## 4. Architecture

### 4.1 스택
- **Frontend**: Next.js 16 App Router, React 19, Tailwind 4
- **Backend**: Next.js Route Handlers (API Routes), Firebase Admin SDK
- **Auth**: Firebase Auth (이메일 + 카카오)
- **DB**: Firestore
- **Storage**: Firebase Storage (업로드 사진)
- **LLM**: Google Gemini via Firebase Vertex AI SDK
- **Hosting**: Vercel 또는 Firebase Hosting (TBD in design phase)

### 4.2 주요 디렉토리 구조
```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (customer)/
│   │   ├── dashboard/page.tsx
│   │   └── editor/[pageId]/page.tsx
│   ├── p/[slug]/page.tsx           # 공개 홍보 페이지 (ISR)
│   └── api/
│       ├── generate/route.ts       # Gemini 섹션별 생성
│       └── publish/route.ts        # slug 발급
├── components/
│   ├── editor/{InputForm, PhotoUpload, SectionEditor}.tsx
│   ├── promo/{PromoPage, HygieneBadge}.tsx
│   ├── promo/sections/{Hero, Intro, Highlights, Hygiene, Location, CTA}.tsx
│   └── ui/
├── lib/
│   ├── firebase/{client, admin}.ts
│   ├── llm/{gemini, prompt-builder}.ts
│   ├── templates/{restaurant, salon, cafe}.ts
│   └── trend-keywords.ts
└── types/page.ts
```

### 4.3 책임 분리 핵심
- `templates/[category].ts`: 섹션 구조 + 🧹② 청결 강조 여부 + 프롬프트 힌트
- `prompt-builder.ts`: 입력값 + 트렌드(🧹⑤ 가중치) + 템플릿 힌트 → Gemini 프롬프트 조립
- `HygieneBadge.tsx`: `isCheonggwangPartner` 조건부 렌더 🧹①

### 4.4 Next.js 16 주의
프로젝트 `AGENTS.md` 지시에 따라 설계 단계(`/pdca design`)에서 `node_modules/next/dist/docs/`의 관련 가이드(App Router, Route Handlers, ISR, Server Actions, Metadata API) 확인 후 구현.

---

## 5. Data Model

### 5.1 Firestore 컬렉션

```
users/{uid}
  email, displayName, createdAt
  isCheonggwangPartner: bool     # 🧹① 위생 배지 조건 (운영자 수동 설정)
  partnerCleaningFrequency?: string  # "주 2회" 등 — 배지 문구용

pages/{pageId}
  ownerUid
  category: 'restaurant' | 'salon' | 'cafe'
  businessName, address, phone
  keyPoints: string[]
  photos: [{ url, path, order }]
  sections: {
    hero:       { title, subtitle },
    intro:      { body },
    highlights: { items: string[] },     # 🧹② 청결 항목 기본 1개 포함
    hygiene:    { body } | null,         # 🧹① 파트너 시만 렌더
    location:   { mapEmbed },
    cta:        { label, link }
  }
  slug: string | null
  published: bool
  createdAt, updatedAt

slugs/{slug}         # 역인덱스 — 공개 페이지 조회용
  pageId

trendKeywords/{category}
  keywords: string[]
  hygieneKeywords: string[]    # 🧹⑤ 가중치 주입 대상
  updatedAt
```

### 5.2 Firebase Storage
```
photos/{uid}/{pageId}/{filename}
```

---

## 6. Key Flows

### 6.1 페이지 생성·발행
1. 로그인 (Firebase Auth) → `users/{uid}` 자동 생성
2. `/dashboard` → "새 페이지" → `/editor/new`
3. 업종 선택 → 템플릿 고정
4. 업체 정보/키포인트/사진 입력 → Firestore 저장
5. "AI 글 생성" → `POST /api/generate`
   - 서버: 페이지 + 템플릿 + 트렌드 키워드 로드
   - 🧹① + 🧹② + 🧹⑤ 적용해 프롬프트 조립
   - Gemini 호출 → 섹션 텍스트 수신 → Firestore 업데이트
6. 인라인 편집 (debounce 저장)
7. "발행" → `POST /api/publish`
   - slug 생성 (businessName slug화 + nanoid 6자), 중복 체크
   - `slugs/{slug}` 생성, `pages.published=true`

### 6.2 공개 페이지 방문
1. `/p/{slug}` 접속
2. ISR (revalidate 60s) → `slugs/{slug}` → `pageId` → `pages/{pageId}`
3. `category`별 템플릿 컴포넌트로 렌더
4. `isCheonggwangPartner === true` → `<HygieneBadge />` 조건부 렌더 🧹①

### 6.3 트렌드 키워드 갱신 (운영자)
- v1: Firestore 콘솔에서 `trendKeywords/{category}` 수동 수정
- v2: Admin UI

---

## 7. 🧹 청소업 특화 Moat 요약 (2026-04-19 방향 전환)

**전환 사유**: 홍보글 본문은 업종 표준 마케팅 톤이어야 함. 청소를 "강조"하면 고객의 홍보 목적(자기 매장 마케팅)과 어긋남. 청소업 관련 요소는 **신뢰 배지** 역할로만 유지.

| 항목 | v1 | v2 | 우위 |
|------|-----|-----|------|
| ① 위생 안심 배지 | ✅ | | 일반 페이지 빌더에 없음, 신뢰 요소 |
| ② ~~청결 강조 섹션~~ | ❌ 제거 | | 홍보 목적과 상충 |
| ③ 최근 청소일 자동 표시 | | ✅ | 옵션 — 페이지 하단 mini-trust 영역 |
| ④ Before/After 사진 | | ✅ | 옵션 — 매장 소개 보조 자료 |
| ⑤ ~~위생 키워드 가중치~~ | ❌ 제거 | | 일반 트렌드 키워드로 대체 (별도 연구 파이프라인) |

**전략 변경**: 콘텐츠 경쟁력은 **업종별 플랫폼 연구 파이프라인**(별도 plan 문서: `content-research-pipeline.plan.md`)으로 확보. 청소업 moat는 오직 **신뢰 배지**로만.

---

## 8. Risks & Open Questions

| 리스크 | 완화 |
|--------|------|
| Gemini 생성 품질이 업종별로 편차 클 수 있음 | 업종별 프롬프트 예시(few-shot) 추가, 내부 테스트 세트 구축 |
| Firestore read 비용 (공개 페이지 트래픽 ↑) | ISR 60s 캐시, 향후 CDN 전면 배치 |
| 업체명 slug 충돌 | nanoid 6자 suffix 기본 부착 |
| Next.js 16 breaking changes | 설계 단계에서 `node_modules/next/dist/docs/` 검토 의무화 |
| 개인정보/저작권 (사진) | 업로드 시 고객 동의 문구 필수 |
| 청광 파트너 수동 플래그 관리 오류 | v2에서 내부 CRM 연동으로 자동화 |

**Open Questions (다음 단계 `/pdca design`에서 해소)**
- 발행 후 편집 재발행 정책 (즉시 반영? revalidate?)
- Gemini 프롬프트/응답 로깅 (품질 개선 루프)
- 카카오 로그인 공급자 설정 방식 (Firebase 지원 범위 확인)
- 호스팅: Vercel vs Firebase Hosting (배포·비용·DX 비교)

---

## 9. Brainstorming Log (핵심 결정)

| 단계 | 결정 | 근거 |
|------|------|------|
| Q1 타겟 | "청소 서비스 이용 고객(건물주/상가)" | 사용자 답변 |
| Q2 핵심 가치 | "랜딩페이지 + 자동 글 생성(기본글+트렌드워딩)" | 사용자 답변 |
| Phase 2 접근 | Approach A 채택 | 타겟 IT 숙련도 + 청소업 moat 탑재 가능 |
| Phase 3 YAGNI | 🧹① ② ⑤ 만 MVP, ③ ④ 는 v2 | ③④는 청소 이력 DB 연동 필요 |
| Phase 4-1 LLM | Gemini (Firebase Vertex AI) | Firebase 스택 네이티브 연동 |
| Phase 4-2 템플릿 | 업종 3개로 시작 (음식점/미용실/카페) | 청소업 주요 고객군 |
| Phase 4-3 플로우 | ISR 60s + slug 역인덱스 | Firestore read 비용 + 공개 조회 효율 |

---

## 10. Next Steps

- [ ] `/pdca design promo-page` — 상세 설계 (API 스펙, 컴포넌트 props, Gemini 프롬프트 초안, Next.js 16 공식 가이드 반영)
- [ ] `/pdca do promo-page` — 구현
- [ ] `/pdca analyze promo-page` — Gap analysis
- [ ] `/pdca report promo-page` — 완료 보고서
