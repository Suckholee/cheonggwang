---
template: design
version: 1.2
feature: promo-feed
date: 2026-04-20
author: Seokho Lee
project: cheonggwang (firebase-next-app)
version-proj: 0.1.0
---

# promo-feed Design Document

> **Summary**: `/` 홈을 Netflix/쿠팡플레이 스타일 **레일 기반 피드**로 재정의. 방문자가 여러 업체의 홍보 게시글을 지역·컨셉 태그·시간대별로 탐색한다. 동적 시간대 레일 1개 + 정적 큐레이션 레일 6개 = 총 7개 레일 구성. 검색·지역·업종 필터 클라이언트 사이드.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Author**: Seokho Lee
> **Date**: 2026-04-20
> **Status**: Draft
> **Planning Doc**: [promo-feed.plan.md](../../01-plan/features/promo-feed.plan.md)

---

## 0. Open Questions 해소 (Plan §7)

| Q | 해소 |
|---|------|
| 카드 종횡비 | **4:3** (사진 중심, 다이닝코드 카드 형태 참고. Netflix 2:3 세로형은 포스터용이라 맞지 않음) |
| "최근 발행" N일 | **14일** (7일은 게시글 적을 때 레일이 비어버림) |
| 시간대 경계 | 아침 06~10:59 · 점심 11~13:59 · 오후 14~17:59 · 저녁 18~21:59 · 야식 22~05:59 |
| 지역 계층 | **시·구까지만** (v1). 동 단위는 v1.1 |
| 검색 UI 위치 | **상단 sticky** (스크롤해도 항상 보임) |

---

## 1. Overview

### 1.1 Design Goals
- Cold-start 상황(방문자 세션 없음, 소규모 게시글)에서 매체 가치 확보
- Netflix 2단 랭킹(row + within-row) 패턴의 경량 구현
- Gemini 태그 추출 1회 추가로 게시글 분류 자동화
- 발행·수정 즉시 피드 반영 (`revalidateTag('feed', 'max')`)
- 기존 `/p/{slug}` · 에디터 · 대시보드는 영향 최소화

### 1.2 Design Principles
- **Server-first**: 피드 데이터는 Server Component + `'use cache'` + `cacheTag` + `cacheLife`
- **Thin client**: Controls(지역·업종·검색)만 Client Component
- **URL = state**: `/?region=X&category=Y&q=Z` — 공유·새로고침에도 유지
- **Small-data first**: 방문자 비로그인, 게시글 500개 이하 — 전체 로드 후 클라 필터가 충분
- **🧹 Hygiene 격리 유지 (§1.2)**: 태그 추출 프롬프트에도 청결 어휘 금지 명시 + 서버 2차 정규식 필터
- **Cache tag 분리**: `feed` (피드 리스트용) · `page:{slug}` (상세 페이지용) 독립 관리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────────┐
│ / (FeedPage — Server)                                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ FeedControls (Client, sticky top)                    │ │
│  │  [지역 select] [전체|음식점|미용실|카페] [🔍 검색]       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  <Suspense fallback={<FeedSkeleton />}>                   │
│    <FeedRails                                             │
│      filter={{region, category}}                          │
│      query={q}                                            │
│    />                                                     │
│    → feedService.getFeedPosts(filter)                     │
│      'use cache' + cacheTag('feed') + cacheLife('minutes')│
│    → 클라에서 검색 q 적용                                  │
│    → 각 레일별 rankRailPosts()                             │
│                                                            │
│    🎠 [동적 시간대]                                        │
│    🎠 당신 근처 — {district}                              │
│    🎠 부모님과 가기 좋은                                    │
│    🎠 혼밥하기 좋은                                         │
│    🎠 분위기 좋은 데이트                                    │
│    🎠 인스타에 올리기 좋은                                   │
│    🎠 최근 발행                                             │
│  </Suspense>                                              │
└────────────────────────────────────────────────────────────┘

Mutation → Cache 무효화:
  publishPage/unpublishPage/deletePage/savePage
    → revalidateTag('feed', 'max')  + 기존 page tag
```

### 2.2 Data Flow

```
[GET /] 
  ↓
<FeedPage>
  ├── <FeedControls urlParams={searchParams} />  Client, sticky
  └── <Suspense>
        <FeedRails filter={{region, category}} q={q}>  // Server
          ├── getFeedPosts({category}) → Page[500]      'use cache'
          ├── detectUserRegion(filter.region) → TimeContext
          ├── 클라 side q filter 적용 (하위 Client props로)
          └── rails = RAILS.filter(applicableFor(timeCtx))
               각각 rankRailPosts(posts, rail) → Rail with 20 posts
          → <Rail title=... posts=...> 7개 렌더
        </FeedRails>
      </Suspense>

[Mutation from /editor]
  savePage / publishPage / unpublishPage / deletePage Server Action
    → pages 업데이트 (+ 태그/지역)
    → revalidateTag('feed', 'max')
    → 다음 / 방문자는 stale 후 fresh (ISR 60s)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| FeedPage (Server) | feedService (App layer) | 피드 데이터 fetch |
| FeedControls (Client) | next/navigation `useRouter`, `useSearchParams` | URL state 양방향 |
| Rail, PostCard (Server) | PostView type | 카드 렌더 |
| feedService | pageRepository (extended `listPublished`) | Firestore read |
| ranking | RailDef + Page type | 순수 함수 |
| time-context | `Date()` (서버/클라 둘 다) | 현재 시간대 판정 |
| generate-service (기존) | promptBuilder.buildTagExtraction | 생성 파이프라인 |

