# Plan · community-feed-3panel

**Feature**: 커뮤니티 피드 3패널 개편 — 청소 노하우 / 청소업체 홍보 / 고객 홍보(AI)
**Level**: Dynamic
**Cycle**: #18 (Marketplace v1.6 · community-feed-revamp)
**Method**: Plan Plus (brainstorming-enhanced)
**Started**: 2026-04-22

---

## 1. User Intent Discovery

### 1.1 Core Purpose
기존 단일 커뮤니티 피드를 **3개 패널(탭)로 전환 가능한 구조**로 개편한다.
- **청소 노하우 (tips)** — 전문가 팁/노하우
- **청소업체 홍보 (providers)** — 청명(공급자) 자가 홍보글
- **고객 홍보 (stories)** — **고객 업로드 사진(음식·공간 등) → AI RAG 기반 자동 블로그 생성**

세 패널은 `/community/[panel]` 단일 라우트 패밀리에서 탭으로 전환되며, 각 패널은 독립된 SEO 앵커(canonical · sitemap · RSS)를 갖는다.

### 1.2 Target Users
- **Primary (Viewer)**: 유기검색을 통해 유입되는 잠재 고객 (공간/살림 관련 검색)
- **Secondary (Viewer)**: 기존 고객 재방문
- **Creator — tips**: 청명(공급자) 및 운영진 편집 콘텐츠
- **Creator — providers**: 인증된 청명
- **Creator — stories**: 로그인한 고객 (사진 업로드 → AI 자동 생성)

### 1.3 Success Criteria
**SEO / 트래픽 유입**이 최우선 기준.
- 3개 패널 + 개별 글이 Google에 인덱싱된다 (sitemap.xml · JSON-LD Article).
- Core Web Vitals 기준 LCP < 2.5s, CLS < 0.1 (Next 16 + ISR 캐시).
- 발행된 `customer-story` 포스트가 크롤 가능한 상태로 정상 노출된다.
- 패널 전환 시 URL이 바뀌어 패널 자체가 독립된 랜딩 페이지로 인덱싱된다.

### 1.4 Constraints
- **자동 발행** — 관리자 모더레이션 없음. 품질 게이트는 `lib/llm/hygiene-guard.ts` 하나.
- **동기 생성** — v1은 서버 인라인 생성(3–8s 목표). 백그라운드 큐는 이연.
- Firebase (Firestore + Storage + Auth) · Gemini (Vision + Pro) 스택 고정.

---

## 2. Alternatives Explored

### A. 탭 분할 + 통합 `posts` (postType 판별자) — 채택 ✅
- URL: `/community/[panel]` (panel ∈ {tips, providers, stories})
- 데이터: 기존 `posts` 컬렉션에 `postType` 필드 추가 · 기존 `/p/[slug]` 재사용
- Pros: SEO URL 깔끔 · 기존 repository/detail view 재사용 · 단일 소스 오브 트루스
- Cons: posts 스키마가 커짐 · 복합 인덱스 추가 필요

### B. 3개 분리 컬렉션 + 3개 라우트
- `tips`, `posts`, `customerStories` 각각 독립
- Pros: 도메인 분리 명확 · 컬렉션별 최적 인덱스
- Cons: 3× 보일러플레이트 (repo · detail route · sitemap) · 크로스 패널 기능 향후 난이도

### C. 필터 칩 + 단일 피드
- `/community` 하나에 카테고리 chip만 추가
- Pros: 가장 단순
- Cons: "3단 패널 전환" 의도 미달성 · 패널별 canonical URL 부재 (SEO 약화)

**결정**: Approach A. 공통 detail 페이지 재사용 · SEO 요건 충족 · 향후 postType 확장 여지.

---

## 3. YAGNI Review

### Included (v1, 10 items)

**핵심 구조 (4)**
1. **I1** — `postType: 'tip'|'provider'|'customer-story'` 스키마 확장 + 복합 인덱스 3종
2. **I2** — `/community/[panel]` 다이나믹 라우트 + 탭 네비 + 패널 설정 모듈
3. **I3** — `postRepository.listByType` / `searchInType` / `listByTypeFiltered`
4. **I4** — `/p/[slug]` JSON-LD Article 확장 (postType별 author)

