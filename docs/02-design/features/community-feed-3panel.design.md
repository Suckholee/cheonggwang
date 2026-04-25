# Design · community-feed-3panel

**Feature**: 커뮤니티 피드 3패널 개편 + AI 고객 스토리 자동 생성 (스크랩북 + 정기 배치)
**Version**: v0.3 (Phase 4.5 스크랩북 아키텍처 · Phase 5 SEO 완공 · Next 16 런타임 특이사항 반영)
**Level**: Dynamic
**Cycle**: #18 (Marketplace v1.6 · community-feed-revamp)
**Based on**: `docs/01-plan/features/community-feed-3panel.plan.md`
**Created**: 2026-04-22

---

## 0.0 Plan vs Design Reconciliation

Design는 현재 코드와 정합하도록 Plan의 6개 지점을 바로잡습니다.

| # | Plan 지점 | Plan 표현 | Design 실제 | 이유 |
|---|---|---|---|---|
| R1 | Plan §2, §7 라우팅 | `/community/[panel]/page.tsx` 단일 다이나믹 | `/community/{tips,providers,stories}/page.tsx` 3개 정적 세그먼트 | Next.js 라우팅 제약 — 기존 `/community/[postId]` 와 동일 레벨에서 다이나믹 충돌. 정적 세그먼트가 우선 매칭되어 공존 가능 |
| R2 | Plan §2, §7, §9 상세 경로 | `/p/[slug]` | `/community/p/[slug]` + `/community/[postId]` 301 shim | `/p/[slug]`는 promo pages(`pages` 컬렉션)용 기존 라우트 · post 상세는 /community 하위 유지 |
| R3 | Plan §5.1 hygiene-guard 재사용 | 기존 `hygiene-guard.ts` 직접 사용 | 같은 파일에 `checkMarkdownHygiene()` 추가 함수 도입 | 현 파일은 `Sections` 타입 전용 · customer-story는 markdown 본문 · 규칙은 공유하되 API 분리 |
| R4 | Plan §5.3 Storage 경로 | `/stories/{uid}/{nanoid}/{idx}.jpg` | `/stories/{uid}/{storyId}/{fileName}` · ≤5MB · jpeg/png/webp | 기존 `storage.rules` 3-segment 관례(`{uid}/{parentId}/{fileName}`) + 사이즈/타입 정책 일치 |
| R5 | Plan §5.1 스키마 확장 | `postType` 신규 필드만 추가 | + 마이그레이션: `toPost`가 missing `postType` → 'provider' 기본값 · 원샷 backfill 스크립트 | 기존 `posts` 도큐먼트 호환 · 읽기 path에 안전판 + 쓰기 path에 명시화 |
| R6 | Plan §8 생성 동기성 | "동기 생성 3-8s" | 동일 · 실패 시 폴백 위치 구체화 (`revalidatePath` 호출 순서 포함) + 504 타임아웃 10s 상한 | 공급 Gemini latency 변동 가능 · 상한 없으면 사용자 hang |
| R7 | Plan §7.5·§8·§9 ISR `revalidate` 세그먼트 | `export const revalidate = 300 \| 3600` | **사용 불가** — `next.config.ts`의 `cacheComponents: true` 모드에서 route segment `revalidate` 금지 (Next 16 런타임 에러 확인). 대체: 동적 렌더 기본 + 필요 시 `'use cache'` + `cacheLife()` 데이터 레벨 캐싱(Phase 5) | 프로젝트 `next.config.ts` 설정 강제 · 런타임 500 에러 직접 확인 후 수정 |
| R8 | Plan §5 즉시 발행 파이프라인 | 업로드 → 동기 Gemini 생성 → 즉시 공개 발행 | **스크랩북 + 정기 배치**: 업로드는 `storyScrapbook/{itemId}` 로 저장(pending) · 정기 크론이 10건씩 원자적 claim → Gemini 생성 → 공개 발행. 사용자 제어 없이 "알아서" 생성 | 사용자 의도 변경 — 현장에서 바로 발행이 아닌, 자료만 쌓아두면 자동 생성되는 UX 선호 (2026-04-22 확정) |
| R9 | Plan § 없음 | — | **동적 세그먼트 한국어 URL 디코딩 필수**: Next 16 Turbopack은 `/community/p/[slug]` 한국어 slug를 URL-encoded 상태로 전달(`%EC%9A%A9...`). 페이지에서 `decodeURIComponent()` 해야 Firestore slug 필드와 매칭 | 런타임 404 재현 → console.log 로 확인 · 향후 ASCII slug(한국어 제거 혹은 romanization) 정책 고려 여지 |
| R10 | Plan § 없음 | — | **동적 generateMetadata + uncached data 금지**: `cacheComponents: true` 모드에서 metadata fetch가 "uncached outside Suspense" 에러를 발생시켜 페이지가 404로 렌더링됨. 해결: 정적 metadata + React 19 `<title>`/`<meta>` hoisting으로 동적 값은 PostBody 내부(Suspense 안)에서 선언 | Next 16 특이사항 · 문서화되지 않은 동작 · `'use cache'` 디렉티브로 캐시하면 동적 가능하나 Firebase Admin SDK 호환 검증 미완료 |
| R11 | Plan § 없음 | — | **Firebase Admin `initializeApp`에 `storageBucket` 필수**: 누락 시 `bucket()` 호출 실패. 호출부도 `getStorageBucketName()` 헬퍼로 bucket name 명시 전달 (live app이 캐시된 상태에서도 안전) | 실제 업로드 시도에서 "Bucket name not specified" 발견 |

**모든 변경은 실제 코드/프레임워크와의 정합 목적 · Plan의 의도 왜곡 없음.**

### 0.0.1 v0.2 Validator Response (92% Match Rate)

| Finding | Severity | Resolution |
|---|---|---|
| C1 — `CreatePostInput` missing `postType`/`sourcePhotos`/`generationMeta` | Critical (Phase 1 blocker) | §4.0 신설: `CreatePostInput` 확장 시그니처 + `.create()` 본문 명시 |
| C2 — `DocumentSnapshot.exists` method vs property | False positive | Firebase **Admin SDK** (`firebase-admin/firestore`)에서 `.exists`는 **property** (맞음). Client SDK는 method. 서버 전용 코드이므로 현 스펙 정확 — §4.1 주석으로 명시 |
| C3 — Provider CTA/InfoCard 상실 | Critical (Phase 4 blocker) | §7.3 `ProviderFollowupBlock` 정의 추가 · 기존 `PostProviderInfoCard` + `QuoteCTAButton` 래핑 |
| C4 — File inventory 개수 불일치 | Critical (cleanup) | §1.1 테이블 재정리 (정확히 28개 신규 파일 + 행 삭제 방침) |
| C5 — hygiene 실패 시 Storage 파일 삭제 경로 부재 | Critical (Phase 4) | §5.2 API handler + §5.3 generator에 `cleanupStoryPhotos(uid, storyId)` 호출 명시 |
| H1 — 마크다운 XSS 방지 | High | §7.3에 `src/lib/markdown.ts` 사용 명시 + `sanitize-html` 의존성 활용 (package.json 이미 존재) |
| H5 — `NEXT_PUBLIC_BASE_URL` 미확정 | High | §7.4–7.7에 `getBaseUrl()` 헬퍼 도입 · env 없으면 헤더/요청 origin fallback |
| H6 — `inferCategories` 매핑 부재 | High (Phase 4 blocker) | §13 Open Questions 상단에 승격 · Phase 4 착수 전 확정 필요 |
| H2/H3/H4/H7 | Medium 수용 | 현 스코프 밖 또는 운영 단계 · §12 Risk에 추가 |
| M1–M6 | 정보 | 문서 내 각 항에 메모만 추가 |

---

## 0. Design Overview

