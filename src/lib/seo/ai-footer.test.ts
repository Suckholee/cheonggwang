/**
 * v1.16 cycle #29 partner-editorial-oversight · Test Plan §9.1.
 *
 * shouldShowAiFooter 4 cases (R14 scope 검증):
 *  1. isAutoSeries=true + partner-promo → true
 *  2. isAutoSeries=false (사장님 직접) → false
 *  3. tip postType (defensive — R5 invariant로 실제 발생 X) → false
 *  4. provider postType (defensive 동일) → false
 *
 * 실행: npx tsx src/lib/seo/ai-footer.test.ts
 */

import { shouldShowAiFooter, AI_FOOTER_TEXT, AI_FOOTER_MARKDOWN } from "./ai-footer";
import type { Post, PostType } from "@/types/post";

let failures = 0;
function assert(name: string, cond: boolean, info?: unknown): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}`, info ?? "");
    failures++;
  }
}

function makePost(over: { isAutoSeries?: boolean; postType: PostType }): Pick<Post, "isAutoSeries" | "postType"> {
  return {
    isAutoSeries: over.isAutoSeries,
    postType: over.postType,
  };
}

// Case 1: 정상 케이스 — isAutoSeries=true + partner-promo → true
{
  const post = makePost({ isAutoSeries: true, postType: "partner-promo" });
  assert("Case 1: isAutoSeries+partner-promo → footer 표시", shouldShowAiFooter(post) === true);
}

// Case 2: 사장님 직접 작성 → false
{
  const post = makePost({ isAutoSeries: false, postType: "partner-promo" });
  assert("Case 2: isAutoSeries=false (사장님 직접) → footer X", shouldShowAiFooter(post) === false);

  // isAutoSeries undefined도 false 처리
  const noFlag = makePost({ postType: "partner-promo" });
  assert("Case 2b: isAutoSeries=undefined (legacy) → footer X", shouldShowAiFooter(noFlag) === false);
}

// Case 3: tip postType (defensive — 실제로는 isAutoSeries=true + tip 조합 발생 X)
{
  const post = makePost({ isAutoSeries: true, postType: "tip" });
  assert("Case 3: tip postType + isAutoSeries=true → footer X (R14)", shouldShowAiFooter(post) === false);
}

// Case 4: provider postType (defensive 동일)
{
  const post = makePost({ isAutoSeries: true, postType: "provider" });
  assert("Case 4: provider postType + isAutoSeries=true → footer X (R14)", shouldShowAiFooter(post) === false);
}

// 추가 검증: 상수 텍스트
assert(
  "AI_FOOTER_TEXT 한국 광고법 호환 문구 포함",
  AI_FOOTER_TEXT.includes("AI") && AI_FOOTER_TEXT.includes("매장에서 검토"),
);

assert(
  "AI_FOOTER_MARKDOWN HR + italic 구조",
  AI_FOOTER_MARKDOWN.startsWith("\n\n---\n\n*") && AI_FOOTER_MARKDOWN.endsWith("*"),
);

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\n✅ all ai-footer tests passed");
