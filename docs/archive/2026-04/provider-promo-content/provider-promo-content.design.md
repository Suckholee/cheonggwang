---
template: design
version: 0.1
feature: provider-promo-content
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# provider-promo-content Design Document

> **Summary**: 청명 AI 홍보 블로그 생성 · `/community` placeholder 교체 + `/providers/{id}` NewsSection · Server Action + Gemini 2.5 Flash direct (30-50s) · 주 1회 cooldown · 읽기 only · posts 컬렉션 + 2 indexes · providers 3 필드 확장 · 16 components · v1.4 신규 콘텐츠 마케팅 track.
>
> **Plan**: [provider-promo-content.plan.md](../../01-plan/features/provider-promo-content.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** Gemini model | **`gemini-2.5-flash`** (env `GOOGLE_GENERATIVE_AI_MODEL` 오버라이드 가능) · content-research-pipeline과 동일 SDK (`@google/generative-ai@0.24.1`) · **main `package.json` 이미 포함 확인**. |
| **Q2** Gemini JSON schema | `generationConfig.responseMimeType: "application/json"` + `responseSchema: Schema` 전달 · `@google/generative-ai` 지원. functions/src/research/lib/gemini.ts 동일 패턴 복사. |
| **Q3** Markdown sanitize | **`marked` + `sanitize-html`** 신규 deps 2개 추가 (main package.json) · functions에서 이미 `sanitize-html@2.11` 검증됨. allowedTags whitelist: `h2,h3,p,ul,ol,li,strong,em,a,br`. |
| **Q4** slug collision | `${titleSlug}-${postId.slice(0,6)}` · Firestore auto ID 20자에서 6자 suffix 사용 · 60^6 = ~4.6B 충돌 거의 없음 · `slug` unique 불필요 (doc id가 primary) |
| **Q5** XSS 방어 | Gemini 출력 → `sanitize-html`에 whitelist allowedTags · `a[href]`는 `https://` 만 허용 + `rel="noopener noreferrer"` 강제. **외부 이미지 태그 제거** (cover만 controlled). |
| **Q6** coverImageUrl null feed card | 이니셜 gradient (client-dashboard/search `initialGradient` 재활용 · PostFeedCard에 inline 복제) + category emoji overlay |
| **Q7** summary80 range | Zod `min(10) max(120)` · Gemini 엄밀 80 보장 어려움 → 80±20 허용. feed card에 `.slice(0,80)` 2차 truncate. |
| **Q8** 청결 격리 프롬프트 | archived `promo-page` 시스템 프롬프트의 3중 방어 문구 재활용 (배상보험 청광 소유 · 청명 개인 공격 금지 · 기술 중심) · `domain/promo-prompt.ts` 상수화. |
| **Q9** cooldown UI 표시 | `lastPromoPostAt + 7d`가 미래면 `formatScheduledLabel(nextAllowedMs)` 재활용 (`booking-day-bucket.ts`) · "다음 생성 가능: 4/28 (월)" 형식. |
| **Q10** 부분 저장 불가 | Zod `brandTone + slogan` 둘 다 required · 단일 폼 제출 · 중간 저장 없음. |
| **Q11** seed 청광 직영 3 포스트 | seed-first-provider.mjs에 markdown 하드코딩 3종 (입주청소 가이드 · 에어컨 시즌 · 단골 리뷰 모음) · createdAt daysAgo 10/20/30 |
| **Q12** feed seed 포함 정렬 | seed는 createdAt 과거 시각 → 실 포스트 생성 시 상단 · seed는 하단 배치 (자연스러움) |
| **Q13** /community/{postId} SEO | `generateMetadata` async · title + `openGraph.images: [coverImageUrl]` · description = summary80 |
| **Q14** ProfileEditorTabs 4탭 | `EditorTabKey = 'basic'\|'price'\|'portfolio'\|'promo'` · `VALID_TABS` array + `parseTab` fallback · 동일 패턴 확장 |

---

## 1. Overview

### 1.1 Design Goals
- **콘텐츠 마케팅 루프 첫 도입** (마켓 루프와 독립된 수요 유입 채널)
- Gemini direct call via Server Action (Approach A · chat v1.2 패턴 재활용)
- archived promo-page 3중 방어 프롬프트 재활용
- content-research-pipeline `lib/gemini.ts` TS 변환 + main app 이동
- 7-day cooldown · Gemini 실패 시 미소모
- Markdown render server-only + XSS sanitize

### 1.2 Principles
- Server-first (shell + Gemini 호출) + Client (form submit · redirect)
- public read `posts.read: true` · Admin SDK only write
- Denormalization snapshot at creation (companyName · categories · regionLabel)
- 기존 필드 90% 재활용 (description · priceBook · workCases · reviews · trendKeywords)
- 첫 포스트는 seed로 cold start 방지

---

## 2. Architecture

### 2.1 createPromoPost Server Action (30-50s)

```
POST createPromoPost({topicHint})

1. Zod parse
2. `resolveProviderId()` helper (provider-profile-editor와 동일 패턴 · cookies → verifySession → userRepository.get → providerId guard → FORBIDDEN throw)
3. provider = providerRepository.get(providerId)
4. (step 4는 아래 존재 확인으로 통합)
   · brandTone/slogan null → INVALID_STATE "사전 정보를 먼저 저장해 주세요"
   · lastPromoPostAt + 7d > now → INVALID_STATE "다음 생성 가능: {label}"
5. 병렬 fetch (Promise.all):
   - workCases: workCaseRepository.listByProvider(providerId, 3)
   - reviews:   reviewRepository.listByProvider(providerId, 1) [option]
   - ~~trendKeywords~~ **v1 생략** (validator fix H1: 기존 `trendKeywordsRepository`는 `Category` = restaurant/salon/cafe 전용 · `QuoteCategory`와 미호환 · v1.5b에서 `quoteTrendKeywords/{quoteCategory}` 신규 컬렉션 + pipeline 확장 검토)
6. prompt = buildPromoPrompt({provider, workCases, reviews, topicHint})
7. const raw = await geminiClient.call<GeminiPostOutput>({
     systemInstruction: prompt.system,
     prompt: prompt.user,
     schema: geminiPostOutputSchema (JSON schema),
     temperature: 0.7 (블로그 창의성)
   })
8. parsed = geminiPostOutputSchema.parse(raw)  // 2차 Zod 검증
9. Cover image:
   coverImageUrl = workCases[0]?.afterPhoto?.url
                ?? provider.profileImage
                ?? null
   coverImageAlt = parsed.title
10. const newPostId = adminDb.collection("posts").doc().id
    const slug = titleToSlug(parsed.title) + '-' + newPostId.slice(0, 6)

11. TX:
    tx.create(posts/{newPostId}, {
      providerId,
      providerOwnerUid: provider.ownerUid,
      companyName: provider.companyName,
      categories: provider.categories,
      regionLabel: provider.regions[0]
        ? `${regions[0].city} ${regions[0].district}`
        : null,
      title: parsed.title,
      slug,
      coverImageUrl,
      coverImageAlt,
      bodyMarkdown: parsed.bodyMarkdown,
      summary80: parsed.summary80,
      topicHint: input.topicHint ?? null,
      brandTone: provider.brandTone,
      createdAt: serverTimestamp,
    })
    tx.update(providers/{providerId}, { lastPromoPostAt: serverTimestamp })

12. revalidatePath('/community')
    revalidatePath(`/providers/${providerId}`)
    revalidatePath('/provider/profile')  // MyPromoPostsList
13. return {ok, data: {postId: newPostId, slug}}
```

**실패 처리**:
- Gemini network/timeout/rate limit → `LLM_FAILURE` error · `lastPromoPostAt` 미변경
- Gemini JSON malformed → `geminiPostOutputSchema.parse` throw → `INVALID_INPUT` "AI 응답 해석 실패, 재시도"
- **쿨다운 절약**: 실패는 TX 이전에 throw · update 미발생

### 2.2 updatePromoSettings Server Action

```
POST updatePromoSettings({brandTone, slogan})
1. Zod parse
2. resolveProviderId
3. providerRepository.update(providerId, {brandTone, slogan})
4. revalidatePath('/provider/profile?tab=promo')
5. return {ok, data: {providerId}}
```

### 2.3 `/community` feed

```
Server shell (Suspense):
  await connection()  (Cache Components dynamic 전환)
  posts = await postRepository.listRecent(50)  // createdAt DESC
  → posts.length === 0 → <CommunityEmptyState/>
  → <PostFeedGrid posts={posts} />
     → PostFeedCard × N (Client · Link)
```

### 2.4 `/community/{postId}` 상세

```
Server shell:
  post = await postRepository.get(postId) · not found → notFound()
  provider = await providerRepository.get(post.providerId)
  sanitizedHtml = renderMarkdown(post.bodyMarkdown)  // server-only
  → <PostDetailView post sanitizedHtml />
  → <PostProviderInfoCard provider />
  → <QuoteCTAButton providerId={post.providerId} category={post.categories[0]} />

generateMetadata({params}):
  // React cache()로 dedup · 같은 request 내 중복 Firestore read 방지
  post = await getPostCached(postId)  // React.cache 래핑
  return {
    title: `${post.title} · 청광`,
    description: post.summary80,
    openGraph: {
      title: post.title,
      description: post.summary80,
      images: post.coverImageUrl ? [post.coverImageUrl] : [],
    }
  }
```

### 2.5 `/providers/{id}` reader 확장

```
기존 Promise.all에 추가:
  posts = await postRepository.listByProvider(providerId, 3)
렌더:
  {기존 섹션들}
  {posts.length > 0 && <NewsSection posts={posts} providerId={providerId} />}
```

### 2.6 `/provider/profile?tab=promo`

```
기존 4-tab editor에 "홍보" 추가:
  const VALID_TABS = ['basic', 'price', 'portfolio', 'promo'] as const;
  tab === 'promo' → <PromoTab provider={provider} />
```

`PromoTab` (Client):
- `<PromoSettingsForm provider={provider}/>` (brandTone select + slogan input · 저장)
- `<CreatePromoPostButton provider={provider}/>` (쿨다운 + isPending · redirect)
- `<MyPromoPostsList providerId={providerId}/>` (최신 3 포스트 Server fetch)

---

## 3. Data Model

### 3.1 Firestore 🆕

#### `posts/{postId}`

| Field | Type | 비고 |
|-------|------|------|
| providerId | string | |
| providerOwnerUid | string | denorm |
| companyName | string | snapshot |
| categories | QuoteCategory[] | snapshot |
| regionLabel | string \| null | snapshot "서울 강남구" |
| title | string | Gemini · max 80 |
| slug | string | `${titleSlug}-${postId.slice(0,6)}` |
| coverImageUrl | string \| null | workCase.afterPhoto / profileImage / null |
| coverImageAlt | string \| null | |
| bodyMarkdown | string | Gemini long-form (200-5000) |
| summary80 | string | Gemini (10-120 · 80 타깃) |
| topicHint | string \| null | 청명 입력 (debug) |
| brandTone | `"friendly"\|"professional"\|"playful"` | snapshot |
| createdAt | Timestamp | serverTimestamp |

**Document ID**: Firestore auto ID (20 char)

### 3.2 Firestore Rules 🆕

```javascript
match /posts/{postId} {
  allow read: if true;      // public feed
  allow write: if false;    // Admin SDK only
}
```

### 3.3 Firestore Indexes 🆕 (2개)

```json
{ "collectionGroup": "posts", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "createdAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "posts", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "providerId", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "DESCENDING" }
]}
```

### 3.4 `providers/{id}` 확장 🆕 3 필드

```ts
brandTone?: "friendly" | "professional" | "playful" | null;
slogan?: string | null;           // max 40
lastPromoPostAt?: Date | null;
```

Optional · 기존 데이터 호환 · `toProvider` 매핑 추가.

### 3.5 Types (`src/types/post.ts`) 🆕

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export type BrandTone = "friendly" | "professional" | "playful";

export interface Post {
  id: string;
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
  createdAt: Date;
}

export interface PostFeedCardDTO {
  id: string;
  title: string;
  summary80: string;
  coverImageUrl: string | null;
  companyName: string;
  category: QuoteCategory;       // categories[0]
  createdAtMs: number;
}
```

### 3.6 `providers/{id}` typescript 확장

`types/provider.ts` 필드 3개 optional 추가 · `toProvider` 매핑 확장.

---

## 4. API Specification

### 4.1 Zod Schemas (`src/domain/promo-schemas.ts`) 🆕

```ts
import { z } from "zod";
import type { Schema } from "@google/generative-ai";

export const BRAND_TONES = ["friendly", "professional", "playful"] as const;

export const updatePromoSettingsInputSchema = z.object({
  brandTone: z.enum(BRAND_TONES),
  slogan: z.string().trim().min(1, "슬로건 1자 이상").max(40, "40자 이하"),
});
export type UpdatePromoSettingsInput = z.infer<typeof updatePromoSettingsInputSchema>;

export const createPromoPostInputSchema = z.object({
  topicHint: z.string().trim().max(60).nullable(),
});
export type CreatePromoPostInput = z.infer<typeof createPromoPostInputSchema>;

export const geminiPostOutputSchema = z.object({
  title: z.string().min(1).max(80),
  bodyMarkdown: z.string().min(200).max(5000),
  summary80: z.string().min(10).max(120),
});
export type GeminiPostOutput = z.infer<typeof geminiPostOutputSchema>;

/** Gemini generationConfig.responseSchema 전달용 · @google/generative-ai Schema 타입 */
export const geminiPostResponseSchema: Schema = {
  type: "object" as const,
  properties: {
    title: { type: "string" },
    bodyMarkdown: { type: "string" },
    summary80: { type: "string" },
  },
  required: ["title", "bodyMarkdown", "summary80"],
};
```

### 4.2 Gemini Client (`src/lib/gemini.ts`) 🆕

content-research-pipeline `functions/src/research/lib/gemini.ts` **직접 copy + env 소스 변경** (Firebase Functions secrets → Next.js env).

```ts
import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";

export interface GeminiCall {
  systemInstruction: string;
  prompt: string;
  schema: Schema;
  temperature?: number;
}

export function createGeminiClient(model?: string) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("[gemini] GOOGLE_GENERATIVE_AI_API_KEY not set");
  }
  const MODEL =
    model ?? process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async call<T>(input: GeminiCall): Promise<T> {
      const m = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: input.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: input.schema,
          temperature: input.temperature ?? 0.3,
        },
      });
      const result = await m.generateContent(input.prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    },
  };
}
```

**Retry 정책**: v1은 retry 없음 (Gemini Flash 안정적 · 실패 시 사용자 재시도). v1.5에서 `retry` util 추가 검토.

### 4.3 Prompt Builder (`src/domain/promo-prompt.ts`) 🆕

```ts
export interface PromoPromptContext {
  provider: Provider;
  workCases: WorkCase[];          // 최대 3
  latestReview: Review | null;
  topicHint: string | null;
  // trendKeywords v1 미사용 (validator fix H1)
}

