import { ANGLE_EMOJI, ANGLE_LABELS } from "@/domain/auto-series-angle";
import {
  POST_FORMAT_EMOJI,
  POST_FORMAT_LABELS,
} from "@/domain/post-format";
import { nextNSlots } from "@/lib/auto-series/queue-preview";
import type { Partner } from "@/types/partner";

/**
 * v1.14 cycle #27 partner-series-queue · §6.4 (S10).
 *
 * "다음 N회 발행 예정" 미리보기 — server component.
 *  - effectiveQueue 기반 (큐 비어있으면 ROTATION_POOL fallback).
 *  - autoPublish 윈도우 없음 → 안내 문구.
 *  - 큐 비어있고 fallback 사용 중 → 시스템 기본임을 명시.
 */

interface Props {
  partner: Partner;
  n?: number;
}

export default function PartnerSeriesQueuePreview({
  partner,
  n = 5,
}: Props) {
  const slots = nextNSlots(partner, n);
  const usingFallback =
    !partner.autoSeriesQueue ||
    partner.autoSeriesQueue.filter((q) => q.enabled).length === 0;

  if (!partner.autoPublish.enabled) {
    return (
      <p className="text-xs text-zinc-500">
        자동발행이 OFF 상태예요. 위 "발행 요일·시간"에서 켜주세요.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        예정된 발행이 없어요. 윈도우 설정을 확인해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {usingFallback && (
        <p className="text-xs text-zinc-500">
          큐가 비어 있어 시스템 기본 순서로 발행될 예정이에요.
        </p>
      )}
      <ol className="space-y-1.5">
        {slots.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <span className="text-xs font-medium text-zinc-400">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1">
              <span className="mr-1">{ANGLE_EMOJI[s.slot.angle]}</span>
              {ANGLE_LABELS[s.slot.angle]}
              <span className="mx-1 text-zinc-400">·</span>
              <span>{POST_FORMAT_EMOJI[s.slot.format]}</span>{" "}
              {POST_FORMAT_LABELS[s.slot.format]}
            </span>
            <time className="text-xs text-zinc-500">
              {s.estimatedAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}
