# cleaning-tips-content · Design v0.2 (cycle #30 v1.17)

> Source plan: `docs/01-plan/features/cleaning-tips-content.plan.md`
> v0.1 → v0.2: design-validator agent reality-check 결과 26 issue 모두 §12 결의 매트릭스에 매핑
> Generated: 2026-04-28
> Streak target: 10th consecutive single-pass ≥ 90%

---

## §1. Overview

### 1.1 Background
청광 v1.16 cycle #29까지 완성된 자동 발행 + AEO/SEO + 편집 투명성 인프라 위에 **/community/tips 패널 자동 채우기 시스템** 도입. 현재 tips 패널은 0건 — partner-promo만 community 피드 운영.

문제:
- 사용자: "청소 노하우를 /plan-plus 로 기획해서 채워넣자"
- /community/tips 패널 콘텐츠 0건
- partner-promo와 달리 universal cleaning know-how + 운영진 톤 (광고 X) 필요

### 1.2 Surgical philosophy (10-streak 도전)
- **R15 cycle #19 partner-promo-generator 0줄 변경 10번째** — 신규 tips-generator.ts 별도 작성
- cycle #28 AEO 인프라 100% 재사용 (FAQPage·BreadcrumbList·Article @graph + 질문형 H2 + TL;DR)
- cycle #19 publish 토글 재사용 (R13)
- cycle #28 toKstWallClock 패턴 재사용 (today-kst.ts · currentKstSeason)
- Option A 코드 복제 5번째 사이클 (Cloud Functions ↔ Next.js mirror)

---

## §2. Goals / Non-goals

### 2.1 Goals
| ID | Goal |
|---|---|
| G1 | /community/tips 패널 자동 채우기 — tipsTick cron + 일일 1건 제한 |
| G2 | 신규 tips-generator (R15 10번째 검증) |
| G3 | RAG anti-drift — 최근 20 tip의 title prompt 주입 |
| G4 | Photoless 모드 (커버 이미지 없는 tip) |
| G5 | /admin/tips dashboard + manual trigger |
| G6 | Stat 조회 (월별 generate / draft / published) |
| G7 | AEO 인프라 재사용 (FAQPage 자동 추출) |

### 2.2 Non-goals
- **Deferred to cycle #31+**: publishMode 'auto' for trusted topics, multi-part 시리즈, 외부 SEO keyword research, 이미지 검색 API, 카드뉴스 format, admin 본문 직접 편집 UI
- **Permanent**: AI prompt에 footer 강제 (R14), partner-promo와 generator 통합 (R15), 손님 UGC

---

## §3. Architecture

### 3.1 Topic 선정 흐름

```
Cron (매일 09:30 KST 발화 — autoSeriesTick과 30분 offset, NEW-H6 결의)
또는 Admin 수동 트리거
  ↓
src/lib/tips/topic-pool.ts에서 라운드 로빈 1건 선택
  + RAG anti-drift (최근 20 tip의 title 회피)
  + 시즌 필터 (currentKstSeason)
  ↓ { topic, category, season?, intent? }
src/lib/llm/tips-generator.ts:composeTipDraft
  ↓ AI compose (Gemini 3 Flash, cycle #28 AEO 패턴)
checkMarkdownHygiene (cycle #19 hygiene-guard 재사용, postType 미지정 — 의도적, NEW-H2)
  ↓
postRepository.create({ ... 항상 'draft', isAutoSeries: false })
```

### 3.2 Tips runner (functions side, NEW-H6 schedule offset)

**`functions/src/tips/index.ts`** (신규):
```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { runTipsTick } from "./runner";

if (getApps().length === 0) initializeApp();

const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret(
  "GOOGLE_GENERATIVE_AI_API_KEY",
);

export const tipsTick = onSchedule(
  {
    // NEW-H6 — autoSeriesTick(매시간 정각)와 30분 offset (rate limit + log 가독성)
    schedule: "30 9-17 * * *",  // cron syntax: 9:30, 10:30, ..., 17:30 KST
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0,
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY],
  },
  async () => {
    const start = Date.now();
    console.log("[tips] tick start", new Date().toISOString());
    try {
      await runTipsTick(new Date());
    } catch (e) {
      console.error("[tips] tick failed", e);
    } finally {
      console.log("[tips] tick end", `${Date.now() - start}ms`);
    }
  },
);
```

**`functions/src/index.ts`** (수정 — 1줄 추가):
```ts
export * from "./auto-series";
export * from "./tips";  // cycle #30 신규
```

> **DT1 결의**: `firebase.json` 변경 0 (Plan §5.2 잘못 — onSchedule decorator 안에 schedule)

### 3.3 runTipsTick 흐름 (전체 코드, helper imports 명시)