export function buildPromoPrompt(ctx: PromoPromptContext): {
  system: string;
  user: string;
};
```

**System prompt (고정 + brandTone 삽입)**:

```
당신은 한국 로컬 청소 마켓플레이스 '청광'의 청명(청소 업체) 홍보 블로그 작가입니다.

**청결 격리 원칙 (반드시 준수)**:
1. 청결 이슈와 배상은 '청광 배상보험 5억'이 책임 · 청명 개인 책임으로 말하지 않음
2. 청명 개인에 대한 공격·비난 표현 금지
3. 기술 중심 서술 (약품 · 도구 · 공정 설명) · 개인 감정 과장 금지

**금지 표현**:
- "최저가" "파격 할인" 같은 과장 표현
- 타사 비방 · 비교
- 개인정보 언급
- 결과 100% 보장 약속

**톤**: {brandTone}
- friendly: 친근한 반말체 ("함께 알아볼까요?" "편하게 말씀해 주세요")
- professional: 정중한 존댓말 ("말씀드리겠습니다" "도움이 되시길")
- playful: 유머 섞인 친근 ("깜짝 놀랄 만큼" 이모지 간헐 사용)

**출력 형식 (JSON)**:
{
  "title": "매력적인 블로그 제목 (40-80자)",
  "bodyMarkdown": "## H2 2-3개와 bullet list 1개 포함한 800-1500자 markdown 본문",
  "summary80": "피드 카드용 80자 내외 요약"
}

