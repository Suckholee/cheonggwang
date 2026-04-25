# Design · partner-promo

**Feature**: 의뢰업체(B2B 파트너) AI 보조 홍보글 게시 — `customer-story` 패널 대체
**Version**: v0.2 (design-validator 응답 반영 — C1–C4 정정 + H1·H2·H3·H4·H6·H7 결의 + OQ-3·OQ-4 결정)
**Level**: Dynamic
**Cycle**: #19 (Marketplace v1.7 · partner-promo)
**Based on**: `docs/01-plan/features/partner-promo.plan.md`
**Inherits constraints from**: `docs/02-design/features/community-feed-3panel.design.md` (R7·R9·R10·R11 등 Next 16/Firebase Admin 제약 그대로 적용)
**Created**: 2026-04-25

---

## 0. Plan vs Design Reconciliation

Plan 문서를 현재 코드/프레임워크 제약과 맞추기 위한 보정.

| # | Plan 지점 | Plan 표현 | Design 실제 | 이유 |
|---|---|---|---|---|
| R1 | Plan §6, §7 라우트 | `/community/partners/page.tsx` | 그대로 | community-feed-3panel R1과 동일 — 정적 세그먼트가 우선 매칭. 충돌 없음 |
| R2 | Plan §6 상세 경로 | `/p/[slug]` 재사용 | **`/community/p/[slug]`** 재사용 (community-feed-3panel R2 그대로) | `/p/[slug]`는 `pages` 컬렉션(promo pages)용. 커뮤니티 글은 이미 `/community/p/[slug]` 표준 |
| R3 | Plan §5.5 Storage 경로 | `/partners/{uid}/{nanoid}/{i}.jpg` | **`/partners/{uid}/{postId}/{fileName}`** · 5MB · jpeg/png/webp | 기존 `storage.rules` 3-세그먼트 관례 + 사이즈/MIME 정책 통일 (`/photos`, `/quote-photos`, `/profile-images`, `/work-photos`, `/stories` 모두 동일) |
| R4 | Plan §5.4 rules `posts.publishStatus` | 일반 텍스트 | **rules `write`는 그대로 false 유지** (Admin SDK 독점) · `read`만 publishStatus 분기 추가 | community-feed-3panel과 동일하게 모든 쓰기는 Route Handler 경유 — 클라이언트 직접 쓰기 봉쇄 |
| R5 | Plan §5.1 `Post.publishStatus` 필수 | 모든 문서가 필수 | **`toPost` 매핑에서 missing → `'published'` 기본값** (레거시 `provider`/`tip` 글 호환). 신규 쓰기는 항상 명시 | 기존 posts 문서 호환. 별도 backfill 없이도 깨짐 없음 |
| R6 | Plan §6 캐싱 | `revalidate=300/3600` | **사용 불가** — `next.config.ts`의 `cacheComponents: true`가 segment-level `revalidate` 금지 (community-feed-3panel R7과 동일 런타임 에러). 동적 렌더 + 데이터 레이어에서 `cacheLife()` 검토 (Phase 5에서 결정) | Next 16 + cacheComponents 제약 |
| R7 | Plan §8 동기 생성 | 3–8s 목표 | 동일 · 상한 10s · 1 retry · timeout 시 504 + Storage 파일 cleanup | 사용자 hang 방지 |
| R8 | Plan §6 `/community/stories` redirect | redirect 추가 | **`/community/stories/page.tsx`를 redirect로 교체** + `/community/stories/upload/`도 redirect (둘 다 308 permanent → `/community/partners`) | 기존 SEO·외부 링크 유지 |
| R9 | Plan §6 `/partner` 영역 | 한 줄 언급 | **`requirePartner` 가드 + middleware 또는 layout 패턴 명시** (Server Component layout에서 `requirePartner()` 호출 → 미충족 시 `redirect('/login?next=/partner/posts')`) | 보호 영역의 일관된 가드 |
| R10 | Plan §5.2 `partners.autoPublish` 디폴트 | 객체 중첩 | **CLI 발급 시 디폴트 `{enabled: false, weekdays: [], startMinute: 0, endMinute: 0, timezone: 'Asia/Seoul'}` 강제 set** (undefined 방지). `toPartner` 매핑에서도 missing → 기본값 채움 | autoPublish는 `enabled=false` 의미적 안전 디폴트 — 명시적 옵트인 강제 |
| R11 | Plan § 없음 | — | **Firebase Admin Storage 호출 시 `getStorageBucketName()` 헬퍼로 bucket 명시** (community-feed-3panel R11과 동일) | 멀티 인스턴스 시 안전 |
| R12 | Plan § 없음 | — | **`hygiene-guard.ts`의 `checkMarkdownHygiene`을 그대로 재사용** + partner-promo 전용 추가 패턴(`PARTNER_PROMO_PATTERNS`)을 같은 파일에 추가 (`/(최저가|업계 1위|만족도 100%)/` 등) — score 계산 로직 공유 | 공통 함수 분기 — 재사용성 + 일관 |
| R13 | Plan § 없음 | — | **`/api/partner/posts` 응답 구분**: autoPublish 결정 결과에 따라 `status: 'draft' | 'published'`를 응답에 포함 → 클라이언트가 분기(편집 페이지로 vs `/p/${slug}`로) | UX — "지금 발행됐습니다" 안내와 즉시 공유 가능 |

**모든 변경은 실제 코드/프레임워크와의 정합 목적 · Plan의 의도 왜곡 없음.**

---

## 1. File Inventory

### 1.1 신규 파일 (22)

**Domain & Infra (5)**
| 경로 | Role |
|---|---|
| `src/types/partner.ts` | `Partner`, `PartnerStatus`, `AutoPublishConfig` 인터페이스 |
| `src/lib/firebase/partner-repository.ts` | `getById` · `getByOwnerUid` · `setStatus` · `updateAutoPublish` · `appendEvent` (서브컬렉션 events 기록) |
| `src/lib/llm/partner-promo-generator.ts` | story-generator 골격 재구성. `generatePartnerPromoDraft` — **저장하지 않고** draft 객체만 반환 (저장은 API handler 책임) |
| `src/lib/llm/partner-promo-rag.ts` | story-rag 재구성. `retrievePartnerStyleReferences(tags, limit)` — **published** + `partner-promo`/`provider` 글에서 스타일 참조 검색 |
| `src/lib/partner/auto-publish-window.ts` | `isInAutoPublishWindow(cfg, now=Date)` (KST), `validateAutoPublishConfig(cfg)` (zod), `nextAutoPublishWindow(cfg, now)` → `{ startsAt: Date \| null, endsAt: Date \| null }` (UI 표시용 — L3) |

**Auth Guards (1)**
| 경로 | Role |
|---|---|
| `src/lib/auth/require-partner.ts` | **두 함수 export (M1)**: `requirePartnerPage(): Promise<Partner>` — 미충족 시 `redirect('/login?next=...')` 또는 `redirect('/')` (Server Component layout 전용). `requirePartnerApi(): Promise<Partner>` — 미충족 시 `throw new AppError('UNAUTHENTICATED'\|'FORBIDDEN')` (Route Handler 전용). 내부적으로 공통 `loadActivePartner(uid)` 헬퍼 사용 |