### 0.1 목표
- 3패널(tips/providers/stories) 라우트 + 공통 레이아웃 + 정적 세그먼트 라우팅
- `posts` 스키마 3필드 확장 (`postType`, `sourcePhotos?`, `generationMeta?`) + 복합 인덱스 3종
- `postRepository` 메서드 3종 추가 (type 필터 + 커서 페이지네이션)
- AI 파이프라인: Vision → RAG → 생성 → 마크다운 hygiene → 자동 발행
- SEO: 패널별 메타/OG, JSON-LD Article on `/community/p/[slug]`, 사이트맵/robots, 패널별 RSS
- 슬러그 기반 URL 전환 + 레거시 `[postId]` 301 shim

### 0.2 Design 원칙
- **라우팅 안전성**: 정적 > 다이나믹 우선순위 활용, 기존 URL 호환
- **스키마 하위호환**: 기존 posts 문서가 `postType` 없어도 'provider'로 읽힘
- **쓰기 격리**: 모든 posts 쓰기는 Admin SDK (`firestore.rules`에서 write 차단 유지)
- **Hygiene이 유일 게이트**: 자동 발행 정책 — hygiene 임계 + 구조 검증 강화
- **Cache-first**: 모든 list 경로 React `cache()` 래핑, Next ISR 병행

---

## 1. File Structure

### 1.1 신규 파일 (28개)

**Domain & Infra (8)**
| 경로 | Role |
|---|---|
| `src/lib/feed/panel-config.ts` | `PANELS` 상수 · SEO/OG/empty-copy 메타 |
| `src/lib/llm/story-generator.ts` | Vision → RAG → generate → hygiene 오케스트레이션 |
| `src/lib/llm/story-rag.ts` | 스타일 참조 posts 검색 (Vision 태그 시드) |
| `src/lib/llm/story-cleanup.ts` | `cleanupStoryPhotos(uid, storyId)` — Storage 파일 일괄 삭제 (hygiene fail 시) |
| `src/lib/seo/article-jsonld.ts` | `buildArticleJsonLd(post)` |
| `src/lib/seo/sitemap-builder.ts` | 패널/posts 엔트리 조립 |
| `src/lib/seo/rss-builder.ts` | RSS 2.0 XML 직렬화 (type-agnostic 빌더) |
| `src/lib/seo/base-url.ts` | `getBaseUrl()` 헬퍼 (env → headers fallback, H5) |

**UI Components (8)**
| 경로 | Role |
|---|---|
| `src/components/community/CommunityPanelTabs.tsx` | sticky 탭 네비 (active·ARIA) |
| `src/components/community/PanelLayout.tsx` | 공유 shell (header·tabs·search·filters·slot) |
| `src/components/community/PanelEmptyState.tsx` | 패널별 빈 상태 + CTA |
| `src/components/community/PanelSearchBar.tsx` | 패널 내 검색 (debounced, URL `?q=`) |
| `src/components/community/PanelSubFilters.tsx` | 지역/카테고리 chip (URL `?region=`, `?cat=`) |
| `src/components/community/InfiniteFeedList.tsx` | 커서 기반 무한스크롤 |
| `src/components/community/ProviderFollowupBlock.tsx` | `/community/p/[slug]` provider post용 info + CTA 래퍼 (C3 — 기존 `PostProviderInfoCard` + `QuoteCTAButton` 포함) |
| `src/components/community/stories/StoryUploadForm.tsx` | 사진 선택 · 캡션 · 제출 |
| `src/components/community/stories/StoryGeneratingState.tsx` | 생성 중 스피너 |

**Routes (11)**
| 경로 | Role |
|---|---|
| `src/app/community/tips/page.tsx` | tips 패널 |
| `src/app/community/providers/page.tsx` | providers 패널 |
| `src/app/community/stories/page.tsx` | stories 패널 |
| `src/app/community/stories/upload/page.tsx` | 고객 업로드 UI |
| `src/app/community/tips/rss.xml/route.ts` | tips RSS |
| `src/app/community/providers/rss.xml/route.ts` | providers RSS |
| `src/app/community/stories/rss.xml/route.ts` | stories RSS |
| `src/app/community/p/[slug]/page.tsx` | 슬러그 기반 post 상세 (JSON-LD) |
| `src/app/api/community/stories/upload/route.ts` | 업로드 + 동기 AI 생성 API |
| `src/app/sitemap.ts` | 전체 사이트맵 |
| `src/app/robots.ts` | robots.txt |

**Operator (1)**
| 경로 | Role |
|---|---|
| `scripts/backfill-posts-post-type.mjs` | 기존 posts 문서 `postType='provider'` 일괄 셋팅 |

### 1.2 수정 파일

| 경로 | 변경 |
|------|------|
| `src/app/community/page.tsx` | `redirect('/community/tips')` 로 축소 (서버 컴포넌트 한 줄) |
| `src/app/community/[postId]/page.tsx` | `postRepository.get` → 찾으면 `redirect(\`/community/p/${post.slug}\`, 'permanent')`, 없으면 notFound |
| `firestore.indexes.json` | posts 복합 인덱스 3종 추가 |
| `firestore.rules` | posts write 유지 (Admin SDK 독점) — 규칙 본문 변경 없음, 단 주석에 postType='customer-story' 경로 명시 |
| `storage.rules` | `/stories/{uid}/{storyId}/{fileName}` 블록 추가 (read public, write auth + 5MB + image MIME) |

---

## 2. Data Model

### 2.1 `Post` 스키마 확장 (`src/types/post.ts`)

```ts
export type PostType = 'tip' | 'provider' | 'customer-story';

export interface StoryGenerationMeta {
  model: string;               // e.g. 'gemini-2.5-pro'
  generatedAt: Date;
  ragSourceIds: string[];      // 참조된 post.id[] (0-5개)
  hygieneScore: number;        // [0, 1]
  visionTags: string[];        // 인덱싱 힌트
}

export interface Post {
  id: string;
  providerId: string;          // customer-story는 'customer'
  providerOwnerUid: string;    // customer-story는 업로더 uid
  companyName: string;         // customer-story는 '청광 고객'
  categories: QuoteCategory[];
  regionLabel: string | null;
  title: string;
  slug: string;                // v1부터 canonical URL 키
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  bodyMarkdown: string;
  summary80: string;
  topicHint: string | null;
  brandTone: BrandTone;
  createdAt: Date;

  // NEW
  postType: PostType;
  sourcePhotos?: string[];
  generationMeta?: StoryGenerationMeta;
}
```

### 2.2 `toPost` 마이그레이션 안전판 (`post-repository.ts`)

```ts
function toPost(id: string, d: DocumentData): Post {
  // ... 기존 매핑 ...
  const rawType = d.postType as string | undefined;
  const postType: PostType =
    rawType === 'tip' || rawType === 'customer-story'
      ? rawType
      : 'provider'; // 레거시 문서 기본값
  const sourcePhotos = Array.isArray(d.sourcePhotos)
    ? (d.sourcePhotos as string[])
    : undefined;
  const genMeta = d.generationMeta as DocumentData | undefined;
  return {
    ...,
    postType,
    sourcePhotos,
    generationMeta: genMeta
      ? {
          model: String(genMeta.model ?? ''),
          generatedAt: tsToDate(genMeta.generatedAt as Timestamp),
          ragSourceIds: Array.isArray(genMeta.ragSourceIds)
            ? (genMeta.ragSourceIds as string[])
            : [],
          hygieneScore: Number(genMeta.hygieneScore ?? 0),
          visionTags: Array.isArray(genMeta.visionTags)
            ? (genMeta.visionTags as string[])
            : [],
        }
      : undefined,
  };
}
```

### 2.3 Backfill 스크립트 (`scripts/backfill-posts-post-type.mjs`)

- Admin SDK로 `posts` 컬렉션 전체 순회
- `postType` 없는 문서에 `postType: 'provider'` 추가 (set merge:true)
- 배치 500건 씩 · dry-run 옵션 기본 on · `--apply` 플래그로 실행
- 로그: `updated=N skipped=M total=T`

### 2.4 Firestore 인덱스 (`firestore.indexes.json` 추가)

