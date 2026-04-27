#!/usr/bin/env node
/**
 * cycle #26 partner-auto-series · §1.5 — Option A 미러 동기화 검증 (S18).
 *
 * functions/src/auto-series/lib/{rotation,window,derive-inputs}.ts와
 * src/lib 측 원본 간 핵심 시그니처 일치 검증.
 *
 * 완벽한 byte 일치보다 "핵심 export·signature가 동기화되어 있는지"를 검증.
 *
 * exit 0: 통과 / exit 1: mismatch 발견 (CI에서 fail)
 */
import { readFile } from "node:fs/promises";

const CHECKS = [
  {
    title: "ROTATION_POOL 길이 (10 slot)",
    files: [
      "src/domain/auto-series-rotation-pool.ts",
      "functions/src/auto-series/lib/rotation.ts",
    ],
    pattern: /AUTO_SERIES_ROTATION_POOL[\s\S]+?\];/m,
    extract: (match) => {
      const slots = match[0].match(/\{ angle:/g) ?? [];
      return slots.length;
    },
  },
  {
    title: "AUTO_SERIES_ANGLES (5 angle)",
    files: [
      "src/domain/auto-series-angle.ts",
      "functions/src/auto-series/lib/types.ts",
    ],
    pattern: /AutoSeriesAngle\s*=\s*([^;]+)/,
    extract: (match) => {
      const tokens = match[1].match(/"\w+"/g) ?? [];
      return tokens.sort().join(",");
    },
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
    const values = [];
    for (const f of check.files) {
      const src = await readSafe(f);
      const m = src.match(check.pattern);
      if (!m) {
        console.error(`  ❌ ${check.title} — pattern not found in ${f}`);
        failed++;
        values.push(null);
        continue;
      }
      values.push(check.extract(m));
    }
    const allEqual = values.every((v) => v === values[0]);
    if (allEqual && values[0] !== null) {
      console.log(`  ✓ ${check.title} — ${values[0]}`);
    } else {
      console.error(
        `  ❌ ${check.title} — mismatch: ${JSON.stringify(values)}`,
      );
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} mirror check(s) failed.`);
    console.error(
      "   Sync functions/src/auto-series/lib/* with src/lib·src/domain originals.",
    );
    process.exit(1);
  }
  console.log("\n✅ all auto-series mirror checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
