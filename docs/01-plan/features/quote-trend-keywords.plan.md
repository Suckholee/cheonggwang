# Plan · quote-trend-keywords

**Feature**: QuoteCategory별 트렌드 키워드 저장소 — AI 홍보글 생성 프롬프트 강화
**Level**: Dynamic
**Cycle**: #17 (Marketplace v1.5a · provider-promo-content 후속)
**Method**: Plan Plus (brainstorming-enhanced)
**Started**: 2026-04-21

---

## 1. User Intent Discovery

### 1.1 Core Purpose
**🅐 Promo 프롬프트 강화 only** — `QuoteCategory`별 트렌드 키워드를 Gemini 2.5 Flash 프롬프트에 주입해 AI 생성 홍보글 품질을 향상. **사용자 노출 UI 없음** · 내부 시스템 자산.

### 1.2 Target Users
- **Primary**: 홍보글 생성을 요청하는 공급자 (간접 수혜 · 출력 품질 향상)
- **Secondary**: `/community` 피드를 읽는 고객 (간접 수혜 · 콘텐츠 품질 향상)
- **Operator**: 개발자/운영자 (CLI 스크립트로 키워드 주기 갱신)

### 1.3 Success Criteria
- Gemini 출력에 카테고리 특화 용어(예: "입주청소"에서 "베이크아웃", "새집증후군") 자연스럽게 등장
- fallback 체계 — Firestore 비어있어도 홍보글 생성 정상 동작
- 배포 없이 키워드 수정 가능 (CLI 재실행으로 완결)

---

## 2. Alternatives Explored

### A. Firestore 신규 컬렉션 `quoteTrendKeywords/{category}` — 채택 ✅
- Pros: 네임스페이스 명확 · legacy 분리 · v2 자동화 여지 · 타입 안전
- Cons: Firestore read 1회 추가 (cache()로 dedup)

### B. 상수 파일 하드코딩
- Pros: 가장 단순 · Firestore 0
- Cons: 수정 시 배포 필요 · 이력 추적 불가

### C. 기존 `trendKeywords` 컬렉션 재사용
- Pros: 기존 repository/writer 재사용
- Cons: legacy Category vs QuoteCategory 키 충돌 · 쓰기 격리 정책 꼬임

**결정**: Approach A. 미래 Admin UI 또는 Cloud Function 자동화 여지 유지 + 정적 seed 단순성.

---

## 3. YAGNI Review

### Included (v1, 10 items)

**필수 기반 (6)**
1. **I1** — `QuoteTrendKeywords` 타입 + `DEFAULT_QUOTE_TREND_KEYWORDS` 상수 (6×12)
2. **I2** — `quoteTrendKeywordsRepository` (getOrDefault + React cache())
3. **I3** — seed 스크립트 (6 카테고리 Firestore 초기화)
4. **I4** — `firestore.rules` (read=true, write=false)
5. **I5** — `promo-prompt.ts` 통합 (트렌드 키워드 섹션 삽입)
6. **I6** — `promo-actions.ts` 호출 흐름 수정

**품질 강화 (4)**
7. **I7** — Zod schema 검증 (read 시 `{ keywords, updatedAt }` shape)
8. **I8** — Admin CLI 스크립트 (`scripts/update-quote-trend-keywords.mjs`)
9. **I9** — before/after 검증 노트 (디자인 문서 내 1건 예시)
10. **I10** — 6 카테고리 × 10~15 실제 키워드 큐레이션 (seed+defaults 데이터)

### Out of Scope (v2 이후 이연)

- **O1** Admin Web UI (`/admin/trend-keywords` 편집 폼)
- **O2** Cloud Function 자동 갱신 (주/월 스케줄)
- **O3** 크롤링 파이프라인 (네이버/구글 검색어 수집)
- **O4** 키워드 가중치 · 통계 추적
- **O5** UI 노출 (community 필터 칩 · search 제안어)
- **O6** A/B 테스트 (키워드 포함 vs 미포함 품질 비교)
- **O7** 다국어 키워드 (영어/중국어)
- **O8** 공급자별 커스텀 키워드 오버라이드
- **O9** 키워드 블랙리스트 (금칙어 별도 컬렉션)

---

## 4. Scope

