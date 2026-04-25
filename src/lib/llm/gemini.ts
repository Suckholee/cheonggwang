import "server-only";
import {
  GoogleGenerativeAI,
  type Schema,
} from "@google/generative-ai";
import { AppError } from "@/lib/errors";

const MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-1.5-flash";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface GeminiCall {
  systemInstruction: string;
  prompt: string;
  schema: Schema;
  temperature?: number;
}

const MAX_RETRIES = 3;

export async function callGemini<T>(call: GeminiCall): Promise<T> {
  if (!genAI) {
    throw new AppError(
      "LLM_FAILURE",
      "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다"
    );
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: call.systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: call.schema,
      temperature: call.temperature ?? 0.7,
    },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(call.prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new AppError("LLM_FAILURE", `AI 생성 실패: ${msg}`);
}
