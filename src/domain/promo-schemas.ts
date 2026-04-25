import { z } from "zod";
import type { Schema } from "@google/generative-ai";

export const BRAND_TONES = ["friendly", "professional", "playful"] as const;
export type BrandToneEnum = (typeof BRAND_TONES)[number];

export const updatePromoSettingsInputSchema = z.object({
  brandTone: z.enum(BRAND_TONES),
  slogan: z
    .string()
    .trim()
    .min(1, "슬로건을 입력해 주세요")
    .max(40, "40자 이하로 작성해 주세요"),
});
export type UpdatePromoSettingsInput = z.infer<
  typeof updatePromoSettingsInputSchema
>;

export const PROVIDER_STORY_CATEGORIES = [
  "field",
  "howto",
  "gear",
  "life",
] as const;
export type ProviderStoryCategoryEnum =
  (typeof PROVIDER_STORY_CATEGORIES)[number];

export const createPromoPostInputSchema = z.object({
  topicHint: z
    .string()
    .trim()
    .max(60, "60자 이하로 작성해 주세요")
    .nullable(),
  storyCategory: z.enum(PROVIDER_STORY_CATEGORIES),
});
export type CreatePromoPostInput = z.infer<typeof createPromoPostInputSchema>;

// v1.6 (post-merge): 카테고리별 프롬프트로 변경하면서 body 최소길이 700자로 상향 —
// 기존 Flash 모델이 400~500자만 뽑던 문제 대응.
export const geminiPostOutputSchema = z.object({
  title: z.string().min(1).max(80),
  bodyMarkdown: z.string().min(700).max(5000),
  summary80: z.string().min(10).max(120),
});
export type GeminiPostOutput = z.infer<typeof geminiPostOutputSchema>;

/** Gemini generationConfig.responseSchema 전달용 */
export const geminiPostResponseSchema: Schema = {
  type: "object" as never,
  properties: {
    title: { type: "string" as never, description: "블로그 제목 (20-50자)" },
    bodyMarkdown: {
      type: "string" as never,
      description:
        "Markdown 본문 (h2/h3/p/ul/li/strong/em/a/br · 한국어 800-1200자)",
    },
    summary80: {
      type: "string" as never,
      description: "피드 카드용 80자 내외 요약 (영업 멘트 금지)",
    },
  },
  required: ["title", "bodyMarkdown", "summary80"],
};