```json
{
  "collectionGroup": "posts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "postType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "posts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "postType", "order": "ASCENDING" },
    { "fieldPath": "regionLabel", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "posts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "postType", "order": "ASCENDING" },
    { "fieldPath": "categories", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

기존 `(providerId, createdAt DESC)` 인덱스는 유지 (provider 프로필 페이지에서 사용).

### 2.5 Storage 경로 및 규칙

**경로**: `/stories/{uid}/{storyId}/{fileName}`
- `storyId` = `nanoid(12)` (서버가 발급, 업로드 요청 번들 = 1개의 storyId 디렉터리)
- `fileName` = `{index}-{nanoid(6)}.{ext}` (순서 + 충돌 방지)

**storage.rules 추가 블록**:
```
match /stories/{uid}/{storyId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```
(기존 `photos/`, `profile-images/` 블록과 동일 패턴)

---

## 3. Routing Design

### 3.1 라우트 트리

```
src/app/
  sitemap.ts                                  # /sitemap.xml
  robots.ts                                   # /robots.txt
  community/
    page.tsx                                  # / → redirect(/community/tips)
    tips/
      page.tsx                                # 청소 노하우 패널
      rss.xml/route.ts                        # tips RSS
    providers/
      page.tsx                                # 청소업체 홍보 패널
      rss.xml/route.ts                        # providers RSS
    stories/
      page.tsx                                # 고객 홍보 패널
      rss.xml/route.ts                        # stories RSS
      upload/
        page.tsx                              # 고객 업로드 UI
    p/
      [slug]/
        page.tsx                              # 슬러그 기반 상세 (primary)
    [postId]/
      page.tsx                                # 레거시 → 301 redirect to p/[slug]
  api/
    community/
      stories/
        upload/route.ts                       # POST: 업로드+AI 생성
```

### 3.2 라우팅 우선순위

Next.js App Router는 동일 레벨에서 **정적 > 다이나믹** 우선. 따라서:
- `/community/tips` → `tips/page.tsx` (static, 최우선)
- `/community/providers` → `providers/page.tsx` (static)
- `/community/stories` → `stories/page.tsx` (static)
- `/community/p/...` → `p/[slug]/page.tsx` (static segment `p` 우선)
- `/community/{anything-else}` → `[postId]/page.tsx` (fallback, 레거시 shim)

패널 슬러그(tips/providers/stories)는 postId 공간(nanoid)과 충돌하지 않음.

### 3.3 레거시 `[postId]` shim

```ts
// src/app/community/[postId]/page.tsx
import { redirect, notFound } from 'next/navigation';
import { postRepository } from '@/lib/firebase/post-repository';

export default async function LegacyPostRedirect(props: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await props.params;
  const post = await postRepository.get(postId);
  if (!post) notFound();
  redirect(`/community/p/${post.slug}`, 'permanent'); // 301
}
```

---

## 4. Repository API

### 4.0 `CreatePostInput` 확장 (C1 — Phase 1 필수)

기존 `post-repository.ts:42`의 `CreatePostInput`은 `postType`/`sourcePhotos`/`generationMeta`를 포함하지 않음. 반드시 확장 + `.create()` 본문 수정.

```ts
// src/lib/firebase/post-repository.ts
export interface CreatePostInput {
  // ... 기존 13개 필드 유지 ...
  providerId: string;
  providerOwnerUid: string;
  companyName: string;
  categories: QuoteCategory[];
  regionLabel: string | null;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  bodyMarkdown: string;
  summary80: string;
  topicHint: string | null;
  brandTone: BrandTone;

  // NEW (Phase 1)
  postType: PostType;
  sourcePhotos?: string[];
  generationMeta?: StoryGenerationMeta;
}

export const postRepository = {
  async create(id: string, data: CreatePostInput): Promise<void> {
    const payload: DocumentData = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    };
    // generationMeta는 optional — undefined 필드 Firestore 저장 회피
    if (data.generationMeta) {
      payload.generationMeta = {
        ...data.generationMeta,
        generatedAt: Timestamp.fromDate(data.generationMeta.generatedAt),
      };
    } else {
      delete payload.generationMeta;
    }
    if (!data.sourcePhotos) delete payload.sourcePhotos;
    await col().doc(id).create(payload);
  },
  // ... 기존 + 신규 메서드 ...
};
```

**Phase 1 호환성 체크**
- 기존 `promo-actions.ts` · `seed-first-provider.mjs` 등에서 `postRepository.create` 호출 위치 전수 확인 필요. 확장 필드 missing 시 TS 에러. 해결:
  - 최소 변경: 호출부에 `postType: 'provider'` 명시
  - 대체안: `CreatePostInput.postType`을 optional로 두고 기본값 'provider' 주입 (런타임 안전 우선)
- Design v0.2 선택: **minimal change** — 호출부 수정(컴파일 타임 안전).

### 4.1 `postRepository` 확장 메서드

```ts
export interface PostListOptions {
  limit?: number;               // 기본 20
  cursor?: string;              // 이전 페이지 마지막 post.id
}
export interface PostFilterOptions extends PostListOptions {
  regionLabel?: string;
  category?: QuoteCategory;
}
export interface PostPage {
  posts: Post[];
  nextCursor: string | null;
}

export const postRepository = {
  // ... 기존 5개 ...

  /** 패널 기본 리스트 (인덱스 1 사용)
   *  C2 note: firebase-admin/firestore의 DocumentSnapshot.exists는 **property** (client SDK의 method와 다름).
   *  서버 전용 코드이므로 `snap.exists` (괄호 없음) 사용이 정확. */
  listByType: cache(
    async (type: PostType, opts: PostListOptions = {}): Promise<PostPage> => {
      const { limit = 20, cursor } = opts;
      let q: FirebaseFirestore.Query = col()
        .where('postType', '==', type)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap); // Admin SDK: property
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next = snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return { posts: docs.map((d) => toPost(d.id, d.data())), nextCursor: next };
    },
  ),

  /** region/category 서브필터 (인덱스 2/3 사용) */
  listByTypeFiltered: cache(
    async (type: PostType, opts: PostFilterOptions): Promise<PostPage> => {
      const { limit = 20, cursor, regionLabel, category } = opts;
      let q = col().where('postType', '==', type) as FirebaseFirestore.Query;
      if (regionLabel) q = q.where('regionLabel', '==', regionLabel);
      if (category) q = q.where('categories', 'array-contains', category);
      q = q.orderBy('createdAt', 'desc').limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap);
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next = snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return { posts: docs.map((d) => toPost(d.id, d.data())), nextCursor: next };
    },
  ),

  /** 텍스트 검색 (v1: 클라이언트-서버 하이브리드 — Firestore에서 type 필터 후 인메모리 contains) */
  async searchInType(type: PostType, query: string, limit = 30): Promise<Post[]> {
    if (!query.trim()) return [];
    const snap = await col()
      .where('postType', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(200) // v1: 최근 200건 내 검색, v2에서 Algolia/Elastic 도입 고려
      .get();
    const q = query.toLowerCase();
    return snap.docs
      .map((d) => toPost(d.id, d.data()))
      .filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary80.toLowerCase().includes(q) ||
        p.bodyMarkdown.toLowerCase().includes(q),
      )
      .slice(0, limit);
  },

  /** 슬러그로 조회 (상세 페이지 · 기존 스텁 활성화) */
  findBySlug: cache(async (slug: string): Promise<Post | null> => {
    const snap = await col().where('slug', '==', slug).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toPost(doc.id, doc.data());
  }),

  /** 사이트맵용 — 모든 published posts 스트리밍 (3패널 전체) */
  async listAllForSitemap(): Promise<Post[]> {
    const snap = await col().orderBy('createdAt', 'desc').limit(5000).get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },
};
```

### 4.2 복잡도 분석

| 메서드 | 쿼리 | 인덱스 | 비고 |
|---|---|---|---|
| `listByType` | where+orderBy | (postType, createdAt) | 페이지네이션 정석 |
| `listByTypeFiltered` | 2×where+orderBy | (postType, regionLabel, createdAt) 또는 (postType, categories[], createdAt) | 둘 중 하나 사용 (둘 다는 v1 미지원) |
| `searchInType` | where+orderBy | (postType, createdAt) | 인메모리 200건 필터 · v2에서 외부 검색 |
| `findBySlug` | where+limit1 | (slug) 단일 필드 자동 | 새 인덱스 불필요 |

**v1 제약 명시**: `listByTypeFiltered`는 region OR category 중 하나만. 둘 다 동시 적용은 v2에서 복합(3-way) 인덱스 추가 검토.

---

## 5. AI Pipeline Detail

### 5.1 파일별 책임

- **`story-generator.ts`** — 오케스트레이션, 외부 호출
- **`story-rag.ts`** — 스타일 참조 retrieval 로직
- **`hygiene-guard.ts` (확장)** — markdown 본문 검증 함수 추가
- **API route** — HTTP 계층 (인증·rate limit·업로드·호출·응답)

### 5.2 `POST /api/community/stories/upload` 계약

**Request** (multipart/form-data)
| 필드 | 타입 | 제약 |
|---|---|---|
| `photos` | File[] | 1–5개, 각 ≤5MB, image/jpeg·png·webp |
| `caption` | string? | ≤200자 (optional hint) |

**Preconditions**
- Firebase Auth session cookie 유효 → `uid` 추출
- `checkAndIncrement('story:' + uid, 3, 24 * 60 * 60 * 1000)` 통과
- 업로드 파일 검증 통과

**Response**
- `201 Created` → `{ postId, slug, url: '/community/p/{slug}' }`
- `401 Unauthorized` → 로그인 필요
- `422 Unprocessable` → `{ reason: 'hygiene' | 'validation', message }`
- `429 Too Many` → rate limit
- `504 Gateway Timeout` → 10s 초과 시
- `500` → 기타

**처리 흐름** (C5 — hygiene/타임아웃 실패 시 Storage 정리 경로 포함)
```ts
import { cleanupStoryPhotos } from '@/lib/llm/story-cleanup';

