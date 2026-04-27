"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { DEFAULT_AUTO_SERIES } from "@/types/auto-series";
import { AppError } from "@/lib/errors";

/**
 * v1.13 cycle #26 partner-auto-series · §5.1.
 *
 * R7 결의 — 모든 partner write는 server action(Admin SDK) 경유.
 * zod 화이트리스트로 enabled/brandTone만 partner self-write 허용.
 * lastIndex/lastTickAt/totalPublished/totalFailed는 Cloud Functions runner + admin reset만.
 */

const toggleSchema = z.object({
  enabled: z.boolean(),
  brandTone: z.enum(["friendly", "professional", "playful"]).optional(),
});

interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function togglePartnerAutoSeries(
  input: z.infer<typeof toggleSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = toggleSchema.parse(input);

    // photo-missing 가드 (Risk Mitigation — Plan §8 risk-table)
    if (parsed.enabled && (partner.profile?.photoUrls?.length ?? 0) < 1) {
      return {
        ok: false,
        message:
          "매장 사진 1장 이상 등록 후 자동 시리즈를 켜주세요. (/partner/profile)",
      };
    }
    // autoPublish OFF 가드 (OQ5)
    if (parsed.enabled && !partner.autoPublish.enabled) {
      return {
        ok: false,
        message:
          "자동발행이 OFF 상태입니다. /partner/settings에서 먼저 자동발행을 켜주세요.",
      };
    }

    // M6 결의 — first-time enablement이면 DEFAULT 채우기
    const isFirstTime = !partner.autoSeries;
    if (isFirstTime) {
      await partnerRepository.updateAutoSeries(partner.id, {
        ...DEFAULT_AUTO_SERIES,
        enabled: parsed.enabled,
        brandTone: parsed.brandTone ?? "friendly",
      });
    } else {
      await partnerRepository.updateAutoSeries(partner.id, {
        enabled: parsed.enabled,
        ...(parsed.brandTone ? { brandTone: parsed.brandTone } : {}),
      });
    }

    revalidatePath("/partner/series");
    revalidatePath("/partner/posts");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

/** admin only — lastIndex reset (특정 partner 시리즈 재시작) */
export async function resetSeriesIndex(partnerId: string): Promise<ActionResult> {
  try {
    await requireAdminApi();
    if (!partnerId) {
      throw new AppError("INVALID_INPUT", "partnerId 필요");
    }
    await partnerRepository.updateAutoSeries(partnerId, {
      lastIndex: -1,
      lastTickAt: null,
    });
    revalidatePath("/admin/auto-series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

function toError(e: unknown): ActionResult {
  if (e instanceof AppError) {
    return { ok: false, message: e.message };
  }
  console.error("[partner-auto-series-actions]", e);
  return { ok: false, message: "일시적 오류" };
}