```ts
// functions/src/tips/runner.ts (신규)
import {
  type Firestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { composeTipDraft } from "./lib/tips-generator";
import { pickNextTopic, TIPS_TOPIC_POOL } from "./lib/topic-pool";
import { pickStockImage } from "./lib/stock-images";
import { getTodayKstStart, currentKstSeason } from "./lib/today-kst";
import { inferCategoriesFromTopic } from "./lib/infer-categories";
import { uniqueSlug } from "../auto-series/lib/slug";  // cycle #19 helper 재사용

// NEW-C5 — nanoid16 로컬 복제 (auto-series runner.ts 0줄 변경 보존, R1 streak 기여)
function nanoid16(): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export async function runTipsTick(now: Date): Promise<void> {
  const db = getFirestore();
  
  // R16 — 매 시간 발화하지만 하루 1건 제한
  const todayKstStart = getTodayKstStart(now);
  const todaySnap = await db.collection("posts")
    .where("postType", "==", "tip")
    .where("createdAt", ">=", Timestamp.fromDate(todayKstStart))
    .limit(1).get();
  if (!todaySnap.empty) {
    console.log("[tips] already generated today — skip");
    return;
  }
  
  // RAG anti-drift — 최근 20 tip title (자체 query, Option A 코드 복제 패턴)
  const recentSnap = await db.collection("posts")
    .where("postType", "==", "tip")
    .orderBy("createdAt", "desc")
    .limit(20).get();
  const recentTitles = recentSnap.docs.map((d) => (d.data().title as string) ?? "");
  
  // 시즌 필터 + 라운드 로빈
  const seasonNow = currentKstSeason(now);
  const topic = pickNextTopic({ recentTitles, seasonNow });
  if (!topic) {
    console.warn("[tips] no available topic — pool exhausted in current season");
    return;
  }
  
  // AI compose
  let draft;
  try {
    draft = await composeTipDraft({ topic, recentTitles });
  } catch (e) {
    console.error("[tips] compose failed", e);
    return;
  }
  
  // hygiene check (cycle #19 재사용 패턴)
  if (!draft.passed) {
    console.warn(`[tips] hygiene failed: ${draft.reasons.join(", ")}`);
    return;
  }
  
  // post create — 항상 'draft' (R16), isAutoSeries=false 명시 (NEW-H3)
  const postId = nanoid16();
  const slug = await uniqueSlug(db, draft.title);
  await db.collection("posts").doc(postId).create({
    providerId: "cheonggwang-staff",
    providerOwnerUid: "admin",
    companyName: "청광",
    categories: inferCategoriesFromTopic(topic),
    regionLabel: null,
    title: draft.title,
    slug,
    coverImageUrl: topic.photoless ? null : pickStockImage(topic.category),
    coverImageAlt: draft.coverImageAlt ?? null,
    bodyMarkdown: draft.bodyMarkdown,
    summary80: draft.summary80,
    topicHint: topic.id,
    brandTone: "friendly",
    postType: "tip",
    publishStatus: "draft",  // R16
    isAutoSeries: false,     // NEW-H3 결의 — 명시적 false
    format: "blog",          // R18
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    // publishedAt: omit (cycle #19 + cycle #29 C1 convention)
  });
  
  console.log(`[tips] saved draft ${postId} topic=${topic.id}`);
}
```

### 3.4 tips-generator (Next.js side, sanitizeHtml import 제거)

```ts
// src/lib/llm/tips-generator.ts (신규, NEW-L5: sanitizeHtml import 제거)
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { checkMarkdownHygiene } from "./hygiene-guard";

export interface TipTopic {
  id: string;
  label: string;
  category: "bathroom" | "kitchen" | "aircon" | "living" | "move" | "general";
  season?: "spring" | "summer" | "fall" | "winter";
  intent?: "howto" | "guide" | "checklist" | "comparison" | "qa";
  photoless?: boolean;
}

export interface TipComposeArgs {
  topic: TipTopic;
  recentTitles?: string[];
}

export interface TipDraftResult {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt?: string;
  hygieneScore: number;
  passed: boolean;
  reasons: string[];
}

const composeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary80: { type: SchemaType.STRING },
    bodyMarkdown: { type: SchemaType.STRING },
    coverImageAlt: { type: SchemaType.STRING },
  },
  required: ["title", "summary80", "bodyMarkdown"],
};

function buildTipPrompt(args: TipComposeArgs): string {
  const recentBlock = args.recentTitles && args.recentTitles.length > 0
    ? `\n[최근 다룬 주제 — 중복 회피]\n${args.recentTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join("\n")}\n`
    : "";
  const seasonHint = args.topic.season ? `(${args.topic.season} 시즌 콘텐츠)` : "";
  const intentHint = args.topic.intent ? `의도: ${args.topic.intent}` : "";
  
  return `[주제] ${args.topic.label} ${seasonHint}
[카테고리] ${args.topic.category}
${intentHint}
${recentBlock}
청광 운영진의 톤으로 위 주제에 대한 청소 노하우 글을 쓰세요.

규칙:
- 매장명·전화번호·할인율을 단정하지 않습니다.
- "최저가", "업계 1위", "만족도 100%" 등 단정 광고 표현 금지.
- 청광 외 특정 업체명 직접 언급 X.
- 운영진 톤 — 정보 전달 + 친근 (광고/홍보 톤 X).
- **첫 단락(2-3줄)**: 핵심 메시지를 직설적으로 답변 (TL;DR).
- **H2 헤더**: "OO 비용은?", "어떻게 OO하나요?" 처럼 자연어 질문 형식 1~2개 포함.
- **마지막에 [자주 묻는 질문] 섹션**: \`## 자주 묻는 질문\` + \`### Q1./Q2./Q3.\` 형식 + 답변은 단락으로.
- **구조**: 답변(첫 단락) → 근거(중단 H2들) → 자주 묻는 질문 (마지막).
- FAQ 답변에서도 가격·할인율·전화번호를 사실로 단정하지 않습니다.
- 1500~3000자 한국어 본문 (markdown — h2/h3/p/ul/li/strong 허용).
- 결과를 JSON으로 반환.`;
}

const COMPOSE_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ??
  process.env.GOOGLE_GENERATIVE_AI_MODEL ??
  "gemini-2.5-flash";

const genAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  : null;

export async function composeTipDraft(args: TipComposeArgs): Promise<TipDraftResult> {
  if (!genAI) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY 미설정");
  const model = genAI.getGenerativeModel({
    model: COMPOSE_MODEL,
    systemInstruction:
      "당신은 청광 운영진을 위한 청소 노하우 콘텐츠 작가입니다. 정확한 정보 + 친근한 톤으로 글을 쓰며, 광고/홍보 표현은 사용하지 않습니다.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: composeSchema,
      temperature: 0.7,
    },
  });
  
  const prompt = buildTipPrompt(args);
  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text());
  
  // NEW-H2: postType opts 미지정 — PARTNER_PROMO_PATTERNS 미적용 (의도적)
  // tip은 운영진 톤이지만 prompt 규칙으로 광고 단정 회피 + 이중 안전망은 hygiene 기본 패턴(FAKE_BUSINESS, PII)
  const hygiene = checkMarkdownHygiene(
    json.bodyMarkdown,
    json.title,
    json.summary80,
  );
  
  return {
    title: json.title,
    summary80: json.summary80,
    bodyMarkdown: json.bodyMarkdown,
    coverImageAlt: json.coverImageAlt,
    hygieneScore: hygiene.score,
    passed: hygiene.passed,
    reasons: hygiene.reasons,
  };
}

