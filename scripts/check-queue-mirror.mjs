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
  // v1.15 cycle #28 partner-aeo-boost (C1+H7 결의)
  {
    title: "setKstClock host TZ 무관 (Date.UTC 사용 + setHours 금지)",
    files: [
      "src/lib/partner/auto-publish-window.ts",
      "functions/src/auto-series/lib/window.ts",
    ],
    test: (src) =>
      /Date\.UTC\(/.test(src) && !/\.setHours\(/.test(src),
  },
  {
    title: "toKstWallClock 두 패키지 모두 export",
    files: [
      "src/lib/partner/auto-publish-window.ts",
      "functions/src/auto-series/lib/window.ts",
    ],
    test: (src) => /export function toKstWallClock/.test(src),
  },
  // v1.16 cycle #29 partner-editorial-oversight (N4 stricter regex)
  {
    title: "PartnerAutoSeries.publishMode + PublishMode type 양 패키지",
    files: [
      "src/types/auto-series.ts",
      "functions/src/auto-series/lib/types.ts",
    ],
    test: (src) =>
      /publishMode\s*:\s*PublishMode/.test(src) &&
      /export type PublishMode\s*=/.test(src),
  },
  {
    title: "PartnerAutoSeries.targetAudience 양 패키지",
    files: [
      "src/types/auto-series.ts",
      "functions/src/auto-series/lib/types.ts",
    ],
    test: (src) => /targetAudience\s*:\s*string\s*\|\s*null/.test(src),
  },
  // v1.17 cycle #30 cleaning-tips-content (5 신규 mirror check)
  {
    title: "tips-generator AEO 패턴 (FAQ + TL;DR) 양 패키지",
    files: [
      "src/lib/llm/tips-generator.ts",
      "functions/src/tips/lib/tips-generator.ts",
    ],
    test: (src) =>
      /자주\s*묻는\s*질문/.test(src) && /TL;DR|첫\s*단락/.test(src),
  },
  {
    title: "TIPS_TOPIC_POOL 양 패키지 동일 export",
    files: [
      "src/lib/tips/topic-pool.ts",
      "functions/src/tips/lib/topic-pool.ts",
    ],
    test: (src) => /export const TIPS_TOPIC_POOL/.test(src),
  },
  {
    title: "STOCK_IMAGES 양 패키지 동일 export (NEW C3)",
    files: [
      "src/lib/tips/stock-images.ts",
      "functions/src/tips/lib/stock-images.ts",
    ],
    test: (src) => /pickStockImage|STOCK_IMAGES/.test(src),
  },
  {
    title: "inferCategoriesFromTopic 양 패키지 (NEW C2)",
    files: [
      "src/lib/tips/infer-categories.ts",
      "functions/src/tips/lib/infer-categories.ts",
    ],
    test: (src) => /export function inferCategoriesFromTopic/.test(src),
  },
  {
    title: "today-kst 양 패키지 (NEW C1)",
    files: [
      "src/lib/tips/today-kst.ts",
      "functions/src/tips/lib/today-kst.ts",
    ],
    test: (src) =>
      /getTodayKstStart/.test(src) && /currentKstSeason/.test(src),
  },
  // v1.18 cycle #31 tips-admin-config (3 신규 mirror check)
  {
    // cycle #32 갱신 (R-H1·R-M3) — TipsScheduleConfig literal 추가 검증
    title:
      "tips-config TipsAutoConfig + TipsScheduleConfig 양 패키지 (cycle #31·32)",
    files: [
      "src/lib/tips/tips-config.ts",
      "functions/src/tips/lib/tips-config.ts",
    ],
    test: (src) =>
      /TipsAutoConfig/.test(src) && /TipsScheduleConfig/.test(src),
  },
  {
    title:
      "dynamic-topic-pool fetchActiveTopicPool + pickNextTopicFromPool 양 패키지 (C2)",
    files: [
      "src/lib/tips/dynamic-topic-pool.ts",
      "functions/src/tips/lib/dynamic-topic-pool.ts",
    ],
    test: (src) =>
      /fetchActiveTopicPool/.test(src) && /pickNextTopicFromPool/.test(src),
  },
  {
    // cycle #32 갱신 (R-M3) — 6 literal → 7 literal (skip-out-of-schedule 추가)
    title: "TipsTickStatus 7 literal 양 패키지 (C3 — drift 방지, cycle #32)",
    files: [
      "src/lib/tips/tips-config.ts",
      "functions/src/tips/lib/tips-history.ts",
    ],
    test: (src) =>
      /published-draft/.test(src) &&
      /skip-disabled/.test(src) &&
      /skip-already-today/.test(src) &&
      /skip-no-topic/.test(src) &&
      /compose-fail/.test(src) &&
      /hygiene-fail/.test(src) &&
      /skip-out-of-schedule/.test(src),
  },
  // v1.19 cycle #32 tips-schedule-editor (2 신규 mirror check)
  {
    title:
      "schedule-gate shouldTickNow + :30 invariant 양 패키지 (NEW cycle #32)",
    files: [
      "src/lib/tips/schedule-gate.ts",
      "functions/src/tips/lib/schedule-gate.ts",
    ],
    test: (src) => /shouldTickNow/.test(src) && /minutes !== 30/.test(src),
  },
  {
    title:
      "next-tick-time calculateNextTickTime 양 패키지 (NEW cycle #32 mirror)",
    files: [
      "src/lib/tips/next-tick-time.ts",
      "functions/src/tips/lib/next-tick-time.ts",
    ],
    test: (src) => /calculateNextTickTime/.test(src),
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