export async function POST(req: Request) {
  const uid = await requireAuthUid(req);
  await checkAndIncrement(`story:${uid}`, 3, 24 * 60 * 60 * 1000);
  const form = await req.formData();
  const photos = validatePhotos(form.getAll('photos'));
  const caption = (form.get('caption') as string | null) ?? null;

  const storyId = nanoid(12);
  const photoUrls = await uploadPhotosToStorage(uid, storyId, photos);

  try {
    const result = await Promise.race([
      generateStoryPost({ uid, storyId, photoUrls, caption }),
      timeout(10_000, '생성 시간이 초과되었습니다'),
    ]);
    revalidatePath('/community/stories');
    revalidatePath(`/community/p/${result.slug}`);
    revalidatePath('/sitemap.xml');
    return Response.json(
      { postId: result.postId, slug: result.slug, url: `/community/p/${result.slug}` },
      { status: 201 },
    );
  } catch (e) {
    // C5: 발행 실패 시 업로드된 Storage 파일 정리
    await cleanupStoryPhotos(uid, storyId).catch((cleanupErr) => {
      console.warn('[stories/upload] cleanup failed', cleanupErr);
    });
    throw e;
  }
}
```

**`story-cleanup.ts`**
```ts
import 'server-only';
import { getStorage } from 'firebase-admin/storage';

export async function cleanupStoryPhotos(uid: string, storyId: string): Promise<void> {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `stories/${uid}/${storyId}/` });
}
```

### 5.3 `story-generator.ts`

```ts
export interface GenerateStoryInput {
  uid: string;
  photoUrls: string[];
  caption: string | null;
}
export interface GenerateStoryResult {
  postId: string;
  slug: string;
  hygieneScore: number;
}

export async function generateStoryPost(input: GenerateStoryInput): Promise<GenerateStoryResult> {
  // 1. Vision: 각 사진 설명 + 태그
  const visionDescs = await Promise.all(
    input.photoUrls.map((url) => describePhotoWithGemini(url)),
  );
  const visionTags = uniq(visionDescs.flatMap((d) => d.tags)).slice(0, 20);

  // 2. RAG: 스타일 참조 포스트 3~5건
  const ragPosts = await retrieveStyleReferences(visionTags, 5);

  // 3. 생성 (Gemini Pro)
  let draft: StoryDraft;
  try {
    draft = await composeStoryDraft({
      visionDescs,
      caption: input.caption,
      styleRefs: ragPosts,
    });
  } catch (e) {
    // RAG 실패·생성 실패 1회 재시도
    draft = await composeStoryDraft({
      visionDescs,
      caption: input.caption,
      styleRefs: [], // fallback: RAG 없이 생성
    });
  }

  // 4. Hygiene
  const hygiene = checkMarkdownHygiene(draft.bodyMarkdown, draft.title, draft.summary80);
  if (hygiene.score < 0.7) {
    throw new AppError('HYGIENE_FAIL', '사진을 다시 선택해 주세요', { reason: hygiene.reasons });
  }

  // 5. 슬러그 생성 + 충돌 해결
  const slug = await uniqueSlug(slugify(draft.title));

  // 6. 저장
  const postId = nanoid(16);
  await postRepository.create(postId, {
    providerId: 'customer',
    providerOwnerUid: input.uid,
    companyName: '청광 고객',
    categories: inferCategories(visionTags),  // 비어있어도 허용 (토픽만 있는 케이스)
    regionLabel: null,
    title: draft.title,
    slug,
    coverImageUrl: input.photoUrls[0] ?? null,
    coverImageAlt: draft.coverImageAlt,
    bodyMarkdown: draft.bodyMarkdown,
    summary80: draft.summary80,
    topicHint: null,
    brandTone: 'friendly',
    postType: 'customer-story',
    sourcePhotos: input.photoUrls,
    generationMeta: {
      model: 'gemini-2.5-pro',
      generatedAt: new Date(),
      ragSourceIds: ragPosts.map((p) => p.id),
      hygieneScore: hygiene.score,
      visionTags,
    },
  });

  return { postId, slug, hygieneScore: hygiene.score };
}

async function uniqueSlug(base: string, tries = 3): Promise<string> {
  for (let i = 0; i < tries; i++) {
    const candidate = `${base}-${nanoid(4)}`;
    if (!(await postRepository.findBySlug(candidate))) return candidate;
  }
  return `${base}-${nanoid(8)}`; // 최종 폴백
}
```

### 5.4 `story-rag.ts`

```ts
export async function retrieveStyleReferences(
  visionTags: string[],
  limit = 5,
): Promise<Post[]> {
  if (visionTags.length === 0) return [];

  // v1: 카테고리 기반 간이 retrieval
  // 1) visionTags → QuoteCategory 힌트 매핑
  const cat = inferCategories(visionTags)[0];

  // 2) 해당 카테고리의 최근 provider posts를 스타일 레퍼런스로 사용
  if (cat) {
    const snap = await adminDb
      .collection('posts')
      .where('postType', '==', 'provider')
      .where('categories', 'array-contains', cat)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  }

  // 3) fallback: 최근 provider posts N건
  const fallbackSnap = await adminDb
    .collection('posts')
    .where('postType', '==', 'provider')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return fallbackSnap.docs.map((d) => toPost(d.id, d.data()));
}
```

**v2 업그레이드 여지**: 임베딩 벡터 기반 유사도 검색 (Vertex AI / Pinecone). v1은 카테고리 기반이 비용 0 + 충분히 쓸만함.

### 5.5 Prompt 템플릿 (개요)

```
System:
당신은 공간·일상 사진을 읽고 SEO 친화적 블로그를 쓰는 한국어 카피라이터입니다.
- 주어진 사진 설명을 바탕으로 자연스러운 500~900자 블로그 본문(markdown)을 작성합니다.
- 사실 지어내지 않습니다. 사진 설명에 없는 상호명·가격·약속은 쓰지 않습니다.
- 친근한 톤(brandTone='friendly')으로 씁니다.
- 제목은 30자 이내, 검색 유입에 유리하게.

User:
[사진 설명]
{visionDescs}

[고객 캡션 힌트] (있을 시)
{caption}

[참고 스타일 (문체만 참고, 내용 복사 금지)]
{styleRefs.map(p => p.summary80 + '...' + p.bodyMarkdown.slice(0, 200)).join('\n---\n')}