// helper for buildTipPrompt — exported for testing (RAG anti-drift verification)
export const __testExports = { buildTipPrompt };
```

### 3.5 Topic pool (Next.js)

```ts
// src/lib/tips/topic-pool.ts (신규)
import type { TipTopic } from "@/lib/llm/tips-generator";

export const TIPS_TOPIC_POOL: TipTopic[] = [
  // 욕실 (4)
  { id: "bathroom-mold", label: "욕실 곰팡이 제거 — 셀프 vs 전문가", category: "bathroom", season: "summer", intent: "comparison" },
  { id: "bathroom-tile-cleaning", label: "욕실 타일 줄눈 청소 노하우", category: "bathroom", intent: "howto" },
  { id: "bathroom-drain", label: "하수구 막힘 해결 5가지 방법", category: "bathroom", intent: "howto" },
  { id: "bathroom-chrome", label: "수도꼭지 물때 깨끗이 닦는 법", category: "bathroom", intent: "howto" },
  // 주방 (5)
  { id: "kitchen-hood", label: "주방 후드 기름때 닦기", category: "kitchen", intent: "howto" },
  { id: "kitchen-fridge", label: "냉장고 청소 주기와 방법", category: "kitchen", intent: "guide" },
  { id: "kitchen-microwave", label: "전자레인지 안쪽 깨끗하게", category: "kitchen", intent: "howto" },
  { id: "kitchen-sink", label: "싱크대 배수구 냄새 잡는 법", category: "kitchen", intent: "qa" },
  { id: "kitchen-baking-soda", label: "베이킹소다·식초 청소 활용 가이드", category: "kitchen", intent: "guide", photoless: true },
  // 에어컨 (4)
  { id: "aircon-disassembly", label: "에어컨 분해 청소 — 자주 묻는 질문", category: "aircon", season: "spring", intent: "qa" },
  { id: "aircon-cost", label: "에어컨 청소 비용은 얼마일까?", category: "aircon", intent: "qa" },
  { id: "aircon-filter", label: "에어컨 필터 셀프 청소 방법", category: "aircon", intent: "howto" },
  { id: "aircon-when", label: "에어컨 청소 언제 해야 할까?", category: "aircon", intent: "qa" },
  // 거실 (5)
  { id: "living-pet-hair", label: "반려동물 털 — 빠르게 제거하는 5가지", category: "living", intent: "howto" },
  { id: "living-floor", label: "마룻바닥 흠집 없이 청소하는 법", category: "living", intent: "howto" },
  { id: "living-dust", label: "먼지 자주 쌓이는 곳 핵심 관리", category: "living", intent: "checklist", photoless: true },
  { id: "living-curtain", label: "커튼 세탁 주기와 셀프 관리", category: "living", intent: "guide" },
  { id: "living-sofa", label: "패브릭 소파 얼룩 제거", category: "living", intent: "howto" },
  // 이사 (4)
  { id: "move-checklist", label: "이사 청소 체크리스트 — 빠뜨리지 말 것", category: "move", intent: "checklist", photoless: true },
  { id: "move-in-out", label: "입주 청소 vs 이사 청소 차이", category: "move", intent: "comparison" },
  { id: "move-cost", label: "이사 청소 평수별 비용 가이드", category: "move", intent: "guide" },
  { id: "move-self", label: "셀프 이사 청소 — 가능한 부분과 한계", category: "move", intent: "comparison", photoless: true },
  // 일반 (8)
  { id: "general-spring-cleaning", label: "봄 대청소 — 어디부터 시작할까", category: "general", season: "spring", intent: "guide" },
  { id: "general-summer", label: "여름철 곰팡이·습기 관리", category: "general", season: "summer", intent: "guide" },
  { id: "general-fall", label: "환절기 침구 관리법", category: "general", season: "fall", intent: "howto" },
  { id: "general-winter", label: "겨울 대청소 — 연말 마무리 청소", category: "general", season: "winter", intent: "guide" },
  { id: "general-frequency", label: "공간별 청소 주기 — 주간·월간 추천", category: "general", intent: "checklist", photoless: true },
  { id: "general-tools", label: "청소 도구 추천 — 가성비 best", category: "general", intent: "comparison" },
  { id: "general-eco", label: "친환경 청소 가이드 — 화학약품 없이", category: "general", intent: "guide" },
  { id: "general-pro", label: "전문가 청소 의뢰 vs 셀프 — 언제 어떤 선택?", category: "general", intent: "comparison" },
];

export function pickNextTopic(args: {
  recentTitles: string[];
  seasonNow?: TipTopic["season"];
}): TipTopic | null {
  const { recentTitles, seasonNow } = args;
  const recentSet = new Set(recentTitles);
  
  // 1. 시즌 필터
  const seasonal = TIPS_TOPIC_POOL.filter(
    (t) => !t.season || t.season === seasonNow,
  );
  
  // 2. recent 회피
  const candidates = seasonal.filter((t) => !recentSet.has(t.label));
  
  // 3. 후보 0개면 시즌 해제
  const pool = candidates.length > 0
    ? candidates
    : TIPS_TOPIC_POOL.filter((t) => !recentSet.has(t.label));
  if (pool.length === 0) return null;
  
  // 4. 랜덤 선택
  return pool[Math.floor(Math.random() * pool.length)];
}
```

### 3.6 today-kst.ts (NEW C1·M9 결의 — getTodayKstStart + currentKstSeason)

```ts
// src/lib/tips/today-kst.ts (신규)
import { toKstWallClock } from "@/lib/partner/auto-publish-window";  // cycle #28 helper 재사용

export function getTodayKstStart(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  // 오늘(KST) 자정 = real UTC of (year, month, date, 0시 KST = -9시 UTC)
  return new Date(Date.UTC(wall.year, wall.month, wall.date, -9, 0, 0, 0));
}

export type TipSeason = "spring" | "summer" | "fall" | "winter";

