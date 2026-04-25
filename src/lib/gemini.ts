import "server-only";
import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";

export interface GeminiCall {
  systemInstruction: string;
  prompt: string;
  schema: Schema;
  temperature?: number;
}

export interface GeminiClient {
  call<T>(input: GeminiCall): Promise<T>;
}

/**
 * v1.4 #1 provider-promo-content — Gemini 클라이언트.
 * content-research-pipeline `functions/src/research/lib/gemini.ts` copy + env 변경.
 * env: GOOGLE_GENERATIVE_AI_API_KEY · GOOGLE_GENERATIVE_AI_MODEL (default gemini-2.5-flash)
 */
export function createGeminiClient(model?: string): GeminiClient {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("[gemini] GOOGLE_GENERATIVE_AI_API_KEY not set");
  }
  const MODEL =
    model ??
    process.env.GOOGLE_GENERATIVE_AI_MODEL ??
    "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async call<T>(input: GeminiCall): Promise<T> {
      const m = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: input.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: input.schema,
          temperature: input.temperature ?? 0.3,
        },
      });
      const result = await m.generateContent(input.prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    },
  };
}
