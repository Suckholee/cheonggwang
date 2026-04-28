/**
 * v1.17 cycle #30 cleaning-tips-content · §3.4 — buildTipPrompt 추출.
 *
 * tips-generator.ts (server-only) 와 분리하여 tsx 단위 테스트 가능.
 * 의도적으로 외부 의존성 0 (Next.js / server-only / firebase X).
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
}

export function buildTipPrompt(args: TipComposeArgs): string {
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