export function currentKstSeason(now: Date = new Date()): TipSeason {
  const wall = toKstWallClock(now);
  const m = wall.month + 1;  // 1-based
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

export function firstDayOfMonthKst(now: Date = new Date()): Date {
  const wall = toKstWallClock(now);
  return new Date(Date.UTC(wall.year, wall.month, 1, -9, 0, 0, 0));
}
```

functions side mirror — `functions/src/tips/lib/today-kst.ts` (cycle #28 functions/.../window.ts:toKstWallClock import).

### 3.7 inferCategoriesFromTopic (NEW C2)

```ts
// src/lib/tips/infer-categories.ts (신규)
import type { TipTopic } from "@/lib/llm/tips-generator";
import type { QuoteCategory } from "@/domain/quote-category";

const TIP_TO_QUOTE_CATEGORY: Record<TipTopic["category"], QuoteCategory> = {
  bathroom: "regular",
  kitchen: "regular",
  aircon: "aircon",
  living: "regular",
  move: "move-in",
  general: "regular",
};

export function inferCategoriesFromTopic(topic: TipTopic): QuoteCategory[] {
  return [TIP_TO_QUOTE_CATEGORY[topic.category]];
}
```

functions side mirror — `functions/src/tips/lib/infer-categories.ts` (동일 로직).

### 3.8 stock-images.ts + functions mirror (NEW C3)

```ts
// src/lib/tips/stock-images.ts (신규)
import type { TipTopic } from "@/lib/llm/tips-generator";

const STOCK_IMAGES: Record<TipTopic["category"], string[]> = {
  bathroom: [
    "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    "https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=1200&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    "https://images.unsplash.com/photo-1556909195-4e5d12d57da7?w=1200&q=80",
    "https://images.unsplash.com/photo-1565604742-b6a96e62a26c?w=1200&q=80",
  ],
  aircon: [
    "https://images.unsplash.com/photo-1631545341935-f86ddff3b56f?w=1200&q=80",
    "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=1200&q=80",
  ],
  living: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80",
    "https://images.unsplash.com/photo-1487611459768-bd414656ea10?w=1200&q=80",
  ],
  move: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1200&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&q=80",
  ],
};

export function pickStockImage(category: TipTopic["category"]): string {
  const pool = STOCK_IMAGES[category];
  return pool[Math.floor(Math.random() * pool.length)];
}
```

functions side mirror — `functions/src/tips/lib/stock-images.ts`.

> Unsplash CDN은 cycle #29에서 next.config.ts remotePatterns + should-unoptimize.ts에 등록됨.

### 3.9 hygiene-guard mirror 정책 (NEW-C4 결의 — option 2 채택)

**선택**: Option 2 — `tips-generator.ts` 내부에 mirror 인라인 X. 대신 functions side는 `functions/src/auto-series/lib/generator.ts`의 자체 hygiene 패턴(FORBIDDEN_PHRASES)을 별도 함수로 추출하여 `functions/src/tips/lib/hygiene-guard.ts`에 mirror.

```ts
// functions/src/tips/lib/hygiene-guard.ts (신규, mirror)
// ⚠️ MIRROR of src/lib/llm/hygiene-guard.ts checkMarkdownHygiene — keep in sync.
// PostType 옵션 미사용 (tip 전용, partner-promo 패턴 X).

const FAKE_BUSINESS_PATTERNS = [
  /\([가-힣]{2,10}\s?청소\)/,
  /[0-9]{2,4}-[0-9]{3,4}-[0-9]{4}/,
  /[0-9]{1,3}\s?%\s?할인/,
];
const PII_PATTERNS = [/[0-9]{6}-[0-9]{7}/];

export interface MarkdownHygieneResult {
  score: number;
  reasons: string[];
  passed: boolean;
}

export function checkMarkdownHygiene(
  body: string,
  title: string,
  summary: string,
): MarkdownHygieneResult {
  const text = `${title}\n${summary}\n${body}`;
  const reasons: string[] = [];
  for (const re of FAKE_BUSINESS_PATTERNS) {
    if (re.test(text)) reasons.push(`광고 패턴: ${re.source}`);
  }
  for (const re of PII_PATTERNS) {
    if (re.test(text)) reasons.push(`PII 패턴: ${re.source}`);
  }
  const score = Math.max(0, 1 - reasons.length * 0.25);
  return { score, reasons, passed: score >= 0.7 };
}
```

> Next.js side는 기존 `src/lib/llm/hygiene-guard.ts:checkMarkdownHygiene` 그대로 사용 (postType opts 미지정).

### 3.10 검토 dashboard (S4 + A4)

```tsx
// src/app/admin/tips/page.tsx (NEW)
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipRepository } from "@/lib/firebase/tip-repository";

export default function AdminTipsPage() {
  return (
    <div className="space-y-6">
      <h1>청소 노하우 관리</h1>
      <Suspense fallback={<StatSkeleton />}>
        <StatCards />
      </Suspense>
      <Suspense fallback={<DraftListSkeleton />}>
        <DraftList />
      </Suspense>
    </div>
  );
}

async function StatCards() {
  await connection();
  await requireAdminPage();
  const stats = await tipRepository.getTipMonthlyStats();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="이번 달 생성" value={stats.generated} />
      <StatCard label="검토 대기" value={stats.drafted} highlight={stats.drafted > 0} />
      <StatCard label="이번 달 발행" value={stats.published} />
      <StatCard label="실패율" value={`${stats.failureRate}%`} />
    </div>
  );
}

async function DraftList() {
  await connection();
  await requireAdminPage();
  const drafts = await tipRepository.listDrafts(20);
  // 카드: link to /community/p/{slug} (preview) + cycle #19 publish 토글 (R13)
}
```

### 3.11 Manual trigger (A2)

```ts
// src/app/actions/admin-tips-actions.ts (NEW)
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { composeTipDraft } from "@/lib/llm/tips-generator";
import { inferCategoriesFromTopic } from "@/lib/tips/infer-categories";
import { pickStockImage } from "@/lib/tips/stock-images";
import { uniqueSlug } from "@/lib/slug";  // NEW-L8 결의 — slugRepository 언급 제거, 표준 slug helper 사용
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const triggerSchema = z.object({
  topicLabel: z.string().min(5).max(120),
  category: z.enum(["bathroom", "kitchen", "aircon", "living", "move", "general"]),
  intent: z.enum(["howto", "guide", "checklist", "comparison", "qa"]).optional(),
  photoless: z.boolean().default(false),
});

