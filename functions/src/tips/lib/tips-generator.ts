import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { checkMarkdownHygiene } from "./hygiene-guard";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.4 functions side mirror.
 *
 * ⚠️ MIRROR of src/lib/llm/tips-generator.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (자주 묻는 질문 + TL;DR 양 패키지).
 *
 * NEW-H2: PARTNER_PROMO_PATTERNS 미적용 (의도적). prompt 규칙으로 광고 단정 회피.
 */

export interface TipTopic {
  id: string;
  label: string;
  category: "bathroom" | "kitchen" | "aircon" | "living" | "move" | "general";
  season?: "spring" | "summer" | "fall" | "winter";
  intent?: "howto" | "guide" | "checklist" | "comparison" | "qa";
  photoless?: boolean;
}

export interface TipComposeArgs {
  topic: TipTopic;
  recentTitles?: string[];
  apiKey?: string;
}

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

function buildTipPrompt(args: TipComposeArgs): string {
  const recentBlock =
    args.recentTitles && args.recentTitles.length > 0
      ? `\n[최근 다룬 주제 — 중복 회피]\n${args.recentTitles
          .slice(0, 10)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}\n`
      : "";
  const seasonHint = args.topic.season
    ? `(${args.topic.season} 시즌 콘텐츠)`
    : "";
  const intentHint = args.topic.intent ? `의도: ${args.topic.intent}` : "";

  return `[주제] ${args.topic.label} ${seasonHint}
[카테고리] ${args.topic.category}
${intentHint}
${recentBlock}
청광 운영진의 톤으로 위 주제에 대한 청소 노하우 글을 쓰세요.

규칙:
- 매장명·전화번호·할인율을 단정하지 않습니다.
- "최저가", "업계 1위", "만족도 100%" 등 단정 광고 표현 금지.
- 청광 외 특정 업체명 직접 언급 X.
- 운영진 톤 — 정보 전달 + 친근 (광고/홍보 톤 X).
- **첫 단락(2-3줄)**: 핵심 메시지를 직설적으로 답변 (TL;DR).
- **H2 헤더**: "OO 비용은?", "어떻게 OO하나요?" 처럼 자연어 질문 형식 1~2개 포함.
- **마지막에 [자주 묻는 질문] 섹션**: \`## 자주 묻는 질문\` + \`### Q1./Q2./Q3.\` 형식 + 답변은 단락으로.
- **구조**: 답변(첫 단락) → 근거(중단 H2들) → 자주 묻는 질문 (마지막).
- FAQ 답변에서도 가격·할인율·전화번호를 사실로 단정하지 않습니다.
- 1500~3000자 한국어 본문 (markdown — h2/h3/p/ul/li/strong 허용).
- 결과를 JSON으로 반환.`;
}

const COMPOSE_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ??
  process.env.GOOGLE_GENERATIVE_AI_MODEL ??
  "gemini-2.5-flash";

export async function composeTipDraft(
  args: TipComposeArgs,
): Promise<TipDraftResult> {
  const apiKey = args.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY 미설정");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
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

export const __testExports = { buildTipPrompt };