**Markdown 제한**:
- 허용 태그: h2, h3, p, ul, ol, li, strong, em, a, br
- 이미지 태그 금지 (cover 이미지는 별도 처리)
- 외부 링크는 https:// 만
```

**User prompt**:

```
청명 정보:
- 업체명: {companyName}
- 지역: {regionLabel}
- 서비스 카테고리: {categories}
- 소개: {description || "없음"}
- 슬로건: {slogan}

대표 단가 (priceBook):
{priceBook 최대 3개 · 없으면 "등록된 단가 없음"}

최근 작업 사례:
{workCases 3개: sizeLabel · category · memo}

최신 리뷰:
{latestReview?.text · 없으면 "리뷰 없음"}

**주제 힌트**: {topicHint ?? "자유 주제 (계절 · 청소 팁 · workCase 사례 중 선택)"}

위 정보를 바탕으로 실제 고객이 읽을 블로그 포스트 1개를 작성하세요.
JSON 형식으로만 응답하고, 추가 설명 없이 바로 JSON을 출력하세요.
```

### 4.4 Markdown renderer (`src/lib/markdown.ts`) 🆕 · server-only

```ts
import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br"],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
```

**Deps 추가** (main package.json):
- `marked@^14.0.0`
- `sanitize-html@^2.13.0`
- `@types/sanitize-html@^2.11.0` (dev)

### 4.5 Slug util (`src/lib/slug.ts`) 🆕

```ts
/** 한글 포함 · 공백/특수문자 → 하이픈 · 길이 30자 제한 */
export function titleToSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return slug || "post";
}
```

### 4.6 Repository

#### `postRepository` (`src/lib/firebase/post-repository.ts`) 🆕

```ts
import { cache } from "react";