**AI 파이프라인 (2)**
5. **I5** — `StoryUploadForm` + `POST /api/community/stories/upload` (Auth · rate-limit · Storage)
6. **I6** — `story-generator.ts` (Gemini Vision → `story-rag.ts` → Gemini Pro → hygiene-guard)

**패널 UX (2)**
7. **I7** — 무한스크롤 · 패널별 빈 상태 · 패널 내 검색 · 서브 필터(지역 · 카테고리)
8. **I8** — `CommunityPanelTabs` + `PanelLayout` 공유 레이아웃

**SEO (2)**
9. **I9** — `app/sitemap.ts` + `app/robots.ts` + 패널별 메타/OG
10. **I10** — `app/community/[panel]/rss.xml/route.ts` (RSS 2.0, 최신 50건)

### Out of Scope (v2 이후 이연)

- **O1** 관리자 검토/승인 큐 UI
- **O2** AI 초고 수동 편집 UI (published → edit 플로우)
- **O3** 백그라운드 생성 큐 (Cloud Functions + 이메일 알림)
- **O4** 좋아요 / 댓글 / 팔로우 / 공유
- **O5** 관련 포스트(Related) 섹션
- **O6** 패널별 개인화 랭킹 · A/B
- **O7** 다국어 / hreflang
- **O8** 관리 대시보드 / 분석
- **O9** 콘텐츠 캘린더 · 예약 발행
- **O10** 고객 사진 업로드 재발행/삭제 UX(최초 발행만)

---

## 4. Scope

### In scope
- `posts` 스키마 확장 3필드 (`postType`, `sourcePhotos?`, `generationMeta?`)
- `/community/[panel]` 라우트 패밀리 + 루트 `/community` → `/community/tips` 리다이렉트
- `CommunityPanelTabs` · `PanelLayout` · `PanelEmptyState` · `PanelSearchBar` · `PanelSubFilters` · `InfiniteFeedList`
- `StoryUploadForm` · `StoryGeneratingState` · `/api/community/stories/upload`
- `story-generator.ts` · `story-rag.ts` 신규 LLM 모듈 (기존 `lib/llm/*` 확장)
- `postRepository` 메서드 3개 추가 + Firestore 인덱스 3종
- `app/sitemap.ts` · `app/robots.ts` · `/community/[panel]/rss.xml`
- `/p/[slug]` JSON-LD Article 추가

### Out of scope
- 모더레이션 · 편집 UI · 백그라운드 큐 · 좋아요/댓글 · 관련 포스트 · 다국어 · 관리 대시보드 · A/B · 예약 발행

---

## 5. Data Model

### 5.1 `Post` 스키마 확장 (`src/types/post.ts`)

```ts
export type PostType = 'tip' | 'provider' | 'customer-story';

export interface Post {
  // 기존 필드 유지 (id, providerId, providerOwnerUid, companyName, categories,
  // regionLabel, title, slug, coverImageUrl, coverImageAlt, bodyMarkdown,
  // summary80, topicHint, brandTone, createdAt)

  postType: PostType;                // NEW — 패널 판별자

  // customer-story 전용 (선택)
  sourcePhotos?: string[];           // Storage URL 1~5건
  generationMeta?: {
    model: string;                   // 예: 'gemini-2.5-pro'
    generatedAt: Date;
    ragSourceIds: string[];          // 참조한 post.id[]
    hygieneScore: number;            // [0,1], 임계 0.7
  };
}
```

- `provider` / `tip` 글: 기존 `providerId` · `companyName` 사용
- `customer-story` 글: `providerId = 'customer'` (가상 오너) · `providerOwnerUid = 업로더 uid`

### 5.2 Firestore 복합 인덱스 (`firestore.indexes.json`)

| # | collection | fields |
|---|-----------|--------|
| 1 | posts | `postType ASC`, `createdAt DESC` |
| 2 | posts | `postType ASC`, `regionLabel ASC`, `createdAt DESC` |
| 3 | posts | `postType ASC`, `categories ARRAY_CONTAINS`, `createdAt DESC` |