---

## 3. Data Model

### 3.1 Page 타입 확장

```typescript
// src/types/page.ts (수정)
export interface Page {
  // ... 기존 필드 전부 유지
  tags: string[];                                    // 신규
  region: { city: string; district: string } | null; // 신규
}

// 기존 emptySections 옆에 추가
export function emptyRegion(): Page["region"] { return null; }
```

### 3.2 태그 Taxonomy 상수

```typescript
// src/domain/tags.ts (신규)
export const TAG_TIME      = ['#아침', '#점심', '#오후', '#저녁', '#야식'] as const;
export const TAG_COMPANION = ['#혼밥', '#데이트', '#가족', '#부모님', '#친구모임', '#회식'] as const;
export const TAG_MOOD      = ['#조용한', '#활기찬', '#인스타감성', '#가성비', '#프리미엄'] as const;

export const ALL_TAGS: string[] = [
  ...TAG_TIME,
  ...TAG_COMPANION,
  ...TAG_MOOD,
];

export type TagTime      = typeof TAG_TIME[number];
export type TagCompanion = typeof TAG_COMPANION[number];
export type TagMood      = typeof TAG_MOOD[number];

export const TAG_TAXONOMY = {
  time: TAG_TIME,
  companion: TAG_COMPANION,
  mood: TAG_MOOD,
} as const;

export const MAX_TAGS_PER_POST = 5;
export const MIN_TAGS_PER_POST = 3;
```

### 3.3 Firestore Indexes (신규 2개)

`firestore.indexes.json`에 추가:
```json
[
  { "collectionGroup": "pages", "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "ownerUid",  "order": "ASCENDING" },
      { "fieldPath": "updatedAt", "order": "DESCENDING" }
    ]
  },
  { "collectionGroup": "pages", "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "published", "order": "ASCENDING" },
      { "fieldPath": "tags",      "arrayConfig": "CONTAINS" },
      { "fieldPath": "updatedAt", "order": "DESCENDING" }
    ]
  },
  { "collectionGroup": "pages", "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "published",       "order": "ASCENDING" },
      { "fieldPath": "region.city",     "order": "ASCENDING" },
      { "fieldPath": "region.district", "order": "ASCENDING" },
      { "fieldPath": "updatedAt",       "order": "DESCENDING" }
    ]
  }
]
```

단, v1 초기엔 Firestore 한 번에 `where published==true limit 500`만 쿼리해도 충분 — 두 신규 인덱스는 scale-out 대비 사전 배포.

### 3.4 Firestore Security Rules
**변경 없음**. 새 필드 `tags`, `region`은 owner-only 쓰기·공개 페이지 rendering 시 Admin SDK로 읽으므로 기존 `pages` 규칙 그대로.

---

## 4. API / Service Specification

### 4.1 Route / Function 리스트

| Kind | Path/Name | Auth | 신규/변경 |
|------|-----------|:-:|:-:|
| Page (Server) | `/` | - | **변경** (랜딩 → FeedPage) |
| Page (Server) | `/p/[slug]` | - | 유지 |
| Server Action | `savePage`, `publishPage`, `unpublishPage`, `deletePage` | 필요 | **변경** (feed revalidate 추가) |
| Route Handler | `POST /api/generate` | 필요 | **변경** (태그 추출 단계 추가) |
| Service | `feedService.getFeedPosts(filter)` | — | **신규** |
| Service | `generateService.run(pageId, uid)` | — | 기존 + 태그/region 저장 |
| Repo | `pageRepository.listPublished(options)` | — | **신규** |

### 4.2 `feedService.getFeedPosts(filter)`

```typescript
// src/services/feed-service.ts (신규)
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { pageRepository } from "@/lib/firebase/page-repository";
import type { Page, Category } from "@/types/page";

export interface FeedFilter {
  category?: Category | "all";
}

/**
 * 공개 피드 페이지 전용. published === true인 페이지 최대 500개 반환.
 * Cache Components: 'use cache' + cacheTag('feed') + cacheLife('minutes').
 * publish/unpublish/delete/save Server Action에서 revalidateTag('feed', 'max') 호출.
 */
const FEED_LIMIT = 500;

export async function getFeedPosts(filter: FeedFilter = {}): Promise<Page[]> {
  "use cache";
  cacheTag("feed");
  cacheLife("minutes");
  const posts = await pageRepository.listPublished({
    category:
      filter.category && filter.category !== "all" ? filter.category : undefined,
    limit: FEED_LIMIT,
  });
  // v0.2 (I5): scale warning — 500건 도달 시 레일별 Firestore 쿼리로 전환 필요
  if (posts.length >= FEED_LIMIT) {
    console.warn(
      `[feed-service] FEED_LIMIT(${FEED_LIMIT}) reached — switch to rail-specific array-contains-any queries`
    );
  }
  return posts;
}
```

### 4.3 `pageRepository.listPublished(options)` (신규)

```typescript
// src/lib/firebase/page-repository.ts (확장)
export const pageRepository = {
  // ... 기존 get, listByOwner, create, update, delete 유지
  
  async listPublished(options: {
    category?: Category;
    limit?: number;
  }): Promise<Page[]> {
    let q = col().where("published", "==", true) as FirebaseFirestore.Query;
    if (options.category) q = q.where("category", "==", options.category);
    const snap = await q
      .orderBy("updatedAt", "desc")
      .limit(options.limit ?? 500)
      .get();
    return snap.docs.map((d) => toPage(d.id, d.data()));
  },
};
```

### 4.4 `POST /api/generate` — 태그 추출 단계 추가

