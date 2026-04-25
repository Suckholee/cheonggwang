# Design · quote-trend-keywords

**Feature**: QuoteCategory별 트렌드 키워드 저장소 → Gemini 프롬프트 주입
**Version**: v0.2 (validator 97% → fixes applied: C1/C2/H1/H2/H3/H4)
**Level**: Dynamic
**Cycle**: #17 (Marketplace v1.5a)
**Based on**: `docs/01-plan/features/quote-trend-keywords.plan.md`
**Created**: 2026-04-21

---

## 0.0 Plan vs Design Reconciliation (v0.2)

Design는 현재 코드와 정합하도록 다음 3건의 Plan 설명을 바로잡습니다.

| # | Plan 지점 | Plan 표현 | Design 실제 | 이유 |
|---|---|---|---|---|
| R1 | Plan §8.1 step 5, §11 signature | `buildPromoPrompt(..., reviews, ...)` + single concatenated string | `buildPromoPrompt({ ..., latestReview, trendKeywords })` · returns `{ system, user }` | 기존 `src/domain/promo-prompt.ts:7-23` 계약 유지 |
| R2 | Plan §9 firestore rules | `allow read: if true` | `allow read: if false` (§7.1) | 기존 legacy `trendKeywords` 패턴(`firestore.rules:59`) 일치 · repository가 Admin SDK 사용하므로 behavior 동일 |
| R3 | Plan §11 prompt 주입 위치 | `[systemPromptWith3Defenses, renderTrendKeywordsSection(...), ...]` (system 뒤) | user 프롬프트의 `[최신 리뷰]` 뒤 + `[주제 힌트]` 앞 (§5.2) | system 3중 방어는 불변 유지가 안전 · user에 두면 prompt injection 방어 경계 명확 |

**모든 변경은 실제 코드와의 정합 목적 · Plan의 의도 왜곡 없음.**

---

## 0. Design Overview

### 0.1 목표
- Firestore `quoteTrendKeywords/{category}` 6 문서 컬렉션 구축
- `quoteTrendKeywordsRepository` (server-only · Zod · React cache() · fallback)
- 수정 4 파일 최소 변경 통합: `promo-prompt.ts` · `promo-actions.ts` · `firestore.rules` · `seed-first-provider.mjs`
- 스크립트 2종: seed 블록 추가 + 독립 Admin CLI (`update-quote-trend-keywords.mjs`)

### 0.2 Design 원칙
- **기존 패턴 재사용**: `post-repository.ts` (React cache) · `trend-keywords-repository.ts` (read-only legacy) · posts 쓰기 격리 규칙
- **네임스페이스 분리**: `quoteTrendKeywords` ≠ legacy `trendKeywords` (키 체계·수명·책임 모두 분리)
- **Fallback 이중**: Firestore 실패 → DEFAULT 상수 → 빈 배열(엣지) 순차 fallback
- **Stateless prompt**: 키워드 섹션이 Gemini 출력 품질 이상으로 토큰을 소비하지 않도록 최대 30개

---

## 1. File Structure

### 1.1 신규 4 파일
| 파일 | Layer | Role |
|---|---|---|
| `src/types/quote-trend-keywords.ts` | Domain | `QuoteTrendKeywords` 타입 (repository 반환) |
| `src/domain/quote-trend-keywords-defaults.ts` | Domain | `DEFAULT_QUOTE_TREND_KEYWORDS: Record<QuoteCategory, string[]>` (6×12) |
| `src/lib/firebase/quote-trend-keywords-repository.ts` | Infrastructure | `"server-only"` · `getOrDefault(category)` · Zod 검증 · React `cache()` |
| `scripts/update-quote-trend-keywords.mjs` | Operator | Admin SDK CLI · 6 문서 덮어쓰기 |

### 1.2 수정 4 파일
| 파일 | Layer | Change |
|---|---|---|
| `src/domain/promo-prompt.ts` | Domain | `PromoPromptContext`에 `trendKeywords: string[]` 추가 · `user` 프롬프트에 `[참고 트렌드 키워드]` 섹션 삽입 |
| `src/app/actions/promo-actions.ts` | Application | `createPromoPost` 내부에 repo fetch + buildPromoPrompt 호출 인자 추가 |
| `firestore.rules` | Infrastructure | `match /quoteTrendKeywords/{category}` 규칙 추가 |
| `scripts/seed-first-provider.mjs` | Operator | seed 블록 1개 추가 (6 문서 초기화) |

