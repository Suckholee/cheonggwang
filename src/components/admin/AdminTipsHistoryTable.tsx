import Link from "next/link";
import { connection } from "next/server";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { getAdminDataErrorMessage } from "@/lib/errors";
import type {
  TipsTickEvent,
  TipsTickStatus,
} from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S8 history table).
 *
 * 최근 10건 tipsTick 결과 — server component, M9 결의 try/catch + getAdminDataErrorMessage.
 * Suspense child — M4 결의 await connection() (cacheComponents opt-out).
 */

const STATUS_LABELS: Record<TipsTickStatus, { label: string; color: string }> = {
  "published-draft": { label: "✅ draft 저장", color: "text-emerald-600 dark:text-emerald-400" },
  "skip-disabled": { label: "⏸ 일시 정지", color: "text-zinc-500" },
  "skip-already-today": { label: "⏭ 오늘 발행됨", color: "text-zinc-500" },
  "skip-no-topic": { label: "⚠️ topic 부족", color: "text-amber-600 dark:text-amber-400" },
  "compose-fail": { label: "❌ AI 실패", color: "text-rose-600 dark:text-rose-400" },
  "hygiene-fail": { label: "⚠️ hygiene 미달", color: "text-amber-600 dark:text-amber-400" },
  // cycle #32 — wide cron 24/일 발화에서 schedule gate 미통과 시 (정상 운영 상태 — 노이즈 ↑)
  "skip-out-of-schedule": { label: "⏸ schedule out", color: "text-zinc-400" },
};

export default async function AdminTipsHistoryTable() {
  await connection();

  let events: TipsTickEvent[];
  try {
    events = await tipsConfigRepository.listHistory(10);
  } catch (e) {
    console.error("[AdminTipsHistoryTable] listHistory failed", e);
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        {getAdminDataErrorMessage(e)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        아직 cron 발화 history가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        최근 발행 history ({events.length})
      </div>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">시각</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">post / 사유</th>
              <th className="px-3 py-2 text-right">hygiene</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {events.map((e) => {
              const status = STATUS_LABELS[e.status] ?? {
                label: e.status,
                color: "text-zinc-500",
              };
              return (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {e.at.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </td>
                  <td className={`px-3 py-2 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.postSlug ? (
                      <Link
                        href={`/community/p/${e.postSlug}`}
                        prefetch={false}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        /community/p/{e.postSlug}
                      </Link>
                    ) : e.reason ? (
                      <span className="text-zinc-500">{e.reason}</span>
                    ) : e.topicId ? (
                      <span className="text-zinc-400">topic={e.topicId}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums text-zinc-500">
                    {typeof e.hygieneScore === "number"
                      ? e.hygieneScore.toFixed(2)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
