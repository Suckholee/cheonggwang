# Plan · partner-promo

**Feature**: 의뢰업체(B2B 파트너) AI 보조 홍보글 게시 — `customer-story` 패널 대체
**Level**: Dynamic
**Cycle**: #19 (Marketplace v1.7 · partner-promo)
**Method**: Plan Plus (brainstorming-enhanced)
**Started**: 2026-04-25
**Replaces**: `customer-story` postType + `/community/stories` 패널 (community-feed-3panel v1.6)

---

## 1. User Intent Discovery

### 1.1 Core Purpose
청광이 마케팅 차원에서 인증한 **B2B 의뢰업체(식당·카페·사무실 등)**가 **AI 보조**로 자사 매장·서비스 홍보글을 작성·게시할 수 있게 한다.

기존 `customer-story`(고객 사진 → AI 자동 생성 → 자동 발행) 흐름을 폐기하고, 다음 흐름으로 대체한다:

```
인증된 파트너 → 사진+키워드 입력 → AI 초고 생성 → 파트너 본인 편집 → '발행' 버튼 → 공개
```

### 1.2 Target Users
- **Creator (Primary)**: 청광 운영진이 인증한 마케팅 파트너 (B2B; 식당·카페·상가·사무실 등)
- **Viewer**: 유기검색을 통해 유입되는 잠재 고객 + 기존 청광 고객 재방문
- **Operator**: 청광 운영진 — 파트너 계정 발급(CLI), 결과 모니터링

### 1.3 Success Criteria
**SEO/유기검색 유입**이 최우선 기준.
- `/community/partners` 패널 + 파트너 글이 Google에 인덱싱된다 (sitemap.xml · JSON-LD Article)
- 패널이 독립된 canonical URL과 RSS 피드를 가진다
- 파트너 발행글이 청광 검색 키워드(공간/지역/카테고리)에서도 노출된다
- LCP < 2.5s, CLS < 0.1 (Next 16 + ISR 캐시, 기존 3panel 기준 동등)

### 1.4 Constraints
- **기본은 수동 발행** — 모든 AI 초고는 `draft` 상태로 저장되며, 파트너 본인이 명시적으로 '발행'해야 공개
- **선택적 자동 발행** — 파트너가 자기 계정에 `autoPublish` 옵션을 켜고 **요일·시간 윈도우**를 지정하면, 그 윈도우 내에 생성된 초고는 hygiene 통과 시 즉시 자동 발행 (윈도우 외부 또는 미통과는 draft 보류)
- **인증된 파트너만 작성** — `partners` 컬렉션의 `status === 'active'`만 통과. 운영진 CLI로만 발급
- **단일 게이트** — hygiene-guard는 자동/수동 모두에 필수 적용. 그 이후 검열은 파트너 본인 + 유저 신고(이연)
- Firebase (Firestore + Storage + Auth) · Gemini (Vision + Pro) 스택 고정

---

## 2. Alternatives Explored

### Approach A — `customer-story` postType 자리에 `partner-promo` 대체 ✅ 채택
- `posts.postType`: `'tip' | 'provider' | 'customer-story'` → `'tip' | 'provider' | 'partner-promo'`
- `/community/stories` → `/community/partners` (panel-config 갱신)
- 신규 `partners` 컬렉션 + 신규 `posts.publishStatus` 필드
- AI 파이프라인은 `story-generator/rag/cleanup` 골격 재사용 (B2B 프롬프트로 변경)
- **Pros**: 3panel 라우트·repository·sitemap·RSS 그대로 재사용 · SEO canonical 분리 · `/p/[slug]` 상세 공통
- **Cons**: 기존 `customer-story` 코드/타입을 들어내야 하므로 마이그레이션 영향 평가 필요

### Approach B — `providers` 패널에 작가 구분 서브-필터
- `posts.postType='provider'` 유지 + `authorRole: 'provider'|'partner'` 신규 필드
- **Pros**: 라우트 추가 없음 · 가장 단순
- **Cons**: SEO 약화(두 작가 유형이 한 canonical에 섞임) · 패널별 RSS 분리 불가 · 멘탈 모델 혼란

