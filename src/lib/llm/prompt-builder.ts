import { SchemaType, type Schema } from "@google/generative-ai";
import type { GeminiCall } from "./gemini";
import type { Page } from "@/types/page";
import type { CategoryTemplate } from "@/lib/templates/types";
import { CATEGORY_LABELS, HYGIENE_KEYWORDS, SECTION_MAX_LENGTHS } from "@/domain/constants";
import { ALL_TAGS } from "@/domain/tags";

export type GenSectionKey = "hero" | "intro" | "highlights" | "cta" | "hygiene" | "tags";

export interface PromptBuilderContext {
  page: Page;
  template: CategoryTemplate;
  trendKeywords: string[];
  isPartner: boolean;
  partnerCleaningFrequency?: string;
}

export interface SectionGenPrompt<T> {
  section: GenSectionKey;
  call: GeminiCall;
  parse: (raw: unknown) => T;
}

export interface GeneratedHero {
  title: string;
  subtitle: string;
}
export interface GeneratedIntro {
  body: string;
}
export interface GeneratedHighlights {
  items: string[];
}
export interface GeneratedHygiene {
  body: string;
}
export interface GeneratedCta {
  label: string;
  link: string;
}

export interface GeneratedTags {
  tags: string[];
}

const MARKETING_SYSTEM = `당신은 한국 지역 상권 소상공인의 홍보글 작가입니다.
업종 표준 마케팅 톤으로 간결하고 매력적인 문구를 작성합니다.

원칙:
1. 과장·허위 표현 금지
2. 존댓말 사용
3. 이모지는 섹션당 최대 1개
4. 주어진 JSON schema 형태로만 응답
5. 다음 어휘는 절대 사용 금지 (이 섹션은 일반 마케팅 섹션입니다): ${HYGIENE_KEYWORDS.join(", ")}`;

const HYGIENE_SYSTEM = `당신은 한국 지역 상권 소상공인의 홍보글 작가입니다.
이 섹션은 "위생 안심" 섹션으로, 청결·위생·방역 관련 어휘 사용이 허용되고 권장됩니다.

원칙:
1. 과장 금지, 담백한 톤
2. 존댓말 사용
3. "청광 파트너" 표현을 자연스럽게 1회 포함
4. 주기 정보가 주어지면 활용
5. 주어진 JSON schema 형태로만 응답`;

function commonCtx(ctx: PromptBuilderContext): string {
  return `업체명: ${ctx.page.businessName}
업종: ${(CATEGORY_LABELS as Record<string, string>)[ctx.page.category] || ctx.page.category}
주소: ${ctx.page.address}
주요 특징/키포인트: ${ctx.page.keyPoints.filter(Boolean).join(" / ") || "(미입력)"}
트렌드 키워드(참고): ${ctx.trendKeywords.slice(0, 8).join(", ")}

업종 톤 가이드:
${ctx.template.toneGuidelines.map((g) => `- ${g}`).join("\n")}`;
}

// ─── hero ──────────────────────────────────────────────────────────────────
const heroSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    subtitle: { type: SchemaType.STRING },
  },
  required: ["title", "subtitle"],
};

export function buildHeroPrompt(
  ctx: PromptBuilderContext
): SectionGenPrompt<GeneratedHero> {
  return {
    section: "hero",
    call: {
      systemInstruction: MARKETING_SYSTEM,
      prompt: `${commonCtx(ctx)}

요청: 히어로 섹션 — title(${SECTION_MAX_LENGTHS.heroTitle}자 이내) + subtitle(${SECTION_MAX_LENGTHS.heroSubtitle}자 이내)
섹션 지침: ${ctx.template.sections.hero.promptHint}`,
      schema: heroSchema,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedHero>;
      return {
        title: String(j.title ?? "").slice(0, SECTION_MAX_LENGTHS.heroTitle),
        subtitle: String(j.subtitle ?? "").slice(0, SECTION_MAX_LENGTHS.heroSubtitle),
      };
    },
  };
}

