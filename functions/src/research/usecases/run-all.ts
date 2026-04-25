import type { Firestore } from "firebase-admin/firestore";
import type { GeminiClient } from "../lib/gemini";
import type { CategoryRunSummary, EmailConfig } from "../writers/email-notifier";
import { sendWeeklyReport } from "../writers/email-notifier";
import { CATEGORIES } from "../types/shared";
import { runSingleCategory, type SingleRunConfig } from "./run-single";
import { weekKeyOf } from "../lib/week-key";

export interface AllRunConfig extends SingleRunConfig {
  email: EmailConfig;
}

/**
 * 업종 3개를 독립적으로 실행한 뒤 요약 이메일 1건 발송.
 * 한 카테고리 실패가 나머지를 막지 않도록 Promise.allSettled 사용.
 */
export async function runAllCategories(
  config: AllRunConfig,
  db: Firestore,
  gemini: GeminiClient,
  weekKey: string = weekKeyOf()
): Promise<CategoryRunSummary[]> {
  const settled = await Promise.allSettled(
    CATEGORIES.map((category) =>
      runSingleCategory(category, weekKey, config, db, gemini)
    )
  );

  const results: CategoryRunSummary[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      results.push(s.value);
    } else {
      console.error(
        `runSingleCategory failed for ${CATEGORIES[i]}:`,
        s.reason
      );
    }
  });

  if (results.length > 0) {
    try {
      await sendWeeklyReport(config.email, weekKey, results);
    } catch (e) {
      console.error("sendWeeklyReport failed:", e);
    }
  }

  return results;
}
