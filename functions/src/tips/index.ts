import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { runTipsTick } from "./runner";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.2 — Scheduled Function entry.
 *
 * NEW-H6 — autoSeriesTick(매시간 정각)와 30분 offset으로 cron 충돌 회피.
 *   schedule: "30 9-17 * * *" → 9:30, 10:30, ..., 17:30 KST.
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
    // NEW-H6 — autoSeriesTick과 30분 offset (cron syntax — every X hours from 미사용)
    schedule: "30 9-17 * * *",
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
