import type { Schema } from "@google/generative-ai";

/**
 * v1.12 cycle #25 partner-content-formats · §3.2.
 *
 * 카드뉴스 형식 system instruction + post-process 검증 + composeSchema patch.
 *
 * Sentinel: `\n@@SLIDE@@\n` (M2 결의 — markdown HR과 충돌 회피)
 */

const CARD_NEWS_SCHEMA_DESC =
  "6~10개 슬라이드를 '\\n@@SLIDE@@\\n'으로 구분한 카드뉴스 본문. " +
  "각 슬라이드 80~150자 내외. 마크다운 헤더(#) 사용 금지.";

export const CARD_NEWS_INSTRUCTION = `

[형식: 카드뉴스]
- 6~10개 슬라이드 구성. 각 슬라이드는 다음 라인에 \`@@SLIDE@@\`만 적은 줄로 구분
- 슬라이드별 80–150자, 한 가지 핵심 메시지만
- 첫 슬라이드: 후크(질문 / 숫자 / 임팩트)
- 마지막 슬라이드: CTA (방문 / 문의 / 할인)
- 마크다운 헤더(#) 사용 금지 — 슬라이드 자체가 단위
- bodyMarkdown 필드에 위 형식의 텍스트를 그대로 반환
`;

export function buildCardNewsInstruction(): string {
  return CARD_NEWS_INSTRUCTION;
}

/**
 * card-news 본문 검증 (post-process).
 * - 슬라이드 4~12개
 * - 각 슬라이드 250자 이하
 */
export function validateCardNewsBody(body: string): {
  ok: boolean;
  slides: string[];
  reason?: string;
} {
  const slides = body
    .split(/\n[ \t]*@@SLIDE@@[ \t]*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (slides.length < 4) {
    return { ok: false, slides, reason: "슬라이드 4개 미만" };
  }
  if (slides.length > 12) {
    return { ok: false, slides, reason: "슬라이드 12개 초과" };
  }
  if (slides.some((s) => s.length > 250)) {
    return { ok: false, slides, reason: "슬라이드 길이 초과" };
  }
  return { ok: true, slides };
}

/**
 * composeSchema의 bodyMarkdown.description을 카드뉴스용으로 교체 (M6 결의).
 * 기존 schema는 mutation 없이 새 객체 반환.
 *
 * 타입 가드: 입력 schema는 ObjectSchema 형태(properties 보유)여야 함.
 * 그렇지 않으면 원본 그대로 반환.
 */
export function patchComposeSchemaForCardNews(schema: Schema): Schema {
  // Gemini SDK Schema는 union type — Object 형태일 때만 properties 존재
  const obj = schema as unknown as {
    properties?: Record<string, unknown>;
    [k: string]: unknown;
  };
  if (!obj.properties) return schema;
  const bodyMd = (obj.properties.bodyMarkdown ?? {}) as Record<string, unknown>;
  return {
    ...obj,
    properties: {
      ...obj.properties,
      bodyMarkdown: {
        ...bodyMd,
        description: CARD_NEWS_SCHEMA_DESC,
      },
    },
  } as unknown as Schema;
}