export const postRepository = {
  async create(id: string, data: PostCreateInput): Promise<void>;
  /** React cache() 래핑 · generateMetadata + page body 같은 요청 내 dedup */
  get: cache(async (id: string): Promise<Post | null> => { ... }),
  async findBySlug(slug: string): Promise<Post | null>;  // v1.5b SEO URL용
  async listRecent(limit = 50): Promise<Post[]>;          // createdAt DESC
  async listByProvider(providerId: string, limit = 3): Promise<Post[]>;
};
```

#### `providerRepository.update` 기존 재활용 (patch에 brandTone/slogan/lastPromoPostAt 가능).

#### `toProvider` 매핑 3 필드 추가.

### 4.7 Env 설정

- `.env.local` 에 `GOOGLE_GENERATIVE_AI_API_KEY=...` 필요 (배포 시 Vercel/Firebase Hosting env)
- `GOOGLE_GENERATIVE_AI_MODEL=gemini-2.5-flash` (optional · default fallback)

---

## 5. UI / UX Design

### 5.1 `/provider/profile?tab=promo` (청명 홍보 탭)

```
┌─────────────────────────────────────────┐
│ 청명 프로필 편집 · 홍보 탭                  │
├─────────────────────────────────────────┤
│ [기본정보] [서비스단가] [포트폴리오] [홍보]  │  4-tab
├─────────────────────────────────────────┤
│                                          │
│ **사전 정보** (1회 설정)                    │
│ 브랜드 톤                                 │
│ [ 친근한 말투 ▾ ]                         │
│ 슬로건 (40자)                             │
│ [ 강남에서 4년간 믿고 맡기는 청소 ]         │
│ [ 저장하기 ]                              │
│                                          │
├─────────────────────────────────────────┤
│ **새 홍보 포스트 만들기**                  │
│ 주제 힌트 (선택 · 60자)                    │
│ [ 입주청소 꿀팁 · 비우기 ]                 │
│                                          │
│ [📝 포스트 생성 (주 1회)]                  │
│ 💡 다음 생성 가능: 4/28 (월) 14:00         │  ← 쿨다운 시                              │
│                                          │
├─────────────────────────────────────────┤
│ **내 최근 포스트**                         │
│ ┌──────────────────────────────────┐    │
│ │ 입주청소 전 꼭 챙겨야 할 5가지       │    │
│ │ 3일 전 · 편안한 집으로 이사하는 ...  │    │
│ └──────────────────────────────────┘    │
│ ┌──────────────────────────────────┐    │
│ │ ...                              │    │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 5.2 `/community` 피드