### Approach C — 독립 라우트 + 독립 컬렉션
- `/partners/[slug]` 도메인 + 신규 `partnerPosts` 컬렉션
- **Pros**: 도메인 분리 명확
- **Cons**: 3panel과 동떨어진 정보 구조 · repository·sitemap·RSS·JSON-LD 모두 신규 → 보일러플레이트 큼

**결정**: Approach A. 단, 사용자 피드백("고객 스토리 대신") 반영하여 customer-story와 **공존이 아닌 대체**로 진행.

---

## 3. YAGNI Review

### Included (v1, 13 items)

**핵심 구조 · 데이터 모델 (4)**
1. **I1** — `posts.postType` 교체 (`customer-story` 제거 · `partner-promo` 추가) + `posts.publishStatus`(`draft|published|withdrawn`) 신규 필수 필드
2. **I2** — `partners/{partnerId}` 컬렉션 신설 (`ownerUid`, `businessName`, `logoUrl`, `status`, `autoPublish`, `issuedAt`, `notes`)
3. **I3** — Firestore 인덱스(`postType, publishStatus, createdAt`) + 룰 갱신 + Storage `/partners/{uid}` 룰
4. **I4** — `scripts/issue-partner.ts` 운영진 CLI (관리자 UI 없이)

**작성·편집·발행 흐름 (5)**
5. **F1** — AI 초고 생성 (`partner-promo-generator.ts` = vision + RAG + Pro + hygiene)
6. **F2** — 마크다운 편집 UI (`PartnerPromoEditor` — textarea 기반, 외부 에디터 의존 없음)
7. **F3** — 발행·철회 액션 (publishStatus 전이 + revalidatePath)
8. **F4** — 파트너 본인 글 목록 (`/partner/posts` — status 그룹화)
9. **F5** — 자동 발행 옵션 (요일+시간 윈도우 설정 UI + 윈도우 판정 유틸 + 생성 시 분기 로직)

**패널 UX · SEO (4)**
10. **S1** — `/community/partners` 패널 (panel-config 갱신, `/community/stories` 제거 + redirect 추가)
11. **S2** — 메타·OG·JSON-LD 갱신 (author = `partners.businessName`) + sitemap·RSS 반영
12. **S3** — 권한·제한 레이드 (`requirePartner` 가드 + 일 3건 rate-limit + Storage write 본인 제한)
13. **S4** — hygiene 로그·모니터링 (`partners/{id}/events` 서브컬렉션에 score/reject reason + autoPublish 결정 로그)

### Out of Scope (v2 이후 이연)

- **O1** 파트너 셀프 가입/온보딩 폼 (현 단계는 운영진 화이트리스트)
- **O2** 댓글·좋아요·공유·팔로우
- **O3** 다국어 / hreflang
- **O4** 관리자 대시보드 UI (지표 조회·일괄 비활성화·파트너 초대 발급 UI)
- **O5** A/B 시안 (AI 초고 2개 생성 후 선택)
- **O6** 백그라운드 큐 (현 단계는 동기 인라인 생성, 3–8s 목표)
- **O7** 통계 (조회수·CTR·인용 키워드)
- **O8** 임시저장 자동저장 (수동 PATCH만)
- **O9** 이미지 드래그앤드롭 정렬·리오더
- **O10** 발행 전 미리보기 모달 (편집 페이지 자체가 미리보기 역할)
- **O11** 사용자 신고 / abuse flow

---

## 4. Scope

