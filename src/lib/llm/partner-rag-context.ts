import "server-only";
import type { PartnerProfile } from "@/types/partner-profile";
import type { ContentTemplate } from "@/types/content-template";
import { contentTemplateRepository } from "@/lib/firebase/content-template-repository";
import {
  retrievePartnerStyleReferences,
} from "./partner-promo-rag";
import { describePhoto } from "./partner-promo-generator";

/**
 * v1.11 partner-rag-system · §3 — RAG 3단 통합 entry point.
 *
 * R2: 단일 함수로 partner profile + admin templates + cycle #19 anti-drift 통합.
 * R3·R4: profile.status·suspended 가드.
 * R5: ragSourceIds 스냅샷 (max 20 cap).
 */

const RAG_SOURCE_IDS_MAX = 20;

export interface RagContext {
  partnerProfile: {
    description: string;
    usps: string[];
    priceItems: { name: string; price: number }[];
    photoAnalysisSummary: string;
    industry: string;
    sourceId: string;
  } | null;
  templates: Array<{
    id: string;
    type: ContentTemplate["type"];
    body: string;
    sourceId: string;
  }>;
  /** cycle #19 — anti-drift posts. ragSourceIds용 메타만 (실제 prompt는 generator의 styleRefs로 처리). */
  styleSourceIds: string[];
  /** R5: 통합 ragSourceIds (max 20). */
  ragSourceIds: string[];
}

interface GetRagContextArgs {
  partnerId: string;
  profile: PartnerProfile | null | undefined;
  /** cycle #19 retrievePartnerStyleReferences가 사용할 tags. 호출자가 vision 후 추출. */
  visionTags?: string[];
  /** cycle #19 RAG 가 자기 자신 제외 (H3) */
  excludeOwnerUid?: string;
}

export async function getRagContext(
  args: GetRagContextArgs,
): Promise<RagContext> {
  const { partnerId, profile } = args;

  // 1) Partner profile (R3·R4 가드)
  let partnerProfile: RagContext["partnerProfile"] = null;
  if (
    profile &&
    !profile.suspended &&
    (profile.status === "auto-approved" || profile.status === "approved")
  ) {
    partnerProfile = {
      description: profile.description,
      usps: profile.usps,
      priceItems: profile.priceItems,
      photoAnalysisSummary: profile.photoAnalysisSummary,
      industry: profile.industry,
      sourceId: `profile/${partnerId}@v${profile.version}`,
    };
  }

  // 2) Content templates (H4·H5·M1)
  // H5: profile.status·suspended 무관, profile 객체만 있으면 industry 매칭으로 retrieval (admin curated 안전).
  // M1: industry='other'이면 type만 fallback.
  const templates: RagContext["templates"] = [];
  if (profile) {
    try {
      const found =
        profile.industry === "other"
          ? await contentTemplateRepository.queryByType({ maxPerType: 2 })
          : await contentTemplateRepository.queryByIndustry(profile.industry, {
              maxPerType: 2,
            });
      for (const t of found) {
        templates.push({
          id: t.id,
          type: t.type,
          body: t.body,
          sourceId: `template/${t.id}`,
        });
      }
    } catch (e) {
      console.warn("[partner-rag-context] templates retrieval failed", e);
    }
  }

  // 3) cycle #19 anti-drift는 generator에서 직접 호출 (이미 흐름 보존).
  //    여기서는 sourceIds만 보고 받기 위해 호출 옵션. 호출자가 visionTags 제공 시 retrieval.
  const styleSourceIds: string[] = [];
  if (args.visionTags && args.visionTags.length > 0 && args.excludeOwnerUid) {
    try {
      const styleRefs = await retrievePartnerStyleReferences(args.visionTags, {
        excludeOwnerUid: args.excludeOwnerUid,
        limit: 5,
      });
      for (const post of styleRefs) {
        styleSourceIds.push(`post/${post.id}`);
      }
    } catch (e) {
      console.warn("[partner-rag-context] style refs retrieval failed", e);
    }
  }

  // 4) R5: ragSourceIds 통합 + max 20 cap
  const allIds: string[] = [];
  if (partnerProfile) allIds.push(partnerProfile.sourceId);
  templates.forEach((t) => allIds.push(t.sourceId));
  allIds.push(...styleSourceIds);
  const capped = allIds.slice(0, RAG_SOURCE_IDS_MAX);

  return {
    partnerProfile,
    templates,
    styleSourceIds,
    ragSourceIds: capped,
  };
}

/**
 * H2·H3: profile photoUrls 변경 detect 시만 호출. 통합 텍스트 요약 (max 1500자).
 * Gemini Vision으로 매장 영구 사진 1~10장을 분석해 1단 요약 텍스트 반환.
 *
 * cycle #19 describePhoto는 사진 단건 caption — 우리는 매장 분위기 통합 텍스트 필요.
 */
export async function analyzePartnerProfilePhotos(
  photoUrls: string[],
): Promise<string> {
  if (photoUrls.length === 0) return "";
  try {
    // cycle #19 describePhoto 패턴 재사용 — 각 사진의 caption + tags 통합
    const descs = await Promise.all(photoUrls.slice(0, 10).map(describePhoto));
    const lines: string[] = [];
    for (let i = 0; i < descs.length; i++) {
      const d = descs[i];
      lines.push(
        `사진 ${i + 1}: ${d.caption}${d.tags.length > 0 ? ` (${d.tags.join(", ")})` : ""}`,
      );
    }
    const summary = lines.join("\n");
    return summary.length > 1500 ? summary.slice(0, 1497) + "..." : summary;
  } catch (e) {
    console.warn("[analyzePartnerProfilePhotos] failed", e);
    return "";
  }
}

/** RAG context를 prompt에 inject하는 텍스트 빌드 (generator buildComposePrompt에서 사용). */
export function buildRagContextSection(ctx: RagContext): string {
  const parts: string[] = [];

  if (ctx.partnerProfile) {
    const p = ctx.partnerProfile;
    parts.push("[매장 정보 — 이 매장의 RAG profile]");
    parts.push(`- 매장 소개: ${p.description}`);
    if (p.usps.length > 0) parts.push(`- 강점: ${p.usps.join(", ")}`);
    if (p.priceItems.length > 0) {
      parts.push(
        `- 메뉴: ${p.priceItems.map((x) => `${x.name} ${x.price}원`).join(", ")}`,
      );
    }
    if (p.photoAnalysisSummary) {
      parts.push(`- 영구 매장 사진 요약: ${p.photoAnalysisSummary}`);
    }
  }

  if (ctx.templates.length > 0) {
    parts.push("");
    parts.push("[참고 템플릿 — admin curated, 톤·구성만 참고]");
    ctx.templates.forEach((t, i) => {
      const truncated = t.body.length > 1000 ? t.body.slice(0, 997) + "..." : t.body;
      parts.push(`템플릿 ${i + 1} (${t.type}): ${truncated}`);
    });
  }

  return parts.join("\n");
}