### In scope
- `quoteTrendKeywords` Firestore 컬렉션 (6 문서)
- Server-only repository + Zod 검증 + React cache()
- DEFAULT_QUOTE_TREND_KEYWORDS 폴백 상수 (6×~12)
- seed + Admin CLI 2개 스크립트
- `promo-prompt.ts` · `promo-actions.ts` 통합
- `firestore.rules` 업데이트

### Out of scope
- UI 노출 / Admin Web UI / 자동 크롤링 / 통계 / A/B / 다국어 / 공급자 오버라이드

---

## 5. Data Model

### 5.1 Firestore `quoteTrendKeywords/{quoteCategory}`

```ts
interface QuoteTrendKeywordsDoc {
  keywords: string[];       // 10~30, min 1
  updatedAt: Timestamp;     // serverTimestamp on write
}
```

- Document ID = `QuoteCategory` (`"move-in"|"office"|"aircon"|"move-out"|"special"|"regular"`)
- 6개 문서 고정 (seed 시 전체 생성 · set merge:false)
- Admin SDK 전용 쓰기 (rules)

### 5.2 TypeScript 타입

```ts
// src/types/quote-trend-keywords.ts
export interface QuoteTrendKeywords {
  keywords: string[];
  updatedAt: Date | null;
}
```

### 5.3 DEFAULT_QUOTE_TREND_KEYWORDS (6×12 ≈ 72 단어)

카테고리별 대표 키워드 샘플:
- **move-in** (입주청소): 입주청소, 새집증후군, 베이크아웃, 유해물질, 입주 전 청소, ...
- **office** (사무실청소): 사무실 청소, 카펫 케어, 파티션 먼지, 공용공간 위생, 정기청소, ...
- **aircon** (에어컨청소): 에어컨 분해청소, 냄새 제거, 냉방효율, 필터 교체, 실외기, ...
- **move-out** (이사청소): 이사청소, 잔여물 정리, 베란다, 욕실 물때, 입주 전 청소, ...
- **special** (특수청소): 곰팡이 제거, 해충 방역, 유품정리, 고독사, 화재잔해, ...
- **regular** (정기청소): 주 1회 청소, 월 구독, 정기 관리, 단골, 장기계약, ...

상세는 Design 문서에서 확정.

---

## 6. Architecture Overview

```
Firestore: quoteTrendKeywords/{category} (6 docs)
      ↓ read-only
quoteTrendKeywordsRepository (server-only, cache())
  • getOrDefault(category) → string[]
  • Zod 검증 · Firestore 실패 시 DEFAULT 폴백
      ↓
promo-actions.ts · createPromoPost
  + trendKeywords fetch → buildPromoPrompt(..., trendKeywords)
      ↓
promo-prompt.ts · 3중 방어 + 트렌드 키워드 섹션
      ↓
Gemini 2.5 Flash
```

**원칙**:
- 쓰기 격리 (Admin SDK only, 기존 posts 패턴 동일)
- Fallback 필수 (Firestore 0 상태에서도 기능 정상)
- 기존 legacy `trendKeywords` 컬렉션과 완전 분리

---

## 7. Key Components

### 신규 4 파일
| 파일 | 역할 |
|---|---|
| `src/types/quote-trend-keywords.ts` | 타입 정의 |
| `src/domain/quote-trend-keywords-defaults.ts` | DEFAULT 상수 (6×~12) |
| `src/lib/firebase/quote-trend-keywords-repository.ts` | server-only read + cache() + Zod |
| `scripts/update-quote-trend-keywords.mjs` | Admin CLI 업데이트 스크립트 |

### 수정 4 파일
| 파일 | 변경 |
|---|---|
| `src/domain/promo-prompt.ts` | `trendKeywords: string[]` 파라미터 추가 · 프롬프트 섹션 삽입 |
| `src/app/actions/promo-actions.ts` | repository fetch + buildPromoPrompt 호출 수정 |
| `firestore.rules` | `match /quoteTrendKeywords/{category}` 규칙 추가 |
| `scripts/seed-first-provider.mjs` | 6 카테고리 초기 키워드 seed 블록 추가 |

---

## 8. Data Flow