**기존 10단계 + 1, 2 추가**:
```
1. JSON parse
2. Auth (sessionCookie verify)
3. App Check (env-gated)
4. Rate limit (5/min/uid)
5. Load page + template + trendKeywords
6. Load partner flag
7. Build prompts (5 or 6, partner 여부)
8. Gemini 병렬 호출
9. Hygiene guard (재생성 or fallback)

🆕 10. Build tag-extraction prompt (hero + intro + highlights + cta + category + ALL_TAGS)
🆕 11. Gemini 1회 호출 (structured JSON, enum: ALL_TAGS)
🆕 12. 서버 2차 필터:
     tags.filter(t => ALL_TAGS.includes(t))
         .filter(t => !HYGIENE_KEYWORDS.some(kw => t.includes(kw)))
         .slice(0, MAX_TAGS_PER_POST)
🆕 13. Region 파싱 (로컬 정규식)

14. pageRepository.update({ sections, tags, region })
15. updateTag(`page:${pageId}`)
16. Response: { sections, tags, region }
```

**Response (변경)**
```json
{
  "sections": { ... },
  "tags": ["#오후", "#혼밥", "#가성비"],
  "region": { "city": "서울특별시", "district": "강남구" }
}
```

### 4.5 Server Actions (변경) — feed tag 추가

```typescript
// src/app/actions/page-actions.ts
export async function savePage(input: SavePageInput) {
  // ... 기존
  updateTag(`page:${pageId}`);
  revalidateTag("feed", "max");   // 🆕
  // ...
}

export async function publishPage(pageId: string) {
  // ... 기존
  revalidateTag(`page:${slug}`, "max");
  revalidateTag("feed", "max");   // 🆕
  // ...
}

export async function unpublishPage(pageId: string) {
  // ... 기존
  if (page.slug) revalidateTag(`page:${page.slug}`, "max");
  revalidateTag("feed", "max");   // 🆕
}

export async function deletePage(pageId: string) {
  // ... 기존
  revalidateTag("feed", "max");   // 🆕
}

// saveSections는 feed 카드에 hero.subtitle이 노출되므로 영향 있음 → 추가
export async function saveSections(pageId: string, sections: Sections) {
  // ... 기존
  updateTag(`page:${pageId}`);
  revalidateTag("feed", "max");   // 🆕
}
```

---

## 5. UI/UX Design