// ─── intro ─────────────────────────────────────────────────────────────────
const introSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: { body: { type: SchemaType.STRING } },
  required: ["body"],
};

export function buildIntroPrompt(
  ctx: PromptBuilderContext
): SectionGenPrompt<GeneratedIntro> {
  return {
    section: "intro",
    call: {
      systemInstruction: MARKETING_SYSTEM,
      prompt: `${commonCtx(ctx)}

요청: 소개 섹션 — body(${SECTION_MAX_LENGTHS.introBody}자 이내의 한 문단)
섹션 지침: ${ctx.template.sections.intro.promptHint}`,
      schema: introSchema,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedIntro>;
      return { body: String(j.body ?? "").slice(0, SECTION_MAX_LENGTHS.introBody) };
    },
  };
}

// ─── highlights ────────────────────────────────────────────────────────────
const highlightsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["items"],
};

export function buildHighlightsPrompt(
  ctx: PromptBuilderContext
): SectionGenPrompt<GeneratedHighlights> {
  return {
    section: "highlights",
    call: {
      systemInstruction: MARKETING_SYSTEM,
      prompt: `${commonCtx(ctx)}

요청: 특징 섹션 — items 배열(정확히 3개, 각 ${SECTION_MAX_LENGTHS.highlightItem}자 이내)
섹션 지침: ${ctx.template.sections.highlights.promptHint}`,
      schema: highlightsSchema,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedHighlights>;
      const items = Array.isArray(j.items) ? j.items : [];
      return {
        items: items
          .slice(0, 3)
          .map((s) => String(s).slice(0, SECTION_MAX_LENGTHS.highlightItem)),
      };
    },
  };
}

// ─── cta ───────────────────────────────────────────────────────────────────
const ctaSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    label: { type: SchemaType.STRING },
    link: { type: SchemaType.STRING },
  },
  required: ["label", "link"],
};

export function buildCtaPrompt(
  ctx: PromptBuilderContext
): SectionGenPrompt<GeneratedCta> {
  const telLink = `tel:${ctx.page.phone.replace(/-/g, "")}`;
  return {
    section: "cta",
    call: {
      systemInstruction: MARKETING_SYSTEM,
      prompt: `${commonCtx(ctx)}
제공된 전화번호: ${ctx.page.phone}

요청: CTA 섹션 — label(${SECTION_MAX_LENGTHS.ctaLabel}자 이내의 버튼 문구), link(반드시 "${telLink}" 사용)
섹션 지침: ${ctx.template.sections.cta.promptHint}`,
      schema: ctaSchema,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedCta>;
      return {
        label: String(j.label ?? "").slice(0, SECTION_MAX_LENGTHS.ctaLabel),
        // link는 서버에서 보장 — LLM 출력이 이상하면 전화 링크로 고정
        link:
          typeof j.link === "string" && (j.link.startsWith("tel:") || j.link.startsWith("http"))
            ? j.link
            : telLink,
      };
    },
  };
}

// ─── hygiene (partner only) ────────────────────────────────────────────────
const hygieneSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: { body: { type: SchemaType.STRING } },
  required: ["body"],
};

export function buildHygienePrompt(
  ctx: PromptBuilderContext
): SectionGenPrompt<GeneratedHygiene> {
  const freq = ctx.partnerCleaningFrequency ?? "정기";
  return {
    section: "hygiene",
    call: {
      systemInstruction: HYGIENE_SYSTEM,
      prompt: `업체명: ${ctx.page.businessName}
업종: ${(CATEGORY_LABELS as Record<string, string>)[ctx.page.category] || ctx.page.category}
청광 청소 주기: ${freq}

요청: 위생 안심 섹션 — body(${SECTION_MAX_LENGTHS.hygieneBody}자 이내의 한 문단)
섹션 지침: ${ctx.template.sections.hygiene.promptHint}
주기 표현을 자연스럽게 섞어 담백하게 작성하세요. "청광 파트너" 표현을 1회 포함하세요.`,
      schema: hygieneSchema,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedHygiene>;
      return { body: String(j.body ?? "").slice(0, SECTION_MAX_LENGTHS.hygieneBody) };
    },
  };
}