### 5.3 Storage 경로

```
/stories/{uid}/{nanoid}/{idx}.jpg
```
- 단일 nanoid 디렉터리 = 단일 업로드 요청 번들
- Storage rules: write = `request.auth.uid == uid`, read = public (이미지는 OG에 노출)

---

## 6. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Client                                                      │
│  /community/[panel]  →  PanelLayout                          │
│    ├─ CommunityPanelTabs  (sticky)                           │
│    ├─ PanelSearchBar                                         │
│    ├─ PanelSubFilters                                        │
│    └─ InfiniteFeedList  →  PostFeedCard × N                  │
│                                                              │
│  /community/stories/upload                                   │
│    └─ StoryUploadForm ─→ POST /api/community/stories/upload  │
│                          └─ StoryGeneratingState (spinner)   │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  Server (Route Handlers · Server Components)                 │
│                                                              │
│  postRepository                                              │
│    ├─ listByType(type, {limit, cursor})                      │
│    ├─ listByTypeFiltered(type, {regionLabel?, category?})    │
│    └─ searchInType(type, query)                              │
│                                                              │
│  story-generator.ts                                          │
│    Gemini Vision → story-rag.ts → Gemini Pro →               │
│    hygiene-guard.ts → postRepository.create                  │
│                                                              │
│  sitemap.ts / robots.ts / [panel]/rss.xml                    │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  External                                                    │
│  Firestore: posts (postType 필드)                            │
│  Firebase Storage: /stories/{uid}/...                        │
│  Gemini Vision / Gemini Pro                                  │
└──────────────────────────────────────────────────────────────┘
```

**원칙**
- 단일 `posts` 컬렉션 · `postType`으로 분기
- 기존 `/p/[slug]` 상세 페이지는 postType 무관하게 공통 렌더
- `customer-story`는 `providerId='customer'` 가상 오너 — 기존 `Post` 타입 깨지지 않음
- 자동 발행 — hygiene-guard가 유일한 품질 게이트 (YAGNI 결정)

---

## 7. Key Components

### 신규 파일

| 경로 | 역할 |
|------|------|
| `src/app/community/[panel]/page.tsx` | 패널 다이나믹 페이지 (server) · generateMetadata · 패널 데이터 패칭 |
| `src/app/community/[panel]/rss.xml/route.ts` | 패널별 RSS 2.0 (최신 50건) |
| `src/app/community/stories/upload/page.tsx` | 고객 사진 업로드 UI |
| `src/app/api/community/stories/upload/route.ts` | 업로드 + 동기 AI 생성 엔드포인트 |
| `src/app/sitemap.ts` | 홈 + 3패널 + 모든 published posts |
| `src/app/robots.ts` | allow `/`, disallow `/api/`, `/provider/`, `/received/` |
| `src/components/community/CommunityPanelTabs.tsx` | sticky 탭 네비 (active state · ARIA) |
| `src/components/community/PanelLayout.tsx` | 공유 레이아웃 (헤더 · 탭 · 검색 · 서브필터) |
| `src/components/community/PanelEmptyState.tsx` | 패널별 빈 상태 + CTA |
| `src/components/community/PanelSearchBar.tsx` | 패널 내 키워드 검색 (debounced) |
| `src/components/community/PanelSubFilters.tsx` | 지역/카테고리 chip 필터 |
| `src/components/community/InfiniteFeedList.tsx` | 커서 기반 무한스크롤 · IntersectionObserver |
| `src/components/community/stories/StoryUploadForm.tsx` | 사진 선택 · 캡션 · 제출 |
| `src/components/community/stories/StoryGeneratingState.tsx` | 생성 중 UI (3–8s 표시) |
| `src/lib/feed/panel-config.ts` | 패널 메타(label · slug · SEO · OG · empty copy) |
| `src/lib/llm/story-generator.ts` | Vision → RAG → 생성 오케스트레이션 |
| `src/lib/llm/story-rag.ts` | 스타일 참조 posts 검색 (vision 태그 시드) |
| `src/lib/seo/article-jsonld.ts` | JSON-LD Article 빌더 |
| `src/lib/seo/sitemap-builder.ts` | 사이트맵 엔트리 조립 |

### 수정 파일

| 경로 | 변경 |
|------|------|
| `src/types/post.ts` | `postType`, `sourcePhotos?`, `generationMeta?` 추가 |
| `src/lib/firebase/post-repository.ts` | `toPost`에 신규 필드 매핑 · `listByType` / `listByTypeFiltered` / `searchInType` 추가 |
| `src/app/community/page.tsx` | `redirect('/community/tips')` 로 축소 |
| `src/app/p/[slug]/page.tsx` | JSON-LD Article 주입 · postType별 author 분기 |
| `firestore.indexes.json` | 복합 인덱스 3종 추가 |
| `firestore.rules` | `posts` 쓰기 규칙에 `postType` 검증 · Storage rules `/stories/{uid}` 추가 |

---

## 8. AI 고객 홍보 Pipeline

```
[Client] StoryUploadForm
  1~5 photos (jpeg/png, ≤10MB each) + optional caption

        │ multipart/form-data
        ▼
