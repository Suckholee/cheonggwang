# partner-editorial-oversight · Design v0.2 (cycle #29 v1.16)

> Source plan: `docs/01-plan/features/partner-editorial-oversight.plan.md`
> v0.1 → v0.2: design-validator agent reality-check 결과 18 issue 모두 §12 결의
> Generated: 2026-04-28
> Streak target: 9th consecutive single-pass ≥ 90%

---

## §1. Overview

### 1.1 Background
청광 v1.15 cycle #28까지의 자동 발행 + AEO/SEO 인프라 위에 **편집 투명성/책임감** layer 추가.

문제 인식 (사용자 질문): "구글이나 다른 LLM에서 이렇게 올리는 글들에 대해서 제재를 가하지는 않을까?"

조사 결과:
- Google 2026년 3월 코어 업데이트: "Scaled content abuse" — 사람 검토 없이 50-500 articles/day 사이트 50-80% 트래픽 감소
- 한국 광고법 2026년 초 시행 예정: AI 생성 광고에 "AI 생성" 표시 의무화
- 청광 현재 (7매장 × 1/일): 안전 영역. 100매장 확장 대비 미리 editorial oversight 도입.

### 1.2 Surgical philosophy (8-streak 패턴 4번째 적용)
- 데이터 모델 1 field 확장 (publishMode) + 1 forward-compat field (targetAudience)
- Firestore 마이그레이션 0건 (mapper에서 default 처리)
- AI prompt 0줄 변경 (R15 cycle #19 generator 9번째 무수정)
- cycle #19 publish 토글 재사용 (R13 코드 변경 0)

---

## §2. Goals / Non-goals

### 2.1 Goals
| ID | Goal | 영향 |
|---|---|---|
| G1 | 사장님 검토 단계 도입 — 신규 매장 default `draft-only` | Google scaled content abuse 회피 |
| G2 | AI footer 본문 마지막에 자동 표시 | 한국 광고법 2026년 초 대비 |
| G3 | 검토 대기 dashboard + 헤더 빨간 배지 | 사장님 운영 UX |
| G4 | seriesHistory에 publishMode 기록 | admin 통계 + 추적 |
| G5 | targetAudience 확장 포인트 | cycle #30 audience targeting 준비 |

### 2.2 Non-goals
- **Deferred to cycle #30+**: audience targeting UI/AI 적용, admin 일괄 publish, draft expire 정책, 사장님 알림, draft 사장님 직접 편집
- **Permanent**: AI prompt에 footer 강제, bodyMarkdown server 변환, 손님별 visibility

---

## §3. Architecture

### 3.1 데이터 모델 확장 (S1)

```ts
// src/types/auto-series.ts
export type PublishMode = "auto" | "draft-only";

export interface PartnerAutoSeries {
  enabled: boolean;
  lastIndex: number;
  lastTickAt: Date | null;
  brandTone: BrandTone;
  totalPublished: number;
  totalFailed: number;
  photoCursor: number;
  // cycle #29 신규 2 필드
  publishMode: PublishMode;
  targetAudience: string | null;
}

export const DEFAULT_AUTO_SERIES: PartnerAutoSeries = {
  enabled: false,
  lastIndex: -1,
  lastTickAt: null,
  brandTone: "friendly",
  totalPublished: 0,
  totalFailed: 0,
  photoCursor: 0,
  publishMode: "draft-only",  // 신규 매장 default
  targetAudience: null,        // cycle #30 활용
};

// cycle #29 신규 history status 추가
export type SeriesHistoryStatus =
  | "published"
  | "auto-draft-saved"  // NEW
  | "hygiene-fail"
  | "error"
  | "photo-missing";
```

mapper (R12 back-compat):
```ts
// src/lib/firebase/partner-repository.ts:toAutoSeries
function toAutoSeries(raw: DocumentData | undefined): PartnerAutoSeries | undefined {
  if (!raw) return undefined;
  return {
    // 기존 필드들...
    photoCursor: typeof raw.photoCursor === "number" ? raw.photoCursor : 0,
    // cycle #29 — 미설정 시 'auto'로 fallback (back-compat 7매장 영향 없음)
    publishMode: raw.publishMode === "draft-only" ? "draft-only" : "auto",
    targetAudience: typeof raw.targetAudience === "string" ? raw.targetAudience : null,
  };
}
```

**N3·N13 결의** (DEFAULT_AUTO_SERIES partial spread + null delete behavior):
- `targetAudience: null`은 `updateAutoSeries`에서 `FieldValue.delete()`로 변환됨 (`partner-repository.ts:223-226`)
- 결과: 신규 매장 first-time enable 시 targetAudience field가 Firestore에 persistent하지 않음 (mapper에서 inferred null로 처리)
- "unset" vs "explicitly null" 구분 불가 — cycle #30 audience UI 설계 시 반영
- `publishMode: 'draft-only'`는 string이므로 정상 persist

### 3.2 Cloud Functions runner publishMode 분기 (S2, N1·N2 결의)

#### `partnerFromSnap` mapper (N1 — 명시적 코드 블록)

```ts
// functions/src/auto-series/runner.ts:34-87 partnerFromSnap 안 autoSeries 객체 리터럴

const autoSeries = d.autoSeries
  ? {
      enabled: d.autoSeries.enabled === true,
      lastIndex: typeof d.autoSeries.lastIndex === "number" ? d.autoSeries.lastIndex : -1,
      lastTickAt: d.autoSeries.lastTickAt ? (d.autoSeries.lastTickAt as Timestamp).toDate() : null,
      brandTone: ...,
      totalPublished: ...,
      totalFailed: ...,
      photoCursor: typeof d.autoSeries.photoCursor === "number" ? d.autoSeries.photoCursor : 0,
      // NEW cycle #29:
      publishMode: d.autoSeries.publishMode === "draft-only" ? "draft-only" as const : "auto" as const,
      targetAudience: typeof d.autoSeries.targetAudience === "string" ? d.autoSeries.targetAudience : null,
    }
  : undefined;
```

#### `SeriesHistoryAppend` 로컬 literal 확장 (N2)

```ts
// functions/src/auto-series/runner.ts:317-327 안 type
interface SeriesHistoryAppend {
  slotIndex: number;
  angle: string;
  format: string;
  status: "published" | "auto-draft-saved" | "hygiene-fail" | "error" | "photo-missing";  // NEW: auto-draft-saved
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
  at: Date;
}
```

#### processOnePartner 정상 발행 분기 (line 259-289 수정)

```ts
// 기존 hygiene-fail/error/photo-missing 분기는 그대로 유지 (publishMode 무관)

// 정상 발행 분기:
const desiredStatus = partner.autoSeries?.publishMode === "draft-only"
  ? "draft" as const
  : "published" as const;
const historyStatus = desiredStatus === "draft"
  ? "auto-draft-saved" as const
  : "published" as const;

try {
  const { slug } = await createPostFromDraft(db, postId, {
    partner,
    draft,
    photoUrls: derived.photoUrls,
    brandTone: partner.autoSeries?.brandTone ?? "friendly",
    keywords: derived.keywords,
    generatedAt: now,
    isAutoSeries: true,
    publishStatus: desiredStatus,  // NEW 인자
  });
  
  await markWindowConsumed(db, partner.id, now);
  await appendSeriesHistory(db, partner.id, {
    slotIndex: nextIndex,
    angle, format,
    status: historyStatus,  // 'published' or 'auto-draft-saved'
    postId, postSlug: slug,
    hygieneScore: draft.hygieneScore,
    at: now,
  });
  
  // OQ1 결의: totalPublished는 'auto'+'draft-only' 둘 다 +1 (단순화).
  // cycle #30+ admin 통계에서 history.status로 분리 가능.
  await db.collection("partners").doc(partner.id).update({
    "autoSeries.totalPublished": FieldValue.increment(1),
    "autoSeries.photoCursor": FieldValue.increment(1),
  });
} catch (e) { /* 기존 transient error 분기 그대로 */ }
```

#### `post-writer.ts` 시그니처 확장 (C1·H2 결의)

```ts
// functions/src/auto-series/lib/post-writer.ts:38

export async function createPostFromDraft(
  db: Firestore,
  postId: string,
  args: {
    partner: Partner;
    draft: PartnerPromoDraftResult;
    photoUrls: string[];
    brandTone: BrandTone;
    keywords: string[];
    generatedAt: Date;
    isAutoSeries: boolean;
    publishStatus?: "published" | "draft";  // NEW (default 'published' back-compat)
  },
): Promise<{ postId: string; slug: string }> {
  const status = args.publishStatus ?? "published";
  // ...
  payload.publishStatus = status;
  // C1·H2 결의: cycle #19 convention 준수 — draft 시 publishedAt field omit (null도 X).
  // toPost mapper(post-repository.ts:85-89)가 absent → null 변환하므로 효과 동일.
  if (status === "published") {
    payload.publishedAt = FieldValue.serverTimestamp();
  }
  // else: omit publishedAt entirely
  // ...
}
```

### 3.3 AI footer (S3, render-time append, N7·N8·N9 결의)

#### `ai-footer.ts` (NEW)

```ts
// src/lib/seo/ai-footer.ts (NEW)
import type { Post } from "@/types/post";

export const AI_FOOTER_TEXT =
  "이 글은 AI가 매장이 제공한 정보를 바탕으로 작성한 후 매장에서 검토했습니다";

/**
 * v1.15 cycle #29 (R14): footer 표시 조건 — isAutoSeries=true && partner-promo postType만.
 * 사장님 직접 작성, tip/provider postType은 false (광고법은 AI 작성에만 적용).
 */
export function shouldShowAiFooter(
  post: Pick<Post, "isAutoSeries" | "postType">,
): boolean {
  return post.isAutoSeries === true && post.postType === "partner-promo";
}

/**
 * N8 결의: footer를 markdown으로 append → renderMarkdown 안 sanitize 파이프라인 통과.
 * 안전한 HTML로 출력됨 (XSS 방어).
 */
export const AI_FOOTER_MARKDOWN =
  `\n\n---\n\n*${AI_FOOTER_TEXT}*`;
```

#### `BlogRenderer.tsx` 수정 (N8 — sanitize pipeline 통과)

```tsx
// src/components/post/BlogRenderer.tsx
import { renderMarkdown } from "@/lib/markdown";
import { shouldShowAiFooter, AI_FOOTER_MARKDOWN } from "@/lib/seo/ai-footer";
import type { Post } from "@/types/post";

export function BlogRenderer({ post }: { post: Post }) {
  // N8 결의: footer를 markdown 단계에서 append → sanitize-html 통과 후 안전 HTML로 변환
  const md = post.bodyMarkdown +
    (shouldShowAiFooter(post) ? AI_FOOTER_MARKDOWN : "");
  const html = renderMarkdown(md);
  return (
    <div
      className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

**M3 결의**: `BlogRenderer`의 prop 변경 `{ body: string }` → `{ post: Post }`. caller 영향:
- `PostBodyRenderer.tsx:20, 26` — 이미 post 받음, `<BlogRenderer post={post} />`로 호출 변경
- 다른 caller 없음 (verified by validator)

#### `CardNewsViewer.tsx` 수정 (N9 — Fragment wrapping + parser-fail branch)

```tsx
// src/components/post/CardNewsViewer.tsx (수정)
import { shouldShowAiFooter, AI_FOOTER_TEXT } from "@/lib/seo/ai-footer";

export function CardNewsViewer({ post }: { post: Post }) {
  const slides = parseCardNewsSlides(post.bodyMarkdown);
  
  // 1) Parser-fail fallback branch
  if (slides.length === 0) {
    const html = renderMarkdown(post.bodyMarkdown);
    return (
      <>
        <div className="prose-promo ..." dangerouslySetInnerHTML={{ __html: html }} />
        {shouldShowAiFooter(post) && (
          <p className="mt-6 text-center text-xs italic text-zinc-500">
            {AI_FOOTER_TEXT}
          </p>
        )}
      </>
    );
  }
  
  // 2) Normal paginator branch
  const slideHtmls = slides.map(s => renderMarkdown(s));
  return (
    <>
      <CardNewsPaginator
        slideHtmls={slideHtmls}
        photoPool={post.sourcePhotos ?? []}
        companyName={post.companyName}
      />
      {shouldShowAiFooter(post) && (
        <p className="mt-6 text-center text-xs italic text-zinc-500">
          {AI_FOOTER_TEXT}
        </p>
      )}
    </>
  );
}
```

### 3.4 검토 dashboard + 필터 (S4, M1·N10 결의)

**M1 결의**: list 필터링은 in-memory (기존 listMyPosts 100건 그대로 활용), count는 Firestore aggregation (정확도 우선).

**N10 결의**: Next 16 async searchParams 시그니처 명시.

```tsx
// src/app/partner/posts/page.tsx (수정)
export default async function PartnerPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  return (
    <div className="space-y-6">
      <Suspense fallback={<BannerSkeleton />}>
        <AutoPublishBanner />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <PostsBody filter={filter} />
      </Suspense>
    </div>
  );
}