---

## 2. Data Model

### 2.1 Firestore `quoteTrendKeywords/{category}`

**Document ID**: `QuoteCategory` (`"move-in"|"office"|"aircon"|"move-out"|"special"|"regular"`)

```ts
interface QuoteTrendKeywordsDoc {
  keywords: string[];       // min 1, max 30, 각 항목 min 1 max 30
  updatedAt: Timestamp;     // FieldValue.serverTimestamp() on write
}
```

### 2.2 TypeScript 타입 (`src/types/quote-trend-keywords.ts`)

```ts
import type { QuoteCategory } from "@/domain/quote-category";

export interface QuoteTrendKeywords {
  category: QuoteCategory;
  keywords: string[];
  updatedAt: Date | null;   // null when fallback (DEFAULT)
}
```

**M1 note**: Plan §5.2는 `{keywords, updatedAt}`만 정의. Design은 `category` 필드 추가 — `get()` 반환값 자체 기술(self-describing) 목적 · `getOrDefault()` 호출자에는 미영향 (string[]만 반환).

### 2.3 Zod schema (repository 내부)

```ts
const quoteTrendKeywordsDocSchema = z.object({
  keywords: z.array(z.string().min(1).max(30)).min(1).max(30),
  updatedAt: z.unknown().optional(), // Firestore Timestamp (후처리 toDate)
});
```

---

## 3. DEFAULT_QUOTE_TREND_KEYWORDS (§I1 + §I10 확정)

### 3.1 큐레이션 기준 (OQ1 해소)
- 수동 큐레이션 (v1 단순화)
- 청소 서비스 실제 검색어/고객 언어 반영
- 카테고리당 12개 · 총 72개

### 3.2 6 카테고리 × 12 키워드

```ts
// src/domain/quote-trend-keywords-defaults.ts
export const DEFAULT_QUOTE_TREND_KEYWORDS: Record<QuoteCategory, string[]> = {
  "move-in": [
    "입주청소",
    "새집증후군",
    "베이크아웃",
    "유해물질 제거",
    "입주 전 청소",
    "새집 공기질",
    "창호 틈 먼지",
    "주방 후드 탈지",
    "욕실 물때",
    "바닥 왁스 코팅",
    "환기 · 공기 순환",
    "마감재 보호",
  ],
  office: [
    "사무실 청소",
    "카펫 스팀 청소",
    "파티션 먼지 제거",
    "공용공간 위생",
    "회의실 관리",
    "탕비실 청소",
    "책상 유해균 제거",
    "야간 청소",
    "주말 청소",
    "정기 구독",
    "에어컨 필터 교체",
    "냉난방기 관리",
  ],
  aircon: [
    "에어컨 분해청소",
    "냉방 효율 개선",
    "필터 교체",
    "송풍구 곰팡이 제거",
    "실외기 점검",
    "에어컨 냄새 제거",
    "위생 살균",
    "가정용 분리형",
    "시스템 에어컨",
    "천장형 에어컨",
    "벽걸이형",
    "정기 관리 구독",
  ],
  "move-out": [
    "이사청소",
    "퇴거 전 청소",
    "잔여물 정리",
    "베란다 청소",
    "욕실 물때 제거",
    "주방 기름때",
    "가스레인지 탈지",
    "장판 · 바닥 청소",
    "붙박이장 내부",
    "창문 청소",
    "입주자 대비",
    "임대차 점검",
  ],
  special: [
    "곰팡이 제거",
    "해충 방역",
    "유품정리",
    "고독사 청소",
    "화재잔해 청소",
    "쓰레기 집 청소",
    "악취 제거",
    "오염물 소독",
    "의료폐기물",
    "비위생 공간",
    "특수 약품 처리",
    "감염 관리",
  ],
  regular: [
    "주 1회 청소",
    "월 구독 관리",
    "정기 관리",
    "단골 계약",
    "장기 계약",
    "격주 청소",
    "월 2회 청소",
    "유지보수",
    "일상 청소 대행",
    "가사 도우미",
    "카페 · 매장 청소",
    "아파트 공용부",
  ],
};
```