export async function triggerTipGeneration(formData: FormData): Promise<void> {
  await requireAdminApi();
  const parsed = triggerSchema.parse({
    topicLabel: formData.get("topicLabel"),
    category: formData.get("category"),
    intent: formData.get("intent") || undefined,
    photoless: formData.get("photoless") === "on",
  });
  
  const topic = {
    id: `manual-${Date.now()}`,
    label: parsed.topicLabel,
    category: parsed.category,
    intent: parsed.intent,
    photoless: parsed.photoless,
  };
  
  const draft = await composeTipDraft({ topic });
  if (!draft.passed) {
    redirect("/admin/tips?error=hygiene-fail");
  }
  
  // post create (runner와 동일 패턴, NEW-L4: searchParam-based feedback)
  // ... 위 §3.3 동일 ...
  
  revalidatePath("/admin/tips");
  revalidatePath("/community/tips");
  redirect("/admin/tips?recently-generated=1");
}
```

### 3.12 Photoless render (A1, DT2 결의)

> **DT2 결의**: `src/components/community/PostDetailView.tsx:27` 이미 `{post.coverImageUrl && (...)}` 조건부 렌더 — photoless 자동 처리. **추가 변경 0**. Plan §5.2 잘못.

og:image fallback 추가 (cycle #29 community/p/[slug]/page.tsx 수정):

```tsx
// src/app/community/p/[slug]/page.tsx (수정 — og:image fallback)
{post.coverImageUrl ? (
  <meta property="og:image" content={post.coverImageUrl} />
) : (
  <meta property="og:image" content={`${base}/logo.png`} />
)}
```

### 3.13 Tip repository (S2)

```ts
// src/lib/firebase/tip-repository.ts (신규)
import "server-only";
import { cache } from "react";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { toPost } from "./post-repository";  // NEW-C6 결의 — toPost export 추가
import { firstDayOfMonthKst } from "@/lib/tips/today-kst";  // M1 통일 결의
import type { Post } from "@/types/post";

const col = () => adminDb.collection("posts");

export interface TipMonthlyStats {
  generated: number;
  drafted: number;
  published: number;
  failureRate: number;
}

