import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { checkMarkdownHygiene } from "./hygiene-guard";
import {
  buildTipPrompt,
  type TipTopic,
  type TipComposeArgs,
} from "@/lib/tips/prompt";

export type { TipTopic, TipComposeArgs };

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.4
 *
 * 청광 운영진 톤 청소 노하우 글 자동 작성 — Gemini 응답 schema 강제 + cycle #28 AEO 패턴.
 *
 * R15: cycle #19 partner-promo-generator 0줄 변경 10번째 — 별도 모듈.
 *
 * NEW-H2: PARTNER_PROMO_PATTERNS 미적용 (의도적). prompt 규칙으로 광고 단정 회피 +
 *         이중 안전망은 기본 hygiene (FAKE_BUSINESS, PII).
 *
 * ⚠️ MIRROR of functions/src/tips/lib/tips-generator.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (자주 묻는 질문 + TL;DR 패턴 양 패키지).
 */

export interface TipDraftResult {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt?: string;
  hygieneScore: number;
  passed: boolean;
  reasons: string[];
}

const composeSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary80: { type: SchemaType.STRING },
    bodyMarkdown: { type: SchemaType.STRING },
    coverImageAlt: { type: SchemaType.STRING },
  },
  required: ["title", "summary80", "bodyMarkdown"],
};

const COMPOSE_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ??
  process.env.GOOGLE_GENERATIVE_AI_MODEL ??
  "gemini-2.5-flash";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function composeTipDraft(
  args: TipComposeArgs,
): Promise<TipDraftResult> {
  if (!genAI) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY 미설정");
  }
  const model = genAI.getGenerativeModel({
    model: COMPOSE_MODEL,
    systemInstruction:
      "당신은 청광 운영진을 위한 청소 노하우 콘텐츠 작가입니다. 정확한 정보 + 친근한 톤으로 글을 쓰며, 광고/홍보 표현은 사용하지 않습니다.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: composeSchema,
      temperature: 0.7,
    },
  });

  const prompt = buildTipPrompt(args);
  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text()) as {
    title: string;
    summary80: string;
    bodyMarkdown: string;
    coverImageAlt?: string;
  };

  // NEW-H2: postType opts 미지정 (PARTNER_PROMO_PATTERNS 미적용 — 의도적).
  // 운영진 톤이지만 prompt 규칙으로 광고 단정 회피 + 이중 안전망은 hygiene
  // 기본 패턴(FAKE_BUSINESS_PATTERNS, PII).
  const hygiene = checkMarkdownHygiene(
    json.bodyMarkdown,
    json.title,
    json.summary80,
  );

  return {
    title: json.title,
    summary80: json.summary80,
    bodyMarkdown: json.bodyMarkdown,
    coverImageAlt: json.coverImageAlt,
    hygieneScore: hygiene.score,
    passed: hygiene.passed,
    reasons: hygiene.reasons,
  };
}

/** RAG anti-drift verification 위해 prompt builder re-export. */
export { buildTipPrompt };
export const __testExports = { buildTipPrompt };