### 3.3 카테고리별 품질 근거
- **move-in**: "베이크아웃"(공조 전환 전 가열·환기) · "새집증후군"(VOC) 고관심 용어 포함
- **office**: 주말·야간 등 시간대 언어 + 공간별 세부 (파티션·탕비실·회의실)
- **aircon**: 기기 타입 3종 (분리형·시스템·천장형) 모두 커버
- **move-out**: 퇴거 체크리스트 언어 중심 (임대차·입주자 대비)
- **special**: 민감·전문 영역 (유품정리·고독사) 명시적 포함 — Gemini가 정확한 용어 선택
- **regular**: 주기·공간 유형 (가정/매장/공용부) 언어 다양화

---

## 4. Repository

### 4.1 `src/lib/firebase/quote-trend-keywords-repository.ts`

```ts
import "server-only";
import { cache } from "react";
import { z } from "zod";
import { adminDb } from "./admin";
import type { QuoteCategory } from "@/domain/quote-category";
import { DEFAULT_QUOTE_TREND_KEYWORDS } from "@/domain/quote-trend-keywords-defaults";
import type { QuoteTrendKeywords } from "@/types/quote-trend-keywords";

const COLLECTION = "quoteTrendKeywords";

const docSchema = z.object({
  keywords: z.array(z.string().min(1).max(30)).min(1).max(30),
  updatedAt: z.unknown().optional(),
});

export const quoteTrendKeywordsRepository = {
  /**
   * Firestore read + Zod 검증 + fallback.
   * 실패/누락/Zod 위반 → DEFAULT_QUOTE_TREND_KEYWORDS[category] 반환.
   * React cache() 로 요청 범위 dedup.
   */
  getOrDefault: cache(
    async (category: QuoteCategory): Promise<string[]> => {
      try {
        const snap = await adminDb.collection(COLLECTION).doc(category).get();
        if (!snap.exists) return DEFAULT_QUOTE_TREND_KEYWORDS[category];

        const parsed = docSchema.parse(snap.data());
        return parsed.keywords;
      } catch (e) {
        console.warn(
          `[quoteTrendKeywords] fallback triggered for category="${category}":`,
          e,
        );
        return DEFAULT_QUOTE_TREND_KEYWORDS[category];
      }
    },
  ),

  /**
   * Metadata 포함 조회 (updatedAt 등 관찰용). v1에는 미사용.
   * 관리자 CLI/Admin UI에서 활용 예정.
   */
  async get(
    category: QuoteCategory,
  ): Promise<QuoteTrendKeywords | null> {
    const snap = await adminDb.collection(COLLECTION).doc(category).get();
    if (!snap.exists) return null;
    try {
      const parsed = docSchema.parse(snap.data());
      const raw = snap.data();
      const ts = raw?.updatedAt;
      const updatedAt =
        ts && typeof ts.toDate === "function" ? ts.toDate() : null;
      return {
        category,
        keywords: parsed.keywords,
        updatedAt,
      };
    } catch (e) {
      console.warn(`[quoteTrendKeywords] get() schema fail:`, e);
      return null;
    }
  },
};
```

### 4.2 React cache() 보장 (OQ4 해소)
- `cache()` 래퍼는 **요청 범위**(Next.js 16). 다음 요청에선 재실행 → Admin CLI 갱신 즉시 반영.
- 같은 요청 내 중복 호출(예: log + prompt 양쪽) 시 1회만 Firestore read.

---

## 5. Promo Prompt 통합

### 5.1 PromoPromptContext 확장

```ts
// src/domain/promo-prompt.ts (diff)
export interface PromoPromptContext {
  provider: Provider;
  workCases: WorkCase[];
  latestReview: ReviewView | null;
  topicHint: string | null;
  trendKeywords: string[];   // [신규]
}
```

### 5.2 `user` 프롬프트 섹션 삽입 위치

```ts
const trendKeywordsText =
  ctx.trendKeywords.length > 0
    ? ctx.trendKeywords.slice(0, 30).join(", ")
    : "";

const user = `[청명 정보]
...

[대표 단가]
...

[최근 작업 사례]
...

[최신 리뷰]
...

[참고 트렌드 키워드 · 선택적 반영 · 강제 아님]
${trendKeywordsText || "없음"}

[주제 힌트]
${ctx.topicHint ?? "자유 주제 ..."}

위 정보를 바탕으로 ... JSON으로만 응답하세요.`;
```

