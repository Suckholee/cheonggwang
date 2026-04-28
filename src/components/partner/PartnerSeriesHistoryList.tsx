import Link from "next/link";
import { ANGLE_EMOJI, ANGLE_LABELS } from "@/domain/auto-series-angle";
import { POST_FORMAT_EMOJI } from "@/domain/post-format";
import type { SeriesHistoryEvent } from "@/types/auto-series";

/**
 * v1.13 cycle #26 partner-auto-series · §6.1 — 발행 이력 리스트.
 */

const STATUS_BADGE: Record<
  SeriesHistoryEvent["status"],
  { emoji: string; label: string; className: string }
> = {
  published: {
    emoji: "✅",
    label: "발행됨",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  // v1.16 cycle #29 — publishMode='draft-only' 매장 발행 시
  "auto-draft-saved": {
    emoji: "📝",
    label: "검토 대기",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  "hygiene-fail": {
    emoji: "⚠️",
    label: "위생 실패",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  error: {
    emoji: "❌",
    label: "오류",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  "photo-missing": {
    emoji: "📷",
    label: "사진 없음",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

function formatDateKST(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PartnerSeriesHistoryList({
  history,
}: {
  history: SeriesHistoryEvent[];
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        아직 자동 발행 이력이 없어요.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {history.map((evt) => {
        const badge = STATUS_BADGE[evt.status];
        return (
          <li
            key={evt.id}
            className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${badge.className}`}
                >
                  {badge.emoji} {badge.label}
                </span>
                <span>{formatDateKST(evt.at)}</span>
              </div>
              <p className="mt-1">
                {ANGLE_EMOJI[evt.angle]} {ANGLE_LABELS[evt.angle]}{" "}
                · {POST_FORMAT_EMOJI[evt.format]}
                {typeof evt.hygieneScore === "number" && evt.status === "published"
                  ? ` · 위생 ${evt.hygieneScore.toFixed(2)}`
                  : ""}
              </p>
              {evt.reason ? (
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {evt.reason}
                </p>
              ) : null}
            </div>
            {evt.postSlug && evt.status === "published" ? (
              <Link
                href={`/community/p/${evt.postSlug}`}
                className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                글 보기 →
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
