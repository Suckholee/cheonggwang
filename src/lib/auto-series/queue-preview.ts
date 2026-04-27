import type { Partner } from "@/types/partner";
import type { RotationSlot } from "@/domain/auto-series-rotation-pool";
import { effectiveQueue } from "./effective-queue";
import { nextNAutoPublishWindows } from "@/lib/partner/auto-publish-window";

/**
 * v1.14 cycle #27 partner-series-queue · §3.6 (S3 마지막).
 *
 * 사장님이 /partner/series 화면에서 보는 "다음 N회 발행 예정 미리보기".
 *  - effectiveQueue가 비어 있으면 [] (UI는 "큐가 비어 있어요" 표시)
 *  - autoPublish 윈도우가 0개면 [] (UI는 "자동 발행 OFF" 표시)
 *  - lastIndex 기준 다음 슬롯부터 N개. (lastIndex+i+1) % effective.length.
 *  - 음수 mod 안전 처리: ((x % n) + n) % n.
 *
 * 호출자: PartnerSeriesQueuePreview (server component).
 */
export function nextNSlots(
  partner: Partner,
  n: number = 5,
  now: Date = new Date(),
): Array<{ slot: RotationSlot; estimatedAt: Date }> {
  const effective = effectiveQueue(partner);
  if (effective.length === 0) return [];

  const windows = nextNAutoPublishWindows(partner.autoPublish, now, n);
  if (windows.length === 0) return [];

  const lastIndex = partner.autoSeries?.lastIndex ?? -1;
  const len = effective.length;

  return windows.map((w, i) => {
    const raw = lastIndex + i + 1;
    const idx = ((raw % len) + len) % len;
    return { slot: effective[idx], estimatedAt: w.startsAt };
  });
}