### 5.1 Home `/` 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ [청광 로고]  검색창 🔍 ...........................  [로그인]│  ← Sticky top
│ 지역: [서울 강남구 ▼]  [전체] [음식점] [미용실] [카페]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  오후에 가기 좋은 (#오후)                        <   >   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│  │ 4:3│ │    │ │    │ │    │ │    │                   │
│  │사진│ │... │ │... │ │... │ │... │                   │
│  └────┘ └────┘ └────┘ └────┘ └────┘                   │
│  제목    제목    제목    제목    제목                    │
│  #태그                                                   │
│                                                         │
│  당신 근처 — 강남구                              <   >   │
│  [카드 행]                                              │
│                                                         │
│  부모님과 가기 좋은                              <   >   │
│  ...                                                    │
│                                                         │
│  (총 7개 레일)                                           │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Card 컴포넌트 스펙

```
┌─────────────────────┐
│                     │  ← 4:3 썸네일 (photos[0] 또는 fallback)
│   [카테고리 뱃지]    │     absolute top-left
│                     │
├─────────────────────┤
│ 업체명 (1줄 clamp)   │  ← sections.hero.title or businessName
│ 서브타이틀 (1줄)     │  ← sections.hero.subtitle
│ #태그1 #태그2 #태그3  │  ← 최대 3개
└─────────────────────┘

너비: grid-cols-auto, 최소 180px, 최대 240px
hover: 살짝 scale(1.02) + shadow
click: Link to /p/{slug}
```

### 5.3 User Flow

```
방문자 진입 →  / (홈 피드)
  ├─ 지역 드롭다운 변경  → URL 업데이트 → 서버 재렌더 (feed tag cache hit/miss)
  ├─ 업종 탭 변경        → URL 업데이트 → 서버 재렌더
  ├─ 검색 입력           → 클라 filter (300ms debounce), 서버 호출 없음
  ├─ 레일 스크롤          → CSS scroll-snap-x
  └─ 카드 클릭            → /p/{slug}

발행된 게시글 보유 업체:
  편집 → AI 생성 → 🆕 태그·region도 자동 생성 → 확인 → 발행
  → 1분 내 피드 반영
```

### 5.4 Empty States

| 상황 | UI |
|------|----|
| 레일에 게시글 0개 | "곧 더 많은 {레일 제목} 게시글이 소개됩니다" 1줄 + 레일 자체 렌더 |
| 현재 시간대 레일에 0개 | 해당 레일 숨김 (렌더 안 함) |
| 지역·검색 필터 결과 모두 0개 | "해당 조건의 게시글이 없어요. 필터를 바꿔보세요" |

### 5.5 Component List

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| `FeedPage` | Server | `src/app/page.tsx` | 루트 피드 |
| `FeedControls` | Client | `src/components/feed/FeedControls.tsx` | URL state 동기화, 검색 debounce |
| `FeedRails` | Server | `src/components/feed/FeedRails.tsx` | 레일 7개 오케스트레이션 |
| `Rail` | Server | `src/components/feed/Rail.tsx` | 단일 레일 컨테이너 + 제목 |
| `PostCard` | Server | `src/components/feed/PostCard.tsx` | 카드 렌더 |
| `FeedSkeleton` | Server | `src/components/feed/FeedSkeleton.tsx` | Suspense fallback |
| `RegionSelect` | Client | `src/components/feed/RegionSelect.tsx` | 시·구 드롭다운 |
| `CategoryTabs` | Client | `src/components/feed/CategoryTabs.tsx` | 전체/음식점/미용실/카페 |
| `SearchInput` | Client | `src/components/feed/SearchInput.tsx` | 300ms debounce |

### 5.6 URL State 동기화

```typescript
// src/components/feed/FeedControls.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

// 파라미터:
//   region   = "서울특별시|강남구"  (pipe-delimited, null-safe)
//   category = "all"|"restaurant"|"salon"|"cafe"
//   q        = 검색어 (URL encoded)
```

FeedPage는 Server이므로 `searchParams` Promise로 받아 `await` 후 FeedRails에 전달.

---

## 6. Feed Rails 상세 정의

### 6.1 `src/lib/feed/rails.ts`

```typescript
import type { SectionType } from "@/types/page";

export type TimeContext = 'morning'|'lunch'|'afternoon'|'evening'|'latenight';

export type RailMatch = 
  | { kind: 'tags-any'; tags: readonly string[] }
  | { kind: 'region' }
  | { kind: 'freshness'; withinDays: number };

export interface RailDef {
  id: string;
  title: string;          // "{district}" placeholder 지원 (region 레일)
  match: RailMatch;
  timeContext?: TimeContext;   // 설정되면 현재 시각과 일치할 때만 렌더
  sizeLimit?: number;     // default 20
}

export const RAILS: readonly RailDef[] = [
  // 1. Time-contextual (현재 시각 매칭 1개만 노출)
  { id: 'morning',   title: '아침에 가기 좋은',  match: { kind: 'tags-any', tags: ['#아침'] },  timeContext: 'morning' },
  { id: 'lunch',     title: '점심에 가기 좋은',  match: { kind: 'tags-any', tags: ['#점심'] },  timeContext: 'lunch' },
  { id: 'afternoon', title: '오후에 가기 좋은',  match: { kind: 'tags-any', tags: ['#오후'] },  timeContext: 'afternoon' },
  { id: 'evening',   title: '저녁에 가기 좋은',  match: { kind: 'tags-any', tags: ['#저녁'] },  timeContext: 'evening' },
  { id: 'latenight', title: '야식하기 좋은',     match: { kind: 'tags-any', tags: ['#야식'] },  timeContext: 'latenight' },

  // 2. Static
  { id: 'nearby',    title: '당신 근처 — {district}', match: { kind: 'region' } },
  { id: 'parents',   title: '부모님과 가기 좋은',      match: { kind: 'tags-any', tags: ['#부모님', '#가족'] } },
  // v0.2 (I6): `#조용한`은 데이트·부모님 등 다른 레일과 중복되어 solo 매치셋에서 제거.
  // 태그 자체는 ALL_TAGS에 유지 — 검색·카드 표시용 descriptor 역할. v1.1에서 '조용한 공간' 레일 추가 고려.
  { id: 'solo',      title: '혼밥하기 좋은',           match: { kind: 'tags-any', tags: ['#혼밥'] } },
  { id: 'date',      title: '분위기 좋은 데이트',      match: { kind: 'tags-any', tags: ['#데이트', '#프리미엄'] } },
  { id: 'insta',     title: '인스타에 올리기 좋은',    match: { kind: 'tags-any', tags: ['#인스타감성'] } },
  { id: 'recent',    title: '최근 발행',                match: { kind: 'freshness', withinDays: 14 } },
];
```

### 6.2 `src/lib/feed/time-context.ts`

```typescript
import type { TimeContext } from "./rails";

const HOUR_TO_CONTEXT = new Map<number, TimeContext>([
  [6, 'morning'], [7, 'morning'], [8, 'morning'], [9, 'morning'], [10, 'morning'],
  [11, 'lunch'], [12, 'lunch'], [13, 'lunch'],
  [14, 'afternoon'], [15, 'afternoon'], [16, 'afternoon'], [17, 'afternoon'],
  [18, 'evening'], [19, 'evening'], [20, 'evening'], [21, 'evening'],
  [22, 'latenight'], [23, 'latenight'],
  [0, 'latenight'], [1, 'latenight'], [2, 'latenight'], [3, 'latenight'],
  [4, 'latenight'], [5, 'latenight'],
]);

/**
 * 서버: UTC → KST 변환 후 시각
 * 클라: 브라우저 로컬 시각 (사용자 위치 기반)
 * 
 * 서버 렌더링에서는 UTC의 KST 환산값을 쓰고, 클라이언트에서 `refreshTimeContext`로 
 * 재계산해 필요 시 Rail 하나만 swap한다.
 */
export function currentTimeContext(now: Date = new Date()): TimeContext {
  const kstHour = (now.getUTCHours() + 9) % 24;
  return HOUR_TO_CONTEXT.get(kstHour) ?? 'afternoon';
}

export function currentTimeContextFromLocal(now: Date = new Date()): TimeContext {
  return HOUR_TO_CONTEXT.get(now.getHours()) ?? 'afternoon';
}
```

### 6.3 `src/lib/feed/ranking.ts`

```typescript
import type { Page } from "@/types/page";
import type { RailDef } from "./rails";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Scored {
  post: Page;
  score: number;
}

