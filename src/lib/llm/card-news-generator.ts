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
- **각 슬라이드는 \`**굵은 강조 헤드라인 한 줄**\` + 본문 1~2줄 패턴 권장**
  · 굵은 부분은 카드의 노란색 큰 타이포로 렌더링됨 → 짧고 임팩트 있게 (10~25자)
  · 핵심 키워드는 \`*키워드*\` (italic)로 감싸면 형광펜 하이라이트 효과
- 첫 슬라이드: 후크(질문 / 숫자 / 임팩트) — 굵은 강조 필수
- 마지막 슬라이드: CTA (방문 / 문의 / 할인) — 굵은 강조 필수
- 마크다운 헤더(#) 사용 금지 — 슬라이드 자체가 단위
- 리스트(- )는 슬라이드 내부에서 2~4 항목까지 허용
- bodyMarkdown 필드에 위 형식의 텍스트를 그대로 반환

예시 슬라이드:
\`\`\`
**강남 5분, 진짜 일터** 출퇴근 편하고 24시간 보안 출입까지. 스타트업·프리랜서 50곳이 활동 중인 프리미엄 코워킹입니다.
@@SLIDE@@
**월 25만원부터 시작** 오픈 라운지 데스크 *250,000원*, 1인 전용석 *450,000원*. 미팅룸은 시간당 결제로 부담 없이.
@@SLIDE@@
**지금 투어하면 첫 달 30% 할인** 강남역 5분, 24시간 운영. 지금 바로 카카오톡으로 문의하세요.
\`\`\`
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
