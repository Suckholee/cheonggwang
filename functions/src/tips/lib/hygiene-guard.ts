/**
 * v1.17 cycle #30 cleaning-tips-content · §3.9 (NEW-C4 OQ9 결의 — Option 2 채택)
 *
 * tips 전용 hygiene mirror — auto-series/lib/generator.ts의 자체 hygiene 패턴 0줄 변경 보존
 * (R1 streak 기여). PostType 옵션 미사용 (tip 전용, partner-promo 패턴 X).
 *
 * ⚠️ MIRROR of src/lib/llm/hygiene-guard.ts checkMarkdownHygiene 핵심 로직만 — keep in sync.
 *    CI lint: 양 패키지 일관성은 향후 cycle #31+ 추가 검증.
 */

const FAKE_BUSINESS_PATTERNS: readonly RegExp[] = [
  /\([가-힣]{2,10}\s?청소\)/,
  /[0-9]{2,4}-[0-9]{3,4}-[0-9]{4}/,
  /[0-9]{1,3}\s?%\s?할인/,
];

const PII_PATTERNS: readonly RegExp[] = [
  /[0-9]{6}-[0-9]{7}/, // 주민번호
];

export interface MarkdownHygieneResult {
  score: number;
  reasons: string[];
  passed: boolean;
}

export function checkMarkdownHygiene(
  body: string,
  title: string,
  summary: string,
): MarkdownHygieneResult {
  const all = `${title}\n${summary}\n${body}`;
  const reasons: string[] = [];
  for (const re of FAKE_BUSINESS_PATTERNS) {
    if (re.test(all)) reasons.push("fake-business");
  }
  for (const re of PII_PATTERNS) {
    if (re.test(all)) reasons.push("pii");
  }
  const score = Math.max(0, 1 - reasons.length * 0.25);
  return { score, reasons, passed: score >= 0.7 };
}
