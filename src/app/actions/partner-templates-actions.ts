"use server";

import { z } from "zod";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { contentTemplateRepository } from "@/lib/firebase/content-template-repository";
import {
  CONTENT_TEMPLATE_TYPES,
  type ContentTemplateType,
} from "@/types/content-template";
import {
  PARTNER_INDUSTRIES,
  type PartnerIndustry,
} from "@/domain/partner-industry";
import type { ContentTemplate } from "@/types/content-template";

/**
 * v1.12 cycle #25 partner-content-formats · §4.2 (H4 결의).
 *
 * 파트너 콘솔 Wizard Step 2에서 industry × format 매칭 contentTemplate 6개 반환.
 * 인증된 파트너만 호출 가능. industry='other' fallback 포함.
 */

const inputSchema = z.object({
  industry: z.string(),
  type: z.string(),
});

export type ListTemplatesForPartnerInput = {
  industry: PartnerIndustry;
  type: ContentTemplateType;
};

const MAX_PER_TYPE = 6;

function isPartnerIndustry(v: string): v is PartnerIndustry {
  return (PARTNER_INDUSTRIES as readonly string[]).includes(v);
}

function isContentTemplateType(v: string): v is ContentTemplateType {
  return (CONTENT_TEMPLATE_TYPES as readonly string[]).includes(v);
}

export async function listTemplatesForPartner(
  input: ListTemplatesForPartnerInput,
): Promise<ContentTemplate[]> {
  await requirePartnerApi();
  const parsed = inputSchema.parse(input);

  if (!isPartnerIndustry(parsed.industry)) return [];
  if (!isContentTemplateType(parsed.type)) return [];

  let list = await contentTemplateRepository.queryByIndustry(parsed.industry, {
    maxPerType: MAX_PER_TYPE,
  });
  list = list.filter((t) => t.type === parsed.type);

  // industry='other' fallback (cycle #24 패턴)
  if (list.length === 0 && parsed.industry !== "other") {
    let fallback = await contentTemplateRepository.queryByIndustry("other", {
      maxPerType: MAX_PER_TYPE,
    });
    fallback = fallback.filter((t) => t.type === parsed.type);
    list = fallback;
  }

  return list.slice(0, MAX_PER_TYPE);
}
