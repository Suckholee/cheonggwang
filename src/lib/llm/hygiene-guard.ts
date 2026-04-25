import { HYGIENE_KEYWORDS } from "@/domain/constants";
import type { Sections } from "@/types/page";
import type { PostType } from "@/types/post";

export type NonHygieneSection = "hero" | "intro" | "highlights" | "cta";

export interface HygieneViolation {
  section: NonHygieneSection;
  field: string;
  matched: string;
  sample: string;
}

function matchKeyword(text: string): string | null {
  if (!text) return null;
  for (const kw of HYGIENE_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function truncate(s: string, n = 40): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * §1.2 격리 원칙: hero/intro/highlights/cta 어느 필드에도 청결 키워드가
 * 등장해선 안 된다. 위반 섹션 목록을 반환한다.
 */
export function findHygieneViolations(
  sections: Sections
): HygieneViolation[] {
  const violations: HygieneViolation[] = [];

  const heroTitle = matchKeyword(sections.hero.title);
  if (heroTitle)
    violations.push({
      section: "hero",
      field: "title",
      matched: heroTitle,
      sample: truncate(sections.hero.title),
    });
  const heroSub = matchKeyword(sections.hero.subtitle);
  if (heroSub)
    violations.push({
      section: "hero",
      field: "subtitle",
      matched: heroSub,
      sample: truncate(sections.hero.subtitle),
    });

  const intro = matchKeyword(sections.intro.body);
  if (intro)
    violations.push({
      section: "intro",
      field: "body",
      matched: intro,
      sample: truncate(sections.intro.body),
    });

  sections.highlights.items.forEach((item, idx) => {
    const m = matchKeyword(item);
    if (m)
      violations.push({
        section: "highlights",
        field: `items[${idx}]`,
        matched: m,
        sample: truncate(item),
      });
  });

  const cta = matchKeyword(sections.cta.label);
  if (cta)
    violations.push({
      section: "cta",
      field: "label",
      matched: cta,
      sample: truncate(sections.cta.label),
    });

  return violations;
}

/**
 * 어느 섹션을 재생성해야 하는지 (중복 제거).
 */
export function violatingSections(
  violations: HygieneViolation[]
): NonHygieneSection[] {
  const set = new Set<NonHygieneSection>();
  for (const v of violations) set.add(v.section);
  return Array.from(set);
}

/**
 * v1.7 — partner-promo 마크다운 본문용 hygiene (이전 customer-story 흐름의 후속).
 * HYGIENE_KEYWORDS 재사용 + PII / 가짜 업체명 / 전화번호 / 할인율 패턴 + partner-promo 광고 단정.
 * 임계 0.7 이상 통과.
 */
export interface MarkdownHygieneResult {
  score: number;
  reasons: string[];
  passed: boolean;
}

const FAKE_BUSINESS_PATTERNS: readonly RegExp[] = [
  /\([가-힣]{2,10}\s?청소\)/,
  /[0-9]{2,4}-[0-9]{3,4}-[0-9]{4}/,
  /[0-9]{1,3}\s?%\s?할인/,
];

const PII_PATTERNS: readonly RegExp[] = [
  /[0-9]{6}-[0-9]{7}/, // 주민번호
];

/**
 * v1.7 partner-promo · §4.3 — partner-promo 전용 추가 패턴.
 * 자체 광고 단정 표현 차단 ("최저가", "업계 1위", "만족도 100%" 등).
 */
const PARTNER_PROMO_PATTERNS: readonly RegExp[] = [
  /(최저가|최저\s?가격)/,
  /(업계\s?1위|업계\s?최고)/,
  /(만족도\s?100\s?%|100\s?%\s?보장)/,
  /(절대\s?(?:실패|후회)\s?없)/,
];

/**
 * 마크다운 본문 + 제목 + 요약을 합쳐 검사.
 * 점수 계산: reasons 당 0.25 감점 · [0, 1] clamp.
 * 0.7 이상 통과.
 *
 * v1.7: 선택적 4번째 인자로 postType을 받아 partner-promo 시 추가 패턴 적용.
 *   기본 시그니처(positional 3-arg)는 변경되지 않음 — 기존 호출자 호환.
 */
export function checkMarkdownHygiene(
  body: string,
  title: string,
  summary: string,
  opts?: { postType?: PostType },
): MarkdownHygieneResult {
  const all = `${title}\n${summary}\n${body}`;
  const reasons: string[] = [];

  for (const kw of HYGIENE_KEYWORDS) {
    if (all.includes(kw)) reasons.push(`hygiene:${kw}`);
  }
  for (const p of FAKE_BUSINESS_PATTERNS) {
    if (p.test(all)) reasons.push("fake-business");
  }
  for (const p of PII_PATTERNS) {
    if (p.test(all)) reasons.push("pii");
  }
  if (opts?.postType === "partner-promo") {
    for (const p of PARTNER_PROMO_PATTERNS) {
      if (p.test(all)) reasons.push("promo-overclaim");
    }
  }

  const score = Math.max(0, 1 - reasons.length * 0.25);
  return { score, reasons, passed: score >= 0.7 };
}
