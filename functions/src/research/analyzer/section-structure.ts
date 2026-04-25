import { SchemaType, type Schema } from "@google/generative-ai";
import type { GeminiClient } from "../lib/gemini";
import type { NormalizedSource } from "../types/source";
import type { SectionStructureInsight } from "../types/insight";
import { SECTION_TYPES, type SectionType } from "../types/shared";

const SYSTEM = `당신은 한국 지역 상권 소상공인 홍보 콘텐츠를 분석하는 데이터 분석가입니다.
주어진 블로그/게시물 샘플을 분석하여 정확한 JSON schema로만 응답합니다.
주관적 평가·광고 문구 금지. 데이터 분포와 구조만 추출하세요.`;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    commonOrder: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        format: "enum",
        enum: [...SECTION_TYPES] as string[],
      },
    },
    lengthDistribution: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        SECTION_TYPES.map((s) => [
          s,
          {
            type: SchemaType.OBJECT,
            properties: {
              p50: { type: SchemaType.NUMBER },
              p90: { type: SchemaType.NUMBER },
            },
          },
        ])
      ),
    },
    sampleCount: { type: SchemaType.INTEGER },
  },
  required: ["commonOrder", "sampleCount"],
};

function formatSamples(samples: NormalizedSource[]): string {
  return samples
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\n${s.snippet}${s.body ? `\n${s.body.slice(0, 300)}` : ""}`
    )
    .join("\n\n---\n\n");
}

export async function analyzeSectionStructure(
  samples: NormalizedSource[],
  gemini: GeminiClient
): Promise<SectionStructureInsight> {
  if (samples.length === 0) {
    return { commonOrder: [], lengthDistribution: {}, sampleCount: 0 };
  }

  const prompt = `다음 한국어 블로그 ${samples.length}건 샘플을 분석해 공통 섹션 구조를 추출하세요.
섹션 타입은 다음 enum 중에서만 선택: ${SECTION_TYPES.join(", ")}

- commonOrder: 가장 빈번한 섹션 순서 (없는 섹션은 생략)
- lengthDistribution: 각 섹션별 평균 글자 수 p50(중앙값)·p90
- sampleCount: 실제 분석한 샘플 수

샘플:
${formatSamples(samples)}`;

  const result = await gemini.call<{
    commonOrder: string[];
    lengthDistribution?: Record<string, { p50: number; p90: number }>;
    sampleCount: number;
  }>({
    systemInstruction: SYSTEM,
    prompt,
    schema: SCHEMA,
  });

  const validOrder = result.commonOrder.filter((s): s is SectionType =>
    (SECTION_TYPES as readonly string[]).includes(s)
  );
  const validDistribution: SectionStructureInsight["lengthDistribution"] = {};
  if (result.lengthDistribution) {
    for (const [key, value] of Object.entries(result.lengthDistribution)) {
      if ((SECTION_TYPES as readonly string[]).includes(key)) {
        validDistribution[key as SectionType] = value;
      }
    }
  }

  return {
    commonOrder: validOrder,
    lengthDistribution: validDistribution,
    sampleCount: result.sampleCount,
  };
}
