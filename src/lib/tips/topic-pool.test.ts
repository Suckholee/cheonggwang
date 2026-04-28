import { strict as assert } from "node:assert";
import { TIPS_TOPIC_POOL, pickNextTopic } from "./topic-pool";

/**
 * v1.17 cycle #30 · §9.1 topic-pool 4 cases (NEW M2 — Plan 누락 결의)
 *   pnpm test:tips
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

console.log("[topic-pool.test]");

// 1) 빈 pool 검증 — 풍성 (≥30)
test("TIPS_TOPIC_POOL has ≥ 30 entries", () => {
  assert.ok(
    TIPS_TOPIC_POOL.length >= 30,
    `expected ≥ 30, got ${TIPS_TOPIC_POOL.length}`,
  );
});

// 2) recentTitles 모두 등장 시 null
test("returns null when all labels are in recentTitles", () => {
  const recentTitles = TIPS_TOPIC_POOL.map((t) => t.label);
  const got = pickNextTopic({ recentTitles, seasonNow: "summer" });
  assert.equal(got, null);
});

// 3) 시즌 필터 — summer 전용 또는 시즌 미지정만 통과
test("season filter — summer should not yield winter-only topics", () => {
  // 시즌 미지정 후보 모두를 회피로 제거 → 강제로 season-locked만 남도록
  const forced = TIPS_TOPIC_POOL.filter((t) => !t.season).map((t) => t.label);
  const got = pickNextTopic({ recentTitles: forced, seasonNow: "summer" });
  assert.ok(got !== null, "expected non-null");
  // summer가 아닌 다른 시즌 topic은 절대 안 됨
  assert.ok(
    !got!.season || got!.season === "summer",
    `season violation: ${got!.season}`,
  );
});

// 4) 라운드 로빈 — 같은 입력 반복 호출 시 다른 topic 등장 (확률적)
test("randomized — multiple calls yield ≥ 2 distinct topics over 30 trials", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const got = pickNextTopic({ recentTitles: [], seasonNow: "spring" });
    if (got) seen.add(got.id);
  }
  assert.ok(
    seen.size >= 2,
    `expected ≥ 2 distinct topics, got ${seen.size}`,
  );
});

console.log("[topic-pool.test] done");