```
┌─────────────────────────────────────────┐
│ 커뮤니티                                  │
│ 청명의 청소 팁과 소식을 만나보세요           │
├─────────────────────────────────────────┤
│ ┌──────────────────────────────────┐    │
│ │ [cover image · 16:10]             │    │
│ │                                  │    │
│ │ 입주청소 전 꼭 챙겨야 할 5가지       │    │
│ │ 청광 직영 청소팀 · 3일 전            │    │
│ │ 편안한 집으로 이사하는 지름길...    │    │
│ │                                  │    │
│ └──────────────────────────────────┘    │
│ ┌──────────────────────────────────┐    │
│ │ ...                              │    │
│ └──────────────────────────────────┘    │
│                                          │
│ (empty)                                  │
│ 📝 아직 포스트가 없어요                   │
│ 청명이 홍보 포스트를 올리면 표시돼요        │
└─────────────────────────────────────────┘
```

### 5.3 `/community/{postId}` 상세

```
┌─────────────────────────────────────────┐
│ [← 뒤로]                                 │
│ [cover image 16:10]                      │
│                                          │
│ # 입주청소 전 꼭 챙겨야 할 5가지            │
│ 청광 직영 청소팀 · 3일 전                   │
│                                          │
│ ## 이사 전 필수 체크리스트                 │
│ 편안한 집으로 이사하는 지름길은...         │
│ - 전기 점검                              │
│ - 수도 상태                              │
│ ...                                      │
│                                          │
├─────────────────────────────────────────┤
│ ┌──────────────────────────────────┐    │
│ │ [avatar] 청광 직영 청소팀           │    │
│ │ 서울 강남구 · 4.9⭐ (127)          │    │
│ │ [프로필 보기 →]                   │    │
│ └──────────────────────────────────┘    │
│                                          │
│ [    💰 견적 요청하기    ]                │
│                                          │
└─────────────────────────────────────────┘
```

### 5.4 `/providers/{id}` · "새소식" 섹션 (기존 reader 확장)

```
(기존 섹션들)
...
Reviews
---
**새소식**
┌──────┐ ┌──────┐ ┌──────┐
│ post │ │ post │ │ post │
│  1   │ │  2   │ │  3   │
└──────┘ └──────┘ └──────┘
[커뮤니티에서 더 보기 →]
```

### 5.5 Component List