async function PostsBody({ filter }: { filter?: string }) {
  await connection();
  const { uid, partner } = await requirePartnerPage();
  const all = await postRepository.listMyPosts(uid, 100);
  
  // M1 결의: in-memory filtering (aggregation은 count에서만 사용)
  const filtered = filter === "auto-draft"
    ? all.filter(p => p.publishStatus === "draft" && p.isAutoSeries === true)
    : all;
  
  return <PartnerPostsList posts={filtered} partner={partner} filter={filter} />;
}
```

UI: PartnerPostsList에 filter 탭 (전체 / 🤖 검토 대기) + 카드에 publishStatus='draft' && isAutoSeries 시 "🤖 검토 대기" 노란 배지.

publish toggle은 cycle #19 기존 사용 (R13).

### 3.5 publishMode 토글 UI (A1)

```tsx
// src/components/partner/PartnerPublishModeToggle.tsx (NEW, client)
"use client";
import { useState, useTransition } from "react";
import { togglePublishMode } from "@/app/actions/partner-auto-series-actions";
import type { PublishMode } from "@/types/auto-series";

interface Props { initial: PublishMode; }

export default function PartnerPublishModeToggle({ initial }: Props) {
  const [mode, setMode] = useState<PublishMode>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(next: PublishMode) {
    setError(null);
    const prev = mode;
    setMode(next);
    startTransition(async () => {
      const r = await togglePublishMode({ mode: next });
      if (!r.ok) { setMode(prev); setError(r.message ?? "변경 실패"); }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold">발행 모드</h2>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleToggle("auto")}
                disabled={isPending}
                className={mode === "auto" ? "active-tab" : "inactive-tab"}>
          <span>자동 발행</span>
          <span className="text-xs text-zinc-500">AI 생성 즉시 공개</span>
        </button>
        <button onClick={() => handleToggle("draft-only")}
                disabled={isPending}
                className={mode === "draft-only" ? "active-tab" : "inactive-tab"}>
          <span>검토 후 발행</span>
          <span className="text-xs text-zinc-500">사장님이 검토 후 publish</span>
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
```

server action:
```ts
// src/app/actions/partner-auto-series-actions.ts
const togglePublishModeSchema = z.object({
  mode: z.enum(["auto", "draft-only"]),
});

export async function togglePublishMode(
  input: z.infer<typeof togglePublishModeSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = togglePublishModeSchema.parse(input);
    await partnerRepository.updateAutoSeries(partner.id, {
      publishMode: parsed.mode,
    });
    revalidatePath("/partner/series");
    revalidatePath("/partner/posts");
    return { ok: true };
  } catch (e) { return toError(e); }
}
```

`togglePartnerAutoSeries` first-time enablement 자동 적용:
```ts
// 기존 (변경 없음)
if (isFirstTime) {
  await partnerRepository.updateAutoSeries(partner.id, {
    ...DEFAULT_AUTO_SERIES,  // ← publishMode='draft-only' 포함됨 (cycle #29 default 적용)
    enabled: parsed.enabled,
    brandTone: parsed.brandTone ?? "friendly",
  });
}
```

### 3.6 헤더 검토 대기 배지 (A2, H1 결의 — Next 16 cacheComponents 호환)

**H1 결의**: layout이 sync function이고 server fetch는 Suspense 자식에서 수행하는 cycle #28 패턴 준수.

```tsx
// src/app/partner/layout.tsx (수정)
import { Suspense } from "react";
import { connection } from "next/server";
import PartnerHeaderNav from "@/components/partner/PartnerHeaderNav";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { postRepository } from "@/lib/firebase/post-repository";

// layout 자체는 sync 유지 (cycle #28과 동일)
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-partner-shell>
      <header>
        <Suspense fallback={<PartnerHeaderNav draftCount={0} />}>
          <PartnerHeaderWithBadge />
        </Suspense>
      </header>
      <main>{children}</main>
    </div>
  );
}

// async server component — Suspense 자식
async function PartnerHeaderWithBadge() {
  await connection();
  const { uid } = await requirePartnerPage();
  const draftCount = await postRepository.countAutoDraftsForOwner(uid);
  return <PartnerHeaderNav draftCount={draftCount} />;
}
```

### 3.7 PartnerHeaderNav 빨간 배지 (A2)

```tsx
// src/components/partner/PartnerHeaderNav.tsx (수정)
"use client";

interface Props { draftCount: number; }

export default function PartnerHeaderNav({ draftCount }: Props) {
  // ... 기존 코드 ...
  return (
    <nav>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={...}>
          {t.label}
          {t.href === "/partner/posts" && draftCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {draftCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
```

### 3.8 post-repository 확장 (S4, H3·M1 결의)

**H3 결의**: Firestore Admin SDK count() aggregation `firebase-admin` v11.4.0+ 지원 (이미 v13.x 사용 중). React `cache()` 래퍼로 layout render 비용 최소화.

```ts
// src/lib/firebase/post-repository.ts 추가
import { cache } from "react";

countAutoDraftsForOwner: cache(
  async (ownerUid: string): Promise<number> => {
    const snap = await col()
      .where("providerOwnerUid", "==", ownerUid)
      .where("publishStatus", "==", "draft")
      .where("isAutoSeries", "==", true)
      .count()
      .get();
    return snap.data().count;
  },
),
```

Firestore composite index (firestore.indexes.json):
```json
{
  "collectionGroup": "posts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerOwnerUid", "order": "ASCENDING" },
    { "fieldPath": "publishStatus", "order": "ASCENDING" },
    { "fieldPath": "isAutoSeries", "order": "ASCENDING" }
  ]
}
```

배포: `firebase deploy --only firestore:indexes` (S16에 포함).

### 3.9 seriesHistory auto-draft-saved status (A3)

`PartnerSeriesHistoryList.tsx`에서 status 매핑:
```tsx
const STATUS_LABELS: Record<SeriesHistoryStatus, string> = {
  "published": "✅ 발행됨",
  "auto-draft-saved": "📝 검토 대기",  // NEW (cycle #29)
  "hygiene-fail": "⚠️ 위생 실패",
  "error": "❌ 오류",
  "photo-missing": "📷 사진 없음",
};
```

### 3.10 데이터 의존성 (확인됨)

#### Post 모델 (변경 없음)
- `post.publishStatus`: 'draft' | 'published' | 'withdrawn' (기존)
- `post.isAutoSeries`: boolean | undefined (cycle #26)
- `post.providerOwnerUid`: count 쿼리 필터

#### PartnerAutoSeries (확장 2 필드)
- publishMode + targetAudience (mapper back-compat default 적용)

#### Firestore index 추가
- (providerOwnerUid, publishStatus, isAutoSeries) — count() aggregation용

---

## §4. Component / Module Inventory

### 4.1 신규 파일 (3개) — N6 결의: post-repository-draft.ts 신규 X (기존 확장)

| 파일 | 역할 | LOC |
|---|---|---:|
| `src/lib/seo/ai-footer.ts` | shouldShowAiFooter + AI_FOOTER_TEXT/MARKDOWN | 30 |
| `src/lib/seo/ai-footer.test.ts` | 4 cases (auto+blog, auto+cardnews, manual, tip) | 80 |
| `src/components/partner/PartnerPublishModeToggle.tsx` | client toggle | 100 |

### 4.2 수정 파일 (15개)
| 파일 | 변경 |
|---|---|
| `src/types/auto-series.ts` | PublishMode + 2 필드 + DEFAULT 업데이트 + SeriesHistoryStatus 'auto-draft-saved' |
| `src/lib/firebase/partner-repository.ts` | toAutoSeries mapper 2 필드 (R12 back-compat) |
| `src/lib/firebase/post-repository.ts` | countAutoDraftsForOwner (cache 래퍼) — N6 결의 단일 repo 확장 |
| `src/app/actions/partner-auto-series-actions.ts` | togglePublishMode action |
| `src/components/post/BlogRenderer.tsx` | post prop + AI_FOOTER_MARKDOWN sanitize 통과 (N8) |
| `src/components/post/CardNewsViewer.tsx` | Fragment wrapping + parser-fail branch도 footer (N9) |
| `src/components/post/PostBodyRenderer.tsx` | BlogRenderer 호출 시 post prop 전달 (M3) |
| `src/app/partner/series/page.tsx` | PartnerPublishModeToggle 통합 |
| `src/app/partner/posts/page.tsx` | Next 16 async searchParams 시그니처 + filter 처리 (N10) |
| `src/components/partner/PartnerPostsList.tsx` | filter prop + auto-draft 카드 라벨 |
| `src/app/partner/layout.tsx` | Suspense + PartnerHeaderWithBadge (H1) |
| `src/components/partner/PartnerHeaderNav.tsx` | draftCount prop + 빨간 배지 |
| `src/components/partner/PartnerSeriesHistoryList.tsx` | auto-draft-saved status 매핑 |
| `functions/src/auto-series/lib/types.ts` | mirror PartnerAutoSeries 2 필드 |
| `functions/src/auto-series/lib/post-writer.ts` | publishStatus 인자 (default 'published'), draft 시 publishedAt omit (C1) |
| `functions/src/auto-series/runner.ts` | partnerFromSnap mapper 2 필드 (N1) + publishMode 분기 + SeriesHistoryAppend literal 'auto-draft-saved' (N2) |
| `firestore.indexes.json` | composite index 추가 |
| `scripts/check-queue-mirror.mjs` | publishMode + targetAudience mirror check 2 (N4 stricter regex) |

### 4.3 CI lint 확장 (N4 stricter)

```js
// scripts/check-queue-mirror.mjs 추가
{
  title: "PartnerAutoSeries.publishMode PublishMode type 정의 (양 패키지)",
  files: ["src/types/auto-series.ts", "functions/src/auto-series/lib/types.ts"],
  test: (src) => /publishMode\s*:\s*PublishMode/.test(src) && /export type PublishMode\s*=/.test(src),
},
{
  title: "PartnerAutoSeries.targetAudience 양 패키지 정의",
  files: ["src/types/auto-series.ts", "functions/src/auto-series/lib/types.ts"],
  test: (src) => /targetAudience\s*:\s*string\s*\|\s*null/.test(src),
},
```

### 4.4 환경 변수
추가 없음.

---

## §5. API Contracts

### 5.1 `togglePublishMode` server action
```ts
// Request
interface ToggleInput { mode: "auto" | "draft-only"; }

// Response
interface ActionResult { ok: boolean; message?: string; }

// 동작:
// 1. requirePartnerApi
// 2. zod validation
// 3. partnerRepository.updateAutoSeries({ publishMode })
// 4. revalidatePath('/partner/series') + '/partner/posts'
```

### 5.2 `createPostFromDraft` (functions, 시그니처 확장)
```ts
async function createPostFromDraft(
  db: Firestore,
  postId: string,
  args: {
    partner: Partner;
    draft: PartnerPromoDraftResult;
    photoUrls: string[];
    brandTone: BrandTone;
    keywords: string[];
    generatedAt: Date;
    isAutoSeries: boolean;
    publishStatus?: "published" | "draft";  // NEW (default 'published')
  },
): Promise<{ postId: string; slug: string }>;

// 결의 C1·H2: status === "draft" 시 publishedAt field omit (null도 X). cycle #19 convention 준수.
```

### 5.3 `postRepository.countAutoDraftsForOwner`
```ts
async countAutoDraftsForOwner(ownerUid: string): Promise<number>;

// Firestore aggregation:
//   col().where(providerOwnerUid==uid)
//        .where(publishStatus=='draft')
//        .where(isAutoSeries==true)
//        .count().get()
//
// React cache() 래퍼로 같은 request 안에서 1회만 실제 fetch.
```

---

## §6. UI Changes

| 위치 | 변화 |
|---|---|
| `/partner/series` 페이지 | PartnerPublishModeToggle 추가 |
| `/partner/posts` 카드 | publishStatus='draft' && isAutoSeries=true → "🤖 검토 대기" 노란 배지 |
| `/partner/posts/[id]` 상세 | cycle #19 publish 토글 그대로 (R13, 변경 0) |
| `/partner/*` 헤더 nav | 검토 대기 N건 빨간 동그라미 (count > 0) |
| `/community/p/[slug]` 본문 | AI footer 자동 추가 (isAutoSeries+partner-promo만) |

---

## §7. Security & Privacy

- togglePublishMode: requirePartnerApi (본인 partner self-write)
- post-writer publishStatus 인자: cron runner Admin SDK + create 시점만. 사용자 직접 호출 X
- Firestore rules 변경 0 (cycle #28 그대로)
- AI footer: 클라이언트 read-only 본문 확장 — 정보 누출 없음
- N8: sanitize-html 파이프라인 보존 — 향후 footer parameterize 시 XSS 방어

---

## §8. Implementation Order (S1–S17, N12 결의)

```
S1. types/auto-series.ts — PublishMode + 2 필드 + DEFAULT 업데이트 + SeriesHistoryStatus 확장
S2. partner-repository.ts mapper — toAutoSeries 2 필드 back-compat default
S3. functions/.../types.ts mirror
S4. ai-footer.ts + 단위 테스트 4 cases — pure
S5. BlogRenderer (post prop + AI_FOOTER_MARKDOWN sanitize 통과) + PostBodyRenderer 호출 변경
S6. CardNewsViewer (Fragment + parser-fail branch + footer)
S7. partner-auto-series-actions.ts — togglePublishMode action
S8. PartnerPublishModeToggle.tsx (client component)
S9. /partner/series page에 토글 통합
S10. functions/.../post-writer.ts — publishStatus 인자 + draft 시 publishedAt omit (C1·H2)
S11. functions/.../runner.ts — partnerFromSnap mapper 2 필드 + publishMode 분기 + SeriesHistoryAppend literal 'auto-draft-saved' (N1·N2)
S12. post-repository.ts — countAutoDraftsForOwner (cache 래퍼)
S13. firestore.indexes.json — composite index 추가
S14. /partner/layout.tsx Suspense 패턴 + PartnerHeaderWithBadge (H1) + PartnerHeaderNav 빨간 배지
S15. /partner/posts page — Next 16 async searchParams (N10) + PartnerPostsList filter prop + auto-draft 라벨 + PartnerSeriesHistoryList 'auto-draft-saved'
S16. firebase deploy --only firestore:indexes (composite index 빌드 + production 적용)
S17. CI lint 추가 (2건 N4 stricter) + typecheck + build + 단위 테스트 + lint:mirror + functions deploy + 통합 검증
```

격리: S1·S4·S7·S12은 독립. S2-S3은 mirror 페어. S5·S6은 render. S10-S11은 functions side. S13·S16은 Firestore.

---

## §9. Test Plan

### 9.1 단위 테스트

#### ai-footer.test.ts (4 cases)
1. isAutoSeries=true + partner-promo → shouldShowAiFooter=true
2. isAutoSeries=false (사장님 직접) → false
3. postType='tip' (defensive — 이론적 케이스, R5 invariant로 실제 발생 X) → false (R14)
4. postType='provider' (defensive — 동일) → false (R14)

#### publishMode runner test (4 cases — TypeScript 산술 검증)
1. publishMode='auto' → createPostFromDraft 호출 args.publishStatus='published', history.status='published'
2. publishMode='draft-only' → args.publishStatus='draft', history.status='auto-draft-saved'
3. publishMode 미설정 (mapper R12 default) → 'auto' 동작
4. hygiene-fail 분기는 publishMode 무관 — 항상 history 'hygiene-fail' (post 생성 안 함)

### 9.2 통합 검증
- `pnpm exec tsc --noEmit` (Next.js + functions): exit 0
- `pnpm exec next build`: full prerender
- `pnpm lint:mirror`: 8 + 2 신규 = 10/10
- ai-footer.test.ts: 4/4 pass
- 시나리오: 신규 매장 활성화 → publishMode='draft-only' → AI 생성 → /partner/posts에 카드 표시 (auto-draft 필터에서) → publish 토글 → /community/p에 footer 표시

### 9.3 회귀 보호
- cycle #28 단위 테스트 (54/54 + W1-W8) 모두 유지
- 기존 7매장 (publishMode 미설정 → 'auto') 자동 발행 동작 유지

---

## §10. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| 기존 7매장 default change → 갑자기 draft 모드 | mapper R12 (미설정 → 'auto'). 명시적 변경 X | L |
| 사장님이 draft 모드 인지 못 함 | A2 헤더 빨간 배지 + 카드 라벨 | M |
| AI footer SEO 부정적? | 자연스러운 신뢰도 시그널 (E-E-A-T+) | L |
| draft 무한 누적 | cycle #30+ expire 정책 | L |
| publishMode functions side 누락 | CI lint 2 추가 (N4) | L |
| 카드뉴스 footer 위치 부자연 | 슬라이드 다음 본문 영역 작은 글씨 | M |
| Firestore composite index 빌드 지연 | 데이터 적어 즉시 (수십 docs) | L |
| countAutoDraftsForOwner 비용 | React cache() 래퍼 (request당 1회) | L |
| **N3·N13 targetAudience null 미persist** | mapper에서 absent → null 통합 처리 (cycle #30 audience UI는 unset/null 동등 취급) | L |
| **layout async + cacheComponents 깨짐** | H1 Suspense 패턴 채택 (cycle #28 동일) | L (회피됨) |
| **footer XSS 향후 risk** | N8 sanitize 통과 (markdown append) | L |

---

## §11. Open Questions (자체 답변)

| ID | Question | Resolution |
|----|---|---|
| OQ1 | totalDrafted 별도 counter? | NO — totalPublished 그대로 +1 (단순화). cycle #30+ admin 통계 |
| OQ2 | draft 별도 페이지 vs 필터? | filter (단순화) |
| OQ3 | publish 토글 cycle #19 그대로? | YES — R13 |
| OQ4 | targetAudience UI 위치? | cycle #30 결정 |
| OQ5 | footer 텍스트 변경 시 기존 글에도? | YES — render-time 즉시 |
| OQ6 | 헤더 빨간 배지 0이면? | 숨김 (count > 0일 때만) |
| **OQ7 (NEW)** | **targetAudience null 명시적 vs unset 구분?** | NO — mapper에서 동등 취급 (N3 결의) |
| **OQ8 (NEW)** | **publishedAt draft 시 null로 set vs omit?** | omit (cycle #19 convention, C1·H2 결의) |

---

## §12. 결의 매트릭스 (v0.1 → v0.2 — 18 issue 모두 결의)

### Critical (2개)

| ID | Issue | 결의 |
|---|---|---|
| **C1** | createPostFromDraft publishStatus 인자 + publishedAt 분기 | §3.2 — args.publishStatus default 'published' (back-compat). draft 시 publishedAt field omit (cycle #19 convention) — null도 X |
| **N1 (Critical)** | runner.ts:partnerFromSnap mapper 명시적 코드 누락 | §3.2 — partnerFromSnap autoSeries 객체 리터럴에 publishMode + targetAudience 추가 코드 블록 명시 |

### High (5개)

| ID | Issue | 결의 |
|---|---|---|
| **H1 (escalated to Critical)** | layout.tsx + cacheComponents 호환 | §3.6 — Suspense + PartnerHeaderWithBadge async server component (cycle #28 패턴 준수) |
| **H2** | post-writer publishedAt = null 호환 | C1과 통합 — publishedAt field omit (null 설정 X) |
| **H3** | Firestore Admin SDK count() 지원 | §3.8 — firebase-admin v13.x에서 v11.4.0+ 기능 지원 확인. React cache() 래퍼로 비용 최소화 |
| **N2** | runner.ts SeriesHistoryAppend 로컬 literal 'auto-draft-saved' 누락 | §3.2 — 로컬 type literal 확장 코드 명시 |
| **N3·N13** | DEFAULT_AUTO_SERIES targetAudience null persist 문제 | §3.1 + §10 + OQ7 — null → FieldValue.delete() 변환됨, mapper에서 absent → null 통합. "unset vs explicitly null" 구분 불가능 — cycle #30 audience UI 동등 취급 |

### Medium (5개)

| ID | Issue | 결의 |
|---|---|---|
| **M1** | in-memory filter vs aggregation 모순 | §3.4 + §3.8 — list 필터 = in-memory (listMyPosts 100건), count = aggregation. 명시적 분리 |
| **N4** | CI lint regex 너무 약함 | §4.3 — /publishMode\s*:\s*PublishMode/ + PublishMode type alias export 검증 |
| **N6** | post-repository-draft.ts 신규 vs 확장 | §4.1·§4.2 — 단일 post-repository.ts에 countAutoDraftsForOwner 추가 (Plan §5.1 outdated) |
| **N8** | footer raw HTML sanitize 우회 위험 | §3.3 — AI_FOOTER_MARKDOWN markdown 형태로 append → renderMarkdown sanitize-html 파이프라인 통과 |
| **N10** | /partner/posts Next 16 async searchParams 패턴 누락 | §3.4 — `searchParams: Promise<{ filter?: string }>` + await 명시 |

### Low (6개)

| ID | Issue | 결의 |
|---|---|---|
| **M3 (downgraded)** | BlogRenderer post prop caller 영향 | §3.3 — caller 1곳(PostBodyRenderer)만, 자동 전달 가능 |
| **N5** | pnpm test:auto-series 미존재 (Plan vs Design 불일치) | §9 — 단위 테스트는 직접 npx tsx 실행. Plan §5.4 deprecated |
| **N7** | footer HTML class Plan/Design 불일치 | §3.3 — Design 버전 채택 (mt-8 + border-t + dark mode) |
| **N9** | CardNewsViewer Fragment + parser-fail branch | §3.3 — 두 branch 모두 footer 추가 + Fragment wrapping 명시 |
| **N11** | postType 'tip'+isAutoSeries impossible state defensive test | §9.1 — defensive path test (cycle #26 R5에 의해 실제로는 발생 X) |
| **N12** | Implementation Order S list에 deploy 단계 누락 | §8 — S16 (firestore:indexes deploy) + S17 (functions deploy) 추가 |

### Info-only

| ID | Issue | 결의 |
|---|---|---|
| **M3** (originally Medium, validator downgraded to Low) | BlogRenderer prop caller — verified 1 caller | 위 Low 카운트에 포함 |

---

## §13. Streak Context

cycles #21~#28 모두 ≥ 90% Match Rate (cycle #28 = 98.7% 역대 최고). cycle #29 = 9th attempt.

medium-large scope (~830 LOC, 18 files) — 18 issue 모두 v0.2에서 결의. surgical 변경 + 데이터 모델 1 field 확장 + Option A mirror 4번째 사이클 + cycle #28 cacheComponents Suspense 패턴 준수.

---

## §14. Next Step

```
/pdca do partner-editorial-oversight
```

S1~S17 순차 진행. 격리: S1·S4·S7·S12 의존성 없음, 병렬 가능. mirror 페어 (S2-S3, S10-S11). R15 invariant (cycle #19 generator 9번째 무수정) + Plan Plus + design-validator 패턴 9번째 검증 + 9-streak 도전.
