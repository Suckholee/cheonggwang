---
template: design
version: 1.2
feature: content-research-pipeline
date: 2026-04-19
author: Seokho Lee
project: cheonggwang (firebase-next-app)
version-proj: 0.1.0
---

# content-research-pipeline Design Document

> **Summary**: 네이버 검색 API + 티스토리/워드프레스 RSS로 합법 범위 공개 콘텐츠를 주 1회 자동 수집·분석하여 promo-page의 `trendKeywords/{category}` 키워드 풀을 자동 갱신하고, `templates/{category}/proposals/{weekKey}` 템플릿 제안을 운영자에게 이메일로 전달한다.
>
> **Project**: cheonggwang (firebase-next-app)
> **Version**: 0.1.0
> **Author**: Seokho Lee
> **Date**: 2026-04-19
> **Status**: Draft
> **Planning Doc**: [content-research-pipeline.plan.md](../../01-plan/features/content-research-pipeline.plan.md)
> **Sibling (consumer)**: [promo-page (archived)](../../archive/2026-04/promo-page/promo-page.design.md) — 본 파이프라인의 산출물을 소비하는 기능

---

## 0. Context & Decision Alignments (vs Plan)

Plan 작성 이후 채택된 결정과 본 설계에 반영되는 변경:

| 항목 | Plan | Design 확정 |
|------|------|-------------|
| LLM 공급자 | Gemini via **Vertex AI SDK** | **Google AI Studio API** (`@google/generative-ai`, `gemini-3-flash-preview`) — promo-page와 정렬 |
| LLM 모델 | Gemini 1.5 Flash | `gemini-3-flash-preview` (env 오버라이드 가능) |
| 워크스페이스 | "Firebase Functions 프로젝트 내" (모호) | 현재 `pnpm-workspace.yaml` 존재 → **`functions/` 별도 package**, 루트 monorepo 구성 |
| 이메일 | Firebase Extension 또는 Resend | **Resend API** 단일화 (Firebase Extension은 SMTP 추가 구성 필요) |
| 템플릿 SectionType | 제안 스키마 고정 | promo-page의 `SectionType` enum을 **그대로 공유** (복사본 유지) |

---

## 1. Overview

### 1.1 Design Goals

- 주 1회 실행이 95% 이상 성공률 (plan 성공 기준)
- 사람 손 없이 완주 (템플릿 PR 머지만 수동)
- 어댑터 단위 실패는 전체 실행에 영향 없음 (fault isolation)
- 비용 월 $1.5 이내 유지 (업종 3개 기준)

### 1.2 Design Principles

- **Server-only by construction**: 모든 코드가 Firebase Functions(Admin 권한) 런타임. 클라이언트 접근 경로 없음
- **Fault-isolated adapters**: `Promise.allSettled`로 소스별 실패 격리
- **Schema-first LLM**: Gemini 호출은 항상 `responseSchema`로 구조화 출력
- **Write-isolation 준수 (promo-page §9.4)**: 파이프라인만 `trendKeywords/**`·`researchSources/**`·`proposals/**`를 쓰고, promo-page는 `trendKeywords/{category}`를 **읽기만**
- **TTL-driven cleanup**: 원본(`researchSources`)·rate-limit 등은 Firestore TTL 정책으로 자동 삭제
- **Idempotent by weekKey**: 같은 주 재실행 시 덮어쓰기. Raw는 `urlHash` 기반 멱등

---

## 2. Architecture

### 2.1 Component Diagram

```
                         ┌────────────────────────────────┐
[매주 월 09:00 KST]      │   Cloud Scheduler              │
                         │   (firebase-functions onSchedule│
                         │    자동 생성)                    │
                         └──────────────┬──────────────────┘
                                        │ HTTPS
                                        ▼
┌───────────────────────────────────────────────────────────┐
│  Firebase Functions (2nd gen, Node 22)                    │
│  runResearchPipeline (onSchedule)                         │
│    ├─ fanout: category in ['restaurant','salon','cafe']   │
│    │    ├─ ① Collect  (Promise.allSettled)                │
│    │    │   ├─ NaverSearchAdapter                         │
│    │    │   ├─ TistoryRssAdapter                          │
│    │    │   └─ WordPressRssAdapter                        │
│    │    ├─ ② Normalize (HTML cleaner + hash + classify)    │
│    │    ├─ ③ Persist raw → researchSources/{cat}/raw      │
│    │    ├─ ④ Analyze (Gemini × 4 in parallel)              │
│    │    ├─ ⑤ Persist insights → researchInsights/../weekly │
│    │    └─ ⑥ Write outputs                                │
│    │        ├─ trendKeywords/{cat}          (자동 덮어쓰기) │
│    │        └─ templates/{cat}/proposals/.. (검수 대기)    │
│    └─ ⑦ Resend 이메일 (요약 + 제안 링크)                    │
└───────────────────────────────────────────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
     Firestore (Admin)         Naver Search API        Tistory/WP RSS
     (pipeline 전용)            (Client ID/Secret)     (공개 피드)
                                        
                                        │
                                        ▼
                              Google AI Studio (Gemini)
                                        │
                                        ▼
                              Resend (이메일)
```