| # | Component | Type | Location |
|---|-----------|:----:|----------|
| 1 | PromoTab | Client (wrapper) | `components/provider-profile-editor/PromoTab.tsx` |
| 2 | PromoSettingsForm | Client · useTransition | 동 |
| 3 | CreatePromoPostButton | Client · useTransition + redirect | 동 |
| 4 | MyPromoPostsList | Server · fetch 3 | 동 |
| 5 | ProfileEditorTabs (수정) | Client | 기존 |
| 6 | PostFeedGrid | Server | `components/community/PostFeedGrid.tsx` |
| 7 | PostFeedCard | Client · Link | 동 |
| 8 | CommunityEmptyState | Client · Link | 동 |
| 9 | PostDetailView | Server · dangerouslySetInnerHTML sanitized HTML | 동 |
| 10 | PostProviderInfoCard | Server | 동 |
| 11 | QuoteCTAButton | Client · Link | 동 |
| 12 | NewsSection | Server · fetch 3 | `components/provider-profile/NewsSection.tsx` |

**12 components · Server 7 / Client 5**

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 비로그인 /community · /community/{id} | public 허용 (rules) |
| 비로그인 /provider/profile?tab=promo | proxy /provider/* matcher redirect /login |
| 사전 정보 없이 createPromoPost | INVALID_STATE "사전 정보 저장 필요" |
| 쿨다운 7일 미만 | INVALID_STATE + "다음 생성 가능: {label}" |
| Gemini network 실패 | LLM_FAILURE "생성 실패 · 재시도" · TX 미실행 · 쿨다운 미소모 |
| Gemini JSON malformed | INVALID_INPUT + TX 미실행 |
| Gemini 출력 길이 초과/부족 | Zod 검증 실패 → INVALID_INPUT |
| Post 존재 안 함 /community/{id} | notFound() |
| postRepository list 실패 | console.warn + empty 반환 → EmptyState |
| XSS 시도 (Gemini 이상 출력) | sanitize-html에서 tag 제거 · href non-https 제거 |
| Rate limit (Gemini API 초과) | LLM_FAILURE · 사용자에게 재시도 안내 |

---

## 7. Security

- **Firestore rules** `posts.read: true` public · `write: false` Admin SDK 독점
- **Provider update** 기존 rules `write: false` 유지 · brandTone/slogan/lastPromoPostAt도 Admin SDK만
- **Markdown sanitize** whitelist allowedTags · `a[href]` https-only · rel noopener
- **Gemini API key** server-only env (`GOOGLE_GENERATIVE_AI_API_KEY` · NEXT_PUBLIC_ prefix 없음)
- **Rate limit** v1 생략 · 주 1회 쿨다운이 암묵적 제한 · v1.5 Gemini 비용 모니터링 후 검토
- **Provider ownership** Server Action에서 `resolveProviderId`로 검증 (타인 포스트 생성 불가)

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| Presentation Server | `app/community/page.tsx` · `app/community/[postId]/page.tsx` · `app/providers/[id]/page.tsx` (확장) · `app/provider/profile/page.tsx` (확장) · PostFeedGrid · PostDetailView · PostProviderInfoCard · NewsSection · MyPromoPostsList |
| Presentation Client | PromoTab · PromoSettingsForm · CreatePromoPostButton · PostFeedCard · CommunityEmptyState · QuoteCTAButton · ProfileEditorTabs (기존 확장) |
| Application | `app/actions/promo-actions.ts` (updatePromoSettings · createPromoPost) |
| Domain | `types/post.ts` · `types/provider.ts` (확장) · `domain/promo-schemas.ts` · `domain/promo-prompt.ts` (pure) · `lib/slug.ts` (pure) |
| Infrastructure | `lib/firebase/post-repository.ts` (server-only Admin SDK) · `lib/gemini.ts` (server-only · Gemini client) · `lib/markdown.ts` (server-only · marked + sanitize-html) · 기존 repos 재활용 |

---

## 9. Convention

- `"use server"` / `"use client"` / `"server-only"` 정확
- Import order: external → `@/...` → relative → type
- ARIA: feed `role="list"` · card `role="listitem"` + `aria-label` · CTA button 명확 · tab `aria-selected`
- PascalCase components · camelCase utils (buildPromoPrompt · titleToSlug · renderMarkdown · createGeminiClient)

---

## 10. Implementation Guide

### 10.1 File Structure

```
src/
├── types/
│   ├── post.ts                                 🆕
│   └── provider.ts                             🔄 3 필드 optional
│
├── domain/
│   ├── promo-schemas.ts                        🆕 Zod + geminiPostResponseSchema
│   └── promo-prompt.ts                         🆕 buildPromoPrompt
│
├── lib/
│   ├── gemini.ts                               🆕 server-only · Gemini client
│   ├── slug.ts                                 🆕 pure titleToSlug
│   └── markdown.ts                             🆕 server-only · marked + sanitize-html
│
├── lib/firebase/
│   ├── post-repository.ts                      🆕 5 methods
│   └── provider-repository.ts                  🔄 toProvider 3 필드 + update patch type
│
├── app/actions/
│   └── promo-actions.ts                        🆕 2 Server Actions
│
├── app/community/
│   ├── page.tsx                                🔄 placeholder → feed shell
│   └── [postId]/page.tsx                       🆕 상세 + generateMetadata
│
├── components/community/                        🆕 폴더
│   ├── PostFeedGrid.tsx
│   ├── PostFeedCard.tsx
│   ├── CommunityEmptyState.tsx
│   ├── PostDetailView.tsx
│   ├── PostProviderInfoCard.tsx
│   └── QuoteCTAButton.tsx
│
├── components/provider-profile/
│   └── NewsSection.tsx                         🆕 Server · 3 포스트
│
├── components/provider-profile-editor/
│   ├── PromoTab.tsx                            🆕
│   ├── PromoSettingsForm.tsx                   🆕
│   ├── CreatePromoPostButton.tsx               🆕
│   ├── MyPromoPostsList.tsx                    🆕 Server
│   └── ProfileEditorTabs.tsx                   🔄 "홍보" 탭
│
├── app/provider/profile/page.tsx               🔄 tab=promo 분기
├── app/providers/[providerId]/page.tsx         🔄 NewsSection fetch
│
├── firestore.rules                             🔄 posts rules
├── firestore.indexes.json                      🔄 2 indexes
├── package.json                                🔄 marked + sanitize-html deps
└── scripts/seed-first-provider.mjs             🔄 샘플 포스트 3개
```

**17 신규 + 6 수정 + 3 infra + seed + 3 deps** (marked · sanitize-html · @types/sanitize-html). Server 7 / Client 5.

### 10.2 Implementation Order (12 steps)

1. `pnpm add marked sanitize-html @types/sanitize-html` + env `GOOGLE_GENERATIVE_AI_API_KEY`
2. `types/post.ts` + `types/provider.ts` 확장 + `firestore.rules` + `firestore.indexes.json` · `firebase deploy`
3. `domain/promo-schemas.ts` + `domain/promo-prompt.ts`
4. `lib/gemini.ts` (functions/src copy + env 변경) + `lib/slug.ts` + `lib/markdown.ts`
5. `lib/firebase/post-repository.ts` (5 methods) + `provider-repository.ts` toProvider 확장
6. `app/actions/promo-actions.ts` (updatePromoSettings · createPromoPost)
7. `components/community/` 6 컴포넌트 (Grid · Card · Empty · Detail · Info · CTA)
8. `app/community/page.tsx` 교체 + `app/community/[postId]/page.tsx` 신규 + generateMetadata
9. `components/provider-profile/NewsSection.tsx` + `app/providers/[id]/page.tsx` fetch 추가
10. `components/provider-profile-editor/PromoTab.tsx` + SettingsForm + CreateButton + MyList
11. `ProfileEditorTabs.tsx` "홍보" 탭 + `app/provider/profile/page.tsx` tab=promo 분기
12. `scripts/seed-first-provider.mjs` 포스트 3개 + seed 실행 + pre-flight smoke test

### 10.3 Pre-flight 체크리스트

- [ ] `.env.local` `GOOGLE_GENERATIVE_AI_API_KEY` 설정
- [ ] Firestore rules + 2 indexes 배포
- [ ] `pnpm tsc --noEmit` 0 errors
- [ ] seed 실행 · 청광 직영 포스트 3개 생성
- [ ] 청명 `/provider/profile?tab=promo` 진입 · 사전 정보 저장
- [ ] "포스트 생성" 클릭 → Gemini 호출 → /community/{postId} redirect
- [ ] 쿨다운 7일 미만 시 버튼 disable + 다음 가능 날짜 표시
- [ ] Gemini 실패 시 에러 표시 · lastPromoPostAt 미변경
- [ ] `/community` 피드 · 생성 포스트 최상단 · seed 하단
- [ ] `/community/{postId}` 상세 · markdown render · 견적 CTA
- [ ] `/providers/{id}` NewsSection 3건 노출
- [ ] 비로그인 /community 접속 OK

---

## 11. Next.js 16 Specific

### 11.1 Cache Components
- `/community`: public · `await connection()` 로 dynamic 전환 (기존 client-dashboard 패턴)
- `/community/{postId}`: cookies() 없음 · but postRepository fetch · `await connection()` 필요
- `/provider/profile?tab=promo`: cookies() 있음 → 자동 dynamic

### 11.2 generateMetadata
`/community/{postId}`에서 `generateMetadata({params})` async function · post fetch 재실행이 아니라 React `cache()` 처리 or Next.js 자동 dedup (same params)

### 11.3 revalidatePath
createPromoPost 성공 시:
- `/community` (feed)
- `/providers/${providerId}` (NewsSection)
- `/provider/profile` (MyPromoPostsList)

### 11.4 Server Action 타임아웃
기본 60s · Gemini Flash 10~30s 예상 · 여유 충분. 만약 초과 시 v1.5b에서 Firebase Function 비동기 패턴 검토 (Plan Phase 2 B 옵션).

---

## 12. Test Plan (22건)

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 비로그인 /community | 피드 노출 (public) |
| 2 | /community · posts 0 | CommunityEmptyState |
| 3 | /community · posts N | PostFeedCard × N (createdAt DESC) |
| 4 | /community/{postId} · 존재 | PostDetailView 전체 렌더 |
| 5 | /community/{invalid} | notFound |
| 6 | QuoteCTAButton 클릭 | /quote/new?cat=X&providerId=Y |
| 7 | /providers/{id} · 포스트 3+ | NewsSection 노출 |
| 8 | /providers/{id} · 포스트 0 | NewsSection null |
| 9 | /provider/profile?tab=promo | PromoTab 렌더 |
| 10 | PromoSettingsForm brandTone + slogan 저장 | providers 필드 업데이트 |
| 11 | 사전 정보 없이 CreatePromoPostButton | UI disabled or INVALID_STATE |
| 12 | 쿨다운 < 7d | 버튼 disabled + "다음 가능: {label}" |
| 13 | 쿨다운 >= 7d | 버튼 active |
| 14 | createPromoPost 성공 | posts.create + lastPromoPostAt update + redirect |
| 15 | 생성 후 feed 최상단 | createdAt DESC · seed 하단 |
| 16 | 생성 후 /providers/{id} NewsSection 반영 | revalidatePath |
| 17 | Gemini 실패 | error · lastPromoPostAt 미변경 (쿨다운 절약) |
| 18 | Zod parse 실패 (malformed JSON) | INVALID_INPUT |
| 19 | 슬로건 41자 | Zod 거부 |
| 20 | brandTone invalid | Zod 거부 |
| 21 | MyPromoPostsList 최신 3 | Link /community/{id} |
| 22 | seed 실행 | 청광 직영 포스트 3개 feed 하단 노출 |
| 23 | sanitize-html XSS 방어 | `<script>` payload Gemini 출력 → script tag 제거 |
| 24 | sanitize-html non-https href | `http://...` · `javascript:` href → a 태그 유지 또는 attribute 제거 |
| 25 | Gemini bodyMarkdown < 200자 | Zod `.min(200)` 거부 · 쿨다운 미소모 |
| 26 | titleToSlug Unicode regex | 한글 제목 "입주청소 꿀팁" → "입주청소-꿀팁" · ES2018+ target 확인 |
| 27 | workCase.afterPhoto.url 존재 확인 | `Photo.url` 타입 (types/page.ts:57-60) · null 경우 profileImage fallback |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. 14 Open Questions 해소. Server Action + Gemini Flash direct (`@google/generative-ai` main package 이미 포함) · 주 1회 cooldown · 12 components (Server 7 / Client 5) · posts rules + 2 indexes + providers 3 필드 · marked + sanitize-html 신규 deps · content-research-pipeline Gemini client copy + env 변경 · promo-page 청결 격리 프롬프트 재활용 · 22 Test Plan · 12-step Implementation Order | Seokho Lee |
| 0.2 | 2026-04-21 | design-validator 97% 피드백 반영 (10건): **(H1)** `trendKeywordsRepository`가 `Category`(restaurant/salon/cafe) 전용으로 `QuoteCategory` 미호환 확인 · **v1에서 trendKeywords fetch 생략** · v1.5b에서 `quoteTrendKeywords` 신규 컬렉션 검토. **(H2)** §2.1 step 2를 `resolveProviderId()` helper 패턴으로 명시 (provider-profile-editor와 통일). **(M3)** `generateMetadata`에서 `postRepository.get`을 **React `cache()` 래핑** · 같은 request 내 중복 read 방지. **(M4)** tsconfig `target` ES2018+ 확인 안내 (Unicode regex `/u` flag). **(M5)** `WorkCase.afterPhoto.url` 확인 (`types/page.ts:57` Photo 구조 검증). **(M6)** Gemini quota 실패 시 무한 재시도 위험은 accepted risk (쿨다운 미소모 · v1.5b rate limit 검토). **(L8)** marked + sanitize-html + @types deps 3개 명시. **(L9)** Test #23-27 추가 (XSS · non-https · min(200) · 한글 slug · Photo.url). **(L10)** `EditorTabKey` 확장 다이어그램은 implementation order §10.2 step 11에서 구체화. | Seokho Lee |