**UI Components (4)**
| 경로 | Role |
|---|---|
| `src/components/partner/PartnerPromoDraftForm.tsx` | 사진 1~5 + 키워드/슬로건 + brandTone → `POST /api/partner/posts` 트리거. autoPublish 윈도우 내면 안내 배너 노출 |
| `src/components/partner/PartnerPromoEditor.tsx` | 마크다운 textarea + 제목·요약·커버Alt 편집 + 발행/철회 버튼. 별도 markdown 미리보기는 v2 |
| `src/components/partner/PartnerPostsList.tsx` | 본인 글 목록. status 그룹(draft / published / withdrawn) 분리 표시 |
| `src/components/partner/AutoPublishSettings.tsx` | 요일 체크박스(7) + 시작/종료 시간 picker(15분 단위) + Enable 토글 → `PATCH /api/partner/settings` |

**Routes — Pages (7)**
| 경로 | Role |
|---|---|
| `src/app/community/partners/page.tsx` | 공개 패널 (정적 세그먼트, R1) — `published` 글만 노출 |
| `src/app/community/partners/rss.xml/route.ts` | partners 패널 RSS 2.0 (최신 50, `published`만) |
| `src/app/partner/layout.tsx` | `requirePartner()` 가드 + 공통 nav 헤더 (Server Component layout) |
| `src/app/partner/posts/page.tsx` | 본인 글 대시보드 |
| `src/app/partner/posts/new/page.tsx` | 초고 생성 폼 |
| `src/app/partner/posts/[postId]/edit/page.tsx` | 초고/발행글 편집 |
| `src/app/partner/settings/page.tsx` | autoPublish 설정 |

**Routes — API (4)**
| 경로 | Role |
|---|---|
| `src/app/api/partner/posts/route.ts` | `POST` — 사진+키워드 → AI 초고 → autoPublish 분기 저장 |
| `src/app/api/partner/posts/[postId]/route.ts` | `PATCH` — 본문 수정 · `DELETE` — draft 삭제(+Storage cleanup) |
| `src/app/api/partner/posts/[postId]/publish/route.ts` | `POST` — `{ action: 'publish' \| 'withdraw' }` 전이 + revalidatePath |
| `src/app/api/partner/settings/route.ts` | `PATCH` — autoPublish 설정 갱신 |

**Operator (1)**
| 경로 | Role |
|---|---|
| `scripts/issue-partner.ts` | 운영진 CLI: `pnpm tsx scripts/issue-partner.ts --uid=... --businessName=... [--region=...] [--category=...] [--dry-run]` |

### 1.2 수정 파일 (11)

| 경로 | 변경 |
|---|---|
| `src/types/post.ts` | `PostType`: `customer-story` 제거, `partner-promo` 추가 · `PublishStatus` 신규 export · `Post.publishStatus` 필수 · `StoryGenerationMeta` → `PromoGenerationMeta` 리네임 + `keywordsHint` 추가. `ProviderStoryCategory`는 그대로(provider 패널 서브카테고리) |
| `src/lib/firebase/post-repository.ts` | `toPost`에서 `postType` narrowing(`'tip'\|'partner-promo' → that, else 'provider'`) · `publishStatus` 매핑(missing → `'published'`, R5) · 신규 메서드: `listByTypeAndStatus`, `listMyPosts`, `updateDraft`, `setPublishStatus` · 기존 `listByType`은 내부에서 `publishStatus='published'` 고정 호출로 위임 |
| `src/lib/feed/panel-config.ts` | `PanelSlug`: `'stories'` → `'partners'` · `PANELS.partners` 신규 · `PANEL_ORDER` 재정렬 · `tips` `providers` 항목 보존. `tips` `providers`는 그대로 |
| `src/lib/llm/hygiene-guard.ts` | `PARTNER_PROMO_PATTERNS` (자체 광고 과장 표현) 추가. `checkMarkdownHygiene`에 선택적 4번째 파라미터 `opts?: { postType?: PostType }` 추가 — 호출 시 `postType: 'partner-promo'`이면 추가 패턴 적용. 신규 generator만 호출 (기존 `story-generator` 삭제). 기본 시그니처 변경 아님(positional 3-arg 호환) |
| `src/lib/seo/article-jsonld.ts` | `partner-promo` 분기: `author = { '@type': 'Organization', name: post.companyName }` (= partners.businessName 동기 저장값). `customer-story` 분기 제거 |
| `src/app/community/p/[slug]/page.tsx` | `publishStatus !== 'published'` 시 본인+admin만 접근, 그 외 `notFound()`. 본인/admin 미리보기 모드에서는 상단 배너 표시 |
| `src/app/sitemap.ts` | `published` 필터 추가 (모든 postType 공통) · `/community/partners` 엔트리 포함 |
| `src/app/community/page.tsx` | redirect 그대로 `/community/tips` |
| `src/app/community/stories/page.tsx` | **redirect로 교체** (308 → `/community/partners`) — 파일 삭제하지 않고 한 줄 redirect만 (R8, SEO 호환) |
| `firestore.rules` | `posts` read 룰을 publishStatus 기반으로 추가 분기 · `partners` 신규 컬렉션 룰 · `partners/{partnerId}/events` 서브컬렉션 룰 |
| `firestore.indexes.json` | `(postType, publishStatus, createdAt DESC)` 추가 · `(providerOwnerUid, createdAt DESC)` 추가 · 기존 `(postType, createdAt DESC)` 단일 인덱스는 호환 위해 유지 (drop은 별도 운영 작업) |
| `storage.rules` | `/partners/{uid}/{postId}/{fileName}` 블록 추가 (read public, write auth+본인+5MB+image MIME) — 기존 `/stories/...` 블록은 v1.7 마이그레이션 완료 후 제거 (Open Question OQ-2) |

### 1.3 삭제 / 이전 파일 (Phase 8에서 일괄 정리)

**삭제 (5)**
| 경로 | 사유 |
|---|---|
| `src/lib/llm/story-generator.ts` | partner-promo-generator로 대체 |
| `src/lib/llm/story-rag.ts` | partner-promo-rag로 대체 |
| `src/lib/llm/story-cleanup.ts` | 사용처를 partner 영역으로 흡수 (`cleanupPartnerPostPhotos(uid, postId)` 신규 함수로 신규 generator/route 핸들러에서 호출) |
| `src/app/community/stories/upload/**` | partner 작성 흐름은 `/partner/posts/new`만 사용 (404로 떨어뜨림) |
| `src/components/community/stories/StoryUploadForm.tsx` | 동일 사유 |

**리네임 (1)**
| From | To | 사유 |
|---|---|---|
| `src/components/community/stories/StoryGeneratingState.tsx` | `src/components/partner/PartnerPromoGeneratingState.tsx` | 사진 업로드 후 생성 중 스피너 — UI 동일, 의존성 없음. 신규 P6에서 import 경로만 갱신 |

**Redirect만 추가 (2)** — 파일 자체는 유지하고 본문을 `redirect()` 한 줄로 교체
| 경로 | 동작 |
|---|---|
| `src/app/community/stories/page.tsx` | 308 → `/community/partners` (R8) |
| `src/app/community/stories/rss.xml/route.ts` | 308 → `/community/partners/rss.xml` (구독자 호환) |

---

## 2. Data Model

### 2.1 `Post` 스키마 변경 (`src/types/post.ts`)

