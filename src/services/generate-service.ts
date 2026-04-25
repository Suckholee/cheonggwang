import "server-only";
import type { Page, Sections } from "@/types/page";
import { getTemplate } from "@/lib/templates";
import { trendKeywordsRepository } from "@/lib/firebase/trend-keywords-repository";
import { userRepository } from "@/lib/firebase/user-repository";
import { pageService } from "@/services/page-service";
import { callGemini } from "@/lib/llm/gemini";
import {
  builders,
  buildAllPrompts,
  buildTagExtractionPrompt,
  type PromptBuilderContext,
  type SectionGenPrompt,
  type GenSectionKey,
} from "@/lib/llm/prompt-builder";
import {
  findHygieneViolations,
  violatingSections,
  type NonHygieneSection,
} from "@/lib/llm/hygiene-guard";
import { sanitizeTags } from "@/domain/tags";
import { parseRegion } from "@/domain/region";
import { CATEGORY_LABELS } from "@/domain/constants";

async function runPrompt<T>(p: SectionGenPrompt<T>): Promise<T> {
  const raw = await callGemini<unknown>(p.call);
  return p.parse(raw);
}

async function buildContext(page: Page, uid: string): Promise<PromptBuilderContext> {
  const template = getTemplate(page.category);
  const [trendKeywords, partner] = await Promise.all([
    trendKeywordsRepository.getOrDefault(page.category),
    userRepository.getPartnerFlag(uid),
  ]);
  return {
    page,
    template,
    trendKeywords,
    isPartner: partner.isCheonggwangPartner,
    partnerCleaningFrequency: partner.partnerCleaningFrequency,
  };
}

async function assembleAll(ctx: PromptBuilderContext, page: Page): Promise<Sections> {
  const prompts = buildAllPrompts(ctx);
  const results = await Promise.all(
    prompts.map(async (p) => ({ key: p.section, value: await runPrompt(p) }))
  );
  const get = (k: GenSectionKey) => results.find((r) => r.key === k)?.value;

  const hero = get("hero") as { title: string; subtitle: string } | undefined;
  const intro = get("intro") as { body: string } | undefined;
  const highlights = get("highlights") as { items: string[] } | undefined;
  const cta = get("cta") as { label: string; link: string } | undefined;
  const hygiene = ctx.isPartner
    ? (get("hygiene") as { body: string } | undefined)
    : null;

  return {
    hero: hero ?? { title: "", subtitle: "" },
    intro: intro ?? { body: "" },
    highlights: highlights ?? { items: [] },
    hygiene: hygiene ?? null,
    location: page.sections.location,
    cta: cta ?? { label: "", link: "" },
  };
}

/**
 * 위반 섹션만 재생성. 최대 1회 재시도 (§4.2 - 최대 2회 호출 = 초기 1 + 재시도 1).
 * 재생성 후에도 위반이면 해당 섹션은 page.sections의 기존 값으로 복구.
 */
async function enforceHygieneIsolation(
  sections: Sections,
  ctx: PromptBuilderContext,
  previousSections: Sections
): Promise<Sections> {
  let current = sections;
  const initialViolations = findHygieneViolations(current);
  if (initialViolations.length === 0) return current;

  const targets = violatingSections(initialViolations);
  const regenerated = await Promise.all(
    targets.map(async (sec) => ({
      sec,
      value: await runPrompt(builders[sec](ctx) as SectionGenPrompt<unknown>),
    }))
  );

  current = applyRegenerated(current, regenerated);

  const stillViolating = findHygieneViolations(current);
  if (stillViolating.length === 0) return current;

  // 최종 fallback: 여전히 위반 섹션은 이전 저장값 유지
  console.warn(
    "[hygiene-guard] fallback to previous sections:",
    stillViolating.map((v) => `${v.section}.${v.field}(${v.matched})`).join(", ")
  );
  const fallbackTargets = new Set(violatingSections(stillViolating));
  return applyFallback(current, previousSections, fallbackTargets);
}

function applyRegenerated(
  sections: Sections,
  regenerated: { sec: NonHygieneSection; value: unknown }[]
): Sections {
  const next = { ...sections };
  for (const { sec, value } of regenerated) {
    if (sec === "hero") {
      next.hero = value as { title: string; subtitle: string };
    } else if (sec === "intro") {
      next.intro = value as { body: string };
    } else if (sec === "highlights") {
      next.highlights = value as { items: string[] };
    } else if (sec === "cta") {
      next.cta = value as { label: string; link: string };
    }
  }
  return next;
}

function applyFallback(
  sections: Sections,
  previous: Sections,
  targets: Set<NonHygieneSection>
): Sections {
  const next = { ...sections };
  if (targets.has("hero")) next.hero = previous.hero;
  if (targets.has("intro")) next.intro = previous.intro;
  if (targets.has("highlights")) next.highlights = previous.highlights;
  if (targets.has("cta")) next.cta = previous.cta;
  return next;
}

/**
 * 생성된 섹션을 바탕으로 ALL_TAGS 에서 3~5개 태그를 추출한다.
 * 실패 시 빈 배열 반환 — 전체 generate 플로우는 막지 않는다.
 */
async function extractTagsOrFallback(
  page: Page,
  guarded: Sections
): Promise<string[]> {
  try {
    const prompt = buildTagExtractionPrompt({
      businessName: page.businessName,
      categoryLabel: CATEGORY_LABELS[page.category],
      keyPoints: page.keyPoints,
      hero: guarded.hero,
      intro: guarded.intro,
      highlights: guarded.highlights,
      cta: guarded.cta,
    });
    const result = await runPrompt(prompt);
    return sanitizeTags(result.tags);
  } catch (e) {
    console.warn("[generate-service] tag extraction failed:", e);
    return [];
  }
}

export interface GeneratedPayload {
  sections: Sections;
  tags: string[];
  region: Page["region"];
}

export const generateService = {
  /**
   * 페이지 기반으로 섹션을 생성·저장하고 최종 Sections/tags/region을 반환한다.
   * ownership 검증은 pageService 내부에서 수행.
   * promo-feed v1: 섹션 생성 후 태그 추출 Gemini 호출 1회 + region 파싱.
   */
  async run(pageId: string, uid: string): Promise<GeneratedPayload> {
    const page = await pageService.getForOwner(pageId, uid);
    const ctx = await buildContext(page, uid);

    const generated = await assembleAll(ctx, page);
    const guarded = await enforceHygieneIsolation(generated, ctx, page.sections);

    const [tags, region] = await Promise.all([
      extractTagsOrFallback(page, guarded),
      Promise.resolve(parseRegion(page.address)),
    ]);

    await pageService.updateGenerated(pageId, uid, {
      sections: guarded,
      tags,
      region,
    });

    return { sections: guarded, tags, region };
  },
};