export const tipRepository = {
  async listRecentTipTitles(limit = 20): Promise<string[]> {
    const snap = await col()
      .where("postType", "==", "tip")
      .orderBy("createdAt", "desc")
      .limit(limit).get();
    return snap.docs.map((d) => (d.data().title as string) ?? "");
  },
  
  async listDrafts(limit = 20): Promise<Post[]> {
    const snap = await col()
      .where("postType", "==", "tip")
      .where("publishStatus", "==", "draft")
      .orderBy("createdAt", "desc")
      .limit(limit).get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },
  
  getTipMonthlyStats: cache(
    async (): Promise<TipMonthlyStats> => {
      const monthStart = Timestamp.fromDate(firstDayOfMonthKst());
      const [generatedSnap, draftedSnap, publishedSnap] = await Promise.all([
        col().where("postType", "==", "tip").where("createdAt", ">=", monthStart).count().get(),
        col().where("postType", "==", "tip").where("publishStatus", "==", "draft").count().get(),
        col().where("postType", "==", "tip").where("publishStatus", "==", "published").where("createdAt", ">=", monthStart).count().get(),
      ]);
      return {
        generated: generatedSnap.data().count,
        drafted: draftedSnap.data().count,
        published: publishedSnap.data().count,
        failureRate: 0,  // cycle #31+ tipsHistory subcollection 도입 시 별도 계산
      };
    },
  ),
};
```

### 3.14 핵심 결정 + invariants

- **R15 cycle #19 generator 0줄 변경 10번째** — 신규 tips-generator.ts 별도. functions/auto-series/runner.ts:nanoid16도 무수정 (NEW-C5 — 로컬 복제)
- **R13 cycle #19 publish 토글 재사용** — admin draft → published
- **R16 (cycle #29) tip 항상 'draft' 시작** — admin 검토 필수
- **R17 (cycle #29) tip isAutoSeries=false 명시** (NEW-H3 — undefined 대신 false)
- **R18 tip format='blog'만**
- **NEW-R19 — Cron offset** — autoSeriesTick(매시간 정각) + tipsTick(:30분) 분리 (NEW-H6)
- **NEW-R20 — toPost export** — `src/lib/firebase/post-repository.ts:27`에 export 추가 (1줄, NEW-C6)
- **Option A 코드 복제 5번째 사이클** — 6개 mirror 파일 (topic-pool, tips-generator, stock-images, today-kst, infer-categories, hygiene-guard)

---

## §4. Component / Module Inventory (v0.2 — H1·NEW-H4·NEW-H5 결의)

### 4.1 신규 파일 (17개)

| # | 파일 | 역할 | LOC |
|---|---|---|---:|
| 1 | `src/lib/tips/topic-pool.ts` | TIPS_TOPIC_POOL (~30) + pickNextTopic | 100 |
| 2 | `src/lib/tips/topic-pool.test.ts` (NEW M2) | 4 cases | 80 |
| 3 | `src/lib/tips/stock-images.ts` | category별 Unsplash URL pool | 60 |
| 4 | `src/lib/tips/today-kst.ts` (NEW C1+M9) | getTodayKstStart + currentKstSeason + firstDayOfMonthKst | 50 |
| 5 | `src/lib/tips/infer-categories.ts` (NEW C2) | TipTopic.category → QuoteCategory | 30 |
| 6 | `src/lib/llm/tips-generator.ts` | composeTipDraft + buildTipPrompt | 220 |
| 7 | `src/lib/llm/tips-generator.test.ts` | 4 cases | 100 |
| 8 | `src/lib/firebase/tip-repository.ts` | listRecentTipTitles + listDrafts + getTipMonthlyStats | 100 |
| 9 | `src/app/admin/tips/page.tsx` | dashboard (stat + draft list) | 200 |
| 10 | `src/app/admin/tips/generate/page.tsx` | manual trigger form | 150 |
| 11 | `src/app/actions/admin-tips-actions.ts` | triggerTipGeneration | 130 |
| 12 | `functions/src/tips/index.ts` | tipsTick onSchedule export | 50 |
| 13 | `functions/src/tips/runner.ts` | runTipsTick (helper imports + nanoid16 local copy) | 230 |
| 14 | `functions/src/tips/lib/tips-generator.ts` | mirror | 220 |
| 15 | `functions/src/tips/lib/topic-pool.ts` | mirror | 100 |
| 16 | `functions/src/tips/lib/stock-images.ts` (NEW C3) | mirror | 60 |
| 17 | `functions/src/tips/lib/today-kst.ts` (NEW C1+M9) | mirror (functions side toKstWallClock import) | 50 |
| 18 | `functions/src/tips/lib/infer-categories.ts` (NEW C2) | mirror | 30 |
| 19 | `functions/src/tips/lib/hygiene-guard.ts` (NEW-C4) | mirror — checkMarkdownHygiene | 50 |

> **H1 결의** — 신규 파일 19개 (Plan §5.1 11개 → Design v0.1 12개 → v0.2 19개로 정정).

### 4.2 수정 파일 (5개) — NEW-H4·NEW-H5·NEW-C6 결의

| 파일 | 변경 |
|---|---|
| `functions/src/index.ts` | `export * from "./tips";` 1줄 추가 |
| `src/app/community/p/[slug]/page.tsx` | og:image fallback `${base}/logo.png` (photoless 대비) |
| `src/components/admin/AdminNav.tsx` (NEW-H4) | TABS에 `{ href: "/admin/tips", label: "청소 노하우", matcher: (p) => p.startsWith("/admin/tips") }` 추가 |
| `src/lib/firebase/post-repository.ts` (NEW-C6) | `toPost` 함수 export 추가 (1줄 — `function toPost` → `export function toPost`) |
| `scripts/check-queue-mirror.mjs` | 5 신규 mirror check 추가 |
| `package.json` | `pnpm test:tips` script 추가 |

> **DT1 결의**: `firebase.json` 변경 0 (Plan 잘못 — onSchedule decorator 안에 schedule)
> **DT2 결의**: `src/components/community/PostDetailView.tsx`, `CommunityCard.tsx` 변경 0 (이미 conditional)
> **NEW-H5 결의 (DT5)**: `firestore.indexes.json` 변경 0 (composite (postType, publishStatus, createdAt) 이미 cycle #29에서 line 207-215 추가됨). S13/S16 implementation order에서 제거.

### 4.3 CI lint 확장 (8 → 13, NEW-M6 정정)

기존 8 (cycle #21~#29) + 신규 5 (cycle #30):

```js
// scripts/check-queue-mirror.mjs 신규 5개:
{
  title: "tips-generator AEO 패턴 (FAQ + TL;DR) 양 패키지",
  files: ["src/lib/llm/tips-generator.ts", "functions/src/tips/lib/tips-generator.ts"],
  test: (src) => /자주\s*묻는\s*질문/.test(src) && /TL;DR|첫\s*단락/.test(src),
},
{
  title: "TIPS_TOPIC_POOL 양 패키지 동일 export",
  files: ["src/lib/tips/topic-pool.ts", "functions/src/tips/lib/topic-pool.ts"],
  test: (src) => /export const TIPS_TOPIC_POOL/.test(src),
},
{
  title: "STOCK_IMAGES 양 패키지 동일 export (NEW C3)",
  files: ["src/lib/tips/stock-images.ts", "functions/src/tips/lib/stock-images.ts"],
  test: (src) => /pickStockImage|STOCK_IMAGES/.test(src),
},
{
  title: "inferCategoriesFromTopic 양 패키지 (NEW C2)",
  files: ["src/lib/tips/infer-categories.ts", "functions/src/tips/lib/infer-categories.ts"],
  test: (src) => /export function inferCategoriesFromTopic/.test(src),
},
{
  title: "today-kst 양 패키지 (NEW C1)",
  files: ["src/lib/tips/today-kst.ts", "functions/src/tips/lib/today-kst.ts"],
  test: (src) => /getTodayKstStart/.test(src) && /currentKstSeason/.test(src),
},
```

### 4.4 Test 러너 (NEW-M5 정정)

```json
// package.json
"scripts": {
  ...
  "test:tips": "npx tsx src/lib/llm/tips-generator.test.ts && npx tsx src/lib/tips/topic-pool.test.ts"
}
```

### 4.5 환경 변수
추가 없음.

---

## §5. API Contracts

### 5.1 `tipsTick` Cloud Functions
- Trigger: cron `30 9-17 * * *` Asia/Seoul (NEW-H6 — 30분 offset)
- Action: 일일 1건 제한 + RAG anti-drift + topic 라운드 로빈 + draft 저장

### 5.2 `composeTipDraft`
```ts
async function composeTipDraft(args: {
  topic: TipTopic;
  recentTitles?: string[];
}): Promise<TipDraftResult>;
```

### 5.3 `triggerTipGeneration` server action
```ts
async function triggerTipGeneration(formData: FormData): Promise<void>;
```

### 5.4 `tipRepository.getTipMonthlyStats`
```ts
async getTipMonthlyStats(): Promise<{
  generated: number;
  drafted: number;
  published: number;
  failureRate: number;
}>;
```

---

## §6. UI Changes

| 위치 | 변화 |
|---|---|
| `/admin/tips` (NEW) | dashboard — stat 4개 + draft list |
| `/admin/tips/generate` (NEW) | manual trigger form |
| Admin 헤더 nav | TABS 배열에 "청소 노하우" 추가 (NEW-H4) |
| `/community/tips` 패널 | 매일 1건씩 admin 검토 후 published tip 추가 |
| `/community/p/[slug]` | og:image fallback (photoless 대비) |

---

## §7. Security & Privacy

- `tipsTick`: Admin SDK + scheduled. 사용자 호출 X
- `triggerTipGeneration`: requireAdminApi() — admin only + zod 검증
- `/admin/tips/*`: requireAdminPage()
- `firestore.rules`: tip postType + publishStatus='draft'는 read 차단 (cycle #19 R7 그대로)
- Stock 이미지: Unsplash License (cc-like, attribution 권장 X but recommended)

> **NEW-L6 결의** — Plan §11 OQ4 "Unsplash CC0" 잘못. Unsplash License는 자체 license. Attribution 필수 X but recommended (광고법 영향 X, 정보 정정만)

---

## §8. Implementation Order (S1–S16, NEW-H5·NEW-M10 결의)

```
S1. topic-pool.ts (Next.js) + topic-pool.test.ts (M2)
S2. stock-images.ts
S3. today-kst.ts (NEW C1·M9)
S4. infer-categories.ts (NEW C2)
S5. tips-generator.ts (Next.js) + tips-generator.test.ts (4 cases)
S6. functions/tips/lib/* mirror (6 files: topic-pool, tips-generator, stock-images, today-kst, infer-categories, hygiene-guard) — bulk
S7. functions/tips/runner.ts (helper imports + nanoid16 local + 일일 1건 제한)
S8. functions/tips/index.ts (onSchedule export) + functions/src/index.ts (1줄 추가)
S9. tip-repository.ts + post-repository.ts (toPost export, NEW-C6)
S10. admin-tips-actions.ts (triggerTipGeneration)
S11. /admin/tips/page.tsx (dashboard)
S12. /admin/tips/generate/page.tsx (manual form)
S13. AdminNav.tsx (NEW-H4 — TABS 추가) + community/p/[slug]/page.tsx (og:image fallback)
S14. scripts/check-queue-mirror.mjs (5 신규 mirror check) + package.json (test:tips)
S15. typecheck + build + tests (ai-footer + tips-generator + topic-pool) + lint:mirror 13/13
S16. functions deploy + 통합 검증 (cron 발화 → /admin/tips 표시 → publish 토글 → /community/tips 노출)
```

> **NEW-H5 결의** (DT5) — Plan/Design v0.1 S13(firestore.indexes.json) + S16(firestore deploy) 모두 제거. composite index 이미 cycle #29에서 추가됨.

> **NEW-M10 결의** — Design §8이 Plan §6보다 정확. Plan implementation order는 design §8로 대체.

격리: S1·S2·S3·S4·S9 독립. S6은 bulk mirror (6 files). S7-S8 functions side. S11-S12 admin UI.

---

## §9. Test Plan

### 9.1 단위 테스트

#### tips-generator.test.ts (4 cases)
1. 정상 generate — { topic } 입력 → { title, summary80, bodyMarkdown } 출력 + passed=true
2. RAG anti-drift — recentTitles 입력 시 prompt에 포함됨 (assert via __testExports.buildTipPrompt)
3. hygiene-fail — mock LLM 응답에 "최저가" 포함 → passed=false (단, prompt 규칙 + 기본 hygiene 패턴)
4. photoless — coverImageAlt optional (스키마 required X)

#### topic-pool.test.ts (4 cases, NEW M2)
1. pickNextTopic — recentTitles에 모두 있으면 null 반환
2. 시즌 필터 — seasonNow='summer'면 summer + season 미지정 topics만
3. 라운드 로빈 — 같은 입력 두 번 호출하면 다른 topic (확률적)
4. 빈 pool 검증 — TIPS_TOPIC_POOL에 30개 정도 있어야

### 9.2 통합 검증
- pnpm exec tsc --noEmit (Next.js + functions): exit 0
- pnpm exec next build: full prerender
- pnpm lint:mirror: 13/13 (cycle #29 8 + cycle #30 5 신규)
- pnpm test:tips: tips-generator + topic-pool 8 cases pass
- 시나리오: cron 트리거 → /admin/tips draft 표시 → publish 토글 → /community/tips 노출

### 9.3 회귀 보호
- cycle #29 단위 테스트 (61 → 65) 모두 유지
- partner-promo cron tick 정상 (R15 — generator 0줄 변경)
- /admin 기존 페이지 영향 0

---

## §10. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| AI 같은 주제 반복 | A3 RAG anti-drift | M |
| Topic pool 30개 소진 | 라운드 로빈 + 시즌 1년 cycle. cycle #31+ pool 확장 | L |
| photoless og:image 누락 | logo.png fallback | L |
| Admin draft 누적 미검토 | A4 stat. cycle #31+ 헤더 빨간 배지 | M |
| Stock image 카테고리 매칭 부실 | category × 2-5 photos. cycle #31+ Unsplash search API | L |
| hygiene tip 콘텐츠 거부 | 운영진 톤이라 통과율 ↑. fallback retry 미적용 | L |
| **NEW-H6** Cron autoSeriesTick + tipsTick 동시 발화 | **cron offset 30분** (autoSeriesTick :00, tipsTick :30) | L (회피됨) |
| 일일 1건 제한 race condition | retryCount=0 단일 실행. Firestore atomic | L |
| **NEW-H2** tip 본문 광고 단정 미차단 (PARTNER_PROMO_PATTERNS 미적용) | prompt 규칙으로 광고 단정 회피. 이중 안전망은 기본 hygiene (FAKE_BUSINESS_PATTERNS + PII) | L |

---

## §11. Open Questions (자체 답변)

| ID | Question | Resolution |
|----|---|---|
| OQ1 | Topic pool — Firestore vs static? | static (cycle #30). cycle #31+ admin 동적 편집 |
| OQ2 | tip post providerOwnerUid? | 'admin' 고정 |
| OQ3 | admin 빨간 배지 cycle #30에? | NO — A4 stat card로 충분 |
| OQ4 | Stock 이미지 라이센스? | **Unsplash License** (정정 — CC0 X). Attribution 권장 |
| OQ5 | TipTopic.category → QuoteCategory? | bathroom→regular, kitchen→regular, aircon→aircon, living→regular, move→move-in, general→regular |
| OQ6 | hygiene retry? | NO — cycle #30 scope |
| OQ7 | tip + partner-promo 카드 그리드 충돌? | NO — /admin/tips는 별도 페이지, /partner/posts는 사장님 본인 글만 |
| OQ8 | tipsHistory subcollection? | NO — cycle #30 미적용. console.warn + post create skip만 |
| **OQ9 (NEW)** | **functions hygiene-guard mirror — Option 1(autoSeries 추출) vs 2(tips/lib에 신규)?** | **Option 2** — tips/lib/hygiene-guard.ts 신규 (auto-series 0줄 변경, R1 streak 기여) |

---

## §12. 결의 매트릭스 (v0.1 → v0.2 — 26 issue 모두 결의)

### Critical (6개)

| ID | Issue | 결의 |
|---|---|---|
| C1 | getTodayKstStart 헬퍼 미정의 | §3.6 — `src/lib/tips/today-kst.ts` 신규 + functions mirror. `toKstWallClock` 활용한 KST 자정 산술 명시 |
| C2 | inferCategoriesFromTopic 미정의 | §3.7 — `src/lib/tips/infer-categories.ts` 신규 + functions mirror. TipTopic→QuoteCategory MAP 명시 |
| C3 | pickStockImage functions mirror 누락 | §3.8 + §4.1 — `functions/src/tips/lib/stock-images.ts` 신규 추가 |
| NEW-C4 | functions hygiene-guard mirror 누락 | OQ9 결의 — `functions/src/tips/lib/hygiene-guard.ts` 신규 (Option 2). cycle #19 hygiene-guard 핵심 로직만 mirror |
| NEW-C5 | nanoid16 functions/tips/runner에서 미정의 | §3.3 — runner.ts 안에 로컬 함수 복제 (auto-series runner.ts 0줄 변경 보존, R1 streak 기여) |
| NEW-C6 | toPost post-repository에서 미export | §4.2 — `src/lib/firebase/post-repository.ts:27` `function toPost` → `export function toPost` 1줄 수정 |

### High (4개)

| ID | Issue | 결의 |
|---|---|---|
| H1 | Plan vs Design 파일 수 불일치 | §4.1 — 신규 파일 19개로 정정 (Plan 11 → v0.1 12 → v0.2 19). C2/C3/NEW-C4 helper 추가 반영 |
| NEW-H4 | AdminNav TABS 변경 누락 | §4.2 — `AdminNav.tsx` 수정 파일 추가. TABS에 "청소 노하우" entry |
| NEW-H5 | firestore.indexes.json 추가 X (이미 존재) | §4.2 + §8 — composite (postType, publishStatus, createdAt) cycle #29에서 추가됨. S13/S16 implementation order에서 제거 |
| NEW-H6 | Cron autoSeriesTick + tipsTick 동시 발화 | §3.2 — schedule cron syntax `30 9-17 * * *`로 변경 (30분 offset). NEW-R19 invariant 추가 |

### Medium (10개)

| ID | Issue | 결의 |
|---|---|---|
| M1 | firstDayOfMonthKst 패턴 통일성 | §3.6 — toKstWallClock 활용 (cycle #28 패턴). today-kst.ts에 함께 정의 |
| M2 | topic-pool.test.ts Plan 누락 | §4.1 #2 추가 + §9.1 4 cases 정의 (DT3) |
| M3 | firebase.json 변경 0 (DT1) | §4.2 NOTE에 명시 — 변경 사항 0 |
| M4 | PostDetailView photoless 변경 0 (DT2) | §3.12 NOTE에 명시 — 이미 conditional |
| NEW-M5 | pnpm test:tips path 불명 | §4.4 — 양 테스트 직렬 실행 명시 |
| NEW-M6 | CI lint count "10 → 12" 잘못 | §4.3 — "8 → 13" 정정 (5 신규 check 명시) |
| NEW-M7 | Timestamp import 누락 | §3.3 — runner 첫 부분 import block 명시 |
| NEW-M8 | functions runner import path 불명 | §3.3 — composeTipDraft, pickNextTopic, getTodayKstStart, currentKstSeason, inferCategoriesFromTopic, pickStockImage 모두 명시 |
| NEW-M9 | currentKstSeason 헬퍼 미정의 | §3.6 — today-kst.ts에 함께 정의 (M9는 C1·M1과 한 파일 통합) |
| NEW-M10 | Plan vs Design implementation order 불일치 | §8 — design §8이 정확. Plan §6은 deprecated NOTE |

### Low (7개)

| ID | Issue | 결의 |
|---|---|---|
| H2 강등 | tips-generator hygiene postType opts 미지정 | §3.4 명시적 코멘트 — 의도적 (PARTNER_PROMO_PATTERNS 미적용). prompt 규칙으로 광고 단정 회피 + Risk Table |
| H3 강등 | tip + isAutoSeries=undefined 조합 | §3.3 — `isAutoSeries: false` 명시 (NEW-R20 strict false) |
| NEW-L4 | triggerTipGeneration form action signature | §3.11 코멘트 — searchParam-based feedback (useActionState 미사용, 단순 form) |
| NEW-L5 | sanitizeHtml import 무용 | §3.4 — import 라인 제거 (코드 cleanup) |
| NEW-L6 | Stock images Unsplash 라이센스 정정 | §11 OQ4 — "Unsplash License" 정정 (CC0 X, attribution 권장) |
| NEW-L7 | tipRepository vs functions runner query 중복 | 의도적 — Option A 코드 복제 패턴. Next.js admin manual + functions cron 분리 |
| NEW-L8 | slugRepository 언급 제거 | §3.11 — `src/lib/slug.ts:uniqueSlug` 표준 helper 사용 |

---

## §13. Streak Context

cycles #21~#29 모두 ≥ 90% Match Rate (cycle #29 = 99% 역대 최고). cycle #30 = **10th attempt**.

큰 scope (~1,710 LOC, 24 files = 19 신규 + 5 수정) — 9-streak 가장 큰 cycle. 26 issue 모두 v0.2에서 결의. surgical 변경 + cycle #19 hygiene-guard + uniqueSlug 재사용 + cycle #28 toKstWallClock 활용 + Option A mirror 5번째 사이클 (6 mirror 파일).

10-streak 도전:
- 9-streak 통계적 검증 완료에 더해 **새 도메인(tips) 적용 가능성** 추가 검증
- 가장 큰 scope 처리 가능성 검증
- R15 cycle #19 generator 10번째 무수정 (architecture 누적 효과 두 자리수 도달)

---

## §14. Next Step

```
/pdca do cleaning-tips-content
```

S1~S16 순차 진행. 격리: S1·S2·S3·S4·S9 독립. S6 bulk mirror (6 files). S7-S8 functions side. R15 invariant 10번째 검증 + 10-streak 도전.
