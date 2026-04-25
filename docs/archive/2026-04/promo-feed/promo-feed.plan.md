# Plan: 홍보 게시글 피드 (promo-feed)

> 생성: 2026-04-20
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 상위·선행 기능: [promo-page (archived)](../../archive/2026-04/promo-page/promo-page.plan.md), [content-research-pipeline](./content-research-pipeline.plan.md)
> 다음 단계: `/pdca design promo-feed`

---

## 1. User Intent Discovery

### 1.1 배경 — 방향 전환 (2026-04-20)
promo-page v1은 업체별 **개별 랜딩페이지 빌더**로 완성됐으나, 운영자의 본래 의도는 "**청광 플랫폼이 매체 자체**가 되어 방문자가 여러 업체를 탐색할 수 있어야" 한다는 것. 랜딩페이지는 업체별 goal은 있으나 플랫폼 가치는 부재 — 피드형 누적 구조로 UX 재정의.

### 1.2 핵심 목적
- **플랫폼 = 매체**: 방문자가 홈(`/`)에서 여러 업체의 홍보 게시글을 훑어보는 경험
- **업체별 개별 게시글은 블로그 포스트 느낌** (현재 `/p/{slug}` 유지, 톤 조정은 v1.1)
- **큐레이션**: Netflix/쿠팡플레이 스타일 "레일(행)" UI — 상황·동반자·시간대별 콘셉트 라벨

### 1.3 타겟 사용자
- **1차**: 일반 방문자 (end consumer) — 비로그인 탐색
- **2차**: 업체(기존 promo-page 고객) — 자기 게시글이 더 많은 노출 기회
- **3차**: 청광 운영자 — 플랫폼의 매체 가치 확보

### 1.4 성공 기준 (제안)
- 홈 방문자의 레일 스크롤·클릭률 측정 (v1.1 방문 통계 도입 후 수치화)
- 방문자가 평균 2개 이상 게시글 카드 클릭
- "당신 근처" 레일에서 지역 매칭된 게시글 노출
- 게시글 발행 → 피드 반영까지 60초 이내

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|---|---|
| A | **Netflix Rail + 지역 필터** (리서치 결과 업그레이드) | **채택** |
| B | 다이닝코드 스타일 카테고리 그리드 + 태그 필터 | 기각 (레일 느낌 약함) |
| C | AI 동적 홈 (매 방문 LLM 호출로 레일 자동 구성) | 기각 (MVP 오버엔지니어링) |

### 2.1 리서치 기반 최적화 (추가)

Netflix 2단 랭킹 + 쿠팡 context 추천 + Cold-Start 연구(LLM-guided) 참조:

| 패턴 | 적용 | v1 여부 |
|------|------|:-:|
| Row-level ranking (페이지 상 레일 순서) | 정적 하드코딩 순서 | ✅ |
| Within-row ranking | 매칭 태그 수 + freshness boost + 동일 owner 연속 금지 | ✅ |
| Time-contextual rail (Trending Now 시간대) | 현재 시각 기준 1개 시간대 레일 상단 삽입 | ✅ |
| Personalized Video Ranker | 방문자 세션/취향 필요 | ❌ v2 |
| Top-N Ranker (핫 콘텐츠) | 조회수 데이터 필요 | ❌ v2 |
| Collaborative filtering | 사용자 평가 필요 | ❌ v2 |
| Editorial curation (고정 태그 큐레이션) | ALL_TAGS 16개로 시작 | ✅ |
| LLM tag extraction (cold-start 핵심) | Gemini로 게시글당 3~5 태그 자동 | ✅ |