### 5.3 배치 이유
- **[청명 정보]** 뒤, **[주제 힌트]** 앞: 청명 맥락 파악 후 키워드 권장 · 최종 주제 힌트가 우선권
- **system 프롬프트가 아닌 user 프롬프트**에 배치 (H1 명시 deviation): 3중 방어(system)는 무조건 유지 · 키워드는 참고용 · Plan §11의 single-string + system 뒤 배치 제안을 의도적으로 변경 — actual return type `{ system, user }` 특성 상 user 배치가 3중 방어 경계 보존에 더 안전
- **"선택적 반영 · 강제 아님"** 명시: Gemini가 억지로 키워드 나열하지 않도록
- 최대 30개 하드 캡 (OQ5 해소): 토큰 예산보다는 품질 포커스 유지 목적 — 긴 리스트는 Gemini가 나열 의무감을 느껴 자연스러움 손상 · Gemini 2.5 Flash context 1M token이므로 실 예산 여유는 충분

### 5.4 primaryCategory 결정 (OQ2 해소)
- `provider.categories[0]` 사용 (대표 카테고리)
- 이유: 합집합(N×30=최대 180개)은 토큰 부담 · Gemini가 초점을 잃음
- 빈 배열 엣지: `DEFAULT_QUOTE_TREND_KEYWORDS` 6개 값에서 앞 2개씩 총 12개 **결정적(deterministic) 선택** (셔플 없음 · §6.2 `flatMap((arr)=>arr.slice(0,2))`)

---

## 6. promo-actions.ts 통합

### 6.1 변경 지점 (기존 5번째 블록 수정)

```ts
import { QUOTE_CATEGORIES } from "@/domain/quote-category";

// 기존
const [workCases, reviews] = await Promise.all([
  workCaseRepository.listByProvider(providerId, 3),
  reviewRepository.listByProvider(providerId, 1),
]);
const latestReview = reviews[0] ?? null;

// 변경 (H2 edge guard 포함)
const primaryCategory = provider.categories[0];
const isValidCategory =
  !!primaryCategory && (QUOTE_CATEGORIES as readonly string[]).includes(primaryCategory);

const [workCases, reviews, trendKeywords] = await Promise.all([
  workCaseRepository.listByProvider(providerId, 3),
  reviewRepository.listByProvider(providerId, 1),
  isValidCategory
    ? quoteTrendKeywordsRepository.getOrDefault(primaryCategory)
    : Promise.resolve(buildFallbackKeywords()),
]);
const latestReview = reviews[0] ?? null;
```

**H2 edge-case guard 근거**:
- `categories[0]` = `undefined` (빈 배열) → fallback
- `categories[0]` = `"invalid-legacy-cat"` (data corruption · TS bypass된 레거시 값) → fallback
- `QUOTE_CATEGORIES.includes(...)` 런타임 검증으로 `DEFAULT_QUOTE_TREND_KEYWORDS[category] === undefined` → `.slice(0,30)` TypeError 방지

### 6.2 buildFallbackKeywords (엣지 헬퍼)

```ts
// src/app/actions/promo-actions.ts 내부 로컬 함수
function buildFallbackKeywords(): string[] {
  const entries = Object.values(DEFAULT_QUOTE_TREND_KEYWORDS);
  // 각 카테고리 상위 2개 × 6 = 12 (일반적)
  return entries.flatMap((arr) => arr.slice(0, 2));
}
```

### 6.3 buildPromoPrompt 호출

```ts
const prompt = buildPromoPrompt({
  provider,
  workCases,
  latestReview,
  topicHint: input.topicHint,
  trendKeywords,            // [신규]
});
```

---

## 7. Firestore Rules

### 7.1 추가 블록 (기존 `trendKeywords` 뒤)

```
// ─── quoteTrendKeywords (v1.5a: 서버 전용 · Admin SDK 쓰기) ─
match /quoteTrendKeywords/{category} {
  allow read: if false;   // server-only (repository에서 Admin SDK)
  allow write: if false;  // Admin SDK 전용 (seed + CLI)
}
```

### 7.2 쓰기 격리 근거
- posts 패턴 동일: Cloud Function 또는 CLI 스크립트만 Admin SDK로 쓰기
- 일반 사용자/공급자 접근 불가
- legacy `trendKeywords` 동일 스타일 유지 (일관성)

---

## 8. Firestore Indexes

**필요 없음** — 단일 문서 ID 조회(`.doc(category).get()`)만. 복합 쿼리/정렬 없음. → `firestore.indexes.json` 무변경.

---

## 9. Scripts

### 9.1 `scripts/seed-first-provider.mjs` 확장