### 2.2 Data Flow (Integrated with promo-page)

```
[content-research-pipeline]                [promo-page]

Cloud Scheduler                            
     │                                     
     ▼                                     
runResearchPipeline                        
     │                                     
     ├──writes──→ trendKeywords/{cat}  ──reads──→  prompt-builder
     │                                                    │
     └──writes──→ templates/{cat}/                        │
                    proposals/{weekKey} ──검수──→ git PR  │
                                                 │        │
                                                 ▼        ▼
                                   src/lib/templates/     Gemini 호출
                                   [category].ts (code)   (사용자 편집)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `runResearchPipeline` (Scheduled Fn) | Cloud Scheduler (firebase-functions v2) | 트리거 |
| Adapters | `node-fetch` 내장 `fetch`, `rss-parser` | 원본 수집 |
| Normalizer | `sanitize-html`, Node `crypto` sha1 | HTML 정제, urlHash |
| Category classifier | Gemini (1-shot), 키워드 fallback | 업종 분류 |
| Analyzer | Gemini (`@google/generative-ai`) | 섹션/톤/CTA/키워드 분석 |
| Writers | `firebase-admin/firestore` | Firestore 쓰기 |
| Email notifier | Resend REST API (`fetch`) | 주간 요약 |
| Secret Manager | `firebase-functions/params.defineSecret` | 네이버/Resend/Gemini 키 |

---

## 3. Data Model

### 3.1 Shared Types (copied from promo-page for worker scope)

```ts
// functions/src/research/types/shared.ts
// promo-page의 src/types/page.ts와 동일하게 유지 (향후 workspace package로 리팩터 대상)

export type Category = 'restaurant' | 'salon' | 'cafe';
export type SectionType =
  | 'hero' | 'intro' | 'highlights' | 'hygiene' | 'location' | 'cta';
```

### 3.2 Pipeline Internal Types

```ts
// functions/src/research/types/source.ts
export type SourceType = 'naver' | 'tistory' | 'wordpress';