[API] POST /api/community/stories/upload
  ├─ Auth: Firebase session cookie 필수 (비로그인 401)
  ├─ Rate limit: 3건/일/UID (reuse lib/firebase/rate-limit.ts)
  ├─ Validate: file count/type/size
  └─ Upload to Storage: /stories/{uid}/{nanoid}/{i}.jpg

        │
        ▼
[Server inline generation]
  a. Gemini Vision     → 구조화 캡션 + 태그 per photo
  b. story-rag.ts      → 태그 시드로 posts에서 스타일 참조 3~5건 검색
                         (topicHint / brandTone 앵커)
  c. story-generator   → Gemini Pro prompt:
                         { vision desc, rag excerpts, structural template }
                         output: { title, slug, bodyMarkdown, summary80,
                                   coverImageAlt }
  d. hygiene-guard     → PII / 욕설 / 허위 상호 차단 · score ∈ [0,1]
                         score < 0.7 이면 reject
  e. Pass:
     slug = slugify(title) + '-' + nanoid(4)
     postRepository.create({
       ...generated,
       postType: 'customer-story',
       sourcePhotos, generationMeta,
       providerId: 'customer',
       providerOwnerUid: uid,
       companyName: '청광 고객',
     })
     revalidatePath('/community/stories')
     revalidatePath(`/p/${slug}`)
     → 201 { slug, url: `/p/${slug}` }
  f. Fail:
     Vision 실패    → 1 retry, 그래도 실패 시 500
     RAG empty      → fallback template (RAG 없이 생성)
     Hygiene fail   → 422 { reason: '사진을 다시 선택해 주세요' }
     Duplicate slug → nanoid(4) 재부여 (최대 3회)