### In scope
- `posts` 스키마 변경: `postType` 한 값 교체 + `publishStatus` 신규 필드 (필수, 레거시 디폴트 `published`)
- `partners` 컬렉션 신설 + `partnerRepository`
- `/community/partners` 패널 (3panel → 사실상 3panel 유지 · 한 패널 콘텐츠 교체)
- `/community/stories/**` 라우트 제거 + `/community/stories` → `/community/partners` redirect
- `/partner/posts` · `/partner/posts/new` · `/partner/posts/[postId]/edit` (파트너용 영역)
- `/api/partner/posts` (POST 생성) · `/api/partner/posts/[postId]` (PATCH/DELETE) · `/api/partner/posts/[postId]/publish`
- AI 파이프라인 리네이밍·재구성: `story-generator/rag/cleanup` → `partner-promo-generator/rag/cleanup`
- `hygiene-guard.ts`에 partner-promo 룰 추가 (자사 상호 ✓, 청광·경쟁업체 비방 ✗)
- `article-jsonld.ts` partner-promo 분기 (author = `companyName` = `partners.businessName`)
- `panel-config.ts`·`sitemap.ts`·`firestore.indexes.json`·`firestore.rules`·`storage.rules` 갱신
- `requirePartner` 가드 + 일 3건 rate-limit + Storage 본인 write 제한
- 운영진 CLI `scripts/issue-partner.ts`

### Out of scope
- O1–O11 (위 YAGNI Out of Scope 참조)
- DB 마이그레이션 — 현 시점에 `customer-story` 문서가 프로덕션에 없다고 가정. 있을 경우 별도 cleanup 스크립트는 design 단계에서 결정

---

## 5. Data Model

### 5.1 `Post` 스키마 변경 (`src/types/post.ts`)

```ts
export type PostType = 'tip' | 'provider' | 'partner-promo';   // ← customer-story 제거

export type PublishStatus = 'draft' | 'published' | 'withdrawn';

export interface Post {
  // ... 기존 필드 유지

  postType: PostType;
  publishStatus: PublishStatus;          // NEW (필수). 레거시 문서는 'published' 기본값.

  sourcePhotos?: string[];               // /partners/{uid}/{nanoid}/{i}.jpg
  generationMeta?: PromoGenerationMeta;  // (StoryGenerationMeta에서 리네임)
}

export interface PromoGenerationMeta {
  model: string;
  generatedAt: Date;
  ragSourceIds: string[];
  hygieneScore: number;
  visionTags: string[];
  keywordsHint: string[];                // NEW — 파트너가 입력한 키워드 보존
}
```

- partner-promo 글: `providerId='partner:${partnerId}'` · `providerOwnerUid=uid` · `companyName=partners.businessName`

### 5.2 `Partner` 스키마 (`src/types/partner.ts`, 신규)

```ts
export type PartnerStatus = 'invited' | 'active' | 'suspended';

export interface AutoPublishConfig {
  enabled: boolean;
  // 0=Sun, 1=Mon, ..., 6=Sat. 빈 배열이면 활성 요일 없음 → 사실상 비활성과 동일.
  weekdays: number[];
  // 분 단위(0~1439, KST 기준). 시작 < 종료. 자정 넘김(예: 22시–02시)은 v2.
  startMinute: number;
  endMinute: number;
  timezone: 'Asia/Seoul';    // v1은 KST 고정
}

export interface Partner {
  id: string;
  ownerUid: string;          // Firebase Auth uid
  businessName: string;      // JSON-LD author.name
  logoUrl: string | null;
  category: QuoteCategory | null;  // 매장 업종 (선택)
  regionLabel: string | null;
  status: PartnerStatus;
  autoPublish: AutoPublishConfig;  // 기본: { enabled: false, weekdays: [], startMinute: 0, endMinute: 0, timezone: 'Asia/Seoul' }
  issuedAt: Date;
  issuedBy: string;
  notes: string | null;
}
```

### 5.3 Firestore 복합 인덱스 (`firestore.indexes.json`)

| # | collection | fields |
|---|-----------|--------|
| 1 | posts | `postType ASC`, `publishStatus ASC`, `createdAt DESC` |
| 2 | posts | `postType ASC`, `publishStatus ASC`, `regionLabel ASC`, `createdAt DESC` |
| 3 | posts | `providerOwnerUid ASC`, `createdAt DESC` (본인 글 목록용) |
| 제거 | posts | 기존 customer-story 전용 인덱스(있을 경우) |

