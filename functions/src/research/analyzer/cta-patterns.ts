import { SchemaType, type Schema } from "@google/generative-ai";
import type { GeminiClient } from "../lib/gemini";
import type { NormalizedSource } from "../types/source";
import type { CtaPattern } from "../types/insight";

const SYSTEM = `당신은 한국 지역 상권 소상공인 홍보 콘텐츠의 행동 유도 패턴을 분석하는 데이터 분석가입니다.
독자에게 행동을 촉구하는 표현(예약·방문·전화·DM·쿠폰 등)만 추출합니다.
개인정보(전화번호, 이름)는 표본에서 제거·익명화하세요.`;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    patterns: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING },
          example: { type: SchemaType.STRING },
          frequency: { type: SchemaType.NUMBER },
        },
        required: ["type", "example", "frequency"],
      },
    },
  },
  required: ["patterns"],
};

export async function analyzeCtaPatterns(
  samples: NormalizedSource[],
  gemini: GeminiClient
): Promise<CtaPattern[]> {
  if (samples.length === 0) return [];

  const text = samples
    .slice(0, 100)
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const prompt = `다음 ${Math.min(samples.length, 100)}건 샘플에서 독자 행동 유도 표현을 추출하세요.

요청 사항:
- 각 패턴의 type (한국어, 예: '예약', '방문', '전화', 'DM', '쿠폰', '리뷰', '공유')
- example: 실제 등장한 표현 1개 (최대 40자, 개인정보 제거)
- frequency: 샘플 내 등장 빈도 비율 (0~1 사이 소수)
- 상위 5개만 반환

샘플:
${text}`;

  const result = await gemini.call<{ patterns: CtaPattern[] }>({
    systemInstruction: SYSTEM,
    prompt,
    schema: SCHEMA,
  });

  return (result.patterns ?? [])
    .slice(0, 5)
    .map((p) => ({
      type: String(p.type).slice(0, 20),
      example: String(p.example).slice(0, 40),
      frequency: Math.max(0, Math.min(1, Number(p.frequency) || 0)),
    }));
}