```ts
// v1.7 partner-promo: customer-story 제거 + publishStatus 도입
export type PostType = 'tip' | 'provider' | 'partner-promo';
export type PublishStatus = 'draft' | 'published' | 'withdrawn';

export interface PromoGenerationMeta {
  model: string;
  generatedAt: Date;
  ragSourceIds: string[];
  hygieneScore: number;
  visionTags: string[];
  keywordsHint: string[];          // NEW — 파트너 입력 키워드 보존
}

export interface Post {
  id: string;
  providerId: string;              // partner-promo: `partner:${partnerId}`
  providerOwnerUid: string;        // partner-promo: 작성자 uid
  companyName: string;             // partner-promo: partners.businessName 스냅샷
  categories: QuoteCategory[];
  regionLabel: string | null;      // partners.regionLabel 스냅샷 (생성 시점)
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  bodyMarkdown: string;
  summary80: string;
  topicHint: string | null;
  brandTone: BrandTone;
  createdAt: Date;
  updatedAt: Date;                 // NEW — 수정 시각 (정렬·캐시 무효화)
  publishedAt: Date | null;        // NEW — 발행 시각 (sitemap·RSS pubDate)

  postType: PostType;
  publishStatus: PublishStatus;    // NEW — 필수
  storyCategory?: ProviderStoryCategory;  // provider 패널 전용 (현행 유지)

  sourcePhotos?: string[];
  generationMeta?: PromoGenerationMeta;
  isSample?: boolean;
}
```

**`toPost` narrowing 갱신**:
```ts
const rawType = d.postType as string | undefined;
const postType: PostType =
  rawType === 'tip' || rawType === 'partner-promo' ? rawType : 'provider';

const rawStatus = d.publishStatus as string | undefined;
const publishStatus: PublishStatus =
  rawStatus === 'draft' || rawStatus === 'withdrawn' ? rawStatus : 'published';  // R5

const updatedAt = tsToDate(d.updatedAt as Timestamp | undefined) ?? createdAt;
const publishedAt =
  d.publishedAt ? tsToDate(d.publishedAt as Timestamp) :
  (publishStatus === 'published' ? createdAt : null);
```

### 2.2 `Partner` 스키마 (`src/types/partner.ts`, 신규)

```ts
export type PartnerStatus = 'invited' | 'active' | 'suspended';

export interface AutoPublishConfig {
  enabled: boolean;
  weekdays: number[];              // 0=Sun..6=Sat
  startMinute: number;             // [0..1439]
  endMinute: number;               // [1..1440], startMinute < endMinute
  timezone: 'Asia/Seoul';
}

export const DEFAULT_AUTO_PUBLISH: AutoPublishConfig = {
  enabled: false,
  weekdays: [],
  startMinute: 0,
  endMinute: 0,
  timezone: 'Asia/Seoul',
};

export interface Partner {
  id: string;
  ownerUid: string;
  businessName: string;
  logoUrl: string | null;
  category: QuoteCategory | null;
  regionLabel: string | null;
  status: PartnerStatus;
  autoPublish: AutoPublishConfig;
  issuedAt: Date;
  issuedBy: string;                 // 운영진 식별자 (CLI에서 process.env.OPERATOR_NAME 또는 --by 인자)
  notes: string | null;
}
```

`partners/{partnerId}/events/{eventId}` 서브컬렉션 (S4 hygiene 모니터링):

```ts
export type PartnerEvent =
  | { type: 'auto-published'; postId: string; hygieneScore: number; decidedAt: Date }
  | { type: 'draft-saved'; postId: string; hygieneScore: number; reason: 'auto-disabled' | 'out-of-window' | 'hygiene-fail' | 'manual'; decidedAt: Date }
  | { type: 'publish-toggled'; postId: string; from: PublishStatus; to: PublishStatus; decidedAt: Date }
  | { type: 'status-changed'; from: PartnerStatus; to: PartnerStatus; by: string; decidedAt: Date };
```

### 2.3 Firestore 복합 인덱스 (`firestore.indexes.json`)

신규:

| # | collection | fields |
|---|---|---|
| 1 | posts | `postType ASC`, `publishStatus ASC`, `createdAt DESC` |
| 2 | posts | `postType ASC`, `publishStatus ASC`, `regionLabel ASC`, `createdAt DESC` |
| 3 | posts | `postType ASC`, `publishStatus ASC`, `categories ARRAY_CONTAINS`, `createdAt DESC` |
| 4 | posts | `providerOwnerUid ASC`, `createdAt DESC` (본인 글 목록) |

기존 `(postType, createdAt DESC)` 단일은 백워드 호환 위해 유지 (drop은 운영 작업).

**IN-query 정책 (V1)**: Firestore `where('postType','in',[...])`는 각 값마다 별도 쿼리로 **언롤링**된다 — 인덱스 #1·#2가 각각 `partner-promo`·`provider`에 대해 동일 쿼리 플랜으로 활용된다. 그러나 **v1은 IN을 사용하지 않고**, `partner-promo-rag`는 기존 `story-rag.ts:51-67`처럼 `partner-promo`/`provider`에 대해 **두 개의 평행 쿼리**를 실행 후 합집합·정렬한다 (인덱스 보장 단순화 + Firestore 비용 최소화 — H7 결의).

### 2.4 Firestore Rules (`firestore.rules`)

```
match /posts/{postId} {
  allow read:
       resource.data.publishStatus == 'published'
    || (request.auth != null && request.auth.uid == resource.data.providerOwnerUid)
    || (request.auth != null && request.auth.token.admin == true);
  allow write: if false;   // Admin SDK only (community-feed-3panel R4와 동일)
}

match /partners/{partnerId} {
  allow read:
       (request.auth != null && request.auth.uid == resource.data.ownerUid)
    || (request.auth != null && request.auth.token.admin == true);
  allow write: if false;

  match /events/{eventId} {
    allow read:
         (request.auth != null && request.auth.uid == get(/databases/$(database)/documents/partners/$(partnerId)).data.ownerUid)
      || (request.auth != null && request.auth.token.admin == true);
    allow write: if false;
  }
}
```

### 2.5 Storage Rules (`storage.rules`)

신규 블록:

```
match /partners/{uid}/{postId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/(jpeg|png|webp)');
}
```

기존 `/stories/{uid}/{storyId}/{fileName}` 블록 — 마이그레이션 완료 후 제거 (OQ-2).

---

## 3. Architecture & Data Flow

### 3.1 작성 흐름 (Auto-publish 분기 포함)

```
[Partner] /partner/posts/new
   PartnerPromoDraftForm
     사진 1~5 (jpeg/png/webp ≤5MB each, total ≤25MB)
     + 키워드 ≤5 + 슬로건? + brandTone? (default 'friendly')

         │ multipart/form-data
         ▼
POST /api/partner/posts
   ├─ requirePartner(uid)            — partners.status === 'active' 확인
   ├─ rate-limit: checkAndIncrement(`partner:${uid}`, 3, 86_400_000)  // 3건/일
   ├─ validate: file count 1..5, size·MIME 검증, 키워드 ≤5 (각 ≤30자)
   │
   ├─ try {                                                  ← H2: 업로드 이후 모든 실패 경로에 cleanup 보장
   ├─   Storage 업로드 → /partners/{uid}/{newPostId}/{slug-i.ext}
   ├─   AI 파이프라인 (partner-promo-generator):
   │    Vision (병렬) → tags 합집합
   │    partner-promo-rag(tags) → published partner-promo/provider 3~5건
   │    Compose (Gemini Pro, B2B 프롬프트) → { title, summary80, bodyMarkdown, coverImageAlt }
   │    checkMarkdownHygiene(body, title, summary, { postType: 'partner-promo' })
   │      pass(score ≥ 0.7) → continue
   │      fail              → cleanupPartnerPostPhotos · 422 { reason }
   ├─ slug = uniqueSlug(title)
   ├─ autoPublish 분기:
   │    isInAutoPublishWindow(partners.autoPublish, now)
   │      && hygiene.passed
   │      → publishStatus = 'published', publishedAt = now
   │      → revalidatePath('/community/partners', '/community/p/${slug}', '/sitemap.xml')
   │      → events.add({type:'auto-published', postId, hygieneScore})
   │    else
   │      → publishStatus = 'draft', publishedAt = null
   │      → events.add({type:'draft-saved', reason: !cfg.enabled?'auto-disabled':!inWindow?'out-of-window':'hygiene-fail', postId, hygieneScore})
   ├─   posts.create + (autoPublish시) revalidatePath
   ├─ } catch (err) {
   ├─   await cleanupPartnerPostPhotos(uid, newPostId)       ← Vision/Compose/Hygiene/Slug/Firestore 어떤 실패든
   ├─   throw err
   ├─ }
   └─ 응답:
        201 { postId, slug, status: publishStatus, url: status==='published' ? `/community/p/${slug}` : `/partner/posts/${postId}/edit` }
```

