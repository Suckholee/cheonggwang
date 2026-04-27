# Design · partner-content-formats

> **Status**: v0.2 (design-validator 응답 반영 — Critical 5 + High 8 + Medium 7 + Low 5 모두 결의)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.12
> **Author**: Seokho Lee
> **Date**: 2026-04-27
> **PDCA Cycle**: #25
> **Plan Source**: `docs/01-plan/features/partner-content-formats.plan.md` (v1.0 Plan Plus)

---

## 0. Plan vs Design Reconciliation (R1–R5)

| ID | Plan Invariant | Design 반영 |
|----|----------------|-------------|
| R1 | cycle #19 LLM 진입점 시그니처 변경 0건 | §3.1 — **외부 진입점 `generatePartnerPromoDraft`**의 input 타입 `GeneratePartnerPromoInput`에 `format?: PostFormat`·`templateContext?: string` optional 필드만 추가. 내부 helper `composeDraft`의 args object에 동일한 두 optional 필드 추가. 기존 호출자(레거시 cycle #19/#24)는 두 필드 미지정 → 'blog' 동작과 동일 (regression 0) |
| R2 | cycle #24 ContentTemplate 모델 변경 0건 | §2.4 — 모델·rules·indexes 그대로. 파트너 측 read·표시 추가만 (queryByIndustry는 cycle #24 그대로 사용) |
| R3 | published 글은 /preview 차단 | §6.3 — **C5 결의: 별도 /preview 페이지 신설 X.** `/community/p/[slug]`가 이미 publishStatus 분기로 owner draft preview를 제공하므로 카드 라우팅을 항상 `/community/p/{slug}`로 통합. published는 자동으로 정상 페이지, draft·withdrawn은 owner-only 미리보기 + noindex 배너 (기존 동작) |
| R4 | 본인 글 또는 admin만 미리보기 접근 | §6.3 — `/community/p/[slug]/page.tsx:73-122`의 `tryVerifySessionCookie` 가드 그대로 사용. 추가 변경 없음 (이미 owner check 구현되어 있음). admin draft 미리보기는 OOS (cycle #26 후보) |
| R5 | 카드 클릭 라우팅 정확성 | §5.2 — `resolveCardHref(p) = /community/p/${p.slug}` 단일 함수. 모든 status가 동일 경로 (status-aware UX는 페이지 내부에서 노출) |

---

## 1. File Inventory

### 1.1 신규 파일 (12)

| # | 경로 | 역할 |
|---|------|------|
| 1 | `src/domain/post-format.ts` | `PostFormat` type, `POST_FORMATS`, label/emoji map, `isPostFormat` guard |
| 2 | `src/lib/post/post-format-fallback.ts` | 레거시 post → format='blog' fallback (R1 안전망) |
| 3 | `src/lib/post/extract-excerpt.ts` | summary80 미존재 시 markdown → 80~120자 plain text fallback |
| 4 | `src/lib/post/parse-card-news-slides.ts` | `'\n@@SLIDE@@\n'` 구분자 → string[] 슬라이드 (M2 결의: markdown HR과 충돌 회피용 distinct separator) |
| 5 | `src/lib/llm/card-news-generator.ts` | 카드뉴스 슬라이드 형식 system instruction + post-process 검증 |
| 6 | `src/lib/llm/template-context.ts` | 선택된 템플릿 body를 `templateContext` 문자열로 직렬화 |
| 7 | `src/components/post/PostBodyRenderer.tsx` | format 분기 진입점 — Server Component (renderMarkdown은 server-only) |
| 8 | `src/components/post/BlogRenderer.tsx` | (H3 결의) PostDetailView에서 본문 렌더 부분만 추출. server component, sanitized HTML div + prose-promo class |
| 9 | `src/components/post/CardNewsViewer.tsx` | **server wrapper** — slides[] 각각 renderMarkdown으로 미리 HTML 생성, client paginator에 prop으로 전달 (H1 결의) |
| 10 | `src/components/post/CardNewsPaginator.tsx` | client component — pre-rendered HTML 배열 받아 scroll-snap + dots indicator + 키보드 네비 |
| 11 | `src/components/partner/PartnerPostCard.tsx` | 카드 1개 (커버·발췌·format/tags 배지·status·작성일) |
| 12 | `src/components/partner/PartnerPostsNewWizard.tsx` | 3-step Wizard 컨테이너 (client) — Step1·Step2 분리 컴포넌트 포함 |

### 1.2 수정 파일 (10)

| 파일 | 변경 |
|------|------|
| `src/types/post.ts` | `Post.format?: PostFormat`, `Post.templateId?: string`, `Post.templateScenarios?: string[]` 추가 (모두 optional, 레거시 친화). H7 결의: `templateTags` 대신 사용자 친화 한국어 라벨인 `templateScenarios`만 표시 (예: "신규 오픈"). 내부 검색·analytics용 tags는 generationMeta로 이동 |
| `src/types/post.ts` | `GenerationMeta.templateTags?: string[]` 추가 (analytics·디버그용 — UI 미노출) |
| `src/lib/llm/partner-promo-generator.ts` | (1) `GeneratePartnerPromoInput`에 `format?: PostFormat`, `templateContext?: string` 추가. (2) 내부 `composeDraft` args object에 동일 두 필드 추가. (3) `buildComposePrompt`에서 `format === 'card-news'`이면 `buildCardNewsInstruction()`을 system instruction 끝에 append + `composeSchema.bodyMarkdown.description` 런타임 override (M6 결의). (4) `templateContext` 비공백이면 `ragContextSection` 다음에 결합. (5) format='card-news' 결과는 `validateCardNewsBody`로 검증, 실패 시 같은 함수 안에서 1회 재호출 — HTTP roundtrip 0 (H6 결의) |
| `src/app/api/partner/posts/route.ts` | (C4 결의) FormData 파서 `validateForm`에 `format`·`templateId` 두 필드 추가 (text fields). `generatePartnerPromoDraft` 호출 시 두 값 전달. 응답 post doc에 `format`·`templateId`·`templateScenarios` 저장. **rate-limit 호출 위치 그대로** — 1 HTTP 요청 = 1 차감 (H6 보장) |
| `src/lib/firebase/post-repository.ts` | create 시 format·templateId·templateScenarios optional 저장. read 시 별도 처리 없음(타입 optional이므로 자연 통과) |
| `src/components/partner/PartnerPostsList.tsx` | 텍스트 리스트 → 카드 그리드. status별 그룹핑 유지 |
| `src/app/partner/posts/page.tsx` | postRepository.listMyPosts 결과 + `partner.profile?.photoUrls?.[0]`을 PartnerPostsList에 전달 |
| `src/app/partner/posts/new/page.tsx` | 기존 폼 → `<PartnerPostsNewWizard partner={partner} />` 사용 |
| `src/components/community/PostDetailView.tsx` | (H2 결의) **본문 div 영역만** `<PostBodyRenderer post={post} />`로 교체. 헤더·커버 이미지·summary·JSON-LD·prose-promo 컨테이너 모두 보존. partner-promo 외 postType은 `format` 무시 → 항상 BlogRenderer (PostBodyRenderer 내부에서 분기) |
| `src/components/partner/PartnerPromoDraftForm.tsx` | Wizard로 흡수 → 본 컴포넌트는 Step3 입력 영역만 담당하도록 슬림화. Step3 컴포넌트로 추출 또는 props 확장 |

### 1.3 신규 server actions (2건, §4 참조)

| 파일 | actions |
|------|---------|
| `src/app/actions/partner-templates-actions.ts` | `listTemplatesForPartner({ industry, type })` — partner-callable, 인증된 파트너만 (H4 결의) |

총 신규 13 파일 (12 컴포넌트/유틸 + 1 actions). 수정 10 파일.

### 1.4 인프라

| 자산 | 변경 |
|------|------|
| `firestore.rules` | **변경 없음**. posts는 Admin SDK only write 정책 (`src/types/post.ts:9` 주석). 추가 필드는 server-write only이므로 allowlist 갱신 불필요. M7 보강: 만약 향후 client write 허용 시 `format`·`templateId`·`templateScenarios` 화이트리스트 추가 필요 — 코멘트로 명시 |
| `firestore.indexes.json` | 변경 없음. listMyPosts·queryByIndustry 모두 기존 인덱스 사용 |
| `storage.rules` | 변경 없음 |

### 1.5 환경 변수·의존성
- 환경 변수: 추가 없음
- 의존성: 추가 없음 — 카드뉴스 swipe는 CSS scroll-snap + 기본 touch event로 구현 (외부 carousel 라이브러리 도입 X)

---

## 2. Data Model

### 2.1 `PostFormat` (`src/domain/post-format.ts`)

```ts
export type PostFormat = "blog" | "card-news";

export const POST_FORMATS: PostFormat[] = ["blog", "card-news"];

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  blog: "블로그글",
  "card-news": "카드뉴스",
};

export const POST_FORMAT_EMOJI: Record<PostFormat, string> = {
  blog: "📝",
  "card-news": "🖼️",
};

export function isPostFormat(v: unknown): v is PostFormat {
  return v === "blog" || v === "card-news";
}
```

### 2.2 `Post` 확장 (`src/types/post.ts`)

기존 인터페이스에 3 필드 optional 추가 (`bodyMarkdown` 필드는 cycle #19 그대로):

```ts
export interface Post {
  // ... 기존 필드 (id, slug, title, summary80, bodyMarkdown, coverImageUrl, postType, publishStatus, providerId, providerOwnerUid, ...)

  /** v1.12 cycle #25: 콘텐츠 형식. 누락 시 'blog' fallback (레거시 호환) */
  format?: PostFormat;

  /** v1.12 cycle #25: 사용된 admin contentTemplate ID (추적용, 옵셔널) */
  templateId?: string;

  /** v1.12 cycle #25: 사용된 템플릿의 scenarios 스냅샷 (카드 배지 표시용 — 한국어 user-facing) */
  templateScenarios?: string[];
}

export interface GenerationMeta {
  // ... 기존 필드 (ragSourceIds, ...)

  /** v1.12 cycle #25: tags 스냅샷 (analytics·디버그용, UI 미노출) */
  templateTags?: string[];

  /** v1.12 cycle #25: card-news 검증 실패 후 fallback blog로 재생성된 경우 */
  cardNewsValidationFailed?: boolean;
}
```

**H7 결의**: 사용자 친화 표시는 `templateScenarios` (한국어, 예: "신규 오픈", "시즌 한정 메뉴"). 내부 분류는 `templateTags`이지만 GenerationMeta로 이동 (UI 미노출).

**레거시 doc 호환성**: `format`이 없으면 `postFormatFallback(post) === 'blog'`. 모든 read 경로가 이 helper를 거침. `Post.summary80`은 cycle #19부터 존재 — 카드 발췌의 1차 소스.

### 2.3 `Post.providerId` (cycle #25 영향 없음, 명시화)

partner-promo는 `providerId = "partner:{partner.id}"` (route.ts:298). cycle #25는 이 컨벤션에 변경 없음. ownership 체크는 `providerOwnerUid === uid` (C3 결의).

### 2.4 ContentTemplate (cycle #24, 변경 없음)

```ts
// 기존 그대로
export interface ContentTemplate {
  id: string;
  type: ContentTemplateType;        // 'blog' | 'card-news'
  industry: PartnerIndustry;
  title: string;
  body: string;                     // → templateContext 직렬화 시 사용
  tags: string[];                   // → generationMeta.templateTags 스냅샷 (분석용)
  scenarios: string[];              // → post.templateScenarios 스냅샷 (UI 표시)
  // ...
}
```

R2 invariant: 모델·rules·indexes 모두 cycle #24 그대로.

---

## 3. RAG / LLM 변경

### 3.1 `composeDraft` + `generatePartnerPromoDraft` 시그니처 확장 (R1, C1 결의)

**기존 (cycle #24, partner-promo-generator.ts:224-261):**
```ts
async function composeDraft(args: {
  visionDescs: PhotoDescription[];
  businessName: string;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  styleRefs: Post[];
  ragContextSection?: string;          // cycle #24
}): Promise<PartnerDraft>
```

**확장 (cycle #25):**
```ts
async function composeDraft(args: {
  visionDescs: PhotoDescription[];
  businessName: string;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  styleRefs: Post[];
  ragContextSection?: string;
  format?: PostFormat;                  // ← 신규 optional, default 'blog'
  templateContext?: string;             // ← 신규 optional, 비공백 시 ragContextSection과 결합
}): Promise<PartnerDraft>
```

**외부 진입점 `generatePartnerPromoDraft`의 `GeneratePartnerPromoInput`도 동일한 두 optional 필드 추가.**

**R1 보장 체크**:
- ✓ 기존 args object의 6 required 필드 위치·타입·이름 불변
- ✓ `ragContextSection` 그대로 optional 7번째
- ✓ 새 두 optional 필드는 8·9번째 — 기존 호출자(cycle #19 generator/composeDraft route 진입)는 무영향
- ✓ 미지정 시 `format='blog'` 기본 → cycle #24 호출 결과와 동일 (regression 0)

### 3.2 카드뉴스 프롬프트 (`src/lib/llm/card-news-generator.ts`)

```ts
const CARD_NEWS_SCHEMA_DESC =
  "6~10개 슬라이드를 '\\n@@SLIDE@@\\n'으로 구분한 카드뉴스 본문. " +
  "각 슬라이드 80~150자 내외. 마크다운 헤더(#) 사용 금지.";

export const SLIDE_INSTRUCTION = `
[형식: 카드뉴스]
- 6~10개 슬라이드 구성. 각 슬라이드는 다음 라인에 \`@@SLIDE@@\`만 적은 줄로 구분
- 슬라이드별 80–150자, 한 가지 핵심 메시지만
- 첫 슬라이드: 후크(질문/숫자/임팩트)
- 마지막 슬라이드: CTA (방문/문의/할인)
- 마크다운 헤더(#) 사용 금지 — 슬라이드 자체가 단위
`;

export function buildCardNewsInstruction(): string {
  return SLIDE_INSTRUCTION;
}

/** post-process 검증 */
export function validateCardNewsBody(body: string): {
  ok: boolean;
  slides: string[];
  reason?: string;
} {
  const slides = body
    .split(/\n@@SLIDE@@\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (slides.length < 4) return { ok: false, slides, reason: "슬라이드 4개 미만" };
  if (slides.length > 12) return { ok: false, slides, reason: "슬라이드 12개 초과" };
  if (slides.some((s) => s.length > 250)) return { ok: false, slides, reason: "슬라이드 길이 초과" };
  return { ok: true, slides };
}

/** composeSchema 런타임 description override (M6 결의) */
export function patchComposeSchemaForCardNews(schema: Schema): Schema {
  // schema는 mutable 객체 — bodyMarkdown.description만 카드뉴스용으로 교체
  return {
    ...schema,
    properties: {
      ...schema.properties,
      bodyMarkdown: {
        ...schema.properties.bodyMarkdown,
        description: CARD_NEWS_SCHEMA_DESC,
      },
    },
  };
}
```

**M2 결의**: 구분자 `\n---\n` (markdown HR) 대신 distinct sentinel `\n@@SLIDE@@\n` 사용. markdown 표준과 충돌 없음. LLM에 별도 학습 불필요 (instruction 명확).

### 3.3 `buildComposePrompt` 확장 (M6 결의)

```ts
function buildComposePrompt(args): string {
  const base = /* 기존 prompt body */;
  const ragSection = args.ragContextSection?.trim() ?? "";
  const tplSection = args.templateContext?.trim() ?? "";

  let combined = base;
  if (ragSection) combined += `\n\n${ragSection}`;
  if (tplSection) combined += `\n\n${tplSection}`;

  if (args.format === "card-news") {
    combined += `\n\n${buildCardNewsInstruction()}`;
  }
  return combined;
}
```

`composeDraft` 본문에서 `model.getGenerativeModel({ ..., generationConfig: { responseSchema: args.format === "card-news" ? patchComposeSchemaForCardNews(composeSchema) : composeSchema } })`로 schema 분기.

### 3.4 `templateContext` (`src/lib/llm/template-context.ts`)

```ts
import type { ContentTemplate } from "@/types/content-template";

export function buildTemplateContextSection(
  template: ContentTemplate | null,
): string {
  if (!template) return "";
  return [
    "[참조 템플릿 — admin 큐레이션]",
    `type: ${template.type}`,
    `title: ${template.title}`,
    `tags: ${template.tags.join(", ")}`,
    `scenarios: ${template.scenarios.join(" / ")}`,
    "---",
    template.body,
  ].join("\n");
}
```

### 3.5 H5 결의 — card-news 검증 실패 시 fallback 의미론

**선택: 옵션 (a) — format='blog'로 재compose**.

```
generatePartnerPromoDraft (input.format='card-news')
  ↓ composeDraft(args + format='card-news')
  ↓ if !validateCardNewsBody(result.bodyMarkdown).ok:
      ↓ retry 1회 (같은 args, 동일 함수 호출, HTTP roundtrip 0)
      ↓ if 또 실패:
          ↓ composeDraft(args without format) ← 'blog' 모드 재compose
          ↓ generationMeta.cardNewsValidationFailed = true
          ↓ 최종 post.format = 'blog' (의미상 정합)
  ↓ return draft
```

LLM 호출은 최대 3회 (card-news 1차 + retry 1차 + blog fallback 1차). 모두 단일 HTTP 요청 안에서 처리 → rate-limit 1번만 차감 (H6 보장). Cost 영향: 평균 시나리오 1회, worst case 3회.

---

## 4. Server Actions / Route Handlers

### 4.1 `POST /api/partner/posts` 확장 (C4 결의)

**기존 흐름 (cycle #24):** FormData 받아 → `validateForm` → `generatePartnerPromoDraft` → `postRepository.create`

**확장 (cycle #25):**

```ts
// validateForm 확장 (다음 두 text field 추가 처리):
const format = (data.get("format") as string) || "blog";
const templateId = (data.get("templateId") as string) || null;

if (format !== "blog" && format !== "card-news") {
  return { error: "INVALID_FORMAT" };
}
// templateId는 optional, 빈 값/null 허용
```

```ts
// 핸들러 본문 (rate-limit 후, generate 전):
let templateContext = "";
let templateScenarios: string[] = [];
let templateTagsSnapshot: string[] = [];

if (templateId) {
  const tpl = await contentTemplateRepository.getById(templateId);  // M1 결의: getById
  if (tpl && tpl.type === format) {
    // type 불일치는 무시 (사용자 cheat 가드)
    templateContext = buildTemplateContextSection(tpl);
    templateScenarios = tpl.scenarios.slice(0, 5);
    templateTagsSnapshot = tpl.tags.slice(0, 5);
  }
}

const draft = await generatePartnerPromoDraft({
  ...existingArgs,
  format,
  templateContext,
});

await postRepository.create({
  // ...existing fields
  format,
  templateId: templateId ?? null,
  templateScenarios,
  generationMeta: {
    ...existingMeta,
    templateTags: templateTagsSnapshot,
    cardNewsValidationFailed: draft.cardNewsValidationFailed ?? false,
  },
});
```

**rate-limit 위치 변경 없음**: 기존 `checkAndIncrement(\`partner:${uid}\`, 3, DAY_MS)` 그대로 valid (H6).

### 4.2 `listTemplatesForPartner` (신규 server action, H4 결의)

`src/app/actions/partner-templates-actions.ts`:

```ts
"use server";

import { z } from "zod";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { contentTemplateRepository } from "@/lib/firebase/content-template-repository";
import { CONTENT_TEMPLATE_TYPES } from "@/types/content-template";
import { PARTNER_INDUSTRIES } from "@/domain/partner-industry";
import type { ContentTemplate } from "@/types/content-template";

const inputSchema = z.object({
  industry: z.enum(PARTNER_INDUSTRIES),
  type: z.enum(CONTENT_TEMPLATE_TYPES),
});

const MAX = 6;

export async function listTemplatesForPartner(
  input: z.infer<typeof inputSchema>,
): Promise<ContentTemplate[]> {
  await requirePartnerApi();   // 인증된 파트너만
  const parsed = inputSchema.parse(input);

  let list = await contentTemplateRepository.queryByIndustry(
    parsed.industry,
    parsed.type,
    MAX,
  );

  if (list.length === 0 && parsed.industry !== "other") {
    // industry='other' fallback (cycle #24 패턴)
    list = await contentTemplateRepository.queryByIndustry(
      "other",
      parsed.type,
      MAX,
    );
  }

  return list;
}
```

### 4.3 다른 actions (변경 없음)
- `withdrawPartnerPost`, `publishPartnerPost`: 변경 없음
- partner-profile-actions: 변경 없음

---

## 5. UI Components

### 5.1 PartnerPostCard (`src/components/partner/PartnerPostCard.tsx`)

```
┌────────────────────────────┐
│  [cover image 16:9]         │   ← post.coverImageUrl ?? partner.profile?.photoUrls?.[0] ?? null
│                              │      null이면 emoji placeholder (📝/🖼️) — H8 결의
├────────────────────────────┤
│  📝 블로그 · #신규오픈 #시즌    │   ← format badge + post.templateScenarios slice(0,2) (H7)
│  강남 협업 공간을 찾는다면…    │   ← title (truncate 1줄)
│  강남역 도보 5분 거리에 위치한 │   ← post.summary80 우선, 없으면 extractExcerpt(bodyMarkdown, 100) — M4
│  프리미엄 코워킹스페이스로…    │
│  ─────────────────────────  │
│  📝 초고 · 04-27 14:30      │   ← status badge + 작성일
└────────────────────────────┘
```

**Props:**
```ts
interface PartnerPostCardProps {
  post: Post;
  fallbackCover: string | null;     // partner.profile?.photoUrls?.[0]
  href: string;                     // resolveCardHref 결과 (항상 /community/p/{slug})
}
```

**Server Component**: 인터랙션 없음. cover 결정 우선순위:
1. `post.coverImageUrl`
2. `fallbackCover`
3. emoji placeholder (`POST_FORMAT_EMOJI[format]`)

excerpt 우선순위:
1. `post.summary80` (M4 결의 — cycle #19부터 존재)
2. `extractExcerpt(post.bodyMarkdown, 100)` fallback

### 5.2 PartnerPostsList (개편)

```tsx
function resolveCardHref(p: Post): string {
  // R5 + C5 결의: 단일 경로. published/draft/withdrawn 구분 없이 모두 /community/p/{slug}
  // /community/p/[slug]/page.tsx가 publishStatus 기반 노출/배너를 자체 처리 (cycle 이전부터 구현)
  return `/community/p/${p.slug}`;
}

// status별 그룹핑 유지 (Phase 3 결정)
{(["draft","published","withdrawn"] as PublishStatus[]).map((status) => {
  const list = groups[status];
  if (list.length === 0) return null;
  return (
    <section>
      <h2>{STATUS_EMOJI[status]} {STATUS_LABEL[status]} ({list.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => (
          <PartnerPostCard
            key={p.id}
            post={p}
            fallbackCover={partnerCover}
            href={resolveCardHref(p)}
          />
        ))}
      </div>
    </section>
  );
})}
```

### 5.3 CardNewsViewer (server) + CardNewsPaginator (client) — H1 결의

**서버 래퍼 (`src/components/post/CardNewsViewer.tsx`):**
```tsx
import { renderMarkdown } from "@/lib/markdown";
import { parseCardNewsSlides } from "@/lib/post/parse-card-news-slides";
import { CardNewsPaginator } from "./CardNewsPaginator";

export async function CardNewsViewer({ body }: { body: string }) {
  const slides = parseCardNewsSlides(body);
  // server-only renderMarkdown로 미리 HTML 생성 (H1 결의)
  const slideHtmls = await Promise.all(slides.map((s) => renderMarkdown(s)));
  return <CardNewsPaginator slideHtmls={slideHtmls} />;
}
```

**클라이언트 페이지네이터 (`src/components/post/CardNewsPaginator.tsx`):**
```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  slideHtmls: string[];   // 이미 sanitize된 HTML
}

export function CardNewsPaginator({ slideHtmls }: Props) {
  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slideHtmls.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goto(Math.max(0, idx - 1));
      if (e.key === "ArrowRight") goto(Math.min(total - 1, idx + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, total]);

  function goto(i: number) {
    setIdx(i);
    containerRef.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const w = e.currentTarget.clientWidth;
          setIdx(Math.round(e.currentTarget.scrollLeft / w));
        }}
      >
        {slideHtmls.map((html, i) => (
          <article
            key={i}
            className="snap-start min-w-full prose-promo px-6 py-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {slideHtmls.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}/${total} 슬라이드`}
            onClick={() => goto(i)}
            className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-blue-600" : "w-2 bg-zinc-300"}`}
          />
        ))}
      </div>

      {/* 좌우 화살표 (데스크탑) */}
      <button onClick={() => goto(Math.max(0, idx - 1))} aria-label="이전 슬라이드" className="hidden sm:block absolute left-2 top-1/2">‹</button>
      <button onClick={() => goto(Math.min(total - 1, idx + 1))} aria-label="다음 슬라이드" className="hidden sm:block absolute right-2 top-1/2">›</button>
    </div>
  );
}
```

**핵심:**
- 외부 라이브러리 X — `scroll-snap-x mandatory` + scroll event로 idx 동기화
- 모바일 자연 swipe + 데스크탑 좌우 화살표 + dots indicator + ArrowLeft/Right 키보드 네비 (L4 결의)
- 슬라이드 HTML은 서버에서 sanitize 완료 → `dangerouslySetInnerHTML` 안전

### 5.4 PostBodyRenderer (`src/components/post/PostBodyRenderer.tsx`) — H2·H3 결의

```tsx
import { postFormatFallback } from "@/lib/post/post-format-fallback";
import { CardNewsViewer } from "./CardNewsViewer";
import { BlogRenderer } from "./BlogRenderer";
import type { Post } from "@/types/post";

export function PostBodyRenderer({ post }: { post: Post }) {
  // H2: partner-promo만 format을 사용. 다른 postType은 항상 BlogRenderer
  if (post.postType !== "partner-promo") {
    return <BlogRenderer body={post.bodyMarkdown} />;
  }
  const format = postFormatFallback(post);
  if (format === "card-news") {
    return <CardNewsViewer body={post.bodyMarkdown} />;
  }
  return <BlogRenderer body={post.bodyMarkdown} />;
}
```

### 5.5 BlogRenderer (`src/components/post/BlogRenderer.tsx`) — H3 결의 신규

cycle #19 PostDetailView의 본문 렌더 부분만 추출:

```tsx
import { renderMarkdown } from "@/lib/markdown";

export async function BlogRenderer({ body }: { body: string }) {
  const html = await renderMarkdown(body);
  return (
    <div
      className="prose-promo"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

PostDetailView는 본문 영역을 `<PostBodyRenderer />`로 감싸도록 변경. 헤더·커버·summary·JSON-LD는 그대로 유지.

### 5.6 Wizard 컴포넌트 (`PartnerPostsNewWizard`)

```
Step 1: PostFormatPicker
   [📝 블로그글]   [🖼️ 카드뉴스]
        ↓ 선택
Step 2: TemplateRecommendCards (industry × format 매칭)
   (mount 시 listTemplatesForPartner 호출)
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ 신규 오픈 │ │시즌 메뉴 │ │고객 후기 │
   │ #opening │ │#seasonal │ │ #review  │
   │ "summary"│ │ "summary"│ │ "summary"│
   └──────────┘ └──────────┘ └──────────┘
   [건너뛰기 (직접 입력)]
        ↓ 선택 또는 건너뛰기
Step 3: KeywordInput + 사진 업로드 (기존 PartnerPromoDraftForm 슬림 버전)
   - 제목·키워드·brandTone·사진 업로드
   - [생성하기] → fetch("/api/partner/posts", FormData with format/templateId)
```

**M3 결의 — Wizard state persistence**: client memory만 (sessionStorage 안 쓰기). 페이지 reload 시 Step1부터 재시작. v1 단순함 우선.

**Step 2 빈 상태 (OQ3)**: 템플릿 0건이면 안내 텍스트 + "건너뛰기" 버튼만 노출.

**Step navigation:**
- "다음" 버튼은 각 단계 필수값 충족 시 활성화
- "이전" 버튼으로 단계 회귀 — state는 Wizard 컴포넌트 useState로 보존
- Step 2 "건너뛰기"는 templateId=null, templateScenarios=[]로 진행 → 기존 흐름 100% 보존

---

## 6. Pages

### 6.1 `/partner/posts/page.tsx` (개편)

```tsx
async function PostsBody() {
  await connection();
  const { uid, partner } = await requirePartnerPage();
  const posts = await postRepository.listMyPosts(uid, 100);
  const partnerCover = partner.profile?.photoUrls?.[0] ?? null;
  return <PartnerPostsList posts={posts} partnerCover={partnerCover} />;
}
```

기존 AutoPublishBanner는 그대로.

### 6.2 `/partner/posts/new/page.tsx` (개편)

```tsx
export default function NewPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <NewPageBody />
    </Suspense>
  );
}

async function NewPageBody() {
  await connection();
  const { partner } = await requirePartnerPage();
  return <PartnerPostsNewWizard partner={partner} />;
}
```

`PartnerPostsNewWizard`는 client component. industry는 partner.profile?.industry ?? 'other' fallback. Step 2 mount 시 `listTemplatesForPartner({ industry, type: format })` 호출 (server action via useTransition).

### 6.3 `/community/p/[slug]/page.tsx` — C5/R3/R4 결의 (수정만, 신규 페이지 X)

**기존 동작 (cycle #19):** 이미 `publishStatus !== 'published'`이면 owner 검증 + noindex 배너 표시 (`page.tsx:73-122`). draft는 "📝 초고 미리보기" 배너, withdrawn은 "🚫 철회된 글" 배너. owner가 아니면 notFound.

**cycle #25 변경:**
- `<PostDetailView post={post} />` 내부에서 본문 div를 `<PostBodyRenderer post={post} />`로 교체 (H2)
- 그 외 헤더·커버·noindex·배너 모두 유지
- ownership 체크는 이미 `tryVerifySessionCookie`로 cycle #19 구현 — `post.providerOwnerUid !== uid`이면 notFound (이미 동작 중) — R4 자연 충족
- published는 정상 경로, draft는 owner-only 미리보기 — R3 자연 충족

### 6.4 PostDetailView 변경 (H2 결의)

기존:
```tsx
<div className="prose-promo" dangerouslySetInnerHTML={{ __html: html }} />
```

변경:
```tsx
<PostBodyRenderer post={post} />
```

이 한 변경만으로 partner-promo + format='card-news' 글이 자동으로 슬라이드 뷰어로 렌더링됨. 다른 postType(provider/community)은 PostBodyRenderer 내부 분기로 항상 BlogRenderer 사용 → cycle #19 동작 유지.

### 6.5 ❌ /partner/posts/[postId]/preview/page.tsx 신규 X (C5 결의)

**Plan v1.0 §4.1 In-Scope #5의 "/partner/posts/{id}/preview 신규 페이지"는 codebase reality 발견 후 deprecated**. `/community/p/[slug]`가 이미 동일 기능을 제공함을 design-validator가 발견. 별도 페이지는 코드 중복 + 가드 분기 위험만 야기.

**Plan과의 reconciliation**: Plan §1.3 목표 5번 ("draft를 실제 발행 모습 그대로 미리보기")은 충족 — 단지 위치가 `/community/p/[slug]`임. SC4·SC5·SC6도 모두 충족 가능 (라우팅이 단일 경로로 통일됨).

→ §1.1 신규 파일 12개 (preview page 1개 제거)

---

## 7. Routing & Auth Guards

### 7.1 라우팅 매트릭스

| URL | Method | 가드 | 동작 |
|-----|--------|------|------|
| `/partner/posts` | GET | requirePartnerPage | 카드 그리드 |
| `/partner/posts/new` | GET | requirePartnerPage | Wizard |
| `/partner/posts/{id}/edit` | GET | (기존) requirePartnerPage + ownership | 편집 |
| `/community/p/{slug}` | GET | public + (publishStatus !== 'published'이면) owner 검증 | 공개 또는 owner draft 미리보기 (PostBodyRenderer 적용) |
| `POST /api/partner/posts` | POST | session cookie + role=partner + rate-limit 3/day | 새 글 생성 (format·templateId 추가) |
| `[server action] listTemplatesForPartner` | call | requirePartnerApi | industry × format 템플릿 6개 |

### 7.2 R3·R4 보강 (C5 결의 후)
- **R3**: `/community/p/[slug]`가 published/draft/withdrawn 모두 처리. 별도 redirect 가드 불필요 (단일 경로).
- **R4**: 동일 페이지의 `tryVerifySessionCookie` + `providerOwnerUid` 비교로 자연 차단. admin draft 미리보기는 OOS — cycle #26 후보.

---

## 8. Storage·Firestore Rules

### 8.1 Firestore Rules (변경 없음)
- `posts/{id}`: Admin SDK only write (`src/types/post.ts:9` 기존 컨벤션). `format`/`templateId`/`templateScenarios` 추가 필드는 server-write only이므로 allowlist 갱신 불필요.
- M7 보강 코멘트: 만약 향후 client write 허용 시 위 3 필드 + `generationMeta.templateTags`·`cardNewsValidationFailed` 화이트리스트 추가 필요.

### 8.2 Storage Rules (변경 없음)
- 카드뉴스도 본문은 Firestore에 저장. 슬라이드별 별도 이미지 첨부는 OOS (v2).

### 8.3 Indexes (변경 없음)
- `listMyPosts(uid, limit)`은 기존 인덱스 사용
- `queryByIndustry(industry, type)`은 cycle #24 인덱스 그대로

---

## 9. Open Questions (design-validator v0.2 응답 후)

| OQ | 질문 | 답 |
|----|------|---|
| OQ1 | format 누락 doc backfill? | **아니오** — postFormatFallback이 read-time 처리 |
| OQ2 | 슬라이드 구분자 충돌? | **`@@SLIDE@@` sentinel로 변경** (M2 결의). markdown HR과 충돌 0 |
| OQ3 | Step 2 추천 0건이면? | "선택 가능한 템플릿이 없습니다" + "건너뛰기" 버튼만 |
| OQ4 | card-news 검증 실패 후? | **(a) format='blog' 재compose** (H5). cardNewsValidationFailed 플래그 기록. retry 1회 + fallback 1회 모두 같은 HTTP 안 |
| OQ5 | templateScenarios cap | 5개 |
| OQ6 | preview에 발행/철회? | OOS — /edit으로만 진입 |
| OQ7 | 빈 상태 (글 0건)? | 기존 `📭 아직 작성한 글이 없어요` 그대로 |
| OQ8 | 슬라이드별 cover image? | OOS |
| OQ9 | 뒤로 가기 복귀? | next/link 기본 동작 + Suspense fallback. 별도 처리 X (L3 ack) |
| OQ10 | admin preview? | OOS — cycle #26 후보 |
| OQ11 | Wizard state persistence? | **client memory만, reload 시 재시작** (M3 결의) |
| OQ12 | BlogRenderer 렌더링? | **server component, renderMarkdown 그대로 사용** (H1·H3 결의) — react-markdown 같은 client 라이브러리 도입 X (의존성 0 유지) |

---

## 10. Implementation Order

| Step | 작업 | 산출물 | 의존성 | 예상 LOC |
|------|------|--------|--------|---------|
| S1 | Post 모델 확장 + post-format type + fallback | post.ts·post-format.ts·post-format-fallback.ts | — | 100 |
| S2 | utils: extract-excerpt, parse-card-news-slides (`@@SLIDE@@`) | post/* | — | 80 |
| S3 | card-news-generator + template-context 헬퍼 | llm/* | — | 150 |
| S4 | composeDraft·generatePartnerPromoDraft 확장 (R1 + retry/fallback chain) | partner-promo-generator.ts | S3 | 120 |
| S5 | BlogRenderer (server) + CardNewsViewer (server) + CardNewsPaginator (client) | components/post/* | S2 | 350 |
| S6 | PostBodyRenderer + PostDetailView 본문 swap | components/post/PostBodyRenderer.tsx + community/PostDetailView.tsx | S5 | 80 |
| S7 | listTemplatesForPartner server action | actions/partner-templates-actions.ts | — | 50 |
| S8 | PartnerPostsNewWizard (Step1·2·3) + Step3 draft form 슬림화 | partner/* | S7·S4 | 450 |
| S9 | /api/partner/posts route 확장 (format·templateId 처리) | api/partner/posts/route.ts | S4·S7 | 80 |
| S10 | PartnerPostCard + PartnerPostsList 카드 그리드 (resolveCardHref 단일) | components/partner/* | S2 | 280 |
| S11 | seed-card-news-samples.mjs (idempotent — 더미 파트너 3명에 1건씩, postId 결정적) | scripts/* | S9 | 200 |

**총 예상: ~1,940 LOC** (Plan §7 ~1,760 → +180 LOC, design-validator 결의 사항 반영분)

---

## 11. Acceptance Criteria

| AC | 기준 | 검증 |
|----|------|------|
| AC1 | 새 글 작성 시 format 'blog'/'card-news' 둘 다 저장됨 | E2E: Wizard 진행 → DB doc 확인 |
| AC2 | format='card-news' 글이 슬라이드 뷰어로 렌더링 | E2E: /community/p/{slug} 방문, dots indicator·키보드 좌우 동작 |
| AC3 | /partner/posts 카드 그리드에 커버·발췌·format 배지·templateScenarios 배지·status·날짜 모두 노출 | UI 캡처 |
| AC4 | 모든 status의 카드 클릭 → /community/p/{slug} (단일 라우팅) | 라우팅 |
| AC5 | draft·withdrawn 글에 noindex 배너 표시 + owner만 접근 | R3·R4, /community/p/[slug]/page.tsx 기존 가드 |
| AC6 | 다른 파트너의 draft slug 직접 접근 → notFound | R4 |
| AC7 | 레거시 post (format 누락) → blog로 정상 렌더 | postFormatFallback 시드 1건 검증 |
| AC8 | `generatePartnerPromoDraft`(format 미지정) → cycle #24와 동일 결과 — partner.profile=null 시나리오 | 회귀 테스트 (L2 결의) |
| AC9 | Wizard Step 2 "건너뛰기" → templateId 없이 정상 생성 | E2E |
| AC10 | card-news 검증 실패 → retry 1회 후 blog fallback + cardNewsValidationFailed=true 저장 | LLM mock 테스트 |
| AC11 | rate-limit 1 HTTP 요청 = 1 차감 (retry 안 차감) | route handler 단일 호출 검증 |
| AC12 | PostBodyRenderer가 partner-promo 외 postType은 항상 BlogRenderer | provider 글 검증 (cycle #19 호환) |
| AC13 | listTemplatesForPartner가 industry='other' fallback 정상 동작 | 매칭 0건 시나리오 |
| AC14 | CardNewsPaginator: ArrowLeft/Right 키보드 네비 + dots aria-label | a11y 검증 (L4) |

---

## 12. Migration & Rollback

### 12.1 Migration
- DB schema migration 불필요 — 모든 신규 필드 optional
- 레거시 post는 `postFormatFallback`이 read-time 처리
- 시드 스크립트 1개 추가 (`seed-card-news-samples.mjs`) — idempotent (postId 결정적, 존재 시 skip — L5 결의)

### 12.2 Rollback
- 본 사이클 코드 revert만으로 완전 롤백 가능
- card-news 글 본문은 `@@SLIDE@@` sentinel 포함 markdown — revert 후 BlogRenderer로 fallback 시 sentinel이 본문 텍스트로 그대로 노출 (가독성 저하지만 깨지진 않음)
- post 모델 새 필드는 Firestore에 그대로 남아도 무해

### 12.3 Feature Flag
- 별도 플래그 없음 — 즉시 전체 파트너 적용
- 점진 출시 필요 시 `partner.experiments?.contentFormats === true` 체크 추가 가능 (현 사이클 OOS)

---

## 13. Cross-Cycle Impact

| Cycle | 영향 | 검증 |
|-------|------|------|
| #19 partner-promo | composeDraft·generatePartnerPromoDraft optional only — 호출자 영향 0 | R1, AC8 |
| #24 partner-rag-system | ContentTemplate 모델 변경 0, queryByIndustry 활용도 ↑ | R2, AC13 |
| #21 partner-application | 영향 없음 | — |
| #22 partner-issue-from-users | 영향 없음 | — |
| #23 hotfix signup-then-apply | 영향 없음 | — |
| #20 community-feed-3panel | PostDetailView 내부 본문 swap만, 헤더/커버/JSON-LD 보존 | H2, AC12 |

---

## 14. design-validator 결의 매트릭스

| 카테고리 | 발굴 | 결의 위치 |
|---------|-----|----------|
| 🔴 C1 composeDraft 시그니처 | §3.1, R1 행 |
| 🔴 C2 bodyMarkdown 필드 | §2.2, §3.2, §5.1, §5.4 모두 갱신 |
| 🔴 C3 partnerId → providerOwnerUid | §2.3, §6.3 (이미 cycle #19 구현 활용) |
| 🔴 C4 server action → route handler | §4.1 |
| 🔴 C5 별도 preview 페이지 → /community/p/[slug] 재사용 | §6.3, §6.5, R3·R4·R5 모두 갱신 |
| 🟠 H1 server-only renderMarkdown | §5.3 server wrapper + client paginator 분리 |
| 🟠 H2 PostDetailView body div만 swap | §6.4 |
| 🟠 H3 BlogRenderer 신규 추출 | §1.1 #8, §5.5 |
| 🟠 H4 listTemplatesForPartner | §4.2 |
| 🟠 H5 card-news fallback 의미론 | §3.5 옵션(a) — blog 재compose |
| 🟠 H6 rate-limit retry | §3.5 단일 HTTP 안에서 처리 |
| 🟠 H7 templateScenarios vs templateTags | §2.2 — UI=scenarios, generationMeta=tags |
| 🟠 H8 cover priority | §5.1 — coverImageUrl 우선 |
| 🟡 M1 contentTemplateRepository.getById | §4.1 |
| 🟡 M2 separator collision | `@@SLIDE@@` sentinel |
| 🟡 M3 Wizard state persistence | OQ11, §5.6 |
| 🟡 M4 summary80 우선 | §5.1 |
| 🟡 M5 R3 race condition | OQ9 |
| 🟡 M6 schema description override | §3.2 patchComposeSchemaForCardNews |
| 🟡 M7 firestore.rules 코멘트 | §8.1 |
| 🔵 L1 §0 reconciliation | 갱신 |
| 🔵 L2 AC9 generatePartnerPromoDraft 기준 | AC8 |
| 🔵 L3 back-button | OQ9 |
| 🔵 L4 키보드 네비 | §5.3 ArrowLeft/Right |
| 🔵 L5 seed idempotency | §12.1 |

전 25 발굴 모두 결의 완료.

---

## 15. Next Steps

1. v0.2 사용자 승인
2. **`/pdca do partner-content-formats`** → Step 1 → Step 11 순차 구현
3. 구현 완료 후 **`/pdca analyze`** → gap-detector 검증 → ≥ 90% 목표
4. ≥ 90% 시 **`/pdca report`** → 5사이클 연속 single-pass 90s% 패턴 유지
