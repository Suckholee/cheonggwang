import { SchemaType, type Schema } from "@google/generative-ai";
import type { GeminiClient } from "../lib/gemini";
import type { NormalizedSource } from "../types/source";
import type { ToneProfile } from "../types/insight";

const SYSTEM = `당신은 한국 지역 상권 소상공인 홍보 콘텐츠의 톤을 분석하는 데이터 분석가입니다.
주어진 샘플의 평균적·다수결 톤 특성을 추출합니다.
주관적 평가 금지, 관찰 가능한 특성만.`;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    politenessLevel: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["formal", "casual"],
    },
    emojiDensity: { type: SchemaType.NUMBER },
    avgSentenceLength: { type: SchemaType.NUMBER },
  },
  required: ["politenessLevel", "emojiDensity", "avgSentenceLength"],
};

export async function analyzeToneProfile(
  samples: NormalizedSource[],
  gemini: GeminiClient
): Promise<ToneProfile> {
  if (samples.length === 0) {
    return {
      politenessLevel: "formal",
      emojiDensity: 0,
      avgSentenceLength: 0,
    };
  }

  const text = samples
    .slice(0, 100)
    .map((s) => `${s.title} ${s.snippet}`)
    .join("\n");

  const prompt = `다음 한국어 블로그 ${Math.min(samples.length, 100)}건 샘플에서 평균적 톤을 분석:
- politenessLevel: 'formal' (존댓말 우세) 또는 'casual' (반말·구어 우세)
- emojiDensity: 100자당 이모지 평균 개수 (소수점 2자리)
- avgSentenceLength: 평균 문장 길이 (한글 음절 기준, 정수)

샘플:
${text}`;

  const result = await gemini.call<ToneProfile>({
    systemInstruction: SYSTEM,
    prompt,
    schema: SCHEMA,
  });

  return {
    politenessLevel: result.politenessLevel === "casual" ? "casual" : "formal",
    emojiDensity: Math.max(0, Number(result.emojiDensity) || 0),
    avgSentenceLength: Math.max(0, Math.round(Number(result.avgSentenceLength) || 0)),
  };
}
