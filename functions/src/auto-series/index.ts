import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { runAutoSeriesTick } from "./runner";

/**
 * v1.13 cycle #26 partner-auto-series · §4.1 — Scheduled Function entry.
 *
 * 매시간 09:00–18:00 KST cron. autoSeries.enabled=true partner의 다음 윈도우에
 * angle/format 라운드 로빈 자동 발행.
 */

if (getApps().length === 0) {
  initializeApp();
}

const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret(
  "GOOGLE_GENERATIVE_AI_API_KEY",
);

export const autoSeriesTick = onSchedule(
  {
    schedule: "every 1 hours from 09:00 to 18:00",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0, // skip-and-continue 정책 (R5)
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY], // H4 결의
  },
  async () => {
    const start = Date.now();
    console.log("[auto-series] tick start", new Date().toISOString());
    try {
      await runAutoSeriesTick(new Date());
    } catch (e) {
      console.error("[auto-series] tick failed", e);
    } finally {
      console.log("[auto-series] tick end", `${Date.now() - start}ms`);
    }
  },
);