### 3.2 편집·발행·철회

```
PATCH /api/partner/posts/[postId]
   ├─ requirePartner(uid) + 본인 글 검증 (post.providerOwnerUid === uid)
   ├─ 허용 필드(zod 스키마): title (≤80), summary80 (≤120), bodyMarkdown (≤6000), coverImageUrl, coverImageAlt (≤80), brandTone
   ├─ updatedAt = serverTimestamp
   └─ if publishStatus === 'published': revalidatePath('/community/p/${slug}', '/community/partners')

DELETE /api/partner/posts/[postId]
   ├─ requirePartner + 본인 + publishStatus === 'draft'만 허용
   ├─ posts.delete                                           ← H6: Firestore 먼저 (소스 오브 트루스)
   └─ cleanupPartnerPostPhotos(uid, postId)                  ← Storage는 best-effort (실패 시 로그만, 글은 이미 삭제됨)

POST /api/partner/posts/[postId]/publish
   ├─ body: { action: 'publish' | 'withdraw' }
   ├─ 전이 검증:
   │    publish:  draft → published, withdrawn → published
   │    withdraw: published → withdrawn
   │    그 외 conflict → 409
   ├─ 트랜잭션 내 status 전이 + publishedAt 정책:
   │    draft → published      : publishedAt = serverTimestamp (최초 공개)
   │    withdrawn → published  : publishedAt = serverTimestamp **재발급** (RSS pubDate·SEO freshness 위해 — H1 결의)
   │    published → withdrawn  : publishedAt 보존 (감사 로그)
   ├─ events.add({type:'publish-toggled', from, to, postId})
   └─ revalidatePath('/community/p/${slug}', '/community/partners', '/sitemap.xml')
```

### 3.3 공개 노출

```
GET /community/partners
  ├─ postRepository.listByTypeAndStatus('partner-promo', 'published', {limit:20, cursor})
  └─ InfiniteFeedList → PostFeedCard (sourcePhotos[0] 또는 coverImageUrl)

GET /community/p/[slug]
  ├─ slug = decodeURIComponent(params.slug)         // R9 (community-feed-3panel)
  ├─ post = postRepository.findBySlug(slug)
  ├─ if !post → notFound()
  ├─ if post.publishStatus !== 'published':
  │    if request.auth.uid === post.providerOwnerUid → render with "미리보기 (draft/withdrawn)" 배너
  │    elif admin → render with admin 배너
  │    else → notFound()
  ├─ JSON-LD Article (article-jsonld) — author = post.companyName
  └─ ProviderFollowupBlock 미노출 (partner-promo는 견적 CTA 부적절)
```

### 3.4 권한 매트릭스