export interface RawSource {
  urlHash: string;         // sha1(url)
  url: string;
  sourceType: SourceType;
  title: string;
  snippet: string;
  body?: string;           // RSS full content if available
  tags: string[];
  author?: string;
  publishedAt?: Date;
  collectedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedSource extends RawSource {
  detectedCategory: Category;
  confidence: number;      // 0-1
}

// functions/src/research/types/insight.ts
export interface SectionStructureInsight {
  commonOrder: SectionType[];
  lengthDistribution: Record<SectionType, { p50: number; p90: number }>;
  sampleCount: number;
}

export interface ToneProfile {
  politenessLevel: 'formal' | 'casual';
  emojiDensity: number;       // emojis per 100 chars
  avgSentenceLength: number;
}

export interface CtaPattern {
  type: string;               // '예약'|'방문'|'전화'|'리뷰'|...
  example: string;            // 최대 40자
  frequency: number;          // 0-1
}

export interface KeywordEntry {
  term: string;
  score: number;              // TF-IDF normalized
}

export interface CategoryInsight {
  sectionStructure: SectionStructureInsight;
  toneProfile: ToneProfile;
  ctaPatterns: CtaPattern[];
  topKeywords: KeywordEntry[]; // top 50
}

// functions/src/research/types/proposal.ts
export interface SectionDefinition {
  type: SectionType;
  order: number;
  required: boolean;
  notes?: string;
}

export interface TemplateProposal {
  proposedStructure: SectionDefinition[];
  diff: string;               // vs git templates/[category].ts
  status: 'pending' | 'approved' | 'rejected';
}
```

### 3.3 Firestore Collection Schema

#### `researchJobs/{jobId}`
| Field | Type | Notes |
|-------|------|-------|
| category | Category | |
| weekKey | string | `YYYY-Www` |
| status | 'running'\|'completed'\|'failed' | |
| sourceCount | number | normalized sources 수 |
| startedAt, finishedAt | timestamp | |
| errors | { adapter: string, message: string }[] | |

#### `researchSources/{category}/raw/{urlHash}`
| Field | Type | Notes |
|-------|------|-------|
| sourceType | SourceType | |
| url, urlHash | string | |
| title, snippet, body?, tags[] | | |
| author?, publishedAt? | | |
| collectedAt | timestamp | |
| ttlExpiresAt | timestamp | **Firestore TTL 정책 대상 (90일)** |
| rawPayload | map | |

#### `researchInsights/{category}/weekly/{weekKey}` — 위 `CategoryInsight`

#### `trendKeywords/{category}`
| Field | Type | Notes |
|-------|------|-------|
| keywords | string[30] | 파이프라인이 덮어씀 |
| updatedAt | timestamp | |
| sourceWeek | string | "2026-W17" |

#### `templates/{category}/proposals/{weekKey}`
| Field | Type | Notes |
|-------|------|-------|
| proposedStructure | SectionDefinition[] | SectionType enum 내로 제약 |
| diff | string | |
| status | 'pending'\|'approved'\|'rejected' | |
| createdAt, reviewedAt?, reviewerUid? | | |

### 3.4 Firestore Security Rules (추가 — 기존 규칙에 append)

기존 `firestore.rules`에 `researchJobs/**`, `researchSources/**`, `researchInsights/**`, `templates/**/proposals/**`를 모두 **클라이언트 접근 불가**로 잠금. `trendKeywords/{category}`는 기존대로 v1 closed 유지 (promo-page는 Admin SDK로만 접근).

```javascript
// 기존 firestore.rules에 추가
match /researchJobs/{jobId} {
  allow read: if false;
  allow write: if false;
}
match /researchSources/{category}/raw/{urlHash} {
  allow read: if false;
  allow write: if false;
}
match /researchInsights/{category}/weekly/{weekKey} {
  allow read: if false;
  allow write: if false;
}
match /templates/{category}/proposals/{weekKey} {
  allow read: if false;
  allow write: if false;
}
```

모두 Admin SDK (Firebase Functions)만 접근 가능.

### 3.5 Firestore TTL 정책 (인프라 수동 설정)

Firebase Console → Firestore → TTL:
- Collection: `researchSources` (collection-group) → Field: `ttlExpiresAt`, 90일
- Collection: `rateLimits` (기존 promo-page) → Field: `ttlExpiresAt`, 이미 설정되어 있어야 함

---

## 4. API / Function Specification

### 4.1 Scheduled Function

```ts
// functions/src/research/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const NAVER_CLIENT_ID = defineSecret('NAVER_CLIENT_ID');
const NAVER_CLIENT_SECRET = defineSecret('NAVER_CLIENT_SECRET');
const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret('GOOGLE_GENERATIVE_AI_API_KEY');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

export const runResearchPipeline = onSchedule(
  {
    schedule: '0 9 * * 1',
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
    memory: '1GiB',
    timeoutSeconds: 3600,      // 최대 60분
    secrets: [
      NAVER_CLIENT_ID,
      NAVER_CLIENT_SECRET,
      GOOGLE_GENERATIVE_AI_API_KEY,
      RESEND_API_KEY,
    ],
  },
  async () => {
    await runAllCategories({
      naver: { id: NAVER_CLIENT_ID.value(), secret: NAVER_CLIENT_SECRET.value() },
      gemini: { apiKey: GOOGLE_GENERATIVE_AI_API_KEY.value() },
      resend: { apiKey: RESEND_API_KEY.value(), to: process.env.OPERATOR_EMAIL! },
    });
  }
);
```

### 4.2 Manual Rerun (HTTPS Callable)

```ts
// functions/src/research/admin-rerun.ts
export const rerunResearchPipeline = onCall(
  { region: 'asia-northeast3', secrets: [...] },
  async (request) => {
    // request.auth.token.admin === true 검증 (Firebase Auth custom claim)
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'admin only');
    }
    const { category, weekKey } = request.data as { category: Category; weekKey?: string };
    return runSingleCategory(category, weekKey);
  }
);
```

운영자 UID에 `admin: true` custom claim 부여는 Firebase Admin SDK로 1회 수동 스크립트 수행 (별도 문서).

---

## 5. Adapter Specifications

### 5.1 NaverSearchAdapter — 네이버 블로그 검색 API

**인증**: `X-Naver-Client-Id`, `X-Naver-Client-Secret` 헤더

**엔드포인트**: `https://openapi.naver.com/v1/search/blog.json`

**파라미터**: `query`, `display=100`, `sort=sim`

**쿼리 세트 (업종별, v1 확정)**:

```ts
// functions/src/research/adapters/naver-search.ts
const NAVER_QUERIES: Record<Category, string[]> = {
  restaurant: [
    '동네 맛집', '숨은 맛집', '점심 맛집', '가성비 식당',
    '가족 모임 식당', '분위기 좋은 레스토랑', '브런치 맛집',
  ],
  salon: [
    '잘하는 미용실', '머릿결 미용실', '맞춤 컷 미용실',
    '염색 잘하는 곳', '펌 잘하는 미용실', '1:1 미용실',
  ],
  cafe: [
    '분위기 좋은 카페', '디저트 맛집 카페', '작업하기 좋은 카페',
    '조용한 카페', '스페셜티 카페', '인스타 감성 카페',
  ],
};
```

**동작**: 업종당 7 쿼리 × 100건 = 700건/주. 네이버 API 일일 쿼터 25k 내. 결과 필드: `title`, `description`, `bloggername`, `postdate`, `link`. **블로그 본문은 가져오지 않음** (TOS 준수) — title/description만 저장.

### 5.2 TistoryRssAdapter — 공개 RSS

**엔드포인트**: 각 블로그의 `https://{blogname}.tistory.com/rss`

**큐레이션 피드 목록 (v1, 운영자가 수기로 선정)**:

```ts
// functions/src/research/adapters/curated-feeds.ts
export const TISTORY_FEEDS: Record<Category, string[]> = {
  restaurant: [
    'https://example-foodie.tistory.com/rss',
    // ... 운영자가 10~20개 큐레이션 (설계 승인 후 채움)
  ],
  salon: [...],
  cafe: [...],
};
```

> **Open item**: 본 설계 승인 후 운영자가 각 카테고리당 10~15개 RSS 피드를 별도 PR로 채워 넣는다. 초기엔 빈 배열로 배포해도 `NaverSearchAdapter`만으로 파이프라인이 동작.

**라이브러리**: `rss-parser` (간단 RSS/Atom 파싱)

### 5.3 WordPressRssAdapter — 공개 RSS

**엔드포인트 패턴**: `{domain}/feed/` 또는 `{domain}/?feed=rss2`

**큐레이션 피드**: Tistory와 동일한 패턴, 운영자 큐레이션

**동작**: Tistory와 동일한 `rss-parser` 사용, `sourceType: 'wordpress'`로 태깅.

---

## 6. Normalizer

### 6.1 HTML Cleaner

```ts
// functions/src/research/normalize/html-cleaner.ts
import sanitizeHtml from 'sanitize-html';

export function cleanHtml(html: string): string {
  const stripped = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return stripped
    .replace(/\s+/g, ' ')
    .trim();
}
```

### 6.2 URL Hash

```ts
// functions/src/research/lib/url-hash.ts
import { createHash } from 'node:crypto';
export function urlHash(url: string): string {
  // 프로토콜·trailing slash·utm_* 쿼리 제거 후 sha1
  const normalized = normalizeUrl(url);
  return createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}
```

### 6.3 Schema Mapper

어댑터별 원본 응답 → `RawSource` 공통 스키마 변환. 각 어댑터 파일 내에서 수행 (of layer boundary).

### 6.4 Category Classifier

파이프라인은 이미 카테고리별로 수집하지만, 검색 쿼리 결과는 다른 업종 글이 섞일 수 있음(ex: "동네 맛집"에 카페 포스트). **2단계 검증**:

1. **Keyword rule** (빠른 fallback):
   ```ts
   const KEYWORD_MAP: Record<Category, string[]> = {
     restaurant: ['맛집','식당','레스토랑','분식','한식','양식','일식','중식','고기','점심','저녁'],
     salon: ['미용실','헤어','컷','펌','염색','디자이너','모발','살롱'],
     cafe: ['카페','커피','디저트','브런치','원두','라떼','로스터리'],
   };
   ```
   title+snippet에 해당 카테고리 키워드 ≥ 2회 포함 → `detectedCategory = 수집 대상 category`, `confidence=0.7`

2. **Gemini 1-shot** (rule에서 애매하면만):
   - 프롬프트: "다음 한국어 블로그 제목과 요약이 '음식점/미용실/카페' 중 어디에 해당하는지 분류 + 신뢰도 0~1. JSON으로"
   - 결과 `detectedCategory`가 수집 대상과 다르면 **source 드롭**

### 6.5 Dedup

`researchSources/{category}/raw/{urlHash}` 에서 `urlHash`가 이미 존재하면 skip (이전 주에 수집된 글). 단, 오래 묵은 글이 재학습 샘플에서 밀리지 않도록 **최신 200건 샘플링은 전체 존재 document에서 `collectedAt` desc 정렬**로 수행.

---

## 7. Analyzer — Gemini 4종 (프롬프트 초안)

**공통 시스템 인스트럭션**:
```
당신은 한국 지역 상권 소상공인 홍보 콘텐츠를 분석하는 데이터 분석가입니다.
주어진 블로그/게시물 샘플을 분석하여 정확한 JSON schema로만 응답합니다.
주관적 평가·광고 문구 금지. 데이터 분포와 구조만 추출하세요.
```

### 7.1 Section Structure (섹션 구조)

**입력**: 샘플 200건의 title+snippet (Gemini 컨텍스트에 맞게 50건 단위 batch)

**프롬프트 요약**:
```
다음 한국어 블로그 50건의 본문 요약을 분석해 공통 섹션 구조를 추출하세요.
섹션 타입은 다음 enum 중에서만 선택: ['hero','intro','highlights','hygiene','location','cta']
출력:
- commonOrder: 가장 빈번한 섹션 순서 (배열)
- lengthDistribution: 각 섹션의 p50·p90 글자 수 추정
- sampleCount: 분석한 샘플 수
```

**Schema**: `SectionStructureInsight`

**배치 전략**: 50건 × 4 호출 → Gemini가 통합된 inference. 네 결과를 서버측에서 병합 (commonOrder는 최빈값, lengthDistribution은 가중평균).

### 7.2 Tone Profile (톤 분석)

**프롬프트**:
```
샘플에서 평균적 톤을 분석:
- politenessLevel: 'formal' (존댓말) 또는 'casual' (반말·구어) 중 우세한 쪽
- emojiDensity: 100자당 이모지 평균 개수 (소수점 2자리)
- avgSentenceLength: 평균 문장 길이 (한글 음절 기준)
```

**Schema**: `ToneProfile`

### 7.3 CTA Patterns

**프롬프트**:
```
샘플에서 독자 행동 유도 표현을 추출:
- 각 패턴의 type (한국어, 예: '예약'|'방문'|'전화'|'DM'|'쿠폰'|'리뷰'|'공유')
- example: 실제 등장한 표현 1개 (최대 40자, 개인정보 제거)
- frequency: 샘플 내 등장 빈도 (0-1)
상위 5개만 반환.
```

**Schema**: `{ patterns: CtaPattern[5] }`

### 7.4 Keyword TF-IDF (Hybrid)

**전략**: 로컬 TF-IDF 선계산 → Gemini에 후처리 정제.

**로컬 단계**:
```ts
// functions/src/research/analyzer/keyword-tfidf.ts
// 간이 토크나이저: 공백·구두점 split + 2~10자 한글 토큰만 유지
// 한국어 형태소 분석 라이브러리 의존 없이 단순 토큰 빈도 + 코퍼스 idf
```
상위 100 후보 생성 → Gemini에 "이 중 업종 마케팅에 의미 있는 30개 선별"

**Gemini 프롬프트**:
```
업종: {category}
후보 키워드(TF-IDF 상위 100): [term1, term2, ...]
조건:
- 일반어(그리고, 하지만, 오늘, 정말 등) 제외
- 개인정보(사람 이름, 전화번호) 제외
- 청결 어휘 (청소·위생·방역) 포함 금지 (promo-page §1.2 격리 규칙)
- 상위 30개만 score 내림차순 반환
```

**Schema**: `{ topKeywords: KeywordEntry[30] }`

---

## 8. Writers

### 8.1 `trendKeywords/{category}` 자동 쓰기

```ts
// functions/src/research/writers/trend-keywords-writer.ts
export async function writeTrendKeywords(
  category: Category, insight: CategoryInsight, weekKey: string,
) {
  await adminDb.collection('trendKeywords').doc(category).set({
    keywords: insight.topKeywords.slice(0, 30).map(k => k.term),
    updatedAt: FieldValue.serverTimestamp(),
    sourceWeek: weekKey,
  }, { merge: false });  // 전체 덮어쓰기
}
```

### 8.2 `templates/{category}/proposals/{weekKey}` 검수 대기

**구조 제안 생성 로직**:
1. `insight.sectionStructure.commonOrder`를 받아 SectionType enum 내로 필터링
2. 기존 `src/lib/templates/[category].ts`의 `renderOrder`와 diff 생성 (text unified diff)
3. `TemplateProposal`로 Firestore에 저장

```ts
// functions/src/research/writers/template-proposal-writer.ts
import { createPatch } from 'diff';

export async function writeTemplateProposal(
  category: Category, insight: CategoryInsight, weekKey: string, currentOrder: SectionType[],
) {
  const proposedStructure = insight.sectionStructure.commonOrder
    .filter((s): s is SectionType => SECTION_TYPES.includes(s))
    .map((type, i) => ({ type, order: i, required: ['hero','intro','cta'].includes(type) }));

  const diff = createPatch(
    `templates/${category}.renderOrder`,
    JSON.stringify(currentOrder, null, 2),
    JSON.stringify(proposedStructure.map(s => s.type), null, 2),
  );

  await adminDb.doc(`templates/${category}/proposals/${weekKey}`).set({
    proposedStructure, diff, status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
}
```

### 8.3 Email Notifier (Resend)

**도구**: Resend REST API (`POST https://api.resend.com/emails`)

**템플릿 (plain HTML, 한국어)**:
```html
<!-- functions/src/research/writers/email-notifier.ts 내 inline 생성 -->
<h2>📊 콘텐츠 연구 파이프라인 주간 결과 — {weekKey}</h2>

<h3>수집 요약</h3>
<ul>
  <li>음식점: {N}건 (네이버 {n1} · 티스토리 {n2} · 워드프레스 {n3})</li>
  <li>미용실: ...</li>
  <li>카페: ...</li>
</ul>

<h3>트렌드 키워드 TOP 5 (카테고리별)</h3>
<ul>
  <li>음식점: {kw1}, {kw2}, ...</li>
  ...
</ul>

<h3>템플릿 제안</h3>
<pre>{diff 요약 (max 500자)}</pre>

<p>
  전체 제안 검수: Firebase Console에서
  <code>templates/{category}/proposals/{weekKey}</code> 문서 확인
</p>
```

**Resend 호출**:
```ts
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: 'research-pipeline@{verified-domain}',
    to: operatorEmail,
    subject: `[청광 연구 파이프라인] ${weekKey} 주간 결과`,
    html: emailHtml,
  }),
});
```

**도메인 인증**: Resend 콘솔에서 발송 도메인 DNS 레코드 (SPF/DKIM) 수동 설정 필요.

---

## 9. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| `ADAPTER_FAIL` | 어댑터 1개 실패 (네트워크/쿼터) | `Promise.allSettled`로 격리, `researchJobs.errors`에 기록, 나머지 진행 |
| `GEMINI_FAIL` | Gemini 호출 실패 | exponential backoff × 3회, 최종 실패 시 분석 skip (나머지는 진행) |
| `FIRESTORE_WRITE_FAIL` | writes 실패 | 최대 3회 재시도, 실패 시 `researchJobs.status='failed'` |
| `JOB_FAIL` | 잡 단위 실패 | 화요일 09:00 자동 재시도 (별도 Scheduled Fn) |
| `CLASSIFIER_LOW_CONFIDENCE` | 분류 신뢰도 < 0.5 | 샘플에서 드롭, raw에만 저장 |
| `BAD_TOS` | robots.txt 또는 API 약관 위반 감지 | 해당 URL 영구 블록리스트 추가 (v2) |

**재실행 정책**: `researchJobs`에서 최근 24h 내 `status='failed'` 잡을 화요일 9시에 자동 재시도 (별도 onSchedule Fn).

---

## 10. Security Considerations

- [x] **Firestore 규칙 추가**: researchJobs/researchSources/researchInsights/proposals 모두 closed (§3.4)
- [x] **Secret 관리**: `defineSecret`으로 GCP Secret Manager 바인딩. 코드에 평문 없음
- [x] **Admin 재실행 엔드포인트**: Firebase Auth custom claim (`admin: true`) 검증
- [x] **API 쿼터 보호**: NaverSearchAdapter는 업종×쿼리 매트릭스로 정해진 호출 수만 수행 (주간 총 ~300 쿼리, 일일 25k 쿼터 내)
- [x] **개인정보 마스킹**: Normalizer에서 전화번호(`\d{2,3}-\d{3,4}-\d{4}`), 이메일 정규식 기반 `[REDACTED]` 치환
- [x] **TOS 준수**:
  - 네이버: 검색 API만 사용, 블로그 본문 크롤링 금지
  - 티스토리/워드프레스: 공개 RSS만
  - T3 금지 목록(인스타·당근·네이버 블로그 본문) 하드코딩으로 실수 방지
- [x] **감사 로깅**: 각 잡마다 `researchJobs`에 기록, Cloud Logging 자동 캡처

---

## 11. Test Plan

### 11.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit | Normalizer (html-cleaner, url-hash, classifier), writers 로직 | Vitest |
| Integration | 어댑터 (모킹된 HTTP), Firestore writes (Firebase Emulator) | Vitest + @firebase/rules-unit-testing |
| Contract | Gemini 4종 분석의 응답 스키마 준수 | Vitest + mock Gemini |
| E2E (수동) | Staging 프로젝트에서 소규모 주간 실행 | Firebase Emulator |

### 11.2 Test Cases (Key)

- [ ] Happy path: 3 어댑터 모두 성공 → raw 저장 → insight 저장 → trendKeywords 덮어쓰기 → 제안 저장 → 이메일 1건 발송
- [ ] 1 어댑터 실패: NaverSearchAdapter 에러 → Tistory/WP만 진행, `researchJobs.errors`에 네이버 기록
- [ ] Gemini 실패 1회 + 재시도 성공: exponential backoff 작동
- [ ] Gemini 최종 실패: 해당 분석 skip, 잡 전체는 `completed` (partial)
- [ ] **Hygiene 키워드 필터링**: `keyword-tfidf`에서 '청소' 등이 top 30에 들어가지 않음 (§7.4 프롬프트)
- [ ] **Category classifier**: "동네 카페 맛집" 글이 restaurant로 수집됐을 때 → cafe로 reclassify 후 drop (수집 대상 불일치)
- [ ] **Dedup**: 이전 주 이미 수집된 URL이 다시 나타나면 raw 재쓰기 없음
- [ ] **Slug(weekKey) 멱등**: 같은 주 재실행 → trendKeywords 덮어쓰기, proposal 재생성
- [ ] **Secret manager**: env 없이 로컬 실행 시 `defineSecret`이 런타임 에러 throw
- [ ] **Admin rerun 403**: non-admin 토큰으로 callable 호출 → 403

---

## 12. Clean Architecture

### 12.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Orchestration** | onSchedule entry, fanout, error aggregation | `functions/src/research/index.ts` |
| **Application** | runAllCategories, runSingleCategory (유스케이스) | `functions/src/research/usecases/` |
| **Domain** | types, section-type sync, keyword lists | `functions/src/research/types/`, `functions/src/research/domain/` |
| **Infrastructure** | adapters, gemini client, firestore writers, resend | `functions/src/research/{adapters,analyzer,writers,lib}/` |

### 12.2 Dependency Rules

```
Orchestration ──→ Application ──→ Domain ←── Infrastructure
                      │                            │
                      └────→ Infrastructure ←──────┘
```
- Domain 순수. Adapters/Writers는 Domain 타입만 import
- Orchestration은 Application을 통해서만 Infrastructure 접근

### 12.3 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `runResearchPipeline` (Scheduled Fn), `rerunResearchPipeline` | Orchestration | `functions/src/research/index.ts`, `admin-rerun.ts` |
| `runAllCategories`, `runSingleCategory` | Application | `functions/src/research/usecases/run.ts` |
| 타입 (`source.ts`, `insight.ts`, `proposal.ts`), `Category`·`SectionType` | Domain | `functions/src/research/types/` |
| `NaverSearchAdapter`, `TistoryRssAdapter`, `WordPressRssAdapter` | Infrastructure | `functions/src/research/adapters/` |
| `cleanHtml`, `urlHash`, `classifyCategory` | Infrastructure (with pure helpers dip into Domain) | `functions/src/research/normalize/` |
| Gemini 4 analyzers | Infrastructure | `functions/src/research/analyzer/` |
| `writeTrendKeywords`, `writeTemplateProposal`, `sendEmail` | Infrastructure | `functions/src/research/writers/` |
| `geminiClient`, `adminDb`, `retry` | Infrastructure | `functions/src/research/lib/` |

---

## 13. Coding Convention Reference

### 13.1 Naming

| Target | Rule | Example |
|--------|------|---------|
| Functions | camelCase | `runResearchPipeline`, `writeTrendKeywords` |
| Classes (adapters) | PascalCase | `NaverSearchAdapter` |
| Constants | UPPER_SNAKE_CASE | `NAVER_QUERIES`, `SECTION_TYPES` |
| Files (code) | kebab-case.ts | `naver-search.ts`, `trend-keywords-writer.ts` |
| Folders | kebab-case | `adapters/`, `normalize/` |
| Types | PascalCase | `RawSource`, `CategoryInsight` |

### 13.2 Import Order (functions workspace)

```ts
// 1. Node built-in
import { createHash } from 'node:crypto';

// 2. External
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

// 3. Internal (workspace root)
import { NAVER_QUERIES } from './adapters/queries';

// 4. Types
import type { RawSource, Category } from './types/source';
```

### 13.3 Environment Variables / Secrets

| Source | Purpose |
|--------|---------|
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (Secret) | 네이버 검색 API |
| `GOOGLE_GENERATIVE_AI_API_KEY` (Secret) | Gemini (AI Studio) |
| `GOOGLE_GENERATIVE_AI_MODEL` (env) | 모델 오버라이드, 기본 `gemini-3-flash-preview` |
| `RESEND_API_KEY` (Secret) | Resend 이메일 |
| `OPERATOR_EMAIL` (env) | 수신자 이메일 |

Firebase CLI로 Secret 등록:
```bash
firebase functions:secrets:set NAVER_CLIENT_ID
firebase functions:secrets:set NAVER_CLIENT_SECRET
firebase functions:secrets:set GOOGLE_GENERATIVE_AI_API_KEY
firebase functions:secrets:set RESEND_API_KEY
```

### 13.4 Write-Isolation (from promo-page §9.4)

- `functions/src/research/writers/` 는 **trendKeywords/{category} 쓰기만** 수행 (read 없음, merge:false로 덮어쓰기)
- `functions/src/research/` 외부에서 `researchJobs/**`·`researchSources/**`·`researchInsights/**`·`proposals/**`에 접근하는 코드는 금지 (grep-based CI 체크 권장)

---

## 14. Implementation Guide

### 14.1 File Structure (확정)

```
cheonggwang/                             # 모노레포 루트
├── package.json                         # Next.js app (기존)
├── pnpm-workspace.yaml                  # 루트 workspace (functions 추가)
├── firebase.json                        # firestore rules + functions deploy
├── firestore.rules                      # 본 설계의 §3.4 반영 필요
├── functions/
│   ├── package.json                     # functions 의존성
│   ├── tsconfig.json
│   ├── .env.local                       # 로컬 emulator용 (secrets는 미사용)
│   └── src/research/
│       ├── index.ts                     # onSchedule, onCall 엔트리
│       ├── admin-rerun.ts
│       ├── usecases/
│       │   └── run.ts                   # runAllCategories, runSingleCategory
│       ├── adapters/
│       │   ├── naver-search.ts
│       │   ├── tistory-rss.ts
│       │   ├── wordpress-rss.ts
│       │   └── curated-feeds.ts         # Tistory/WP RSS 목록
│       ├── normalize/
│       │   ├── html-cleaner.ts
│       │   ├── schema-mapper.ts
│       │   ├── category-classifier.ts
│       │   └── dedup.ts
│       ├── analyzer/
│       │   ├── section-structure.ts
│       │   ├── tone-profile.ts
│       │   ├── cta-patterns.ts
│       │   └── keyword-tfidf.ts
│       ├── writers/
│       │   ├── trend-keywords-writer.ts
│       │   ├── template-proposal-writer.ts
│       │   └── email-notifier.ts
│       ├── lib/
│       │   ├── gemini.ts
│       │   ├── firestore-admin.ts
│       │   ├── url-hash.ts
│       │   ├── retry.ts
│       │   └── week-key.ts              # "YYYY-Www" 유틸
│       └── types/
│           ├── shared.ts                # Category, SectionType (promo-page와 싱크)
│           ├── source.ts
│           ├── insight.ts
│           └── proposal.ts
└── src/                                 # Next.js (기존 — 변경 없음)
```

**pnpm-workspace.yaml 갱신**:
```yaml
packages:
  - '.'
  - 'functions'
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

**functions/package.json**:
```json
{
  "name": "cheonggwang-functions",
  "private": true,
  "engines": { "node": "22" },
  "main": "lib/research/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^13.8",
    "firebase-functions": "^6.0",
    "@google/generative-ai": "^0.24",
    "rss-parser": "^3.13",
    "sanitize-html": "^2.11",
    "diff": "^5.2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/sanitize-html": "^2.11",
    "@types/diff": "^5",
    "vitest": "^1"
  }
}
```

### 14.2 Implementation Order

1. [ ] **Monorepo 셋업** — `functions/` 디렉토리, `pnpm-workspace.yaml` 갱신, `firebase.json`에 functions 섹션 추가
2. [ ] **Secret 등록** — Firebase CLI로 4개 secret 등록, `.firebaserc` 확인
3. [ ] **타입 & 도메인** — `types/{shared,source,insight,proposal}.ts`, `lib/{week-key,url-hash,retry}.ts`
4. [ ] **Firestore rules 확장** — §3.4 규칙 append → `firebase deploy --only firestore:rules`
5. [ ] **TTL 정책 설정** — Firebase Console에서 `researchSources` ttlExpiresAt 활성화
6. [ ] **Adapters** — NaverSearchAdapter → TistoryRssAdapter → WordPressRssAdapter (순차)
7. [ ] **Normalizer** — html-cleaner, schema-mapper, category-classifier(LLM+rule), dedup
8. [ ] **Analyzer** — Gemini client + 4 analyzers (병렬 호출 가능하게 구현)
9. [ ] **Writers** — trend-keywords, template-proposal, email-notifier
10. [ ] **Usecases** — `runSingleCategory`, `runAllCategories` (fan-out)
11. [ ] **Entry points** — `onSchedule`, `onCall` (admin rerun)
12. [ ] **Emulator 테스트** — `firebase emulators:start` + 로컬 실행 확인
13. [ ] **Staging 배포** — 별도 Firebase 프로젝트로 배포, 1회 수동 트리거로 엔드투엔드 확인
14. [ ] **프로덕션 배포** — `cheonggwang-e4e33`로 배포, Resend 도메인 인증 확인

---

## 15. Open items resolved by this design

| Plan §8.2 Open Question | 해소 위치 |
|-------------------------|----------|
| 네이버 검색 API 쿼리 세트 | §5.1 (업종당 7개) |
| 티스토리/워드프레스 피드 목록 | §5.2/5.3 (운영자 큐레이션 별도 PR) |
| Gemini 분석 프롬프트 4종 초안 | §7 전체 |
| SectionType enum 확정 | §3.1 (promo-page enum을 그대로 공유) |
| 이메일 템플릿 | §8.3 (Resend inline HTML) |
| Firestore 보안 규칙 전체 | §3.4 |

**남은 운영 작업** (설계 승인 후):
- 티스토리/워드프레스 피드 큐레이션 (운영자 수작업)
- Resend 도메인 DNS (SPF/DKIM) 등록
- Firebase Auth 운영자 UID에 `admin: true` custom claim 부여

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-19 | Initial draft (Plan Plus 기반). LLM: AI Studio API로 정렬. 6 Open Q 해소 (쿼리 세트·프롬프트·SectionType 공유·이메일·보안 규칙). `functions/` 모노레포 구성 확정. | Seokho Lee |