출력 JSON:
{ "title": string, "summary80": string, "bodyMarkdown": string, "coverImageAlt": string }
```

**3중 방어 (기존 promo-prompt 패턴 준수)**:
- 시스템 프롬프트에 hygiene 금지어 섹션 주입 (HYGIENE_KEYWORDS 샘플)
- 출력 JSON 스키마 Zod 검증
- 사후 `checkMarkdownHygiene` 필터

### 5.6 `checkMarkdownHygiene` (hygiene-guard.ts 확장)

```ts
import { HYGIENE_KEYWORDS } from '@/domain/constants';

export interface MarkdownHygieneResult {
  score: number;          // [0, 1]
  reasons: string[];      // 위반 키워드 목록
  passed: boolean;        // score >= 0.7
}

const FAKE_BIZ_PATTERNS = [
  /\([가-힣]{2,10}\s?청소\)/g,  // 가짜 업체명 패턴
  /[0-9]{2,4}-[0-9]{3,4}-[0-9]{4}/g, // 전화번호
  /[0-9]{1,3}%\s?할인/g,  // 가짜 할인율
];
const PII_PATTERNS = [
  /[0-9]{6}-[0-9]{7}/g,   // 주민번호
  /[가-힣]{2,4}\s?님/g,    // 호칭 + 이름 패턴
];

export function checkMarkdownHygiene(
  body: string,
  title: string,
  summary: string,
): MarkdownHygieneResult {
  const all = `${title}\n${summary}\n${body}`;
  const reasons: string[] = [];

  for (const kw of HYGIENE_KEYWORDS) {
    if (all.includes(kw)) reasons.push(`hygiene:${kw}`);
  }
  for (const p of FAKE_BIZ_PATTERNS) {
    if (p.test(all)) reasons.push(`fake-biz`);
  }
  for (const p of PII_PATTERNS) {
    if (p.test(all)) reasons.push(`pii`);
  }

  const score = Math.max(0, 1 - reasons.length * 0.25);
  return { score, reasons, passed: score >= 0.7 };
}
```

---

## 6. UI Components

### 6.1 `PanelLayout`

```tsx
// PanelLayout.tsx (server component 가능)
interface PanelLayoutProps {
  panel: 'tips' | 'providers' | 'stories';
  searchQuery?: string;
  regionFilter?: string;
  categoryFilter?: string;
  children: React.ReactNode; // 피드 slot
}

// 구조:
// <div max-w-2xl>
//   <header sticky>
//     <BrandLogo />
//     <h1>{panelConfig.label}</h1>
//     <p>{panelConfig.tagline}</p>
//     <CommunityPanelTabs active={panel} />
//     <PanelSearchBar initial={searchQuery} />
//     <PanelSubFilters region={regionFilter} category={categoryFilter} />
//   </header>
//   <main>{children}</main>
// </div>
```

### 6.2 `CommunityPanelTabs`

- Sticky 아래쪽 (header 내부) · 3개 Link (NextLink)
- ARIA: `role="tablist"`, 각 항목 `role="tab"`, `aria-current="page"` on active
- Tailwind: underline on active · hover transition
- URL navigation: `<Link href={`/community/${panel}`}>`

### 6.3 `PanelSearchBar`

- `<input>` + debounced 400ms → `router.replace` with `?q=`
- URL param 기반 · 서버 컴포넌트가 `searchParams`로 받음
- 빈 문자열 → 파라미터 제거

### 6.4 `PanelSubFilters`

- 지역 chip: 서울/경기 등 주요 지역 6-8개 (정적 리스트)
- 카테고리 chip: `QuoteCategory` 6개
- 단일 선택(one region OR one category) · 둘 다 선택 시 region 우선 (v1 제약)
- URL params: `?region=서울`, `?cat=move-in`

### 6.5 `InfiniteFeedList`

- 커서 기반 (`nextCursor` 사용)
- IntersectionObserver로 하단 감지 → server action 호출 (`loadMorePosts`) → append
- Client component, 초기 데이터는 서버에서 prop으로 주입
- 에러/로딩 상태 표시

### 6.6 `StoryUploadForm`

- `<form>` with `encType="multipart/form-data"`
- `<input type="file" multiple accept="image/*">` 제한: 5개
- 선택된 사진 썸네일 미리보기
- 캡션 `<textarea>` (선택, 200자)
- 제출 시 `<StoryGeneratingState>` 표시 · fetch 후 성공 시 `router.push` to `/community/p/{slug}`
- 에러 시 422/504/500 각각 다른 메시지 표시

---

## 7. SEO Architecture

### 7.1 `panel-config.ts`

```ts
import type { PostType } from '@/types/post';

export interface PanelConfig {
  slug: 'tips' | 'providers' | 'stories';
  postType: PostType;
  label: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;           // /og/panel-tips.png 등 정적 자산
  emptyCopy: { heading: string; body: string; cta?: string };
}

export const PANELS: Record<PanelConfig['slug'], PanelConfig> = {
  tips: {
    slug: 'tips',
    postType: 'tip',
    label: '청소 노하우',
    tagline: '전문가들이 정리한 공간별 청소 팁',
    seoTitle: '청소 노하우 · 청광',
    seoDescription: '욕실·주방·거실·에어컨 등 공간별 청소 팁 모음. 청명 전문가들이 직접 작성했습니다.',
    ogImage: '/og/panel-tips.png',
    emptyCopy: {
      heading: '아직 공개된 노하우가 없어요',
      body: '곧 전문가들이 작성한 청소 팁이 올라올 예정입니다',
    },
  },
  providers: {
    slug: 'providers',
    postType: 'provider',
    label: '청소업체 홍보',
    tagline: '검증된 청명들의 서비스 소개',
    seoTitle: '청소업체 소개 · 청광',
    seoDescription: '인증된 청명 업체들의 서비스 소개와 홍보 글 모음',
    ogImage: '/og/panel-providers.png',
    emptyCopy: {
      heading: '등록된 업체 홍보가 없어요',
      body: '곧 청명 파트너들의 소개글이 올라올 예정입니다',
    },
  },
  stories: {
    slug: 'stories',
    postType: 'customer-story',
    label: '고객 스토리',
    tagline: '실제 공간이 어떻게 변했는지 생생한 이야기',
    seoTitle: '고객 스토리 · 청광',
    seoDescription: '실제 고객이 올린 사진으로 만든 일상·공간 이야기 모음',
    ogImage: '/og/panel-stories.png',
    emptyCopy: {
      heading: '첫 스토리의 주인공이 되어 주세요',
      body: '사진을 올리면 AI가 자동으로 블로그 글을 만들어드립니다',
      cta: '사진 업로드하기',
    },
  },
};
```

> **⚠️ v0.2.1 Reconciliation R7**: 아래 코드 스니펫에 등장하는 `export const revalidate = …`는
> `next.config.ts`의 `cacheComponents: true` 하에서 **금지**되어 v1 구현에서는 모두 제거됨.
> 페이지는 현재 동적 렌더. Phase 5에서 `'use cache'` + `cacheLife()` 기반으로 데이터 레벨 캐싱 재도입 예정.
> `revalidatePath('/path')` 호출은 여전히 유효 (customer-story 발행 시 경로 무효화).

### 7.2 패널 페이지 `generateMetadata`

```ts
// /community/tips/page.tsx (3개 페이지 모두 동일 패턴)
import { PANELS } from '@/lib/feed/panel-config';

export async function generateMetadata(): Promise<Metadata> {
  const cfg = PANELS.tips;
  return {
    title: cfg.seoTitle,
    description: cfg.seoDescription,
    openGraph: {
      title: cfg.label,
      description: cfg.seoDescription,
      images: [cfg.ogImage],
      type: 'website',
      url: `/community/${cfg.slug}`,
    },
    alternates: {
      canonical: `/community/${cfg.slug}`,
      types: { 'application/rss+xml': `/community/${cfg.slug}/rss.xml` },
    },
  };
}