**소스**: [Netflix Recommendations Research](https://research.netflix.com/research-area/recommendations), [Netflix 2-tiered Architecture (Medium)](https://shilpathota.medium.com/do-you-know-architecture-of-recommendation-system-at-netflix-f49786ca083b), [쿠팡 DEVIEW 2019 추천 변천사](https://deview.kr/2019/schedule/276), [Awesome Cold-Start Recommendation](https://github.com/YuanchenBei/Awesome-Cold-Start-Recommendation), [PromptRec (LLM cold-start)](https://github.com/JacksonWuxs/PromptRec)

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (12개)

1. `/` 홈을 **FeedPage로 교체** (현재 랜딩 → 피드)
2. **Rail 컴포넌트** (가로 스크롤) + **Card 컴포넌트** (썸네일·업체명·서브타이틀·뱃지·태그 칩)
3. **태그 Taxonomy 16개 하드코딩** (시간대 5 + 동반자 6 + 분위기 5)
4. `/api/generate`에 **태그 추출 Gemini 호출 1회 추가** (Structured Output, ALL_TAGS enum 내)
5. **Region 파싱** (address → {city, district}, 정규식 기반, 실패 시 null)
6. Firestore `pages.tags`, `pages.region` 필드 추가 + composite index 2개
7. **레일 7개 구성** (동적 시간대 1 + 정적 6)
8. **Within-row ranking** (매칭 수 · freshness · diversity 순수 함수)
9. **지역 드롭다운** + **업종 탭** + **검색 바**(업체명·태그·subtitle clientside 필터)
10. **FeedService** `'use cache' + cacheTag('feed') + cacheLife('minutes')`
11. **publish/unpublish/delete/savePage Server Action에 `revalidateTag('feed', 'max')` 추가**
12. **🧹 Hygiene 격리 유지**: 태그 프롬프트에 청결 어휘 금지 명시 + 서버 2차 필터

### 3.2 Out of Scope → v1.1 이상

| 항목 | 이동 이유 |
|---|---|
| 브라우저 geolocation 자동 감지 | 권한 요청 비용, v1엔 수동 드롭다운 |
| 태그 클릭 → 필터 페이지 | 레일 + 드롭다운으로 탐색 충분 |
| 관리자 레일 관리 UI | 코드 상수 수정으로 충분 (운영자 = 개발자) |
| 태그 수동 편집 UI | LLM 결과로 시작, 불만 많으면 v1.1 |
| 조회수·인기순 · Top-N Ranker | 통계 선결 필요 |
| Personalized Ranker (쿠키·취향) | 세션 모델 별도 설계 필요 |
| `/p/{slug}` 블로그 톤 조정 | 현재도 가독성 충분, 이터레이션 분리 |
| 지도 기반 탐색 | 비용·복잡도 큼, 드롭다운 대체 |
| 댓글·좋아요 | 독립 기능 |
| 기존 published 페이지 태그 백필 스크립트 | 데이터 1개뿐이라 수동 재편집으로 처리 |

### 3.3 기존 기능에 주는 영향

- **`pages` 스키마 확장**: `tags: string[]`, `region: map \| null` 추가. 기존 데이터는 빈값으로 시작 → "최근 발행" 레일에만 노출 (재편집 시 자동 채워짐)
- **`/api/generate` 레이턴시 +2초** (태그 추출 호출 1회)
- **`/` 홈의 CTA 변경**: "시작하기" 랜딩 → 피드로 완전 교체. 로그인 유도 링크는 헤더로 이동
- **Dashboard·Editor 변경 없음** (태그 미리보기는 v1.1에 추가)

---

## 4. Architecture

### 4.1 스택
- Frontend: Next.js 16 App Router (기존)
- Backend: Next.js Server Components + Route Handlers (기존)
- LLM: Google AI Studio API via `@google/generative-ai` (기존)
- Cache: Cache Components `'use cache' + cacheTag + cacheLife` (기존 패턴 확장)

### 4.2 컴포넌트 구조

```
src/
├── app/
│   ├── page.tsx                    ★ 교체 (랜딩 → FeedPage)
│   └── p/[slug]/page.tsx           (유지)
├── components/feed/
│   ├── FeedPage.tsx                Server Component — rails 전체 조립
│   ├── FeedControls.tsx            Client — 지역·업종·검색
│   ├── Rail.tsx                    가로 스크롤 컨테이너
│   └── PostCard.tsx                썸네일·제목·태그 뱃지 카드
├── lib/feed/
│   ├── rails.ts                    RailDef[] 상수
│   ├── ranking.ts                  rankRailPosts() within-row 정렬
│   └── time-context.ts             현재 시각 → timeContext enum
├── services/
│   └── feed-service.ts             getFeedPosts() — 'use cache' + cacheTag('feed')
├── domain/
│   ├── tags.ts                     TAG_TIME/COMPANION/MOOD/ALL_TAGS
│   └── region.ts                   parseRegion(address)
└── lib/llm/
    └── prompt-builder.ts           기존 — buildTagExtractionPrompt 추가
```

### 4.3 데이터 플로우

```
[방문자] GET /?region=X&category=Y
    ↓
[FeedPage Server] FeedControls + <Suspense fallback=...>
                       └─ FeedRails (async)
                              └─ feedService.getFeedPosts({region, category})
                                    'use cache' + cacheTag('feed') + cacheLife('minutes')
                                    → Firestore query (published + optional category)
    ↓
    Rails 렌더: 레일 7개를 RAILS 상수 순회
       ├─ time-contextual 레일: Client Component가 현재 시각 감지해 선택
       ├─ region 레일: filter.region에 맞는 posts
       ├─ tags-any 레일: rail.tags와 매칭되는 posts
       └─ freshness 레일: updatedAt desc

[검색] 클라 FeedControls → Rail[].posts.filter(includes q)
    (서버 재호출 없이 clientside 축소)

[발행] publishPage Server Action
    → pages 업데이트 + revalidateTag('feed', 'max')
    → 다음 방문에 반영 (stale-while-revalidate)
```

### 4.4 태그 추출 플로우 (Gemini)

```
/api/generate (기존) 마지막 단계에 추가:

buildTagExtractionPrompt({
  generatedSections,  // 방금 생성된 hero/intro/highlights/cta
  keyPoints,
  category,
  allTags: ALL_TAGS,
  forbiddenPatterns: HYGIENE_KEYWORDS,
})

responseSchema: {
  type: 'object',
  properties: { tags: { type: 'array', items: { type: 'string', enum: ALL_TAGS } } },
  required: ['tags']
}

→ 서버 2차 방어:
   result.tags
     .filter(t => ALL_TAGS.includes(t))
     .filter(t => !HYGIENE_KEYWORDS.some(kw => t.includes(kw)))
     .slice(0, 5)
```

### 4.5 Firestore 쓰기

`generateService.run()` 마지막 단계:
```
await pageRepository.update(pageId, { 
  sections,          // 기존
  tags,              // 신규
  region,            // 신규 (parseRegion(page.address))
});
```

---

## 5. Data Model

### 5.1 `pages` 확장 필드

| Field | Type | Notes |
|-------|------|-------|
| tags | string[] | ALL_TAGS enum 내, 최대 5개 |
| region | { city: string, district: string } \| null | nullable — 파싱 실패 시 |

### 5.2 Firestore Composite Indexes (신규 2개)

```json
{
  "collectionGroup": "pages",
  "fields": [
    { "fieldPath": "published", "order": "ASCENDING" },
    { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "pages",
  "fields": [
    { "fieldPath": "published", "order": "ASCENDING" },
    { "fieldPath": "region.city", "order": "ASCENDING" },
    { "fieldPath": "region.district", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
}
```

기존 `(published, ownerUid, updatedAt)` 인덱스는 그대로 유지.

### 5.3 Firestore Security Rules
**변경 없음.** `pages` 접근 규칙은 기존 owner-only 읽기 + published 조건 그대로. 새 필드는 같은 문서 내이므로 별도 규칙 불필요.

---

## 6. Key Flow

### 6.1 홈 피드 방문 (비로그인)
```
GET / (또는 /?region=서울-강남&category=cafe&q=브런치)
 └─ FeedPage (Server, 'use cache' via feed-service)
     ├─ FeedControls (Client): 지역·업종·검색
     └─ 레일 7개 순회:
         [동적 시간대]: time-context.ts가 현재 시각 → 해당 레일 선택
         [당신 근처]: filter.region 매칭 posts
         [부모님과]: #부모님/#가족 태그 매칭
         [혼밥]: #혼밥/#조용한 매칭
         [데이트]: #데이트/#프리미엄 매칭
         [인스타]: #인스타감성 매칭
         [최근 발행]: freshness (updatedAt desc)
 └─ 각 레일에 rankRailPosts 적용:
     ① 매칭 태그 수 desc
     ② freshness (7d 내 +1)
     ③ diversity (같은 ownerUid 연속 제외)
 └─ 응답: 정적 shell + Suspense streaming
```

### 6.2 게시글 생성 (업체)
```
기존 플로우 + Gemini 태그 추출 1회 추가
 ├─ /api/generate (기존 섹션 생성)
 ├─ 🆕 Tag extraction 호출 (ALL_TAGS enum 내 3~5개)
 ├─ 🆕 Region 파싱 (address 기반 정규식)
 ├─ pageRepository.update({ sections, tags, region })
 └─ updateTag(`page:${pageId}`)
```

### 6.3 발행 → 피드 반영
```
publishPage Server Action:
 ├─ pages.update({ published: true, slug })
 ├─ revalidateTag(`page:${slug}`, 'max')      (기존)
 └─ 🆕 revalidateTag('feed', 'max')           (신규)

다음 /?feed 방문 시 stale 데이터 후 업데이트 반영 (~60초 내)
```

### 6.4 검색 (클라 필터)
```
FeedControls useState q → 300ms debounce
 └─ 각 Rail에 q 전달
     └─ rail.posts.filter(p =>
           p.businessName.includes(q)
           || p.tags.some(t => t.includes(q))
           || p.sections.hero.subtitle.includes(q)
        )
```

---

## 7. Risks & Open Questions

| 리스크 | 완화 |
|--------|------|
| 데이터 규모 증가 시 모든 게시글을 한 번에 로드하는 게 비효율 | v1은 500개 limit, 초과 시 레일별 `array-contains-any` 쿼리로 전환 (인덱스 준비됨) |
| Gemini 태그 추출이 ALL_TAGS 외 용어 반환 | responseSchema에 `enum: ALL_TAGS` + 서버 2차 `filter(t => ALL_TAGS.includes(t))` |
| 청결 어휘가 태그에 섞임 | 프롬프트 금지 명시 + 서버 정규식 필터 (§1.2 hygiene 격리) |
| 레일 빈 상태 (게시글 부족) | "곧 더 많은 곳이 소개됩니다" empty state |
| 주소 포맷 다양성 (도로명·지번 혼재) | 1차: 정규식 기반, 실패 시 null (최근 발행에만). 2차: Kakao/Naver 주소 API 도입 (v1.1) |
| 타임존 이슈 (시간대 레일) | 클라이언트 `Date().getHours()` 사용 (브라우저 로컬 타임). SSR에서 KST 기준 fallback |
| 검색이 clientside라 데이터 증가 시 느려짐 | 500건 이하에선 성능 이슈 없음, 초과 시 Firestore side filter로 전환 |

### Open Questions → `/pdca design`에서 해소
- 레일 카드 썸네일 종횡비 (16:9 vs 4:3 vs square)
- "최근 발행" 레일 N일 기준 (7일 vs 14일)
- 시간대 경계 (06:00–10:59 vs 06:00–11:29 등)
- 지역 계층 (시·구까지만 vs 동 단위)
- 검색 UI 위치 (상단 고정 vs 플로팅)

---

## 8. Brainstorming Log

| 단계 | 결정 | 근거 |
|------|------|------|
| Q1 핵심 목적 | "청광 플랫폼 자체가 매체" | 사용자 답변 |
| Q2 탐색 패턴 | 지역 + 넷플릭스식 큐레이션 태그 | 사용자 답변 ("오후 2시에 가기 좋은 카페") |
| Phase 2 Approach | A (Netflix Rail + 지역) | 매체 UX 핵심 + 복잡도 중간 |
| Phase 2 리서치 업그레이드 | Netflix 2단 랭킹 · 쿠팡 context · Cold-Start LLM | 사용자 "웹·깃허브 분석" 요청 |
| Phase 3 YAGNI | 검색 바 v1 추가, geolocation v1.1 | 사용자 요청 + UX 단순화 |
| Phase 4-1 레일 수 | 7개 (시간대 1 + 정적 6) | 밀도·다양성 균형 |
| Phase 4-1 ranking | 매칭 태그 수 + freshness + diversity | Netflix within-row 패턴 |
| Phase 4-2 태그 수 | 16개 (5+6+5) | MVP 큐레이션에 충분, LLM enum 제약에 적합 |
| Phase 4-2 마이그레이션 | 옵션 C (기존 1건 수동 재편집) | 현재 데이터 1개뿐 |
| Phase 4-3 태그 추출 | `/api/generate` 내 1회 추가 호출 | 생성 완료 후 섹션 내용 활용 가능 |
| Phase 4-3 region 파싱 | 정규식 기반 (외부 API 없음) | 의존성 최소화 |

---

## 9. Next Steps

- [ ] `/pdca design promo-feed` — 상세 설계
  - 레일 카드 컴포넌트 타입·props·종횡비
  - FeedControls URL 쿼리 동기화
  - time-context enum 경계
  - Tag extraction 프롬프트 스켈레톤 + responseSchema
  - parseRegion 정규식 + 도시 사전 전체
  - FeedPage Suspense 구조
- [ ] `/pdca do promo-feed` — 스텝별 구현 (파운데이션 → 태그 추출 → 레일 → 컨트롤)
- [ ] `/pdca analyze promo-feed` — 설계 vs 구현 매치율
- [ ] `/pdca report promo-feed`

### 🔗 관련 기능·문서
- [promo-page (archived)](../../archive/2026-04/promo-page/promo-page.plan.md) — 본 피드에 나열되는 게시글의 데이터 원천
- [content-research-pipeline](./content-research-pipeline.plan.md) — `trendKeywords/{category}`를 생성 프롬프트에 주입 (기존 통합 유지)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Plan Plus 초안. 넷플릭스·쿠팡플레이·Cold-Start 리서치 반영 | Seokho Lee |
