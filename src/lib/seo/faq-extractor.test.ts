/**
 * v1.15 cycle #28 partner-aeo-boost · Test Plan §9.1 — faq-extractor 단위 테스트.
 *
 * 실행: `npx tsx src/lib/seo/faq-extractor.test.ts`
 * 실패 시 process.exit(1).
 */

import { extractFaqsFromMarkdown } from "./faq-extractor";

let failures = 0;
function assert(name: string, cond: boolean, info?: unknown): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}`, info ?? "");
    failures++;
  }
}

// Case 1: 정상 — 2개 추출
{
  const md = `## 청광 청소 서비스란?

본문 단락.

## 자주 묻는 질문

### Q1. 비용은 얼마인가요?

청광은 매장에 따라 다양한 가격대를 제공합니다.

### Q2. 예약은 어떻게 하나요?

홈페이지에서 견적 요청을 보내면 됩니다.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 1: 2 Q&A 추출", r.length === 2, r);
  assert("Case 1: Q1 질문 일치", r[0]?.question === "비용은 얼마인가요?", r[0]);
  assert(
    "Case 1: Q1 답변 trim 후 시작",
    r[0]?.answer.startsWith("청광은 매장에"),
    r[0]?.answer,
  );
}

// Case 2: ## 헤더 부재 → 빈 배열 (graceful)
{
  const md = `# 제목\n본문...\n### Q1. 무엇?\n답변...\n`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 2: 섹션 헤더 부재 → []", r.length === 0, r);
}

// Case 3: 헤더 변형 — "자주묻는 질문" 공백 없음
{
  const md = `## 자주묻는 질문

### Q1. 어떻게 하나요?

답변 본문.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 3: 공백 없는 헤더 변형 추출", r.length === 1, r);
}

// Case 4: ### Q 변형 (Q1./Q1:/Q1))
{
  const md = `## 자주 묻는 질문

### Q1. 점 변형
답변 1.

### Q2: 콜론 변형
답변 2.

### Q3) 괄호 변형
답변 3.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 4: 3가지 구분자 변형 추출", r.length === 3, r);
}

// Case 5: 빈 본문 → 빈 배열
{
  const r = extractFaqsFromMarkdown("");
  assert("Case 5: 빈 본문 → []", r.length === 0, r);
  const r2 = extractFaqsFromMarkdown(null as unknown as string);
  assert("Case 5b: null → []", r2.length === 0, r2);
}

// Case 6: Q는 있으나 답변 빈 줄 → 해당 Q 제외
{
  const md = `## 자주 묻는 질문

### Q1. 답변 없는 질문

### Q2. 답변 있는 질문

이건 답변입니다.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 6: 답변 없는 Q는 제외", r.length === 1, r);
  assert(
    "Case 6: Q2만 결과에 포함",
    r[0]?.question === "답변 있는 질문",
    r[0],
  );
}

// Case 7: utf-8 한국어 + 특수문자
{
  const md = `## 자주 묻는 질문

### Q1. 청광은 어떻게 ‘다른가요’?

특수문자 — em-dash, “quotes”, • bullet 모두 통과.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 7: 한국어 + 특수문자 추출", r.length === 1, r);
  assert(
    "Case 7: 특수문자 보존",
    r[0]?.answer.includes("em-dash"),
    r[0]?.answer,
  );
}

// Case 8: 중간 H2가 끼인 경우 — 다른 ## 만나면 종료
{
  const md = `## 자주 묻는 질문

### Q1. 첫 질문
답변 1.

## 다른 섹션

### Q2. 이건 안 잡혀야 함
이 답변은 무시.
`;
  const r = extractFaqsFromMarkdown(md);
  assert("Case 8: 다른 ## 만나면 섹션 종료", r.length === 1, r);
  assert(
    "Case 8: Q1만 추출, Q2는 제외",
    r[0]?.question === "첫 질문",
    r[0],
  );
}

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\n✅ all faq-extractor tests passed");
