import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { runTipsTick } from "./runner";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.2 — Scheduled Function entry.
 * v1.19 cycle #32 tips-schedule-editor · §3.10 — wide cron 24/일 발화로 변경.
 *   실 발행은 runner의 shouldTickNow gate (Firestore admin schedule 기반)가 결정.
 *
 * NEW-H6 — autoSeriesTick(:00 매시간) ↔ tipsTick(:30 매시간) offset 영구 보존.
 *   cycle #30: schedule "30 9-17 * * *" (9-tick/일) → cycle #32: "30 * * * *" (24-tick/일).
 *   :30 minutes invariant는 cron 자체가 보장 + runner gate(`minutes !== 30 → false`)
 *   런타임에서 이중 강제.
 * R16 — 항상 'draft' 시작 (admin 검토 필수).
 * 일일 1건 제한은 runner.ts 안에서 KST 자정 기준 query.
 */

if (getApps().length === 0) {
  initializeApp();
}

const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret(
  "GOOGLE_GENERATIVE_AI_API_KEY",
);

export const tipsTick = onSchedule(
  {
    // NEW-H6 cycle #32 — wide cron 24/일 발화. 실 발행은 runner의 shouldTickNow gate가 결정.
    //   :30 minutes는 NEW-H6 invariant (autoSeriesTick :00 vs tipsTick :30 영구 offset).
    schedule: "30 * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0, // skip-and-continue 정책
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY],
  },
  async () => {
    const start = Date.now();
    console.log("[tips] tick start", new Date().toISOString());
    try {
      await runTipsTick(new Date());
    } catch (e) {
      console.error("[tips] tick failed", e);
    } finally {
      console.log("[tips] tick end", `${Date.now() - start}ms`);
    }
  },
);