export function matchesRail(post: Page, rail: RailDef, userRegion?: Page["region"]): boolean {
  switch (rail.match.kind) {
    case 'tags-any':
      return rail.match.tags.some(t => post.tags.includes(t));
    case 'region':
      if (!userRegion || !post.region) return false;
      return post.region.city === userRegion.city
          && post.region.district === userRegion.district;
    case 'freshness': {
      const ms = rail.match.withinDays * 24 * 60 * 60 * 1000;
      return Date.now() - post.updatedAt.getTime() < ms;
    }
  }
}

export function rankRailPosts(
  posts: Page[],
  rail: RailDef,
  userRegion?: Page["region"]
): Page[] {
  const now = Date.now();
  const scored: Scored[] = posts
    .filter(p => matchesRail(p, rail, userRegion))
    .map(p => {
      const matchCount = rail.match.kind === 'tags-any'
        ? rail.match.tags.filter(t => p.tags.includes(t)).length
        : 0;
      const freshBoost = now - p.updatedAt.getTime() < WEEK_MS ? 1 : 0;
      return { post: p, score: matchCount * 10 + freshBoost };
    })
    .sort((a, b) =>
      b.score - a.score
      || b.post.updatedAt.getTime() - a.post.updatedAt.getTime()
    );

  // Diversity: same ownerUid 연속 금지
  const result: Page[] = [];
  for (const { post } of scored) {
    if (result[result.length - 1]?.ownerUid === post.ownerUid) continue;
    result.push(post);
    if (result.length >= (rail.sizeLimit ?? 20)) break;
  }
  return result;
}
```

---

## 7. Tag Extraction Prompt (Gemini)

### 7.1 System Instruction

```
당신은 한국 지역 상권 마케팅 태그를 선별하는 분석가입니다.
아래 고정된 ALL_TAGS 중에서만 3~5개를 선택하세요.
주관적 평가·창작 금지, 주어진 섹션 내용에서 직접 뒷받침되는 태그만.

