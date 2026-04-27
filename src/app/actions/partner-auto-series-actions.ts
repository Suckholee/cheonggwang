"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import {
  DEFAULT_AUTO_SERIES,
  type QueueItem,
} from "@/types/auto-series";
import { AUTO_SERIES_ANGLES } from "@/domain/auto-series-angle";
import { POST_FORMATS } from "@/domain/post-format";
import { correctLastIndex } from "@/lib/auto-series/lastindex-correction";
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

/**
 * v1.14 cycle #27 partner-series-queue · §5.1 (S6) — 큐 편집 4종 server action.
 *
 * 모든 호출은 본인 partner만(self-write). zod로 angle/format 화이트리스트 검증.
 * angle×format duplicate, MAX 30 등 invariant은 호출 즉시 검사.
 */

const MAX_QUEUE_LEN = 30;

const angleEnum = z.enum([...AUTO_SERIES_ANGLES] as [
  string,
  ...string[],
]);
const formatEnum = z.enum([...POST_FORMATS] as [string, ...string[]]);

const addQueueSchema = z.object({
  angle: angleEnum,
  format: formatEnum,
});

const toggleQueueSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

const removeQueueSchema = z.object({
  id: z.string().min(1),
});

const reorderQueueSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(MAX_QUEUE_LEN),
});

/** 큐 항목 추가 — 비어 있을 때 첫 추가, 또는 미사용 (angle×format) 추가. */
export async function addQueueItem(
  input: z.infer<typeof addQueueSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = addQueueSchema.parse(input);
    const current = partner.autoSeriesQueue ?? [];

    if (current.length >= MAX_QUEUE_LEN) {
      return {
        ok: false,
        message: `큐는 최대 ${MAX_QUEUE_LEN}개까지 추가할 수 있어요.`,
      };
    }
    const dup = current.find(
      (q) => q.angle === parsed.angle && q.format === parsed.format,
    );
    if (dup) {
      return {
        ok: false,
        message: "이미 같은 angle×format이 큐에 있어요.",
      };
    }

    const newItem: QueueItem = {
      id: nanoid(8),
      angle: parsed.angle as QueueItem["angle"],
      format: parsed.format as QueueItem["format"],
      enabled: true,
    };
    const next = [...current, newItem];

    // queue만 갱신 (lastIndex 변경 없음 — append는 active 위치 보존)
    await partnerRepository.updateAutoSeriesQueue(partner.id, next);
    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

/** 큐 항목 활성/비활성 토글. enabled 상태 변경 시 lastIndex 보정 atomic. */
export async function toggleQueueItem(
  input: z.infer<typeof toggleQueueSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = toggleQueueSchema.parse(input);
    const current = partner.autoSeriesQueue ?? [];
    const idx = current.findIndex((q) => q.id === parsed.id);
    if (idx < 0) {
      return { ok: false, message: "큐 항목을 찾을 수 없어요." };
    }
    if (current[idx].enabled === parsed.enabled) {
      return { ok: true }; // no-op
    }

    const next = current.map((q) =>
      q.id === parsed.id ? { ...q, enabled: parsed.enabled } : q,
    );

    // 모두 비활성 가드 — UX는 허용하되 effectiveQueue는 ROTATION_POOL fallback (R2)
    const prevLastIndex = partner.autoSeries?.lastIndex ?? -1;
    const newLastIndex = correctLastIndex({
      prevQueue: current,
      nextQueue: next,
      prevLastIndex,
    });

    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      next,
      newLastIndex,
    );
    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

/** 큐 항목 삭제. lastIndex 보정 atomic. */
export async function removeQueueItem(
  input: z.infer<typeof removeQueueSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = removeQueueSchema.parse(input);
    const current = partner.autoSeriesQueue ?? [];
    if (!current.some((q) => q.id === parsed.id)) {
      return { ok: false, message: "큐 항목을 찾을 수 없어요." };
    }
    const next = current.filter((q) => q.id !== parsed.id);

    const prevLastIndex = partner.autoSeries?.lastIndex ?? -1;
    const newLastIndex = correctLastIndex({
      prevQueue: current,
      nextQueue: next,
      prevLastIndex,
    });

    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      next,
      newLastIndex,
    );
    revalidatePath("/partner/series");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

/**
 * 큐 순서 변경 (drag/▲▼). orderedIds는 현재 큐의 모든 id를 포함해야 함.
 * lastIndex 보정 atomic.
 */
export async function reorderQueue(
  input: z.infer<typeof reorderQueueSchema>,
): Promise<ActionResult> {
  try {
    const { partner } = await requirePartnerApi();
    const parsed = reorderQueueSchema.parse(input);
    const current = partner.autoSeriesQueue ?? [];

    // 1:1 대응 검증 (id 누락/추가/중복 차단)
    if (parsed.orderedIds.length !== current.length) {
      return {
        ok: false,
        message: "큐가 변경되었어요. 새로고침 후 다시 시도해 주세요.",
      };
    }
    const idSet = new Set(current.map((q) => q.id));
    if (
      new Set(parsed.orderedIds).size !== parsed.orderedIds.length ||
      !parsed.orderedIds.every((id) => idSet.has(id))
    ) {
      return {
        ok: false,
        message: "큐가 변경되었어요. 새로고침 후 다시 시도해 주세요.",
      };
    }

    const byId = new Map(current.map((q) => [q.id, q]));
    const next = parsed.orderedIds.map((id) => byId.get(id)!);

    const prevLastIndex = partner.autoSeries?.lastIndex ?? -1;
    const newLastIndex = correctLastIndex({
      prevQueue: current,
      nextQueue: next,
      prevLastIndex,
    });

    await partnerRepository.updateAutoSeriesQueueAndIndexAtomic(
      partner.id,
      next,
      newLastIndex,
    );
    revalidatePath("/partner/series");
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