### 8.1 Happy Path (createPromoPost 내부)
1. 인증 + Zod 입력 (기존)
2. 7일 쿨다운 체크 (기존)
3. provider / workCases / reviews fetch (기존)
4. **[신규]** `quoteTrendKeywordsRepository.getOrDefault(provider.categories[0])` → `string[]`
5. **[변경]** `buildPromoPrompt({ provider, workCases, reviews, trendKeywords })`
6. Gemini 2.5 Flash 호출 (기존)
7. TX: posts.create + providers.update (기존)
8. revalidatePath × 3 (기존)

### 8.2 Fallback (Firestore 실패/누락/Zod 실패)
- `console.warn` + `DEFAULT_QUOTE_TREND_KEYWORDS[category]` 반환
- 사용자 UX 영향 0 (홍보글 생성 정상 진행)
- Zod 실패 시에도 fallback 동일

### 8.3 Admin 갱신
```
pnpm tsx scripts/update-quote-trend-keywords.mjs
  → Admin SDK 초기화
  → 6 카테고리 × keywords[] 덮어쓰기 (merge:false)
  → serverTimestamp updatedAt
  → 다음 createPromoPost 호출부터 신규 키워드 반영
```

### 8.4 primaryCategory 결정
- `provider.categories[0]` (첫 번째 = 대표 카테고리 · 공급자 등록 시 정렬)
- 빈 배열(엣지) → DEFAULT 6개 Flat 상위 8개 (카테고리 독립 일반 키워드)

---

## 9. Firestore Rules

```
match /quoteTrendKeywords/{category} {
  allow read: if true;           // 공개 읽기 (운영상 server-only이지만 문서화 목적)
  allow write: if false;          // Admin SDK 전용
}
```

**쓰기 격리 근거**: posts 패턴(archived provider-promo-content) 동일. Cloud Function/CLI만 Admin SDK로 쓰기.

---

## 10. Firestore Indexes

**없음** — 단일 문서 ID 조회만 (`.doc(category).get()`). 복합 쿼리 없음.

---

## 11. promo-prompt.ts 통합 상세

### 변경 전
```ts
export function buildPromoPrompt({ provider, workCases, reviews, topicHint }): string {
  return [systemPromptWith3Defenses, providerContext, workCases, reviews, topicHint].join("\n\n");
}
```

### 변경 후
```ts
export function buildPromoPrompt({ provider, workCases, reviews, topicHint, trendKeywords }): string {
  return [
    systemPromptWith3Defenses,
    renderTrendKeywordsSection(trendKeywords),   // [신규] 3중 방어 아래 삽입
    providerContext,
    workCases,
    reviews,
    topicHint,
  ].join("\n\n");
}

function renderTrendKeywordsSection(keywords: string[]): string {
  return `[참고 트렌드 키워드 · 선택적 반영 · 강제 아님]\n${keywords.join(", ")}`;
}
```

**제약**:
- 3중 방어 뒤에 배치 (프롬프트 인젝션 방어 후)
- "선택적 반영" 문구로 Gemini가 강제되지 않도록 유도
- 최대 30개 키워드로 토큰 예산 보호

---

## 12. Implementation Order (Do Phase 예고)

1. I1 · 타입 + DEFAULT 상수 (6×~12 작성)
2. I2 · Repository (Zod + cache())
3. I4 · firestore.rules 업데이트
4. I3 · seed 스크립트 (seed-first-provider.mjs 블록 추가)
5. I8 · Admin CLI 스크립트 (update-quote-trend-keywords.mjs)
6. I5 · promo-prompt.ts 통합 (renderTrendKeywordsSection)
7. I6 · promo-actions.ts 호출 흐름 수정
8. I10 · 실제 키워드 큐레이션 (I1 DEFAULT 확정 · seed 동일 데이터)
9. I9 · Design 문서에 before/after 예시 노트 (디자인 단계)
10. TS check + build + smoke test (CLI 실행 · /community 포스트 1건 생성 후 품질 확인)

---

## 13. Success Criteria (검증)