원칙:
1. ALL_TAGS 외 용어 절대 금지
2. 청결·위생·방역·살균·청소·세척·소독 관련 태그는 ALL_TAGS에 없음 — 절대 포함 금지
3. 서로 상충하는 태그 병용 금지 (예: #조용한 + #활기찬)
4. JSON schema { tags: string[] } 형태로만 응답
```

### 7.2 User Prompt Skeleton

```ts
// src/lib/llm/prompt-builder.ts (추가)
export function buildTagExtractionPrompt(input: {
  businessName: string;
  category: Category;
  keyPoints: string[];
  hero: { title: string; subtitle: string };
  intro: { body: string };
  highlights: { items: string[] };
  cta: { label: string };
}): SectionGenPrompt<{ tags: string[] }> {
  return {
    section: 'tags' as const,
    call: {
      systemInstruction: TAG_SYSTEM_INSTRUCTION,
      prompt: `업체명: ${input.businessName}
업종: ${CATEGORY_LABELS[input.category]}
키포인트: ${input.keyPoints.join(' / ')}

생성된 홍보 섹션:
- 타이틀: ${input.hero.title}
- 서브타이틀: ${input.hero.subtitle}
- 소개: ${input.intro.body}
- 특징: ${input.highlights.items.join(' / ')}
- CTA: ${input.cta.label}

ALL_TAGS (이 중에서만 선택):
${ALL_TAGS.join(', ')}

위 내용에서 실제로 뒷받침되는 태그 3~5개를 JSON으로 반환.`,
      schema: {
        type: SchemaType.OBJECT,
        properties: {
          tags: {
            type: SchemaType.ARRAY,
            items: { 
              type: SchemaType.STRING,
              format: 'enum',
              enum: [...ALL_TAGS]
            },
          },
        },
        required: ['tags'],
      },
      temperature: 0.2,
    },
    parse: (raw) => {
      const j = raw as { tags?: string[] };
      return { tags: Array.isArray(j.tags) ? j.tags : [] };
    },
  };
}
```

### 7.3 Server-side 2차 방어

```ts
// src/services/generate-service.ts (추가)
const HYGIENE_PATTERN = /청소|청결|위생|방역|살균|세척|소독/;

function sanitizeTags(raw: string[]): string[] {
  return raw
    .filter((t) => ALL_TAGS.includes(t))               // enum 재확인
    .filter((t) => !HYGIENE_PATTERN.test(t))           // 정규식 방어
    .slice(0, MAX_TAGS_PER_POST);
}

// runSectionGeneration 맨 뒤:
const tagResult = await runPrompt(buildTagExtractionPrompt({...}));
const tags = sanitizeTags(tagResult.tags);
const region = parseRegion(page.address);
await pageRepository.update(pageId, { sections, tags, region });
```

---

## 8. `parseRegion` 사전

```typescript
// src/domain/region.ts (신규)
/**
 * 한국 행정구역 사전. 간이 표준화용.
 * 키: 사용자 입력 변이형. 값: 표준화 명칭.
 */
const CITY_NORMALIZE: Record<string, string> = {
  '서울':   '서울특별시',  '서울시':  '서울특별시',  '서울특별시': '서울특별시',
  '부산':   '부산광역시',  '부산시':  '부산광역시',  '부산광역시': '부산광역시',
  '대구':   '대구광역시',  '대구시':  '대구광역시',  '대구광역시': '대구광역시',
  '인천':   '인천광역시',  '인천시':  '인천광역시',  '인천광역시': '인천광역시',
  '광주':   '광주광역시',  '광주시':  '광주광역시',  '광주광역시': '광주광역시',
  '대전':   '대전광역시',  '대전시':  '대전광역시',  '대전광역시': '대전광역시',
  '울산':   '울산광역시',  '울산시':  '울산광역시',  '울산광역시': '울산광역시',
  '세종':   '세종특별자치시', '세종시': '세종특별자치시', '세종특별자치시': '세종특별자치시',
  '경기':   '경기도',       '경기도': '경기도',
  '강원':   '강원특별자치도', '강원도': '강원특별자치도', '강원특별자치도': '강원특별자치도',
  '충북':   '충청북도',     '충청북도': '충청북도',
  '충남':   '충청남도',     '충청남도': '충청남도',
  '전북':   '전북특별자치도', '전라북도': '전북특별자치도', '전북특별자치도': '전북특별자치도',
  '전남':   '전라남도',     '전라남도': '전라남도',
  '경북':   '경상북도',     '경상북도': '경상북도',
  '경남':   '경상남도',     '경상남도': '경상남도',
  '제주':   '제주특별자치도', '제주도': '제주특별자치도', '제주특별자치도': '제주특별자치도',
};

/**
 * 도 단위 (3-level 주소: 도 → 시 → 구/군).
 * 예: "경기도 성남시 분당구 ..." → city='경기도', district='성남시 분당구'
 */
const DO_NAMES: ReadonlySet<string> = new Set([
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
]);

/**
 * 한국 주소 파서 (v0.2 — I2 fix).
 * 2가지 패턴 지원:
 *   A) 특별시·광역시·특별자치시: [시] [구|군]
 *      "서울특별시 강남구 테헤란로" → {city:'서울특별시', district:'강남구'}
 *   B) 도: [도] [시] [구|군]?
 *      "경기도 성남시 분당구 백현로" → {city:'경기도', district:'성남시 분당구'}
 *      "경기도 수원시 팔달로"       → {city:'경기도', district:'수원시'}
 * 실패 시 null → "최근 발행" 레일에만 노출.
 */
export function parseRegion(address: string): { city: string; district: string } | null {
  const tokens = address.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const firstNorm = CITY_NORMALIZE[tokens[0]] ?? tokens[0];

  // B. 도 단위
  if (DO_NAMES.has(firstNorm)) {
    const si = tokens[1];
    if (!/시$/.test(si)) return null;
    const gu = tokens[2] && /[구군]$/.test(tokens[2]) ? tokens[2] : null;
    return { city: firstNorm, district: gu ? `${si} ${gu}` : si };
  }

  // A. 특별시·광역시
  const districtToken = tokens[1];
  if (!/[구군]$/.test(districtToken)) return null;
  return { city: firstNorm, district: districtToken };
}

export const KNOWN_CITIES = Array.from(new Set(Object.values(CITY_NORMALIZE)));
```

### 8.1 지역 드롭다운 옵션

RegionSelect는 v1 고정 목록으로 17개 시·도 + "전국" 옵션 제공. 구/군 단위 옵션은 **게시글에서 실제로 사용된 district만 동적 표시** (관리자 관점). 이는 FeedRails에서 `uniqueDistricts(posts)`로 계산.

---

## 9. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| `INVALID_INPUT` | URL params 파싱 실패 | 기본값으로 fallback ("all" category, no region, q="") |
| `FEED_EMPTY` (UI) | 필터 결과 0건 | "해당 조건의 게시글이 없어요" empty state |
| `RAIL_EMPTY` (UI) | 특정 레일에 게시글 없음 | 레일 자체 숨김 (freshness는 dev 도중 항상 0이라도 렌더) |
| `TAG_EXTRACT_FAIL` | Gemini 오류 | 태그 없이 저장 (null 또는 `[]`) — 피드엔 최근 발행으로만 노출 |
| `REGION_PARSE_FAIL` | 주소 포맷 불일치 | `region = null` 저장 — "당신 근처" 제외, 나머지 레일 정상 |

**Server Action 반환 규약**: 기존 `ActionResult<T>` 패턴 유지.

---

## 10. Security Considerations

- [x] **인증 불필요** — 피드는 공개 경로. 기존 proxy.ts 가드 대상에 `/` 없음 유지
- [x] **Firestore 규칙 변경 없음** — `tags`, `region`은 owner-only 쓰기 규칙에 이미 포함됨 (모든 필드가 owner 소유)
- [x] **🧹 Hygiene 격리** — Tag extraction 프롬프트 + 서버 정규식 이중 방어
- [x] **XSS** — Next.js 자동 escape (카드 businessName, subtitle 등)
- [x] **SSRF** — 클라로부터 오는 URL 없음
- [x] **Rate limit** — 피드는 Cache Components로 거의 모든 요청이 캐시 히트. revalidate 시점에 Firestore 1회 read 비용
- [x] **개인정보 미노출** — 카드에 ownerEmail/uid 없음, businessName·address는 업체가 직접 발행 의지로 입력한 공개 정보

---

## 11. Test Plan

### 11.1 Scope

| Type | Target | Tool |
|------|--------|------|
| Unit | `parseRegion`, `rankRailPosts`, `currentTimeContext`, `sanitizeTags` | Vitest |
| Unit | `buildTagExtractionPrompt` (schema shape) | Vitest |
| Integration | `feedService.getFeedPosts` (Firestore emulator) | Vitest + Firebase rules-unit-testing |
| Contract | Gemini 태그 추출 응답 schema | Vitest + mock |
| E2E (수동) | 홈 → 필터 변경 → 검색 → 카드 클릭 | Playwright (스텝 10) |

### 11.2 Key Test Cases

- [ ] `parseRegion('서울특별시 강남구 테헤란로 123')` → `{city: '서울특별시', district: '강남구'}`
- [ ] `parseRegion('강남구 테헤란로')` → `null` (시 누락)
- [ ] `parseRegion('서울 강남구')` → `{city: '서울특별시', district: '강남구'}` (normalize)
- [ ] **(I2)** `parseRegion('경기도 성남시 분당구 백현로')` → `{city: '경기도', district: '성남시 분당구'}`
- [ ] **(I2)** `parseRegion('경기도 수원시 팔달로')` → `{city: '경기도', district: '수원시'}` (구 없음 허용)
- [ ] **(I2)** `parseRegion('경기도 성남시')` → `{city: '경기도', district: '성남시'}`
- [ ] **(I2)** `parseRegion('제주특별자치도 서귀포시 일주동로')` → `{city: '제주특별자치도', district: '서귀포시'}`
- [ ] **(I2)** `parseRegion('서울특별시강남구')` → `null` (스페이스 없음)
- [ ] `currentTimeContext(Date('2026-04-20T05:00:00Z'))` → `afternoon` (KST 14시)
- [ ] `rankRailPosts`: 매칭 태그 2개 vs 1개 → 2개 먼저
- [ ] `rankRailPosts`: freshness 7d 내 vs 밖 → 같은 매칭 수면 최근 먼저
- [ ] `rankRailPosts`: 같은 ownerUid 연속 3건 → 1개만 남음
- [ ] `sanitizeTags(['#오후', '#청소', '#가성비', '위생'])` → `['#오후', '#가성비']` (청결 + ALL_TAGS 외 필터)
- [ ] `getFeedPosts({category:'cafe'})` → 카페 published만 반환
- [ ] `/api/generate` 응답에 `tags[], region` 포함 + 업데이트 후 Firestore 반영
- [ ] 홈 `/` 방문 → 레일 7개 렌더 (또는 empty state)
- [ ] 시간대 14시 → "오후에 가기 좋은" 레일만 렌더되고 다른 시간대 레일 없음
- [ ] publishPage 후 `/` 방문 → 새 게시글 최대 60초 내 노출
- [ ] deletePage 후 `/` 방문 → 해당 카드 사라짐
- [ ] 검색어 "브런치" 입력 → 관련 카드만 레일마다 필터링

---

## 12. Clean Architecture

### 12.1 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| FeedPage, FeedRails, Rail, PostCard, FeedSkeleton | Presentation (Server) | `src/components/feed/`, `src/app/page.tsx` |
| FeedControls, RegionSelect, CategoryTabs, SearchInput | Presentation (Client) | `src/components/feed/` |
| feedService | Application | `src/services/feed-service.ts` |
| rails, ranking, time-context | Infrastructure | `src/lib/feed/` |
| Tag·Region 타입·상수·parseRegion | Domain | `src/domain/{tags,region}.ts`, `src/types/page.ts` |
| buildTagExtractionPrompt | Infrastructure | `src/lib/llm/prompt-builder.ts` |
| pageRepository.listPublished 확장 | Infrastructure | `src/lib/firebase/page-repository.ts` |

### 12.2 Dependency Direction

- Presentation(Server) → Application → Domain ← Infrastructure
- Presentation(Client) — `'use client'`, Server Action만 import (Infrastructure 직접 접근 금지)
- Domain (tags, region, types) — 외부 의존 0
- `server-only` sentinel: feedService, prompt-builder, generateService

---

## 13. Coding Conventions

| Target | Rule |
|--------|------|
| 파일 kebab-case | `feed-service.ts`, `rails.ts`, `time-context.ts` |
| 컴포넌트 PascalCase | `PostCard.tsx`, `FeedRails.tsx` |
| 태그 상수 UPPER_SNAKE | `TAG_TIME`, `TAG_COMPANION`, `ALL_TAGS` |
| Import 순서 | Node→external→internal→type |
| URL query param | 전부 lowercase, `region` pipe-delimited |

### 13.1 Environment Variables
변경 없음. 기존 `FIREBASE_ADMIN_SA_BASE64`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_GENERATIVE_AI_MODEL` 그대로 사용.

---

## 14. Implementation Guide

### 14.1 File Structure (신규 + 수정)

```
src/
├── app/
│   └── page.tsx                          🔄 교체 (랜딩 → FeedPage)
├── components/
│   └── feed/                             🆕 전체
│       ├── FeedControls.tsx              (client)
│       ├── FeedRails.tsx                 (server)
│       ├── FeedSkeleton.tsx
│       ├── Rail.tsx                      (server)
│       ├── PostCard.tsx                  (server)
│       ├── RegionSelect.tsx              (client)
│       ├── CategoryTabs.tsx              (client)
│       └── SearchInput.tsx               (client)
├── services/
│   └── feed-service.ts                   🆕
├── lib/feed/                             🆕 전체
│   ├── rails.ts
│   ├── ranking.ts
│   └── time-context.ts
├── domain/
│   ├── tags.ts                           🆕
│   └── region.ts                         🆕
├── types/page.ts                         🔄 tags, region 필드 추가
├── lib/firebase/page-repository.ts       🔄 listPublished 추가
├── lib/llm/prompt-builder.ts             🔄 buildTagExtractionPrompt 추가
├── services/generate-service.ts          🔄 태그 추출 호출 + sanitizeTags
└── app/actions/page-actions.ts           🔄 revalidateTag('feed', 'max') 추가
```

### 14.2 Implementation Order (9 steps)

1. **도메인 계층**: `domain/tags.ts`, `domain/region.ts` + 유닛 테스트
2. **타입 확장**: `types/page.ts`에 `tags`, `region` + `emptyRegion()`
3. **Repo 확장**: `pageRepository.listPublished` + `toPage`에 tags/region 매핑
4. **Feed infra**: `lib/feed/{rails,ranking,time-context}.ts` + 유닛 테스트
5. **Feed service**: `services/feed-service.ts` (use cache + cacheTag)
6. **Generate 확장**: `buildTagExtractionPrompt` + generateService 파이프라인 + sanitizeTags
7. **Server Actions revalidate**: 4개 action에 `revalidateTag('feed', 'max')` 추가
8. **Feed UI**: 클라 컨트롤 3종 + 서버 Rails/Card + URL 동기화
9. **홈 교체**: `app/page.tsx` 전면 재작성 → FeedPage + Suspense

### 14.3 마이그레이션 (기존 데이터)

현재 Firestore `pages`엔 `page-mr5k3k` 1건 (`businessName: "제목 없음"`). 이 문서의 `tags: []`, `region: null`로 초기화. "최근 발행" 레일에만 노출. 재편집 시 자동 채워짐.

### 14.4 실 구동 전 확인 항목

- [ ] `firestore.indexes.json`에 신규 인덱스 2개 추가 → `firebase deploy --only firestore:indexes`
- [ ] `.env.local`에 API 키·SA 이미 설정됨 (변경 없음)
- [ ] 로컬 `pnpm dev`에서 피드 페이지 로드 확인
- [ ] Gemini 태그 추출 호출 성공 (로그 확인)

---

## 15. Next.js 16 Patterns (참고 코드)

### 15.1 `/` 페이지 — Server Component + Suspense

```tsx
// src/app/page.tsx
import { Suspense } from 'react';
import { FeedControls } from '@/components/feed/FeedControls';
import { FeedRails } from '@/components/feed/FeedRails';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';

interface SearchParams {
  region?: string;
  category?: string;
  q?: string;
}

export default async function Home(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  const category = (sp.category ?? 'all') as Category | 'all';
  const region = parseRegionParam(sp.region);
  const q = sp.q ?? '';

  return (
    <main>
      <FeedControls initialRegion={region} initialCategory={category} initialQuery={q} />
      <Suspense fallback={<FeedSkeleton />}>
        <FeedRails filter={{ region, category }} query={q} />
      </Suspense>
    </main>
  );
}
```

### 15.1a 검색 헬퍼 (v0.2 — I3 fix)

```ts
// src/lib/feed/search.ts
import type { Page } from "@/types/page";

/** leading `#` 제거 + 양쪽 whitespace 정리. */
export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/^#+/, "").trim();
}