| Actor | /community/partners | /community/p/[slug] (published) | /community/p/[slug] (draft·withdrawn) | /partner/* | /api/partner/* |
|---|---|---|---|---|---|
| Anonymous | ✓ | ✓ | 404 | login redirect | 401 |
| Logged-in (no partner) | ✓ | ✓ | 404 | 403 | 403 |
| Active partner (본인 외) | ✓ | ✓ | 404 | dashboard | own posts only |
| Active partner (본인) | ✓ | ✓ | preview 모드 | dashboard | full |
| Admin | ✓ | ✓ | preview 모드 | (use as reader) | (CLI/admin route, OOS) |

---

## 4. AI Pipeline · `partner-promo-generator.ts`

### 4.1 시그니처 — 저장 책임 분리 (story-generator와의 차이)

```ts
export interface GeneratePartnerPromoInput {
  uid: string;
  partnerId: string;
  postId: string;                  // pre-allocated nanoid(16) (Storage 경로와 일관)
  photoUrls: string[];             // /partners/{uid}/{postId}/{name}.ext
  keywords: string[];              // 0..5
  slogan: string | null;
  brandTone: BrandTone;
}

export interface PartnerPromoDraft {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt: string;
  visionTags: string[];
  ragSourceIds: string[];
  hygieneScore: number;
  passed: boolean;
  reasons: string[];               // hygiene fail 사유
}

export async function generatePartnerPromoDraft(
  input: GeneratePartnerPromoInput
): Promise<PartnerPromoDraft>;
```

저장은 `/api/partner/posts` 핸들러가 수행 — autoPublish 분기 + companyName 스냅샷 등 컨텍스트 결합 책임 분리.

### 4.2 Compose 프롬프트 (B2B 파트너 광고 톤)

```
[비전 설명 블록]
사진 1: 캡션·태그
...
사진 N: 캡션·태그

[파트너 입력]
- 매장/서비스명: {businessName}
- 키워드: {keywords.join(', ')}
- 슬로건: {slogan ?? '없음'}
- brandTone: {brandTone}

[참고 문체 — 톤만 참고, 내용 복사 금지]
{ragRefs[].summary80}

위 사진 설명과 입력만 근거로 자연스러운 한국어 홍보 블로그 글을 쓰세요.
규칙:
- 사진에 없는 가격·전화번호·할인율을 지어내지 않습니다 (FAKE_BUSINESS_PATTERNS 위반 시 재생성).
- 자기 매장 상호명({businessName})은 자연스럽게 1~2회 언급.
- 청광·경쟁업체 직접 언급 금지.
- "최저가", "업계 1위", "만족도 100%" 등 단정 광고 표현 금지.
- 800-1200자 한국어 본문 (markdown — h2/h3/p/ul/li/strong 허용).
- 결과를 JSON으로 반환.
```

### 4.3 hygiene 추가 패턴 (`hygiene-guard.ts` 확장)

```ts
const PARTNER_PROMO_PATTERNS: readonly RegExp[] = [
  /(최저가|최저\s?가격)/,
  /(업계\s?1위|업계\s?최고)/,
  /(만족도\s?100\s?%|100\s?%\s?보장)/,
  /(절대\s?(?:실패|후회)\s?없)/,
];

export function checkMarkdownHygiene(
  body: string,
  title: string,
  summary: string,
  opts?: { postType?: PostType },
): MarkdownHygieneResult {
  // 기존 KEYWORDS + FAKE_BUSINESS + PII 검사
  // + partner-promo이면 PARTNER_PROMO_PATTERNS 적용 (each match → reasons.push('promo-overclaim'), -0.25)
}
```

### 4.4 RAG (`partner-promo-rag.ts`)

```ts
export async function retrievePartnerStyleReferences(
  visionTags: string[],
  limit = 5,
): Promise<Post[]> {
  // 두 개의 평행 쿼리 (H7):
  //   q1 = posts.where(postType=='provider', publishStatus=='published').orderBy(createdAt DESC).limit(30)
  //   q2 = posts.where(postType=='partner-promo', publishStatus=='published').orderBy(createdAt DESC).limit(30)
  // → 합집합 + 태그 overlap 점수 산정 → top-{limit}
}
```

빈 결과 시 빈 배열 반환 — generator는 fallback (RAG 없이 compose).

**RAG starvation 방지 정책 (H3 결의)**:
- v1 출시 직후에는 `partner-promo` published 글이 0이라 RAG는 사실상 `provider` 글만 사용 — 의도된 동작 (provider 톤이 B2B 광고 톤에 가까움)
- partner-promo 글이 누적된 후에도 **`provider` 우선 가중치 적용**: 합집합에서 같은 태그 overlap 점수일 때 `provider` 글을 먼저 채택. 점수 식: `score = tagOverlap + (postType==='provider' ? 0.1 : 0)`
- self-referential drift 방지: 자기 자신(`partnerId`)이 작성한 글은 RAG에서 제외 (`where('providerOwnerUid', '!=', uid)` — 클라이언트 사이드 필터)
- v2: hand-curated 마커(예: `editedByPartner: boolean`) 도입 후 자동발행 글은 RAG 풀에서 제외 검토

---

## 5. Auto-Publish Window

### 5.1 판정 로직

```ts
// src/lib/partner/auto-publish-window.ts
import type { AutoPublishConfig } from '@/types/partner';

export function isInAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): boolean {
  if (!cfg.enabled) return false;
  if (cfg.weekdays.length === 0) return false;

  // KST 변환 (timezone: 'Asia/Seoul' 고정 — v1)
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = kst.getDay();                                  // 0..6
  if (!cfg.weekdays.includes(day)) return false;

  const minute = kst.getHours() * 60 + kst.getMinutes();     // 0..1439
  return minute >= cfg.startMinute && minute < cfg.endMinute; // [start, end)
}
```

자정 넘김(예: 22:00–02:00)은 v1 미지원 — 설정 검증에서 `endMinute > startMinute` 강제.

### 5.2 검증 (`validateAutoPublishConfig`)

```ts
import { z } from 'zod';

export const autoPublishConfigSchema = z.object({
  enabled: z.boolean(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  timezone: z.literal('Asia/Seoul'),
}).superRefine((cfg, ctx) => {
  if (cfg.startMinute >= cfg.endMinute) {
    ctx.addIssue({ code: 'custom', message: '시작 시간은 종료 시간보다 빨라야 합니다' });
  }
  if (cfg.enabled && cfg.weekdays.length === 0) {
    ctx.addIssue({ code: 'custom', message: '활성화하려면 최소 1일은 선택해 주세요' });
  }
});
```

15분 단위 강제는 UI에서 처리 (서버는 분 단위 정수만 검증 — 단순 유연성 우선).

### 5.3 단위 테스트 케이스 (`__tests__/auto-publish-window.test.ts`)

| Case | Input | Expected |
|---|---|---|
| disabled | `enabled:false`, 어떤 시간이든 | `false` |
| empty weekdays | `enabled:true, weekdays:[]` | `false` |
| outside weekday | `weekdays:[1,2,3,4,5]`, now=일요일 | `false` |
| inside window | `weekdays:[1]`, 09:00–18:00, now=월 12:00 KST | `true` |
| at start | now=09:00 KST | `true` (`>=`) |
| at end | now=18:00 KST | `false` (`<`) |
| just before end | now=17:59 KST | `true` |
| UTC vs KST | UTC 03:00 → KST 12:00 (월) → window | `true` |
| KST midnight edge | now=00:00 KST 월 (window 00:00-23:59) | `true` |

---

## 6. API Contracts

### 6.1 `POST /api/partner/posts` — 초고 생성

**Request** (`multipart/form-data`):
- `photos`: File[] (1..5, 각 ≤5MB jpeg/png/webp, **총 ≤25MB** — M2 결의: per-file 5MB×5 정합)
- `keywords`: string[] (0..5, 각 ≤30자, JSON-encoded)
- `slogan?`: string (≤40자)
- `brandTone?`: 'friendly' | 'professional' | 'playful' (default 'friendly')

**Validation (zod)**:
```ts
const requestSchema = z.object({
  photos: z.array(z.instanceof(File)).min(1).max(5),
  keywords: z.array(z.string().max(30)).max(5),
  slogan: z.string().max(40).optional(),
  brandTone: z.enum(['friendly','professional','playful']).optional().default('friendly'),
});
```

**Response 201**:
```json
{
  "postId": "...",
  "slug": "...-abcd",
  "status": "draft" | "published",
  "url": "/partner/posts/.../edit" | "/community/p/...",
  "hygieneScore": 0.95
}
```

**Errors**:
| Code | HTTP | Reason |
|---|---|---|
| `UNAUTHENTICATED` | 401 | 세션 없음 |
| `FORBIDDEN` | 403 | partner 미존재 또는 status ≠ 'active' |
| `VALIDATION_FAIL` | 400 | 입력 스키마 위반 |
| `RATE_LIMITED` | 429 | 일 3건 초과 |
| `STORAGE_FAIL` | 502 | Storage 업로드 실패 |
| `VISION_FAIL` | 502 | Gemini Vision 실패 (1 retry 후) |
| `COMPOSE_FAIL` | 502 | Gemini Pro 실패 |
| `HYGIENE_FAIL` | 422 | hygiene < 0.7 (`reasons` 포함) |
| `TIMEOUT` | 504 | 전체 처리 > 10s |
| `SLUG_CONFLICT` | 500 | nanoid 3회 재시도 후 충돌 (실질적으로 발생 X) |

**모든 5xx/4xx 응답 전에 `cleanupPartnerPostPhotos(uid, postId)` 호출** (H2). 단, `UNAUTHENTICATED`/`FORBIDDEN`/`VALIDATION_ERROR`/`RATE_LIMITED`는 업로드 이전이라 cleanup 대상 없음.

**에러 코드 컨벤션**: 기존 코드와의 정합을 위해 (M5)
- `VALIDATION_ERROR` (NOT `VALIDATION_FAIL`) — Zod 검증 실패
- `LLM_FAILURE` 재사용 (Vision/Compose 실패 시) — `story-generator.ts:65,72` 패턴
- `STORAGE_FAIL` 신설 — 업로드 실패
- `HYGIENE_FAIL` 재사용 — `story-generator.ts:241` 패턴
- `RATE_LIMITED` 재사용 — `rate-limit.ts:42` 패턴
- `TIMEOUT`/`SLUG_CONFLICT` 신설

### 6.2 `PATCH /api/partner/posts/[postId]` — 편집

**Request** (JSON):
```ts
const patchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  summary80: z.string().min(10).max(120).optional(),
  bodyMarkdown: z.string().min(100).max(6000).optional(),
  coverImageUrl: z.string().url().optional(),
  coverImageAlt: z.string().max(80).optional(),
  brandTone: z.enum(['friendly','professional','playful']).optional(),
}).refine(d => Object.keys(d).length > 0, '변경할 필드를 1개 이상 보내야 합니다');
```

**Response 200**: 갱신된 `Post` (요약 필드만)

### 6.3 `DELETE /api/partner/posts/[postId]` — 초고 삭제

- `publishStatus === 'draft'` 만 허용 (기타 409 `STATUS_CONFLICT`)
- **순서 (H6)**: Firestore 문서 삭제 **먼저** → Storage `/partners/{uid}/{postId}/*` best-effort cleanup
  - 이유: Firestore = 소스 오브 트루스. 만약 Storage 삭제만 성공하고 Firestore가 실패하면 `sourcePhotos[]`가 dangling되어 사용자에게 깨진 이미지 노출. 반대로 Firestore 삭제 후 Storage 잔존은 운영 비용만 증가
- Storage cleanup 실패는 별도 로그(`partners/{id}/events.add({type:'cleanup-failed', postId, reason})`) 후 200 반환 — 사용자에게는 성공 응답
- Response 204

### 6.4 `POST /api/partner/posts/[postId]/publish` — 발행/철회

**Request**:
```ts
const publishSchema = z.object({ action: z.enum(['publish', 'withdraw']) });
```

**Transitions**:
| from | publish | withdraw |
|---|---|---|
| draft | → published | 409 |
| published | (no-op 200) | → withdrawn |
| withdrawn | → published | (no-op 200) |

**Response 200**:
```json
{ "publishStatus": "published", "url": "/community/p/...", "publishedAt": "..." }
```

**트랜잭션 의사코드 (H4)** — read-then-CAS, `rate-limit.ts:32-54` 패턴 동일:
```ts
await adminDb.runTransaction(async (tx) => {
  const ref = adminDb.collection('posts').doc(postId);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new AppError('NOT_FOUND', '...');
  const cur = snap.data()!.publishStatus as PublishStatus;
  const next = computeNext(cur, action);          // 위 표 참조, 불가능 전이는 throw 'STATUS_CONFLICT'
  const update: Record<string, unknown> = {
    publishStatus: next,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (next === 'published') update.publishedAt = FieldValue.serverTimestamp();  // H1 정책
  tx.update(ref, update);
});
// 트랜잭션 외부에서 events 기록 + revalidatePath
```

### 6.5 `PATCH /api/partner/settings` — autoPublish 갱신

**Request**: `AutoPublishConfig` (autoPublishConfigSchema 검증)
**Response 200**: 적용된 config + `partners.updatedAt`

---

## 7. UI Wireframes

### 7.1 `/partner/posts` (대시보드)

```
┌─────────────────────────────────────────────────────────┐
│ ← 청광 파트너  |  ✉ {businessName}    [⚙ 설정] [+ 새 초고] │
├─────────────────────────────────────────────────────────┤
│ ⓘ 자동발행: ON · 평일 09:00–18:00 (다음 윈도우 12h 30m)  │
├─────────────────────────────────────────────────────────┤
│ 📝 초고 (3)                                              │
│   ┌─────┬───────────────┬──────────────────┬──────────┐ │
│   │ 썸네일│ 제목         │ 생성 시각          │ 액션     │ │
│   │     │ 사유: hygiene │ 2026-04-25 14:00 │ [편집][삭제]│ │
│   └─────┴───────────────┴──────────────────┴──────────┘ │
│                                                          │
│ ✅ 발행 (12)                                             │
│   ...                                                    │
│                                                          │
│ 🚫 철회 (1)                                              │
│   ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### 7.2 `/partner/posts/new`

```
┌─────────────────────────────────────────────────────────┐
│ ← 새 초고 만들기                                         │
├─────────────────────────────────────────────────────────┤
│ 사진 (1~5장, 각 5MB 이하)                                │
│   [📷 ＋ 추가]  [🖼1][🖼2][🖼3]                          │
│                                                          │
│ 키워드 (선택, 5개 이하)                                  │
│   [신선한 재료] [수제 빵] [브런치] [+]                   │
│                                                          │
│ 슬로건 (선택, 40자 이내)                                 │
│   [_________________________________]                    │
│                                                          │
│ 브랜드 톤                                                │
│   ◉ 친근  ○ 전문  ○ 발랄                                 │
│                                                          │
│ ⚡ 지금이 자동발행 윈도우입니다 (09:00–18:00 평일)        │
│   초고가 hygiene 통과하면 즉시 공개됩니다.                │
│                                                          │
│                              [취소]  [✨ 초고 생성]      │
└─────────────────────────────────────────────────────────┘
```

### 7.3 `/partner/posts/[postId]/edit`

```
┌─────────────────────────────────────────────────────────┐
│ ← 편집  |  draft  |  생성 2026-04-25 14:00              │
├─────────────────────────────────────────────────────────┤
│ 제목 [__________________________________________]       │
│ 요약 [__________________________________________]       │
│ 본문 (markdown)                                          │
│   ┌────────────────────────────────────────────────┐   │
│   │ ## 신선한 아침                                   │   │
│   │ 오늘도 우리 매장은...                             │   │
│   │ ...                                              │   │
│   └────────────────────────────────────────────────┘   │
│ 커버 이미지   [🖼1] [↻ 다른 사진으로 교체]               │
│ 커버 alt [__________________________________]           │
│                                                          │
│   [📥 임시저장]                  [🚫 철회] [📣 발행]    │
└─────────────────────────────────────────────────────────┘
```

발행 후에는 `[🚫 철회] [💾 변경 저장]`로 액션 버튼 변경 (PATCH로 본문 수정 가능).

### 7.4 `/partner/settings` — AutoPublishSettings

```
┌─────────────────────────────────────────────────────────┐
│ ← 자동발행 설정                                          │
├─────────────────────────────────────────────────────────┤
│ ◯ 자동발행 사용 안 함                                    │
│ ◉ 자동발행 사용                                          │
│                                                          │
│   요일 (KST)                                             │
│     [✓ 월] [✓ 화] [✓ 수] [✓ 목] [✓ 금] [□ 토] [□ 일]    │
│                                                          │
│   시간                                                   │
│     시작 [09 : 00]  종료 [18 : 00]                       │
│                                                          │
│ ⓘ 자동발행 윈도우 안에서 생성된 초고는                   │
│    hygiene 통과 시 즉시 공개됩니다.                      │
│                                                          │
│                                          [💾 저장]       │
└─────────────────────────────────────────────────────────┘
```

---

## 8. SEO

### 8.1 `panel-config.ts` 갱신

```ts
export type PanelSlug = 'tips' | 'providers' | 'partners';

export const PANELS: Record<PanelSlug, PanelConfig> = {
  tips: { /* 그대로 */ },
  providers: { /* 그대로 */ },
  partners: {
    slug: 'partners',
    postType: 'partner-promo',
    label: '의뢰업체 홍보',
    tagline: '청광이 함께한 매장과 서비스, 파트너가 직접 전하는 이야기',
    seoTitle: '의뢰업체 홍보 · 청광',
    seoDescription:
      '청광이 함께한 매장·식당·사무실의 직접 작성한 홍보글. 실제 공간을 사진과 함께 만나보세요.',
    emptyCopy: {
      heading: '아직 공개된 파트너 글이 없어요',
      body: '곧 청광 파트너들이 직접 쓴 매장 이야기가 올라옵니다.',
    },
  },
};