기존 seed 스크립트 말미에 블록 추가:

```js
// 8) quoteTrendKeywords seed (6 문서)
console.log("· quoteTrendKeywords seed 시작…");
const KEYWORDS_SEED = {
  "move-in": [...],  // DEFAULT_QUOTE_TREND_KEYWORDS["move-in"]
  office: [...],
  aircon: [...],
  "move-out": [...],
  special: [...],
  regular: [...],
};
for (const [cat, keywords] of Object.entries(KEYWORDS_SEED)) {
  await adminDb.collection("quoteTrendKeywords").doc(cat).set(
    {
      keywords,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
}
console.log("✓ quoteTrendKeywords 6건 시드");
```

**OQ6 해소**: seed 스크립트는 **단일 파일 내 블록 추가** · 별도 스크립트는 Admin CLI(9.2)로 역할 분리.

### 9.2 `scripts/update-quote-trend-keywords.mjs` (신규)

```js
#!/usr/bin/env node
// 재배포 없이 quoteTrendKeywords 갱신.
// 사용: pnpm tsx scripts/update-quote-trend-keywords.mjs

import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

config({ path: ".env.local" });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

// 여기를 수정해 새 키워드 입력 (재배포 없이 갱신)
const KEYWORDS = {
  "move-in": [...],
  office: [...],
  aircon: [...],
  "move-out": [...],
  special: [...],
  regular: [...],
};

for (const [cat, keywords] of Object.entries(KEYWORDS)) {
  await db.collection("quoteTrendKeywords").doc(cat).set(
    {
      keywords,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  console.log(`✓ ${cat}: ${keywords.length} 키워드`);
}
console.log("✓ 완료");
process.exit(0);
```

**운영 흐름**:
1. 개발자/운영자가 스크립트 내 KEYWORDS 수정
2. `pnpm tsx scripts/update-quote-trend-keywords.mjs` 실행
3. Firestore 6 문서 덮어쓰기 · serverTimestamp 자동 갱신
4. 다음 /promo 요청부터 신규 키워드 반영 (React cache() 요청 단위 무효)

---

## 10. Before/After 검증 (§I9)

### 10.1 비교 시나리오
- **공급자**: "청광 직영 청소팀" (`provider.categories[0]="move-in"`)
- **topicHint**: null (자유 주제)
- **brandTone**: "professional"

### 10.2 Before (키워드 주입 없음)
```
[Gemini 생성 예상]
제목: "전문가의 손길로 완성하는 깨끗한 새 보금자리"
본문: 일반적인 청결 언어 반복. "청소", "깨끗", "위생" 수준.
```

### 10.3 After (키워드 주입)
```
[참고 트렌드 키워드 · 선택적 반영]
입주청소, 새집증후군, 베이크아웃, 유해물질 제거, 입주 전 청소, ...

[Gemini 생성 기대]
제목: "새집증후군 걱정 없는 입주청소 — 베이크아웃부터 마감재 보호까지"
본문: "VOC 가속 발산을 위한 베이크아웃 공정", "광택 유지를 위한 마감재 보호" 등 카테고리 특화 용어 자연스럽게 포함.
```

### 10.4 품질 체크 포인트
- 키워드의 30% 이상 자연스럽게 포함되면 정상
- 모든 키워드 나열되면 "선택적 반영" 문구 무시됐다는 신호 (프롬프트 재검토)
- SEO 관점에서 카테고리 롱테일 키워드 노출 향상

---

## 11. Testing Plan

### 11.1 TS + Build
```bash
pnpm tsc --noEmit
pnpm build
```
**성공 기준**: 0 errors.

### 11.2 Fallback 동작 (수동 smoke)
1. `firestore:emulator:start` (옵션) 또는 실제 Firestore에서 `quoteTrendKeywords` 컬렉션 없음 상태 확인
2. `/provider/profile?tab=promo` → "AI 게시글 생성" 클릭
3. console.warn `[quoteTrendKeywords] fallback triggered...` 로그 확인
4. 포스트 생성 성공 · DEFAULT 키워드 반영

### 11.3 정상 Seed 동작
1. `pnpm tsx scripts/seed-first-provider.mjs` 실행
2. Firestore 콘솔 `quoteTrendKeywords` 6 문서 확인
3. 포스트 생성 → console 로그에 fallback **없음**