| # | 기준 | 검증 방법 |
|---|---|---|
| S1 | Firestore 6 문서 정상 생성 | `pnpm tsx scripts/update-quote-trend-keywords.mjs` 실행 후 Firestore 콘솔 확인 |
| S2 | Fallback 동작 | 임시로 Firestore 문서 삭제 후 promo 생성 → 정상 생성 확인 |
| S3 | 프롬프트 포함 확인 | promo-prompt 로그 출력에 "참고 트렌드 키워드:" 섹션 존재 |
| S4 | Gemini 출력 품질 향상 | 샘플 1건 before/after 수동 비교 (Design §I9) |
| S5 | 쓰기 격리 | Firestore 콘솔에서 직접 쓰기 시도 → 거부 확인 |
| S6 | 타입 안전 | `pnpm build` 0 errors |

---

## 14. Risks & Mitigations

| 위험 | 영향 | 완화책 |
|---|---|---|
| R1. Firestore read 증가 (매 promo 생성) | 비용/속도 | React `cache()` 요청 범위 dedup · 문서당 ~1KB |
| R2. 키워드 품질 저하로 Gemini 출력 악화 | 품질 | "선택적 반영" 문구 + 3중 방어 유지 · before/after 비교 (S4) |
| R3. legacy `trendKeywords`와 혼동 | 개발자 혼란 | 파일명/타입명 모두 `quote` prefix 일관 · Design 문서에 명시 |
| R4. primaryCategory 빈 배열 엣지 | 런타임 에러 | 폴백 로직 (Flat DEFAULT 상위 8개) |
| R5. Zod 검증 실패 | 기능 중단 | fallback으로 DEFAULT 반환 · console.warn 관측 |

---

## 15. Brainstorming Log

### Phase 1 (Intent)
- Q1 → 🅐 Promo 프롬프트 강화 only (UI 노출 X)
- Q2 → 🅐 정적 seed 수동 큐레이션

### Phase 2 (Alternatives)
- 검토 A/B/C · **A 채택** — v2 자동화 여지 + 네임스페이스 분리

### Phase 3 (YAGNI)
- **Included**: I1-I10 (10개 전부)
- **Deferred**: O1-O9 (9개)
- 특기: I8 Admin CLI 포함 (재배포 없이 갱신 · YAGNI 기준 경계선이었으나 운영 편의 중시)

### Phase 4 (Design Validation)
- 4.1 Architecture OK
- 4.2 Components OK (7 파일 · 신규 4 · 수정 3)
- 4.3 Data Flow OK (Happy / Fallback / Admin / Prompt 4개)

### Key Decisions
- 네임스페이스 `quoteTrendKeywords` (legacy와 분리)
- Zod + fallback 이중 안전망
- "선택적 반영" 문구로 Gemini 강제 방지
- Document ID = `QuoteCategory` 직접 사용 (매핑 테이블 없이)

---

## 16. Open Questions (Design 단계로)

| # | 질문 | 후보 |
|---|---|---|
| OQ1 | 카테고리별 실제 키워드 12개씩 큐레이션 소스? | 수동 작성 / 웹 리서치 / Gemini 초안 → 검수 |
| OQ2 | `primaryCategory` 선정 `categories[0]` vs `categories` 전체 합집합? | 합집합이 품질 좋을 수 있음 but 토큰 예산 |
| OQ3 | fallback 시 console.warn → 운영 모니터링 연결? | v1 단순 warn · v2 Sentry/분석 |
| OQ4 | CLI 갱신 후 React cache() 무효화? | 요청 범위 cache라 자연 갱신 (새 요청) — 조치 불필요 |
| OQ5 | 키워드 최대 개수 (프롬프트 토큰 예산) | 20개? 30개? — Design에서 측정 |
| OQ6 | seed 스크립트 별도 분리 vs seed-first-provider.mjs 블록? | 분리 권장 (재실행 편의) |

---

## 17. Next Steps

- [ ] Design 문서 생성: `/pdca design quote-trend-keywords`
- [ ] design-validator 호출 → 피드백 반영
- [ ] Implementation: `/pdca do quote-trend-keywords`
- [ ] Gap 분석: `/pdca analyze quote-trend-keywords`

---

## 18. References

- **archived**: `provider-promo-content` (promo-prompt · createPromoPost · posts 패턴)
- **archived**: `promo-page` (3중 방어 격리 근원)
- **archived**: `content-research-pipeline` (Cloud Function · legacy `trendKeywords`)
- **기존 코드**: `src/lib/firebase/trend-keywords-repository.ts` (legacy 참고)
- **기존 코드**: `src/domain/quote-category.ts` (QuoteCategory 6 카테고리)
