#!/usr/bin/env node
/**
 * cycle #27 partner-series-queue · §S12 — queue mirror 동기화 검증.
 *
 * autoSeriesQueue 관련 lib을 cheonggwang/src ↔ functions/src 양쪽에 복제했으므로
 * 핵심 invariant이 함께 변경되는지 CI에서 검증.
 *
 * 검사 대상:
 *  - effective-queue.ts: ROTATION_POOL fallback 분기 존재
 *  - derive-inputs.ts: photoCursor 사용 (lastIndex 사용 금지)
 *  - QueueItem 4 field (id/angle/format/enabled)
 *  - photoCursor PartnerAutoSeries에 존재
 *
 * exit 0: 통과 / exit 1: mismatch (CI fail)
 */
import { readFile } from "node:fs/promises";

const CHECKS = [
  {
    title: "effectiveQueue ROTATION_POOL fallback 분기",
    files: [
      "src/lib/auto-series/effective-queue.ts",
      "functions/src/auto-series/lib/effective-queue.ts",
    ],
    test: (src) =>
      /AUTO_SERIES_ROTATION_POOL/.test(src) &&
      /active\.length === 0/.test(src),
  },
  {
    title: "derive-inputs photoCursor 사용 (lastIndex 금지)",
    files: [
      "src/lib/auto-series/derive-inputs.ts",
      "functions/src/auto-series/lib/derive-inputs.ts",
    ],
    test: (src) => {
      const usesCursor = /photoCursor/.test(src);
      // lastIndex 단어가 본문 코드에 등장하면 실패 — 단, 주석에서 "이전: lastIndex" 같이
      // 설명 목적으로 등장하는 건 허용. 함수 본문에 "autoSeries?.lastIndex" 패턴이 있으면 fail.
      const usesLastIndex = /autoSeries\?\.lastIndex/.test(src);
      return usesCursor && !usesLastIndex;
    },
  },
  {
    title: "QueueItem 4 field (id/angle/format/enabled)",
    files: [
      "src/types/auto-series.ts",
      "functions/src/auto-series/lib/types.ts",
    ],
    test: (src) =>
      /interface QueueItem[\s\S]+?id:[\s\S]+?angle:[\s\S]+?format:[\s\S]+?enabled:/.test(
        src,
      ),
  },
  {
    title: "PartnerAutoSeries.photoCursor 존재",
    files: [
      "src/types/auto-series.ts",
      "functions/src/auto-series/lib/types.ts",
    ],
    test: (src) => /photoCursor:\s*number/.test(src),
  },
];

async function readSafe(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  let failed = 0;
  for (const check of CHECKS) {
    const results = [];
    for (const f of check.files) {
      const src = await readSafe(f);
      results.push({ file: f, ok: check.test(src) });
    }
    const allOk = results.every((r) => r.ok);
    if (allOk) {
      console.log(`  ✓ ${check.title}`);
    } else {
      const miss = results.filter((r) => !r.ok).map((r) => r.file);
      console.error(
        `  ❌ ${check.title} — failed in:\n     ${miss.join("\n     ")}`,
      );
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} queue mirror check(s) failed.`);
    console.error(
      "   Sync src/lib/auto-series/* + src/types/auto-series.ts with functions/src/auto-series/lib/*.",
    );
    process.exit(1);
  }
  console.log("\n✅ all queue mirror checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