export const PANEL_ORDER: readonly PanelSlug[] = ['tips', 'providers', 'partners'] as const;
```

### 8.2 JSON-LD Article (`article-jsonld.ts`)

```ts
function authorFor(post: Post): { '@type': 'Organization'; name: string } {
  switch (post.postType) {
    case 'tip':           return { '@type': 'Organization', name: '청광' };
    case 'provider':      return { '@type': 'Organization', name: post.companyName };
    case 'partner-promo': return { '@type': 'Organization', name: post.companyName };  // partners.businessName 스냅샷
  }
}
```

### 8.3 Sitemap (`app/sitemap.ts`)

`postRepository.listAllPublished()` (신규 helper) → `published` 글 + 3패널 entry. partner-promo 글은 `lastModified = updatedAt`, `changeFrequency: 'weekly'`.

### 8.4 Robots (`app/robots.ts`)

```ts
disallow: ['/api/', '/provider/', '/received/', '/partner/'],   // /partner 작성 영역 차단
```

### 8.5 RSS — `/community/partners/rss.xml`

`postRepository.listByTypeAndStatus('partner-promo', 'published', { limit: 50 })` → RSS 2.0. `/community/stories/rss.xml`에서 308 redirect 추가 (구독자 호환).

---

## 9. Operator CLI · `scripts/issue-partner.ts`

```bash
pnpm tsx scripts/issue-partner.ts \
  --uid="ABC123uid" \
  --businessName="우리매장" \
  --region="서울 강남구" \
  --category="카페" \
  --notes="2026 봄 마케팅 파트너십" \
  [--by="peter"] \
  [--dry-run]
