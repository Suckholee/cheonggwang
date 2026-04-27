/**
 * v1.14 cycle #27 partner-series-queue · §9.5 — correctLastIndex 단위 테스트.
 *
 * 프로젝트에 jest/vitest 미설치 — `pnpm tsx src/lib/auto-series/lastindex-correction.test.ts`로 실행.
 * 실패 시 process.exit(1).
 *
 * 케이스 (Test Plan §9.5):
 *   1) 빈 큐 → 빈 큐 (no-op)
 *   2) prev invalid lastIndex (-1, length 초과) → -1
 *   3) active item이 next에 그대로 있음 → 새 위치 반환
 *   4) active item이 next에서 disabled됨 → -1 (effective에서 제외)
 *   5) active item이 next에서 삭제됨 → -1
 *   6) reorder — 같은 active item, 다른 위치
 */

import type { QueueItem } from "@/types/auto-series";
import { correctLastIndex } from "./lastindex-correction";

let failures = 0;

function assert(name: string, cond: boolean, info?: unknown): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`, info ?? "");
    failures++;
  }
}

function q(
  id: string,
  angle: QueueItem["angle"],
  format: QueueItem["format"],
  enabled = true,
): QueueItem {
  return { id, angle, format, enabled };
}

// Case 1: 빈 큐 → 빈 큐
{
  const result = correctLastIndex({
    prevQueue: [],
    nextQueue: [],
    prevLastIndex: -1,
  });
  assert("Case 1: 빈 큐 → -1", result === -1, { result });
}

// Case 2: prev invalid lastIndex
{
  const queue = [q("a", "usp", "blog"), q("b", "menu", "blog")];
  const r1 = correctLastIndex({
    prevQueue: queue,
    nextQueue: queue,
    prevLastIndex: -1,
  });
  const r2 = correctLastIndex({
    prevQueue: queue,
    nextQueue: queue,
    prevLastIndex: 99,
  });
  assert("Case 2a: lastIndex=-1 → -1", r1 === -1, { r1 });
  assert("Case 2b: lastIndex out of range → -1", r2 === -1, { r2 });
}

// Case 3: active item 그대로 + 새 항목 prepend
{
  const prev = [q("a", "usp", "blog"), q("b", "menu", "blog")];
  const next = [q("c", "review", "blog"), q("a", "usp", "blog"), q("b", "menu", "blog")];
  // prev lastIndex=0 (active=a)
  const result = correctLastIndex({
    prevQueue: prev,
    nextQueue: next,
    prevLastIndex: 0,
  });
  // a는 next에서 위치 1
  assert("Case 3: active 보존 + 새 항목 prepend → 새 위치", result === 1, {
    result,
  });
}

// Case 4: active item이 disabled됨 → -1
{
  const prev = [q("a", "usp", "blog"), q("b", "menu", "blog")];
  const next = [q("a", "usp", "blog", false), q("b", "menu", "blog")];
  // prev lastIndex=0 (active=a, prevEffective=[a,b])
  const result = correctLastIndex({
    prevQueue: prev,
    nextQueue: next,
    prevLastIndex: 0,
  });
  // a가 next에서 disabled → effective에 없음 → -1
  assert("Case 4: active disabled → -1", result === -1, { result });
}

// Case 5: active item 삭제됨 → -1
{
  const prev = [q("a", "usp", "blog"), q("b", "menu", "blog")];
  const next = [q("b", "menu", "blog")];
  const result = correctLastIndex({
    prevQueue: prev,
    nextQueue: next,
    prevLastIndex: 0,
  });
  assert("Case 5: active 삭제 → -1", result === -1, { result });
}

// Case 6: reorder
{
  const prev = [
    q("a", "usp", "blog"),
    q("b", "menu", "blog"),
    q("c", "review", "blog"),
  ];
  const next = [
    q("c", "review", "blog"),
    q("a", "usp", "blog"),
    q("b", "menu", "blog"),
  ];
  // prev lastIndex=1 (active=b)
  const result = correctLastIndex({
    prevQueue: prev,
    nextQueue: next,
    prevLastIndex: 1,
  });
  // b는 next에서 위치 2
  assert("Case 6: reorder 후 active 위치 보존", result === 2, { result });
}

// Case 7: prevEffective와 prevQueue 다른 경우 (disabled 섞임)
{
  const prev = [
    q("a", "usp", "blog", false), // disabled, effective에서 제외
    q("b", "menu", "blog"), // effective[0]
    q("c", "review", "blog"), // effective[1]
  ];
  const next = [
    q("a", "usp", "blog", false),
    q("c", "review", "blog"), // 위치 변경됨
    q("b", "menu", "blog"),
  ];
  // prev lastIndex=1 (effective=[b,c], active=c)
  const result = correctLastIndex({
    prevQueue: prev,
    nextQueue: next,
    prevLastIndex: 1,
  });
  // next effective=[c,b], c는 위치 0
  assert("Case 7: disabled 섞임 + reorder → effective 인덱스", result === 0, {
    result,
  });
}

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\n✅ all correctLastIndex tests passed");