### 11.3.1 프롬프트 주입 검증 (deterministic · H4 Fix)
**목적**: Gemini 출력과 무관하게 프롬프트에 키워드 섹션이 포함되었는지 확인.

구현:
1. `src/app/actions/promo-actions.ts`에 임시 `console.log("[promo][prompt]\n" + prompt.user)` 추가 (또는 개발 환경 전용 env flag)
2. 포스트 생성 → 서버 로그에 `[참고 트렌드 키워드` 문자열 존재 확인
3. seed 데이터의 첫 키워드 (예: "입주청소") 해당 카테고리에서 로그에 포함 확인
4. 테스트 후 로그 제거

**테스트 통과 기준**: deterministic · Gemini 호출 결과 무관.

### 11.3.2 Gemini 출력 관찰 (heuristic · 품질 참고)
**목적**: 키워드 주입이 실제 출력에 반영되는지 샘플 관찰 (pass/fail 아님).

관찰:
- 생성된 `bodyMarkdown`에 해당 카테고리 키워드 1개 이상 자연스럽게 포함되면 정상
- 0개 포함: Gemini가 주제와 어울리지 않아 무시 (허용) · 모든 키워드 나열: "선택적 반영" 문구 무시 신호 (프롬프트 재검토)

**테스트 통과 기준**: N/A · 품질 관찰용 로그만 남김.

### 11.4 Admin CLI 동작
1. `scripts/update-quote-trend-keywords.mjs` 내 키워드 1개 수정 (예: "move-in" 배열에 "청광 보험 대응" 추가)
2. `pnpm tsx scripts/update-quote-trend-keywords.mjs` 실행
3. Firestore 콘솔에서 `quoteTrendKeywords/move-in.keywords` 변경 확인
4. 포스트 재생성 → 새 키워드 반영 시도 (Gemini 자연어 해석이므로 보장 X, 변화 관찰)

---

## 12. Error Scenarios

| 상황 | 처리 | 사용자 영향 |
|---|---|---|
| Firestore read 실패 (네트워크) | console.warn + DEFAULT fallback | 없음 (포스트 생성 정상) |
| 문서 `.exists=false` | 즉시 DEFAULT fallback | 없음 |
| Zod schema 위반 (keywords 배열 아님) | console.warn + DEFAULT fallback | 없음 |
| Zod 통과했으나 keywords empty (schema `.min(1)` 차단) | 이론상 발생 불가 · 혹시 비게 되면 프롬프트 섹션 `"없음"` 출력 (`trendKeywordsText \|\| "없음"`) | 없음 |
| `provider.categories[]` 빈 배열 | `buildFallbackKeywords()` (6×2=12 혼합) | 없음 (카테고리 미설정 공급자에도 동작) |
| `provider.categories[0]`이 QuoteCategory 외 값 (data corruption · H2 guard) | `QUOTE_CATEGORIES.includes` 실패 → `buildFallbackKeywords()` | 없음 |
| Admin SDK 초기화 실패 (CLI) | `initializeApp` throw → 운영자에게 에러 출력 | CLI 사용자만 |
| KEYWORDS 객체 내 키 누락 (CLI) | `Object.entries` loop 건너뜀 | 해당 카테고리만 미갱신 |

---

## 13. Observability (OQ3 해소)

### 13.1 v1 (단순)
- `console.warn` 3종:
  - `[quoteTrendKeywords] fallback triggered for category="..."`
  - `[quoteTrendKeywords] get() schema fail: ...`
  - promo-actions.ts 기존 `[promo] ...` 로그 유지

### 13.2 v2 이연 (미구현)
- Sentry/Datadog 연동 · fallback 빈도 집계 · 카테고리별 품질 메트릭

---

## 14. Implementation Order (Do Phase)

| Step | 작업 | 파일 | Deps |
|---|---|---|---|
| 1 | 타입 정의 | `src/types/quote-trend-keywords.ts` | - |
| 2 | DEFAULT 상수 12×6 | `src/domain/quote-trend-keywords-defaults.ts` | §3.2 |
| 3 | Repository (cache + Zod + fallback) | `src/lib/firebase/quote-trend-keywords-repository.ts` | 1,2 |
| 4 | firestore.rules 업데이트 | `firestore.rules` | - |
| 5 | seed 스크립트 블록 추가 | `scripts/seed-first-provider.mjs` | 2 |
| 6 | Admin CLI 스크립트 | `scripts/update-quote-trend-keywords.mjs` | - |
| 7 | promo-prompt.ts: trendKeywords 파라미터 + 섹션 삽입 | `src/domain/promo-prompt.ts` | - |
| 8 | promo-actions.ts: repo fetch + buildPromoPrompt 호출 수정 | `src/app/actions/promo-actions.ts` | 3, 7 |
| 9 | TS check + build | — | 1-8 |
| 10 | seed 실행 | `pnpm tsx scripts/seed-first-provider.mjs` | 5 |
| 11 | smoke test (정상 + fallback) | — | 10 |

