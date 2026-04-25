import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { CATEGORIES, type Category } from "./types/shared";
import { runAllCategories } from "./usecases/run-all";
import { runSingleCategory } from "./usecases/run-single";
import { getAdminDb } from "./lib/firestore-admin";
import { createGeminiClient } from "./lib/gemini";
import { weekKeyOf } from "./lib/week-key";

const NAVER_CLIENT_ID = defineSecret("NAVER_CLIENT_ID");
const NAVER_CLIENT_SECRET = defineSecret("NAVER_CLIENT_SECRET");
const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret("GOOGLE_GENERATIVE_AI_API_KEY");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const SECRETS = [
  NAVER_CLIENT_ID,
  NAVER_CLIENT_SECRET,
  GOOGLE_GENERATIVE_AI_API_KEY,
  RESEND_API_KEY,
];

const COMMON_OPTIONS = {
  region: "asia-northeast3" as const,
  memory: "1GiB" as const,
  timeoutSeconds: 3600,
  secrets: SECRETS,
};

function buildAllRunConfig() {
  return {
    naverCreds: {
      id: NAVER_CLIENT_ID.value(),
      secret: NAVER_CLIENT_SECRET.value(),
    },
    email: {
      apiKey: RESEND_API_KEY.value(),
      from: process.env.EMAIL_FROM ?? "research-pipeline@cheonggwang.local",
      to: process.env.OPERATOR_EMAIL ?? "operator@cheonggwang.local",
    },
  };
}

export const runResearchPipeline = onSchedule(
  {
    ...COMMON_OPTIONS,
    schedule: "0 9 * * 1",
    timeZone: "Asia/Seoul",
  },
  async () => {
    const db = getAdminDb();
    const gemini = createGeminiClient(GOOGLE_GENERATIVE_AI_API_KEY.value());
    await runAllCategories(buildAllRunConfig(), db, gemini);
  }
);

export const rerunResearchCategory = onCall<{
  category: Category;
  weekKey?: string;
}>(
  { ...COMMON_OPTIONS },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "admin only");
    }
    const { category, weekKey } = request.data;
    if (!CATEGORIES.includes(category)) {
      throw new HttpsError("invalid-argument", `unknown category: ${category}`);
    }
    const db = getAdminDb();
    const gemini = createGeminiClient(GOOGLE_GENERATIVE_AI_API_KEY.value());
    const config = {
      naverCreds: {
        id: NAVER_CLIENT_ID.value(),
        secret: NAVER_CLIENT_SECRET.value(),
      },
    };
    return runSingleCategory(
      category,
      weekKey ?? weekKeyOf(),
      config,
      db,
      gemini
    );
  }
);