### 5.4 Firestore Rules 핵심

```
match /posts/{postId} {
  allow read:
       resource.data.publishStatus == 'published'
    || request.auth.uid == resource.data.providerOwnerUid
    || request.auth.token.admin == true;
  allow write: if false;   // Admin SDK only (Route Handler 경유)
}

match /partners/{partnerId} {
  allow read:
       request.auth.uid == resource.data.ownerUid
    || request.auth.token.admin == true;
  allow write: if false;   // Admin SDK only
}
```

### 5.5 Storage 경로 / Rules

```
/partners/{uid}/{nanoid}/{i}.jpg
  read: public (피드 카드·OG에 사용)
  write: request.auth.uid == uid && request.resource.size < 10 * 1024 * 1024
```

기존 `/stories/{uid}/...` 경로는 Phase 4(API)에서 deprecated 처리 — design 단계에서 확정.

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Client                                                          │
│  /community/partners               (B2B 홍보 패널 — 공개 피드)    │
│    └─ PanelLayout(재사용) → InfiniteFeedList → PostFeedCard       │
│  /partner/posts                    (파트너 본인 작성 대시보드)    │
│    ├─ "새 초고 생성" CTA → /partner/posts/new                     │
│    └─ 내 글 목록 (draft / published / withdrawn 분리)             │
│  /partner/posts/new                (AI 초고 생성 폼)              │
│    └─ PartnerPromoDraftForm                                      │
│  /partner/posts/[postId]/edit      (마크다운 편집 + 발행)         │
│    └─ PartnerPromoEditor                                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server                                                          │
│  Auth Gate                                                       │
│    requirePartner(uid) → partners 조회 · status==='active'       │
│  partner-promo-generator.ts                                      │
│    Gemini Vision → partner-promo-rag → Gemini Pro                │
│    → hygiene-guard(partner 룰) → posts.create(draft)             │
│  postRepository                                                  │
│    listByTypeAndStatus · listMyPosts · updateDraft · setPublishStatus │
│  partnerRepository                                               │
│    getByOwnerUid · getById · setStatus                           │
│  scripts/issue-partner.ts (운영진 CLI)                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  External                                                        │
│  Firestore: posts (postType + publishStatus) · partners          │
│  Firebase Storage: /partners/{uid}/{nanoid}/{i}.jpg              │
│  Gemini Vision · Gemini Pro                                      │
└─────────────────────────────────────────────────────────────────┘
```

**원칙**
- 단일 `posts` 컬렉션 — `postType` + `publishStatus`로 분기. 공개 쿼리는 항상 `publishStatus == 'published'` 고정
- 기존 `/p/[slug]` 상세는 postType 무관 공통, 비공개 글은 ownerUid·admin만 접근
- 파트너 발급은 운영진 CLI 한정 (관리자 UI 없음 — YAGNI)
- AI 파이프라인은 community-feed-3panel의 `story-*` 모듈을 그대로 가져와 리네임 + B2B 프롬프트로 변경

---

## 7. Key Components

### 신규 파일 (20)

| 경로 | 역할 |
|------|------|
| `src/app/community/partners/page.tsx` | 공개 패널 페이지 (server, generateMetadata) |
| `src/app/community/partners/rss.xml/route.ts` | 패널 RSS 2.0 (최신 50, partner-promo only) |
| `src/app/partner/posts/page.tsx` | 파트너 본인 글 대시보드 |
| `src/app/partner/posts/new/page.tsx` | AI 초고 생성 폼 페이지 |
| `src/app/partner/posts/[postId]/edit/page.tsx` | 초고/발행글 편집 페이지 |
| `src/app/partner/settings/page.tsx` | 파트너 계정 설정 (autoPublish 윈도우) |
| `src/app/api/partner/posts/route.ts` | `POST` — 사진+키워드 → AI 초고 생성 → autoPublish 분기로 draft/published 저장 |
| `src/app/api/partner/posts/[postId]/route.ts` | `PATCH` — draft/published 본문 수정 · `DELETE`(draft) |
| `src/app/api/partner/posts/[postId]/publish/route.ts` | `POST` — publish/withdraw 전이 + revalidatePath |
| `src/app/api/partner/settings/route.ts` | `PATCH` — autoPublish 설정 저장 (검증: 시간 범위, 요일 배열) |
| `src/components/partner/PartnerPromoDraftForm.tsx` | 사진 1~5 + 키워드/슬로건 → 생성 트리거 + 현재 윈도우면 "지금 자동 발행됩니다" 안내 표시 |
| `src/components/partner/PartnerPromoEditor.tsx` | 마크다운 편집 + 커버 교체 + 발행/철회 |
| `src/components/partner/PartnerPostsList.tsx` | 본인 글 목록 (status별 그룹) |
| `src/components/partner/AutoPublishSettings.tsx` | 요일 체크박스 + 시작/종료 시간 picker + Enable 토글 |
| `src/lib/firebase/partner-repository.ts` | `getByOwnerUid` · `getById` · `setStatus` · `updateAutoPublish` |
| `src/lib/llm/partner-promo-generator.ts` | story-generator 골격 재구성 (B2B 프롬프트) |
| `src/lib/llm/partner-promo-rag.ts` | story-rag 재구성 (스타일 참조 published partner-promo·provider) |
| `src/lib/partner/auto-publish-window.ts` | 윈도우 판정 유틸: `isInAutoPublishWindow(config, now=Date)` (KST) |
| `src/lib/auth/require-partner.ts` | 서버 가드: 세션 → partners.ownerUid → status==='active' |
| `scripts/issue-partner.ts` | 운영진 CLI |

### 수정 파일 (11)

| 경로 | 변경 |
|------|------|
| `src/types/post.ts` | `PostType` 교체 · `PublishStatus` 추가 · `Post.publishStatus` 필수 · `PromoGenerationMeta` 리네임/필드 추가 |
| `src/lib/firebase/post-repository.ts` | `toPost`에 publishStatus 매핑(레거시 디폴트 published) · `listByTypeAndStatus` · `listMyPosts` · `updateDraft` · `setPublishStatus` |
| `src/lib/feed/panel-config.ts` | `stories` 제거 → `partners` 추가 (label="의뢰업체 홍보", postType: `partner-promo`) |
| `src/lib/llm/hygiene-guard.ts` | partner-promo 룰: 자사 상호 ✓, 청광·경쟁업체 비방 ✗, PII ✗ |
| `src/lib/seo/article-jsonld.ts` | `partner-promo` 분기 — author = post.companyName (= businessName) |
| `src/app/p/[slug]/page.tsx` | publishStatus !== 'published' 시 ownerUid·admin만 접근, 그 외 notFound |
| `src/app/sitemap.ts` | published만 포함 + `/community/partners` 엔트리 |
| `src/app/community/page.tsx` | redirect target 정리 (tips 유지) |
| `firestore.rules` | posts publishStatus 기반 read · partners read 룰 |
| `firestore.indexes.json` | (postType, publishStatus, createdAt) 인덱스 추가 · 구 인덱스 제거 |
| `storage.rules` | `/partners/{uid}/...` write 본인 한정 |

### 삭제 파일 (4+)

| 경로 | 사유 |
|------|------|
| `src/lib/llm/story-generator.ts` | partner-promo-generator로 대체 |
| `src/lib/llm/story-rag.ts` | partner-promo-rag로 대체 |
| `src/lib/llm/story-cleanup.ts` | 사용처 흡수 또는 통합 (design 단계 확정) |
| `src/app/community/stories/**` | page/rss/upload 일괄 제거. `/community/stories` → `/community/partners` redirect로 대체 |

---

## 8. AI 파이프라인 (`partner-promo-generator.ts`)

```
[Client] PartnerPromoDraftForm
   사진 1~5 (jpeg/png ≤10MB) + 키워드 ≤5 + 슬로건(선택) + brandTone(선택)

         │ multipart/form-data
         ▼
POST /api/partner/posts
   ├─ requirePartner(uid)             — partners.status === 'active'
   ├─ rate-limit                       — 3건/일/uid (lib/firebase/rate-limit)
   ├─ validate                         — file count ≤ 5, size ≤ 50MB total
   ├─ Storage 업로드                    — /partners/{uid}/{nanoid}/{i}.jpg
   ├─ Gemini Vision                    — 이미지별 캡션·태그 (병렬)
   ├─ partner-promo-rag                — 동일 카테고리 published 글 3~5건 (스타일 시드)
   ├─ Gemini Pro                       — { title, slug, bodyMarkdown, summary80, coverImageAlt }
   ├─ hygiene-guard                    — score ∈ [0,1], 임계 0.7, fail 시 422 + reason
   ├─ slug 중복 회피                    — slugify(title) + nanoid(4), 3회 재시도
   ├─ autoPublish 분기:
   │    isInAutoPublishWindow(partners.autoPublish, now KST)
   │      && hygiene.score >= 0.7
   │    → publishStatus = 'published' (즉시 공개 + revalidatePath)
   │    그 외 → publishStatus = 'draft' (수동 편집·발행 대기)
   └─ posts.create({
        postType: 'partner-promo',
        publishStatus,                  ← 자동/수동 분기 결과
        providerId: `partner:${partnerId}`,
        providerOwnerUid: uid,
        companyName: partners.businessName,
        sourcePhotos, generationMeta,
        ...generated
      })
   → 201 { postId, slug, status, editUrl: `/partner/posts/${postId}/edit` }

   실패 케이스:
     Vision 실패        → 1 retry, 그래도 실패 시 502
     RAG empty          → fallback (RAG 없이 Pro 단독 생성)
     Hygiene fail       → 422 { reason }, partners/{id}/events에 로그
     Duplicate slug     → 최대 3회 재시도 후 500
     Total > 10s        → 504 + 재시도 유도
```

**제약**
- 업로드: 사진 ≤ 5 · 총 ≤ 50MB · jpeg/png/webp
- 생성: 일 3건/uid (인증 파트너 한정)
- 동기 인라인 (목표 3–8s, 한도 10s)

**Hygiene 룰 (partner-promo 추가분)**
- 자사 상호·매장명 언급 ✓ 허용
- 청광·경쟁업체 직접 언급/비방 ✗
- 가격·할인 단정 표현(“최저가” 등) ✗
- 위치·전화번호 등 PII는 매장 정보로 한정 (개인 PII 차단)

### 8.5 Auto-Publish Window 판정 (`auto-publish-window.ts`)

```ts
export function isInAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): boolean {
  if (!cfg.enabled) return false;
  // KST 변환 (timezone: 'Asia/Seoul' 고정)
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return false;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  return minute >= cfg.startMinute && minute < cfg.endMinute;
}
```

- 자정 넘김 윈도우(예: 22:00–02:00)는 **v1 미지원** — 설정 UI에서 `endMinute > startMinute` 검증
- `enabled: false` 또는 `weekdays.length === 0` → 항상 false (즉, 모든 글이 draft)
- 윈도우 외 생성된 초고는 draft 보류, 파트너가 들어와서 수동 발행 가능

### 8.6 Auto-Publish 시 추가 처리

```
auto-publish 분기 결정 → publishStatus = 'published' 인 경우
  ├─ revalidatePath(`/community/partners`, `/p/${slug}`, `/sitemap.xml`)
  ├─ partners/{id}/events.add({
  │     type: 'auto-published', postId, hygieneScore, decidedAt
  │   })
  └─ 응답: 201 { postId, slug, status: 'published', publicUrl: `/p/${slug}` }
draft인 경우는 기존과 동일:
  └─ partners/{id}/events.add({
       type: 'draft-saved',
       reason: !cfg.enabled ? 'auto-disabled'
              : !isInWindow ? 'out-of-window'
              : 'hygiene-fail',
       postId, hygieneScore
     })
```

---

## 9. SEO Architecture

### 9.1 패널 메타 (`generateMetadata`)

```ts
// panel-config.ts
export const PANELS = {
  tips:      { label: '청소 노하우',  postType: 'tip' },
  providers: { label: '청소업체 홍보', postType: 'provider' },
  partners:  {
    label: '의뢰업체 홍보',
    desc: '청광이 함께한 매장·서비스 — 파트너가 직접 전하는 이야기',
    postType: 'partner-promo',
  },
} as const;
```

각 패널: `title`, `description`, OG image, `alternates.canonical`, `alternates.types['application/rss+xml']`.

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
    post.postType === 'partner-promo'
      ? { '@type': 'Organization', name: post.companyName }   // = partners.businessName
      : post.postType === 'tip'
        ? { '@type': 'Organization', name: '청광' }
        : { '@type': 'Organization', name: post.companyName },
  publisher: { '@type': 'Organization', name: '청광', logo: {...} },
  mainEntityOfPage: `${BASE_URL}/p/${post.slug}`,
}
```

### 9.3 Sitemap / Robots

- `app/sitemap.ts` — 홈 + 3패널(tips, providers, partners) + 모든 `publishStatus==='published'` posts
- `app/robots.ts` — allow `/`, disallow `/api/`, `/provider/`, `/received/`, `/partner/`(작성 영역 인덱싱 차단)

### 9.4 RSS

- `/community/partners/rss.xml` — RSS 2.0, 최신 50건 (`publishStatus='published'` 한정)
- `revalidate = 600`

### 9.5 Caching

| Resource | revalidate |
|---|---|
| `/community/[panel]` | 300s (5min ISR) |
| `/p/[slug]` | 3600s |
| `/sitemap.xml` | 600s |
| `/community/partners/rss.xml` | 600s |
| 명시적 `revalidatePath` | publish/withdraw 즉시 |

---

## 10. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|---|---|---|
| `customer-story` 코드 제거로 인한 회귀 | 빌드 깨짐 · 기존 SEO URL 404 | `/community/stories` redirect 유지 · 타입/repository/사용처 일괄 grep · CI에서 type-check 강제 |
| 운영진 CLI 발급 누락·오발급 | 무권한 파트너 글 발행 / 정상 파트너 거부 | `requirePartner` 서버 가드 단일화 · CLI에 `--dry-run` 옵션 · 발급 시 partners/{id}/events 로깅 |
| 파트너가 광고성·과장 표현 사용 | 브랜드 리스크 · SEO 스팸 | hygiene-guard 룰(과장 표현 차단) · 자가 발행 흐름이라 책임 명확 · v2 사용자 신고 플로우 |
| AI 생성 지연 >10s | 사용자 이탈 · 504 | 1 retry · 타임아웃 문구 · v2 백그라운드 큐 |
| PII 노출 (사진 EXIF·장소·인물) | 법적/윤리 | hygiene-guard PII 룰 · 업로드 UI 주의 문구 · EXIF strip(설계 단계 결정) |
| `posts` 비대화 | 쿼리 성능 | 복합 인덱스(`postType, publishStatus, createdAt`) · 커서 페이지네이션 |
| 비공개 draft 노출 | 미발행 글이 검색에 노출 | `publishStatus='published'` 쿼리 강제 · sitemap 제외 · `/p/[slug]` 본인+admin 외 404 · robots `/partner/` 차단 |
| 발행 중 publishStatus 경합 | 중복 publish 이벤트 | 서버에서 트랜잭션 상태 전이 검증 · revalidatePath 멱등 |
| 자동 발행 시 의도와 다른 콘텐츠 노출 | 브랜드 리스크 (검토 없이 즉시 공개) | 윈도우 설정은 파트너 본인 책임 + 모든 자동 발행 글은 hygiene 0.7 통과 + partners/{id}/events 감사로그 + 사후 철회(withdraw) 가능 |
| autoPublish 시간대 잘못 설정 (24h/잘못된 분 단위) | 의도치 않은 발행 또는 항상 비활성 | settings PATCH에서 zod 검증 (0≤min<1440, start<end, weekday 0-6) + UI에서 timepicker 강제 |
| 서버 시간대 혼선 (UTC vs KST) | 윈도우 판정 오류 | `auto-publish-window.ts`에서 명시적 KST 변환 + 단위 테스트 케이스 + `timezone: 'Asia/Seoul'` 고정 |

---

## 11. Success Metrics (Post-launch)

- Google Search Console: `/community/partners` 인덱싱 100% (1주 이내)
- partner-promo 발행글 평균 노출 키워드 수 (벤치: provider 글 동등)
- AI 생성 성공률 ≥ 85% (hygiene 통과율)
- 평균 생성 latency ≤ 8s (10s SLA)
- 발행 → 첫 노출 시간 (publishStatus 전이부터 ISR 갱신까지)
- v1 인증 파트너 활성률: 발급 → 30일 내 1건 이상 발행 ≥ 60%

---

## 12. Brainstorming Log

- **Q1 핵심 목적** → 의뢰업체 AI 보조 홍보 (인증 파트너 + AI 보조 + 본인 발행)
- **Q2 Target Users** → 인증권 마케팅 고객 (운영진 셀렉 B2B 파트너)
- **Q3 Success Metric** → SEO/유기검색 유입
- **Q4 발행 흐름** → 파트너 초고·편집 후 본인 발행 (기본). 운영진 승인 X
- **Approach 선택** → A (postType 교체 + customer-story 대체)
- **YAGNI 포함 (초안 12)** → I1–I4 · F1–F4 · S1–S4 (구조·작성 흐름·패널 SEO)
- **YAGNI 제외** → 셀프 가입, 댓글/좋아요, 다국어, 관리자 UI, A/B, 백그라운드 큐, 통계, 자동저장, 이미지 드래그, 발행 전 프리뷰, 신고 플로우
- **추가 요구 (Plan 수정 중)** → 시간대마다 검토 없이 자동 발행 옵션 ⇒ F5 추가
  - 적용 범위: 파트너별 계정 설정 (계정 기본값)
  - 시간 해석: 요일 + 시간 윈도우 (KST, 자정 넘김 v2)
  - hygiene-guard: 자동 발행에도 필수 (≥ 0.7)
  - YAGNI 최종 13개로 갱신
- **Section approvals** → Architecture ✓ · Components ✓ · Data Flow ✓ · Auto-Publish 추가 반영 ✓

---

## 13. Next Steps

1. `/pdca design partner-promo` — 상세 설계 문서 작성:
   - 와이어프레임 (PartnerPromoDraftForm · Editor · 본인 글 목록 · AutoPublishSettings)
   - API 계약 (요청/응답 스키마, 에러 코드 표 — `/api/partner/posts`, `/api/partner/settings`)
   - Firestore rules·indexes 최종 확정
   - hygiene-guard partner-promo 룰 상세
   - partner-promo Pro 프롬프트 템플릿
   - `customer-story` 제거 마이그레이션 체크리스트 (코드·DB·Storage)
   - autoPublish 윈도우 판정 단위 테스트 케이스 (KST · 자정 부근 · 빈 weekdays · 비활성)
2. Design 완료 후 `/pdca do partner-promo` — 구현 (Phase 1 schema → Phase 4 API → Phase 6 UI)
3. `/pdca analyze` (gap-detector) → `/pdca iterate` (필요 시) → `/pdca report`

---

**Plan Plus 완료 · Approval 기록**: Architecture ✅ · Components ✅ · Data Flow ✅