---

## 15. Success Criteria (§13 plan 동기화)

| # | 기준 | 검증 |
|---|---|---|
| S1 | Firestore 6 문서 정상 생성 | seed 실행 후 Firestore 콘솔 |
| S2 | Fallback 정상 | 삭제 상태에서 포스트 생성 정상 |
| S3 | 프롬프트 섹션 주입 | promo-prompt 로그에 `[참고 트렌드 키워드]` 존재 |
| S4 | Gemini 출력 품질 향상 | §10 before/after 샘플 수동 비교 |
| S5 | 쓰기 격리 | Firestore 콘솔에서 일반 사용자 쓰기 시도 거부 (rules) |
| S6 | 타입 안전 | `pnpm build` 0 errors |
| S7 | Admin CLI 갱신 반영 | CLI 실행 후 포스트 생성 시 새 키워드 반영 |

---

## 16. Risks (Plan §14 확장)

| # | 위험 | 완화 |
|---|---|---|
| R1 | Firestore read 증가 | React cache() 요청 범위 · 단일 문서 ~1KB |
| R2 | 키워드 품질 저하 | "선택적 반영" 문구 + 3중 방어 유지 · §10 검증 |
| R3 | legacy trendKeywords 혼동 | 파일명/타입명 `quote` prefix 일관 · 문서에 명시 |
| R4 | `categories[]` 빈 배열 | `buildFallbackKeywords()` 6×2=12 혼합 |
| R5 | Zod schema 실패 무한 fallback | console.warn 로그로 관측 · v2 Sentry 연결 |
| R6 | 토큰 예산 초과 | 최대 30개 하드 캡 · DEFAULT 12개로 안전 마진 |
| R7 | Admin CLI 실행 실수 (빈 KEYWORDS) | merge:false 경고 · script 실행 전 확인 문구 |
| R8 | seed 블록과 `quote-trend-keywords-defaults.ts` **중복 소스** (drift 위험) | `scripts/seed-first-provider.mjs`는 `.mjs`이므로 `.ts` import 불가 — 정책: **Admin CLI(§9.2)가 primary** · seed 블록은 초기화 편의용 복제본으로 유지 · §9.1에 "편집 시 domain 상수와 동기화" 주석 필수 · 장기적으로 seed 스크립트 전체를 `pnpm tsx` 기반으로 마이그 가능 (v2) |

---

## 17. Open Questions Resolution

| # | 질문 | 해소 |
|---|---|---|
| OQ1 | 키워드 큐레이션 소스 | §3.2 수동 큐레이션 12×6 확정 |
| OQ2 | primaryCategory 선정 | §5.4 `categories[0]` · 합집합은 토큰/초점 문제 |
| OQ3 | 모니터링 | §13 v1 console.warn · v2 Sentry 이연 |
| OQ4 | cache 무효화 | §4.2 React cache() 요청 단위로 자동 신선 · 조치 불필요 |
| OQ5 | 최대 키워드 수 | §5.3 30개 하드 캡 · DEFAULT 12로 안전 마진 |
| OQ6 | seed 스크립트 분리 | §9.1 seed-first-provider.mjs 블록 추가 · 별도 CLI는 §9.2 |

---

## 18. Next Steps

- [ ] design-validator 호출 → 피드백 반영
- [ ] `/pdca do quote-trend-keywords`

---

## 19. References

- Plan: `docs/01-plan/features/quote-trend-keywords.plan.md`
- Archived: `provider-promo-content.design.md` (prompt + TX 패턴)
- Archived: `promo-page.design.md` (3중 방어 근원)
- Archived: `content-research-pipeline.design.md` (legacy trendKeywords writer)
- Existing: `src/domain/promo-prompt.ts` (수정 대상)
- Existing: `src/app/actions/promo-actions.ts` (수정 대상)
- Existing: `src/lib/firebase/trend-keywords-repository.ts` (참고 패턴 · legacy)