```

**제약**
- 업로드 ≤ 5 사진 · 총 ≤ 50MB
- 일 3건/UID
- 생성 동기 · 10s 초과 시 504 후 클라이언트 에러 표시 (재시도 유도)

---

## 9. SEO Architecture

### 9.1 패널별 metadata (`generateMetadata`)

```ts
// panel-config.ts
export const PANELS = {
  tips:      { label: '청소 노하우',  desc: '욕실·주방·거실 청소 팁 모음', postType: 'tip' },
  providers: { label: '청소업체 홍보', desc: '검증된 청명들의 서비스 소개', postType: 'provider' },
  stories:   { label: '고객 스토리',   desc: '실제 공간이 어떻게 변했는지 사례 모음', postType: 'customer-story' },
} as const;
```

각 패널 페이지: `title`, `description`, OG image, `alternates.canonical`, `alternates.types['application/rss+xml']`.

### 9.2 JSON-LD Article (`/p/[slug]`)

```ts
{
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  description: post.summary80,
  image: [post.coverImageUrl],
  datePublished: post.createdAt.toISOString(),
  author:
    post.postType === 'customer-story'
      ? { '@type': 'Organization', name: '청광 고객' }
      : { '@type': 'Organization', name: post.companyName },
  publisher: { '@type': 'Organization', name: '청광', logo: {...} },
  mainEntityOfPage: `${BASE_URL}/p/${post.slug}`,
}
```

### 9.3 Sitemap / Robots

- `app/sitemap.ts` — 홈 + 3패널(priority 0.8, daily) + 전 posts(priority 0.6, weekly)
- `app/robots.ts` — allow `/`, disallow `/api/`, `/provider/`, `/received/`; sitemap URL 포함

### 9.4 RSS

- `/community/[panel]/rss.xml` — RSS 2.0, 최신 50건, `link/title/description/pubDate/author`
- `revalidate = 600` (10분)

### 9.5 Caching

| Resource | revalidate |
|---|---|
| `/community/[panel]` | 300s (5min ISR) |
| `/p/[slug]` | 3600s (1h ISR) |
| `/sitemap.xml` | 600s |
| `/community/[panel]/rss.xml` | 600s |
| Explicit `revalidatePath` | 발행 직후 즉시 갱신 |

---

## 10. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|---|---|---|
| 자동 발행 품질 저하 (모더레이션 없음) | Google 인덱싱 손상 · 브랜드 리스크 | hygiene-guard 임계 0.7 · 차단시 사용자 메시지 · v2 모더레이션 큐 예비 |
| AI 생성 지연 >10s | 사용자 이탈 · 504 | 1 retry · 타임아웃 문구 · v2 백그라운드 큐 |
| PII 노출 (고객 사진) | 법적/윤리 | hygiene-guard PII 룰 · 업로드 UI 주의 문구 · 사진 원본 접근 제한 정책 결정(디자인) |
| 중복 slug | 404/충돌 | nanoid(4) 접미사 · 최대 3회 재시도 |
| 스팸 업로드 | Storage 비용 | 3건/일 rate-limit · 총 50MB cap · 비로그인 차단 |
| `posts` 컬렉션 비대화 | 쿼리 성능 | 복합 인덱스 3종 · 커서 페이지네이션 · postType 필터 먼저 |
| 광고성 커스터머 스토리 | 품질 · SEO 스팸 | hygiene-guard에 상호명 언급 규칙 추가 검토(디자인) |

---

## 11. Success Metrics (Post-launch)

- Google Search Console: `/community/tips|providers|stories` 인덱싱 100% (1주 이내)
- Core Web Vitals: LCP < 2.5s, CLS < 0.1 (75 percentile)
- `/p/[slug]` 유기검색 유입 MoM 성장 (기준선: 현재 `/community` 트래픽)
- customer-story 발행 성공률 ≥ 85% (hygiene 통과율)
- 평균 생성 latency ≤ 8s

---

## 12. Brainstorming Log

- **Q1 Core problem** → "3단 패널(청소 노하우 / 청소업체 홍보 / 고객 홍보) 전환"
- **Q2 고객 홍보 의미** → AI RAG 자동 블로그 생성
- **Q3 RAG 소스** → 고객 업로드 사진(음식·공간 등) · 통상적 블로그글
- **Q4 성공 기준** → SEO/트래픽 유입 (Recommended 채택)
- **Approach 선택** → A (탭 + 통합 posts + postType)
- **YAGNI 포함** → AI 업로드+생성, 무한스크롤, 빈 상태, 검색, 서브필터, 메타/OG, JSON-LD, sitemap, RSS
- **YAGNI 제외** → 관리자 승인, 초고 편집 UI (자동 발행 + hygiene 단일 게이트)
- **Section approvals** → 아키텍처 · 컴포넌트 · AI 파이프라인 · SEO 모두 Approve

---

## 13. Next Steps

1. `/pdca design community-feed-3panel` — 상세 설계 문서 작성 (wireframe · API 계약 · Firestore rules · prompt 템플릿 · hygiene 규칙 상세)
2. Design 완료 후 `/pdca do community-feed-3panel` — 구현
3. Phase 4 (API) + Phase 6 (UI) 순차 진행
4. `/pdca analyze` → `/pdca report`

---

**Plan Plus 완료 · Approval 기록**: Architecture ✅ · Components ✅ · AI Pipeline ✅ · SEO ✅