// ─── tags (promo-feed v1) ──────────────────────────────────────────────────
//
// 생성 완료된 섹션 내용과 업체 정보를 바탕으로 ALL_TAGS(16) 중 3~5개를 추출.
// §1.2 hygiene 격리 유지: 청결 어휘는 ALL_TAGS에 없으며 system instruction 에서도 금지 명시.
// 서버 2차 방어는 src/domain/tags.ts sanitizeTags에서 수행.

const TAG_SYSTEM = `당신은 한국 지역 상권 마케팅 태그를 선별하는 분석가입니다.
아래 고정된 ALL_TAGS 중에서만 3~5개를 선택하세요.
주관적 평가·창작 금지, 주어진 섹션 내용에서 직접 뒷받침되는 태그만.

원칙:
1. ALL_TAGS 외 용어 절대 금지
2. 청결·위생·방역·살균·청소·세척·소독 관련 태그는 ALL_TAGS에 없음 — 절대 포함 금지
3. 서로 상충하는 태그 병용 금지 (예: #조용한 + #활기찬)
4. JSON schema { tags: string[] } 형태로만 응답`;

// MIN-4 fix: 단일 소스화 — domain/tags.ts의 ALL_TAGS(readonly string[]) 를
// 스프레드로 mutable string[]으로 변환해 Gemini schema enum에 주입.
const TAG_ENUM: string[] = [...ALL_TAGS];

const tagsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    tags: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        format: "enum",
        enum: TAG_ENUM,
      },
    },
  },
  required: ["tags"],
};

export interface TagExtractionInput {
  businessName: string;
  categoryLabel: string;
  keyPoints: string[];
  hero: { title: string; subtitle: string };
  intro: { body: string };
  highlights: { items: string[] };
  cta: { label: string };
}

export function buildTagExtractionPrompt(
  input: TagExtractionInput
): SectionGenPrompt<GeneratedTags> {
  return {
    section: "tags",
    call: {
      systemInstruction: TAG_SYSTEM,
      prompt: `업체명: ${input.businessName}
업종: ${input.categoryLabel}
키포인트: ${input.keyPoints.filter(Boolean).join(" / ") || "(없음)"}

생성된 홍보 섹션:
- 타이틀: ${input.hero.title}
- 서브타이틀: ${input.hero.subtitle}
- 소개: ${input.intro.body}
- 특징: ${input.highlights.items.join(" / ")}
- CTA: ${input.cta.label}

ALL_TAGS (이 중에서만 선택, 정확히 3~5개):
${TAG_ENUM.join(", ")}

위 섹션 내용에서 실제로 뒷받침되는 태그만 반환.`,
      schema: tagsSchema,
      temperature: 0.2,
    },
    parse: (raw) => {
      const j = raw as Partial<GeneratedTags>;
      return { tags: Array.isArray(j.tags) ? j.tags.map(String) : [] };
    },
  };
}

export function buildAllPrompts(
  ctx: PromptBuilderContext
): SectionGenPrompt<unknown>[] {
  const prompts: SectionGenPrompt<unknown>[] = [
    buildHeroPrompt(ctx) as SectionGenPrompt<unknown>,
    buildIntroPrompt(ctx) as SectionGenPrompt<unknown>,
    buildHighlightsPrompt(ctx) as SectionGenPrompt<unknown>,
    buildCtaPrompt(ctx) as SectionGenPrompt<unknown>,
  ];
  if (ctx.isPartner) {
    prompts.push(buildHygienePrompt(ctx) as SectionGenPrompt<unknown>);
  }
  return prompts;
}

export const builders = {
  hero: buildHeroPrompt,
  intro: buildIntroPrompt,
  highlights: buildHighlightsPrompt,
  cta: buildCtaPrompt,
  hygiene: buildHygienePrompt,
} as const;
