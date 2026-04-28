import { strict as assert } from "node:assert";
import { buildTipPrompt, type TipTopic } from "../tips/prompt";

/**
 * v1.17 cycle #30 · §9.1 tips-generator 4 cases (M2 결의)
 *   pnpm test:tips
 *
 * 실제 LLM 호출 없이 buildTipPrompt 로직만 검증 (네트워크 의존 X).
 * tips-generator.ts (server-only)는 분리된 prompt.ts에 위임 → 테스트는 prompt.ts 직접 import.
 */

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}

console.log("[tips-generator.test]");

const baseTopic: TipTopic = {
  id: "kitchen-hood",
  label: "주방 후드 기름때 닦기",
  category: "kitchen",
  intent: "howto",
};

// 1) 정상 generate prompt — 주제·카테고리·intent·자주 묻는 질문 규칙 포함
test("buildTipPrompt — topic, category, intent, FAQ rule 포함", () => {
  const prompt = buildTipPrompt({ topic: baseTopic });
  assert.ok(prompt.includes("주방 후드 기름때 닦기"), "label missing");
  assert.ok(prompt.includes("kitchen"), "category missing");
  assert.ok(prompt.includes("howto"), "intent missing");
  assert.ok(prompt.includes("자주 묻는 질문"), "FAQ rule missing");
  assert.ok(prompt.includes("TL;DR") || prompt.includes("첫 단락"), "TL;DR rule missing");
});

// 2) RAG anti-drift — recentTitles 입력 시 prompt에 포함됨
test("buildTipPrompt — RAG anti-drift recentTitles 주입", () => {
  const prompt = buildTipPrompt({
    topic: baseTopic,
    recentTitles: ["에어컨 청소 비용은 얼마일까?", "욕실 곰팡이 제거"],
  });
  assert.ok(prompt.includes("최근 다룬 주제"), "recent block missing");
  assert.ok(prompt.includes("에어컨 청소 비용은 얼마일까?"), "title 1 missing");
  assert.ok(prompt.includes("욕실 곰팡이 제거"), "title 2 missing");
});

// 3) recentTitles 비어있을 때 RAG 블록 없음
test("buildTipPrompt — recentTitles 빈 배열 시 RAG 블록 없음", () => {
  const prompt = buildTipPrompt({ topic: baseTopic, recentTitles: [] });
  assert.ok(!prompt.includes("최근 다룬 주제"), "RAG block should be empty");
});

// 4) season hint — 시즌 명시 시 prompt에 시즌 콘텐츠 표시
test("buildTipPrompt — season 명시 시 prompt에 표시", () => {
  const seasonal: TipTopic = { ...baseTopic, season: "summer" };
  const prompt = buildTipPrompt({ topic: seasonal });
  assert.ok(prompt.includes("summer 시즌 콘텐츠"), "season hint missing");
});

console.log("[tips-generator.test] done");