```

동작:
1. Firebase Admin 초기화 (R11 — `getStorageBucketName()` 헬퍼 사용)
2. `--uid`로 Firebase Auth user 존재 확인 → 없으면 abort
3. 기존 partner 존재 확인 (`partners.where('ownerUid','==',uid)`) → 있으면 `--force` 없이는 abort
4. partnerId = nanoid(12)
5. `partners/{partnerId}.set({...DEFAULT, status: 'active', autoPublish: DEFAULT_AUTO_PUBLISH})`
6. `partners/{partnerId}/events.add({type:'status-changed', from:'invited', to:'active', by, decidedAt: now})`
7. `--dry-run`이면 미실행, 출력만

---

## 10. customer-story 제거 마이그레이션 체크리스트 (Phase 8)

| 단계 | 작업 |
|---|---|
| M1 | DB 점검: `posts.where('postType','==','customer-story')` 카운트. 0이면 진행. ≥1이면 OQ-1 결정 (백필/삭제) |
| M2 | `src/types/post.ts`: `PostType`/`StoryGenerationMeta` 갱신 |
| M3 | `src/lib/firebase/post-repository.ts`: `toPost` narrowing 갱신 + 신규 메서드 추가 |
| M4 | `src/lib/feed/panel-config.ts`: stories → partners |
| M5 | `src/lib/llm/`: story-generator/rag/cleanup 삭제 + partner-promo-* 신규 |
| M6 | `src/lib/seo/article-jsonld.ts`: 분기 갱신 |
| M7 | `src/app/community/stories/page.tsx`: redirect 308 → `/community/partners` |
| M8 | `src/app/community/stories/upload/**`: 삭제 |
| M9 | `src/app/community/stories/rss.xml/route.ts`: redirect 308 → `/community/partners/rss.xml` |
| M10 | `src/app/sitemap.ts` / `app/robots.ts` 갱신 |
| M11 | `src/components/community/stories/**`: 삭제 |
| M12 | `firestore.indexes.json` 갱신 + Firebase 콘솔 배포 |
| M13 | `firestore.rules` / `storage.rules` 갱신 + 배포 |
| M14 | grep으로 잔여 `customer-story` 참조 0건 확인 (포함: `lib/llm/hygiene-guard.ts` 주석, `src/types/post.ts` 상단 docstring, JSDoc 전반, `docs/` 디렉토리) |
| M15 | `pnpm build` 통과 확인 |
| M16 | **`storyScrapbook` 컬렉션 결정** — `firestore.rules:160-166` 블록 존재. partner-promo는 사용 안 함. (a) 블록 유지(미사용 컬렉션) (b) 블록 제거 + 잔여 문서 정리. v1 기본 (a) 유지, v2에 정리 작업 등록 |
| M17 | 신규 `partner-promo-generator`의 title 폴백 문자열 결정 — 기존 `"청광 고객 스토리"` 대체. 권장: `"${businessName} 새 글"` 또는 `"매장 이야기"` (브랜드 노출 X) |
| M18 | `firestore.rules`의 customer-story 관련 주석/예시 코드 정리 |

---

## 11. Implementation Order (Phase 1 → 9)

| Phase | 범위 | Output |
|---|---|---|
| **P1** Schema | `src/types/post.ts`, `src/types/partner.ts` 갱신·신규 | 타입 컴파일 통과 |
| **P2** Repository | `partner-repository.ts` 신규 + `post-repository.ts` 메서드 추가/수정 | 로컬 단위 테스트 (option) |
| **P3** Auth & CLI | `require-partner.ts` + `scripts/issue-partner.ts` | 테스트 파트너 1건 발급 가능 |
| **P4** API | 4개 route 핸들러 | 수동 curl로 발급된 파트너로 초고 생성 가능 |
| **P5** AI Pipeline | `partner-promo-generator.ts`, `partner-promo-rag.ts`, hygiene 확장 | hygiene 통과/실패 케이스 동작 |
| **P5.5** Auto-publish | `auto-publish-window.ts` + 단위 테스트 + API 통합 | 윈도우 내 자동 발행 검증 |
| **P6** UI | `/partner/*` 페이지 4종 + 컴포넌트 4종 | E2E (수동) — 발급→초고→편집→발행 |
| **P7** SEO | `panel-config`, `article-jsonld`, `sitemap`, `robots`, RSS | sitemap 응답 검증, GSC 제출 |
| **P8** Migration | customer-story 제거 (M1–M15) | grep 0 + build 통과 |
| **P9** Rules · Indexes 배포 | Firebase 콘솔/CLI 배포 | rules emulator 패스 + indexes 빌드 완료 |

---

## 12. Risks & Mitigations (Plan §10 보강)

| 리스크 | 확률 | 영향 | 완화 |
|---|---|---|---|
| `next.config.ts` `cacheComponents` 모드와 동적 metadata 충돌 (community-feed-3panel R10) | High | 패널/상세 404 렌더 | 정적 metadata + Suspense 내부 동적 값 (이미 community-feed-3panel에서 검증된 패턴) |
| `revalidatePath` 멱등성 — 동시 publish 호출 | Low | 중복 이벤트 | Firestore 트랜잭션으로 publishStatus 전이 검증 (현재 상태 일치 시에만 업데이트) |
| Gemini Pro 한국어 800자 미달 | Medium | hygiene 통과 했어도 부실 | composeSchema에 `bodyMarkdown` min length 800 — community-feed-3panel과 동일 정책 |
| autoPublish 윈도우 내 hygiene fail → 사용자 혼란 | Medium | "왜 자동발행 안 됐지?" | 응답에 `status: 'draft'` + `reason: 'hygiene-fail'` + 에디터 진입 후 사유 배너 |
| 윈도우 변경 직후 생성 → 의도와 다른 결과 | Low | 의도치 않은 자동 발행 | settings 저장 시 partners/{id}/events 로깅 + 변경 후 5분간 confirmation toast |
| Storage cleanup 누락 (DELETE draft 또는 hygiene fail) | Medium | 스토리지 비용 | 모든 실패 경로에 `cleanupPartnerPostPhotos(uid, postId)` 명시 호출 + 스케줄 cleanup 작업은 v2 |
| 운영진이 partners.businessName 변경 (Phase 8) | Low | JSON-LD author와 글 본문 불일치 | `companyName`은 글 생성 시점 스냅샷 — partners.businessName 사후 변경은 글에 영향 X (의도된 동작, OQ-7로 v2 추적) |
| RAG self-reference drift (H3) | Medium (시간 경과 시) | 자동 발행 글이 RAG 풀의 다수가 되면서 톤이 점점 자기 복제 | §4.4 정책: provider 가중치 +0.1, 자기 자신 글 제외, v2에 hand-curated 마커 도입 |
| autoPublish 윈도우 내 hygiene-fail 반복 시도 (OQ-4 결정의 부작용) | Low | 하루 3건 rate-limit이라 스팸은 제한적 | rate-limit + partners/{id}/events에 매 fail 로깅 → 운영 모니터링으로 비정상 패턴 감지 |
| Storage 업로드 후 다른 단계 실패 시 cleanup 누락 (H2) | Medium | dangling 파일 누적 | §3.1 try/catch 강제 + cleanupPartnerPostPhotos 명시 호출 + DELETE는 Firestore 우선(H6) |

---

## 13. Open Questions

| OQ | 질문 | 결정 시점 |
|---|---|---|
| **OQ-1** | 프로덕션 DB에 `customer-story` 문서가 1건이라도 존재하는지 확인. 있으면 (a) 모두 삭제 (b) `archived` 상태로 변경 (c) `partner-promo`로 재할당 중 선택 | Phase 8 착수 전 |
| **OQ-2** | `/stories/{uid}/...` Storage 객체가 존재하는지 확인. 있으면 정리 정책 (삭제 vs 유지) | Phase 8 착수 전 |
| ~~OQ-3~~ | **결정됨** — Suspended 파트너의 기존 published 글은 **그대로 공개 유지**. Suspend는 향후 작성·편집·발행만 차단. CLI `--unpublish-all` 플래그는 v2 | ✓ |
| ~~OQ-4~~ | **결정됨** — autoPublish 윈도우 내 hygiene fail 후 재시도 시 윈도우 살아 있으면 자동발행 시도 가능. 일 3건 rate-limit는 그대로 적용 | ✓ |
| **OQ-5** | partner-promo 글 `categories`는 어떻게 결정? — `partners.category` 1차 + visionTags 2차 (`inferCategories`) merge. `inferCategories` 매핑 부재(community-feed-3panel H6)는 현재 어떻게 처리되어 있는지 재확인 필요 | P5 착수 시 |
| **OQ-6** | 자동 발행 시 SNS 알림? — v1 OOS, v2 검토 | — |
| **OQ-7** | **rebrand sync (H5)** — 파트너가 `businessName`을 변경하면 기존 글의 `companyName`(스냅샷)·JSON-LD author는 stale. v1 기본: 글은 발행 시점 스냅샷 유지(의도). v2: `partner-repository.updateBusinessName` cascade 옵션 + CLI `--cascade-rename` 플래그 | v2 검토 |

---

## 14. Acceptance Criteria

설계가 완료되었다고 보려면:

- [ ] 운영진이 CLI로 partner 1건 발급 가능, `partners` 문서 + `events` 이벤트 1건 생성 확인
- [ ] 발급된 파트너가 `/partner/posts/new`에서 사진 3장 + 키워드로 초고 생성 시:
  - autoPublish OFF → `publishStatus='draft'`, `/partner/posts/.../edit`로 이동, `events.draft-saved.reason='auto-disabled'` 기록
  - autoPublish ON & 윈도우 내 & hygiene pass → `publishStatus='published'`, `/community/p/{slug}`로 이동, sitemap 즉시 반영, `events.auto-published` 기록
  - autoPublish ON & 윈도우 내 & hygiene fail → 422 + Storage cleanup, draft 미생성
- [ ] 초고 편집 후 발행 → 공개 피드/상세에 즉시 노출 (revalidatePath 검증)
- [ ] 발행글 철회 → 공개 상세 404, 본인은 미리보기 가능
- [ ] 본인 외 파트너의 글 PATCH → 403
- [ ] 비파트너 사용자가 `/partner/posts` 진입 → `/login?next=...` redirect
- [ ] `/community/stories` → `/community/partners` 308 redirect 동작
- [ ] sitemap.xml에 published partner-promo 글이 포함, draft/withdrawn은 미포함
- [ ] JSON-LD Article author = post.companyName (= partners.businessName 발행 시점 스냅샷)
- [ ] `pnpm build` 통과, 잔여 `customer-story` 참조 0건 (M14 grep 기준)
- [ ] OQ-3 동작 검증: 발급된 파트너 1건의 `status`를 `suspended`로 CLI 변경 → 기존 published 글은 `/community/p/{slug}`에서 그대로 200 노출 + 해당 파트너의 `/partner/posts` 진입은 403
- [ ] OQ-4 동작 검증: hygiene-fail 응답 직후 동일 윈도우 내 재시도 → 정상 처리 (rate-limit 내에서)
- [ ] PATCH `/api/partner/posts/[postId]`의 `coverImageUrl`은 `/partners/{ownerUid}/{postId}/...` 경로만 허용 (L4 — 외부 URL 거부)

---

## 15. Next Steps

1. OQ-1 / OQ-2 / OQ-5 사전 확인 (DB·Storage 점검) → 결정 후 Phase 8 마이그레이션 범위 확정
2. `/pdca do partner-promo` — Phase 1(타입)부터 순차 구현
3. P5.5 단위 테스트 작성 후 P6 진입
4. 구현 완료 후 `/pdca analyze partner-promo` (gap-detector)
5. Match Rate < 90% 시 `/pdca iterate partner-promo`
6. ≥ 90% 도달 후 `/pdca report partner-promo`

---

**Approval Status**: Ready for `/pdca do partner-promo` (v0.2 design-validator 응답 반영 후).
- 잔여 Open Questions: **OQ-1**(DB customer-story 잔존)·**OQ-2**(Storage `/stories/...` 잔존) — P8 착수 전 점검 / **OQ-5**(`inferCategories` 매핑) — P5 착수 시 / **OQ-7**(rebrand sync) — v2 검토.

### Design-Validator v0.1 응답 반영 (2026-04-25)
| Severity | Item | Resolution |
|---|---|---|
| Critical | C1 (파일 카운트) | §1.1 "20"→"22", "Pages 5"→"7" |
| Critical | C2 (삭제 카운트) | §1.3 → 삭제 5 + 리네임 1 + redirect 2 분리 |
| Critical | C3 (hygiene 시그니처) | §1.2 — 4번째 optional 파라미터 신설로 정정, "back-compat" 문구 제거 |
| Critical | C4 (마이그레이션 누락) | §10 M16(storyScrapbook)·M17(폴백 문자열)·M18(rules 주석) 추가 |
| High | H1 (publishedAt 정책) | §3.2 — withdrawn→published 시 publishedAt 재발급 명시 |
| High | H2 (cleanup race) | §3.1 try/catch + §6.1 cleanup 노트 |
| High | H3 (RAG starvation) | §4.4 provider 가중치·자기 자신 제외 정책 + §12 risk |
| High | H4 (트랜잭션 CAS) | §6.4 의사코드 추가 |
| High | H5 (rebrand sync) | §13 OQ-7 추가, v2 |
| High | H6 (DELETE 순서) | §3.2·§6.3 Firestore 우선 + Storage best-effort |
| High | H7 (IN-query 인덱스) | §2.3 두 개 평행 쿼리로 정정 |
| Medium | M1·M2·M3·M4·M5·M6 | 각 §해당 항목 정정 |
| Low | L1·L2·L3·L4 | L3는 §1.1 helper 추가, L4는 §14 acceptance 추가 |
| OQ-3 | suspend 시 published | "그대로 유지" 결정 — §13·§14 |
| OQ-4 | hygiene-fail 재시도 | "윈도우 매 요청 판정" 결정 — §13 |