/** 빈 쿼리는 전체 통과. 대소문자 무시. 태그는 leading `#` 제거하고 비교. */
export function matchesSearch(post: Page, query: string): boolean {
  const q = normalizeSearchQuery(query).toLowerCase();
  if (!q) return true;
  if (post.businessName.toLowerCase().includes(q)) return true;
  if (post.tags.some((t) => t.replace(/^#/, "").toLowerCase().includes(q))) return true;
  if (post.sections.hero.subtitle.toLowerCase().includes(q)) return true;
  return false;
}
```

SearchInput 컴포넌트는 `normalizeSearchQuery(rawInput)`로 URL query param에 보관, 300ms debounce 후 FeedControls가 URL에 반영.

### 15.2 FeedRails — 'use cache' 호출 + 레일 계산

```tsx
// src/components/feed/FeedRails.tsx
import { getFeedPosts } from '@/services/feed-service';
import { RAILS } from '@/lib/feed/rails';
import { currentTimeContext } from '@/lib/feed/time-context';
import { rankRailPosts } from '@/lib/feed/ranking';
import { Rail } from './Rail';

export async function FeedRails({ filter, query }: Props) {
  const posts = await getFeedPosts({ category: filter.category });
  const filtered = posts.filter((p) => matchesSearch(p, query));

  const tc = currentTimeContext();
  const rails = RAILS.filter(r => !r.timeContext || r.timeContext === tc);
  
  return (
    <>
      {rails.map(rail => {
        const ranked = rankRailPosts(filtered, rail, filter.region);
        if (ranked.length === 0) return null;
        const title = rail.title.replace('{district}', filter.region?.district ?? '');
        return <Rail key={rail.id} title={title} posts={ranked} />;
      })}
    </>
  );
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Plan Plus v0.1 + 리서치 반영 초안. Open Q 5개 해소 (카드 4:3, recent 14일, 시간대 경계, 지역 시·구 단위, 검색 sticky top). Tag extraction prompt + sanitizeTags + parseRegion 사전 + ranking 순수 함수 + 레일 7개 정의 확정 | Seokho Lee |
| 0.2 | 2026-04-20 | design-validator 리뷰 반영 (I2/I3/I5/I6). **I2**: `parseRegion`에 도-시-구 3-level 지원 (`DO_NAMES` 세트, "경기도 성남시 분당구" → `{city:'경기도', district:'성남시 분당구'}`) + 테스트 케이스 5개 추가. **I3**: 검색 헬퍼 `matchesSearch`·`normalizeSearchQuery` 분리, leading `#` strip, 빈 쿼리 전체 통과, 대소문자 무시 (§15.1a 신설). **I5**: `feedService.getFeedPosts`에 `FEED_LIMIT(500)` 상수화 + 도달 시 console.warn. **I6**: solo 레일 태그에서 `#조용한` 제거 (`['#혼밥']` 만). I1(time-context swap), I4(Plan back-sync), M1-M6은 구현·v1.1에서 처리 예정 | Seokho Lee |