export const revalidate = 300; // 5min ISR
```

### 7.3 `/community/p/[slug]/page.tsx` JSON-LD

```tsx
import { buildArticleJsonLd } from '@/lib/seo/article-jsonld';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await postRepository.findBySlug(slug);
  if (!post) return { title: '포스트를 찾을 수 없어요 · 청광' };
  return {
    title: `${post.title} · 청광`,
    description: post.summary80,
    openGraph: { title: post.title, description: post.summary80, images: post.coverImageUrl ? [post.coverImageUrl] : undefined, type: 'article' },
    alternates: { canonical: `/community/p/${post.slug}` },
  };
}

export const revalidate = 3600; // 1h ISR

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = await postRepository.findBySlug(slug);
  if (!post) notFound();
  const jsonLd = buildArticleJsonLd(post);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PostDetailView post={post} />
      {/* C3: provider/tip 포스트는 기존 info card + CTA 보존, customer-story는 별도 CTA */}
      {(post.postType === 'provider' || post.postType === 'tip') && (
        <ProviderFollowupBlock post={post} />
      )}
      {post.postType === 'customer-story' && <StoryCTABlock />}
    </>
  );
}
```

**H1 — 마크다운 XSS 방지**: `PostDetailView`는 기존 `src/lib/markdown.ts`의 렌더러를 사용. AI 생성 본문은 사용자 입력 대비 추가 위험이 없으나, `sanitize-html`(이미 `package.json`에 존재)을 마크다운 렌더 파이프라인에 통합 필수. `PostDetailView` 내부 검토 포인트:
- `marked` 출력을 `sanitize-html`로 래핑 (허용 태그 allowlist 준수)
- `<script>`, `on*` 이벤트, `javascript:` URL 차단
- 기존 `promo-page` 흐름과 같은 정책 재사용

**C3 — `ProviderFollowupBlock` 명세** (`src/components/community/ProviderFollowupBlock.tsx`)
```tsx
import { providerRepository } from '@/lib/firebase/provider-repository';
import { PostProviderInfoCard } from './PostProviderInfoCard';
import { QuoteCTAButton } from './QuoteCTAButton';
import type { Post } from '@/types/post';

export async function ProviderFollowupBlock({ post }: { post: Post }) {
  const provider = await providerRepository.get(post.providerId);
  if (!provider) return null; // customer 가상 오너 등 예외 방어
  return (
    <>
      <PostProviderInfoCard provider={provider} />
      <QuoteCTAButton providerId={post.providerId} category={post.categories[0] ?? 'move-in'} />
    </>
  );
}
```
→ 기존 `/community/[postId]/page.tsx` 의 provider info/CTA 기능이 신규 `/community/p/[slug]` 에서 동일하게 보존.

### 7.4 `buildArticleJsonLd` (H5 — BASE_URL 헬퍼 기반)

```ts
// src/lib/seo/base-url.ts
import 'server-only';
import { headers } from 'next/headers';

/**
 * Base URL 우선순위:
 *  1. NEXT_PUBLIC_BASE_URL (프로덕션 권장)
 *  2. VERCEL_URL (Vercel 배포 자동)
 *  3. x-forwarded-host / host 헤더 (개발·프리뷰)
 *  4. 하드코드 fallback
 */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return 'https://cheonggwang.example';
}
```

```ts
// src/lib/seo/article-jsonld.ts
import { getBaseUrl } from './base-url';
import type { Post } from '@/types/post';

export async function buildArticleJsonLd(post: Post) {
  const base = await getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary80,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.createdAt.toISOString(),
    author:
      post.postType === 'customer-story'
        ? { '@type': 'Organization', name: '청광 고객' }
        : { '@type': 'Organization', name: post.companyName },
    publisher: {
      '@type': 'Organization',
      name: '청광',
      logo: { '@type': 'ImageObject', url: `${base}/logo.png` },
    },
    mainEntityOfPage: `${base}/community/p/${post.slug}`,
  };
}
```

§7.5 sitemap.ts, §7.6 robots.ts, §7.7 RSS 모두 `getBaseUrl()` 사용으로 교체 (하드코드 `BASE` 상수 제거).

### 7.5 `app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next';
import { postRepository } from '@/lib/firebase/post-repository';
import { PANELS } from '@/lib/feed/panel-config';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cheonggwang.example';
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await postRepository.listAllForSitemap();
  return [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: 'weekly' },
    ...Object.values(PANELS).map((p) => ({
      url: `${BASE}/community/${p.slug}`,
      priority: 0.8,
      changeFrequency: 'daily' as const,
    })),
    ...posts.map((p) => ({
      url: `${BASE}/community/p/${p.slug}`,
      lastModified: p.createdAt,
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    })),
  ];
}
```

### 7.6 `app/robots.ts`

```ts
import type { MetadataRoute } from 'next';
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cheonggwang.example';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/provider/', '/received/', '/admin/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
```

### 7.7 RSS (`[panel]/rss.xml/route.ts`)

```ts
// 동일 패턴 3개 파일 (tips/providers/stories)
import { postRepository } from '@/lib/firebase/post-repository';
import { buildRss2_0 } from '@/lib/seo/rss-builder';
import { PANELS } from '@/lib/feed/panel-config';

export const revalidate = 600;

export async function GET() {
  const cfg = PANELS.tips; // providers/stories 각 파일에서 해당 값
  const { posts } = await postRepository.listByType(cfg.postType, { limit: 50 });
  const xml = buildRss2_0({
    channelTitle: cfg.seoTitle,
    channelLink: `/community/${cfg.slug}`,
    channelDescription: cfg.seoDescription,
    items: posts.map((p) => ({
      title: p.title,
      link: `/community/p/${p.slug}`,
      description: p.summary80,
      pubDate: p.createdAt,
      author: p.postType === 'customer-story' ? '청광 고객' : p.companyName,
    })),
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
```

---

## 8. Sequence Diagrams

### 8.1 패널 로딩 (tips 예시)

```
Browser
  │ GET /community/tips
  ▼
Next.js (ISR 캐시 hit?)
  ├─ hit → return cached HTML
  └─ miss ↓
tips/page.tsx (Server Component)
  │ postRepository.listByType('tip', {limit:20})
  ▼
Firestore (인덱스 1)
  │ 20 docs
  ▼
PanelLayout render + InfiniteFeedList (initial data)
  │ HTML + ISR 캐시 저장 (revalidate=300s)
  ▼
Browser (hydrate)
```

### 8.2 고객 스토리 업로드 + 생성

```
Browser · StoryUploadForm
  │ POST /api/community/stories/upload (multipart)
  ▼
Route handler
  │ ① auth check → uid
  │ ② rate limit (story:uid, 3/24h)
  │ ③ validate files
  │ ④ upload → Storage /stories/{uid}/{storyId}/
  ▼
generateStoryPost (10s race)
  │ Vision (each photo) ─ parallel
  │ story-rag.retrieveStyleReferences (visionTags)
  │ composeStoryDraft (Gemini Pro)
  │ checkMarkdownHygiene
  │   └ fail → throw HYGIENE_FAIL
  │ uniqueSlug
  │ postRepository.create
  ▼
revalidatePath('/community/stories')
revalidatePath('/community/p/{slug}')
revalidatePath('/sitemap.xml')
  │
  ▼
201 { postId, slug, url }
  │
  ▼
router.push('/community/p/{slug}')
```

---

## 9. Error Handling & User-facing Copy

| 코드 | 원인 | 사용자 메시지 |
|---|---|---|
| 401 | 비로그인 업로드 | "업로드하려면 로그인이 필요해요" |
| 413 | 파일 >5MB | "사진은 5MB 이하로 올려주세요" |
| 415 | 지원 안 하는 MIME | "JPG, PNG, WebP 형식만 가능해요" |
| 422 hygiene | hygiene 실패 | "사진을 다시 선택해 주세요" (reason 로그만, 사용자엔 비노출) |
| 429 | rate limit | "오늘은 스토리를 3번 올렸어요. 내일 다시 만나요" |
| 504 | 10s 초과 | "생성이 오래 걸려요. 잠시 뒤 다시 시도해 주세요" |
| 500 | 기타 | "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요" |

hygiene 실패는 사용자에게 상세 이유 비공개 (우회 학습 방지).

---

## 10. Testing Strategy

**Unit (Jest / Vitest 미정, 기존 스타일 따름)**
- `checkMarkdownHygiene` — 18가지 케이스 (clean · 각 패턴별 hit)
- `uniqueSlug` — 충돌 시 재시도 로직
- `toPost` 기본값 — postType 없는 레거시 문서 → 'provider'
- `inferCategories` — 태그 → QuoteCategory 매핑 누락/혼합

**Integration (Zero Script QA)**
- 업로드 플로우: 정상 · 비로그인 · rate limit · hygiene fail · 타임아웃 — Docker 로그 기반 검증
- 패널 이동: `/community` → `/community/tips` redirect 확인
- 레거시 URL: `/community/{oldPostId}` → `/community/p/{slug}` 301
- RSS XML validator 수동 확인 (W3C)
- 사이트맵에 신규 post 즉시 반영 (revalidatePath 효과)

**SEO 확인 (수동)**
- Google Rich Results Test: JSON-LD Article 통과
- Lighthouse SEO 점수 90+
- sitemap.xml · robots.txt 크롤 시뮬레이션

---

## 11. Migration Plan

### 11.1 단계

1. **스키마 확장 + backfill** (배포 전)
   - `types/post.ts`, `post-repository.ts` 수정
   - `firestore.indexes.json` 배포 + 인덱스 빌드 대기 (5-15분)
   - `scripts/backfill-posts-post-type.mjs --apply` 실행
2. **정적 패널 라우트 배포** (읽기 전용, 기능 영향 없음)
   - `/community/tips|providers|stories` 추가
   - `/community/page.tsx` redirect 변경
3. **슬러그 상세 라우트 + 레거시 shim**
   - `/community/p/[slug]` 추가
   - `/community/[postId]` → redirect permanent
4. **Storage rules + AI 파이프라인 배포**
   - `storage.rules` 배포
   - `/api/community/stories/upload` + UI 공개
5. **SEO 자산 배포**
   - sitemap.ts, robots.ts, RSS 3종
   - Google Search Console 재등록

### 11.2 롤백 전략

- 각 단계는 Vercel preview → promote 흐름
- 인덱스는 Firestore에 남아도 무해 (추가 비용만)
- backfill는 `postType` 추가만 하므로 롤백 시 필드 무시됨
- 레거시 [postId] redirect 제거 시 구 URL 복원 가능

---

## 12. Risks & Mitigations (Plan 확장)

| 리스크 | 영향 | 완화 |
|---|---|---|
| 레거시 postId URL이 이미 유통된 경우 | 404 증가 | `[postId]/page.tsx`를 shim으로 영구 유지 · 301 permanent |
| Gemini Pro latency spike | 504 급증 | 10s 상한 · 타임아웃 메시지로 재시도 유도 · v2 백그라운드 큐 |
| hygiene false-positive | 업로드 이탈 | 로그 기반 튜닝 주기 (주 1회 · `lib/llm/story-generator` 로그) |
| 악의적 이미지 (성인·폭력) | 브랜드 손상 | Gemini Vision의 Safety filter enable · hygiene 실패 시 파일 Storage 즉시 삭제 |
| 슬러그 충돌 재시도 실패 | 발행 실패 | nanoid(8) 최종 폴백 · 99.9%+ 성공률 |
| 검색 성능 (200건 인메모리) | 느린 응답 | v1 최근 200건 제한 · 응답 ≤500ms 기대 · v2 외부 검색 |
| 사이트맵 5000건 상한 | 확장성 | v1 충분 · 초과 시 sitemap index 파일 분할 |

---

## 13. Open Questions

### 🔴 Phase 4 (AI 파이프라인) 차단 이슈 — 착수 전 반드시 해소

- [ ] **Gemini Vision Safety filter 정책** — `blockThreshold` 파라미터 결정 (BLOCK_LOW_AND_ABOVE 권장). hygiene 보조 장치로 필수.

### 🟡 v1 출시 전 확정 권장

- [ ] 패널 OG 이미지 3종(`/og/panel-*.png`) 디자인 에셋 준비자 지정
- [ ] 관리자가 customer-story를 삭제할 수 있는지? — v1 scope 밖이지만 Firestore rules 측면 기본 정책 결정 필요 (현재 "write: false" → Admin SDK only)
- [ ] 크론 스케줄링 프로바이더 선택: **Vercel Cron Jobs** (vercel.json에 crons 배열 추가) 또는 **Firebase Scheduled Function** (functions/src/cron.ts에서 HTTP ping) — 현재는 `CRON_SECRET` 설정 완료 · 수동 실행 검증 완료
- [ ] 스크랩북에서 이미 배치 처리 중(`processing`)인 아이템이 크론 실행 도중 중단된 경우(서버 crash 등) 복구 정책 — 현재는 계속 processing 상태로 stuck됨. v1 완성도를 위해 `processedAt + N분 초과` 조건으로 stuck 복구 고려

### ✅ v0.2 이후 해소됨

- ~~`NEXT_PUBLIC_BASE_URL` env 이름 확정~~ → `getBaseUrl()` 헬퍼로 env-less 동작 지원 (§7.4)
- ~~`providerRepository.get('customer')` null 방어~~ → `ProviderFollowupBlock` 내부에서 `if (!provider) return null` 처리 (§7.3)
- ~~기존 코드에 `postType: 'provider'` 명시 호출부 전수 확인~~ → `grep postRepository.create` 결과 **0 hits** (src/scripts 통틀어). Phase 1에서 `CreatePostInput.postType` required로 해도 breakage 없음. (Phase 1 구현 완료)
- ~~H6 — `inferCategories(visionTags)` 매핑 테이블~~ → `src/domain/infer-categories.ts` 생성. 한국어+영어 키워드 ~75개 × 6 카테고리, contains 매칭, 빈 배열 fallback 허용. (v1 구현)
- ~~`inferCategories` 빈 배열 허용 여부~~ → 허용. story-rag.ts는 비어있으면 recent provider posts로 fallback (§5.4).
- ~~Gemini Vision Safety filter 임계~~ → `BLOCK_LOW_AND_ABOVE` (4 카테고리 전부) · story-generator.ts 상수로 고정.
- ~~크론 인증 방식~~ → `Authorization: Bearer $CRON_SECRET` · `/api/cron/generate-stories` (POST/GET 양쪽 허용, Vercel Cron 호환).

---

## 14. Implementation Order (for /pdca do)

Phase 1 — 스키마 & 인프라 (읽기 안전):
1. `types/post.ts` 필드 추가
2. `post-repository.ts` `toPost` 안전판 + 신규 메서드
3. `firestore.indexes.json` 업데이트 + 배포
4. `backfill-posts-post-type.mjs` 작성 + dry-run 검증

Phase 2 — 라우팅:
5. `app/community/page.tsx` redirect로 축소
6. `app/community/tips|providers|stories/page.tsx` 생성 (copy-paste 가능, `PANELS[slug]` 로 분기)
7. `app/community/p/[slug]/page.tsx` 생성
8. `app/community/[postId]/page.tsx` redirect로 변경

Phase 3 — UI 컴포넌트:
9. `panel-config.ts`
10. `PanelLayout` · `CommunityPanelTabs`
11. `PanelSearchBar` · `PanelSubFilters`
12. `InfiniteFeedList` + server action `loadMorePosts`
13. `PanelEmptyState`

Phase 4 — AI 파이프라인:
14. `hygiene-guard.ts` 확장 (+ tests)
15. `lib/llm/story-rag.ts`
16. `lib/llm/story-generator.ts` (+ Gemini 호출 함수)
17. `storage.rules` + 배포
18. `api/community/stories/upload/route.ts`
19. `stories/upload/page.tsx` + `StoryUploadForm` + `StoryGeneratingState`

Phase 5 — SEO:
20. `lib/seo/article-jsonld.ts`
21. `lib/seo/sitemap-builder.ts`, `lib/seo/rss-builder.ts`
22. `app/sitemap.ts`, `app/robots.ts`
23. `community/{panel}/rss.xml/route.ts` × 3
24. `/community/p/[slug]/page.tsx`에 JSON-LD 주입

Phase 6 — 검증:
25. Zero Script QA 시나리오 실행
26. Google Search Console 재등록 + Rich Results Test
27. Lighthouse SEO/A11y 점수 확인

---

**Design v0.1 완료** — Plan v1과의 6개 정합 지점 해소 완료.
다음 단계: `/pdca do community-feed-3panel` 또는 design-validator 검증.

---

## 15. Phase 4.5 — 스크랩북 + 정기 배치 아키텍처 (v0.3 추가)

### 15.1 전환 배경

Plan 원본 §5·§8의 "동기 생성 · 10s 내 즉시 발행" 흐름이 사용자 UX 의도와 다르다는 피드백 수용 (2026-04-22).
새 의도: **"스크랩북 같은 개인 영역에 자료만 쌓아두면 알아서 블로그가 생성되어 공개 커뮤니티에 게시되는"** 수동적 UX.

### 15.2 새 데이터 모델

```
Firestore: storyScrapbook/{itemId}
├─ ownerUid: string                 (본인만 read)
├─ photoUrls: string[]              (1~5개 Storage URL)
├─ storyId: string                  (Storage 경로 키: /stories/{uid}/{storyId}/)
├─ memo: string | null              (고객 옵션 힌트, 200자 이내)
├─ uploadedAt: Timestamp
├─ status: 'pending'|'processing'|'published'|'failed'
├─ batchId: string | null           (크론 배치 ID · stuck 감지용)
├─ processedAt: Timestamp | null
├─ publishedPostId: string | null   (발행 시 posts 문서 id)
├─ publishedSlug: string | null
└─ failureReason: string | null
```

**인덱스**
- `(ownerUid, uploadedAt DESC)` — 고객 본인 스크랩북 조회
- `(status, uploadedAt ASC)` — 크론이 가장 오래된 pending 선점

**Firestore Rules**
```
match /storyScrapbook/{itemId} {
  allow read: if request.auth != null
              && resource.data.ownerUid == request.auth.uid;
  allow write: if false;  // Admin SDK 전용
}
```

### 15.3 API 구조

| 경로 | 메서드 | 동작 |
|------|-------|------|
| `/api/stories/scrapbook` | POST | 인증·rate-limit(5/day)·Storage 업로드·scrapbook pending 생성 |
| `/api/cron/generate-stories` | POST/GET | `CRON_SECRET` Bearer 인증 · 10건 원자적 claim → Gemini 생성 → 발행 |

**크론 배치 흐름**
```
listPending(10) → 각 아이템에 대해:
  claimForProcessing(id, batchId)          # tx: pending → processing
    ✓ → generateStoryPost(photoUrls, memo)
        Vision → RAG → Compose → hygiene
        ✓ markPublished(id, {postId, slug})
        ✗ markFailed(id, reason)
           cleanupStoryPhotos(uid, storyId) [fire-and-forget]
    ✗ skipped (다른 배치가 이미 선점)
published > 0 → revalidatePath('/community/stories')
```

### 15.4 라우트 구조 변경

| 경로 | 역할 | 상태 |
|------|------|------|
| `/stories` (customer layout) | 스크랩북 리스트 + 상태 카드 | 🆕 |
| `/stories/new` | 업로드 폼 | 🆕 |
| `/api/stories/scrapbook` | 업로드 API | 🆕 |
| `/api/cron/generate-stories` | 배치 API | 🆕 |
| `/community/stories/upload` | ~~즉시 생성 UI~~ → 301 → `/stories/new` | shim |
| `/api/community/stories/upload` | ~~동기 생성 API~~ | 🗑 삭제 |
| `/community/stories` (public) | customer-story 패널 (배치 발행 결과 노출) | 유지 |

### 15.5 UI 컴포넌트

- `src/app/(customer)/stories/page.tsx` — 스크랩북 리스트 (인증 필수)
- `src/app/(customer)/stories/new/page.tsx` — 업로드 폼 (인증 필수)
- `src/components/community/stories/ScrapbookItemCard.tsx` — 상태 뱃지(Clock/Loader/CheckCircle/AlertCircle) + 썸네일 + 메모 + 클릭 시 publishedSlug로 이동
- `src/components/community/stories/StoryUploadForm.tsx` — target `/api/stories/scrapbook`, 성공 시 `/stories?uploaded=1`

### 15.6 프록시 보호 확장

`src/proxy.ts` matcher에 `/stories/:path*` 추가 — 비로그인 시 edge-level 307 redirect to `/login?next=...`.

---

## 16. Phase 5 — SEO 완공 (v0.3 추가)

### 16.1 구현 파일

| 파일 | 역할 |
|------|------|
| `src/lib/seo/base-url.ts` | `getBaseUrl()` (env → VERCEL_URL → headers fallback) |
| `src/lib/seo/article-jsonld.ts` | schema.org Article JSON-LD 빌더 |
| `src/lib/seo/rss-builder.ts` | RSS 2.0 XML 직렬화 (외부 의존성 X) |
| `src/components/seo/JsonLdScript.tsx` | `<script type="application/ld+json">` 안전 렌더 (XSS 이스케이프) |
| `src/app/sitemap.ts` | 홈 + 3 패널 + 전 posts (5000 상한) |
| `src/app/robots.ts` | `/` allow + 인증/API 경로 disallow + sitemap URL |
| `src/app/community/{tips,providers,stories}/rss.xml/route.ts` | 패널별 RSS 50건 |

### 16.2 JSON-LD 스펙

`/community/p/[slug]` 에 Article 주입:
```
{ "@context": "https://schema.org", "@type": "Article",
  "headline": post.title, "description": post.summary80,
  "image": [post.coverImageUrl?], "datePublished": createdAt.toISOString(),
  "author": { "@type": "Organization",
              "name": postType==='customer-story' ? '청광 고객' : companyName },
  "publisher": { "@type": "Organization", "name": "청광",
                 "logo": { "@type": "ImageObject", "url": `${base}/favicon.ico` } },
  "mainEntityOfPage": `${base}/community/p/${slug}` }
```
Rich Results Test로 검증 권장.

### 16.3 Robots 정책

```
User-Agent: *
Allow: /
Disallow: /api/ · /provider/ · /received/ · /chat/ ·
         /dashboard/ · /editor/ · /quote/ · /stories/ ·
         /login · /signup-provider
Sitemap: {baseUrl}/sitemap.xml
```

### 16.4 RSS 형식

RSS 2.0 · `channelTitle = panelConfig.seoTitle` · atom:link self 포함 · item당 title/link/guid/pubDate/description/author.
W3C Feed Validator 권장 필드 준수.

---

## 17. Next 16 런타임 특이사항 요약 (v0.3 신규)

Next 16 + Turbopack + `cacheComponents: true` + React 19 조합에서 확인된 주의점:

1. **Route segment `revalidate` 금지** → R7
2. **uncached 데이터 접근은 Suspense 내부 필수** (cookies/headers/DB 포함) → R10
3. **동적 `generateMetadata`가 uncached fetch 사용 시 404 렌더링** → 정적 metadata + React 19 head hoisting 으로 우회 → R10
4. **한국어 동적 세그먼트는 URL-encoded 상태로 전달** → 페이지에서 `decodeURIComponent` 필수 → R9
5. **`'use cache'` + `cacheLife` 디렉티브는 Turbopack dev에서 Firebase Admin SDK와 조합 시 null 반환 관찰** — 추후 검증 필요
6. **Firebase Admin `initializeApp`에 `storageBucket` 누락 시 `bucket()` 실패** — `getStorageBucketName()` 헬퍼로 호출부에서도 명시 전달 → R11
7. **Server Component 내 `<script type="application/ld+json">`은 정상 렌더** (우회 불필요 · 슬러그 디코딩 이슈 해결 후 확인)

**프로덕션 배포 전 검증 필요**:
- `next build` 환경에서 cacheComponents 동작이 dev와 동일한지
- JSON-LD가 Google Rich Results Test 통과하는지
- Vercel 배포 환경에서 한국어 slug URL 자동 디코딩 여부

---

**Design v0.3 완료** — Phase 1+2+4+4.5+5 모든 구현 반영 · Next 16 특이사항 문서화.

