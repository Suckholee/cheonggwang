import { DEFAULT_AUTO_SERIES } from "@/types/auto-series";
import { pickSlot } from "@/domain/auto-series-rotation-pool";
import { ANGLE_LABELS, ANGLE_EMOJI } from "@/domain/auto-series-angle";
import { POST_FORMAT_LABELS, POST_FORMAT_EMOJI } from "@/domain/post-format";
import type { Partner } from "@/types/partner";

/**
 * v1.13 cycle #26 partner-auto-series · §6.4 — admin Dashboard.
 */

interface Stats {
  total: number;
  published: number;
  hygieneFail: number;
  error: number;
  photoMissing: number;
  avgHygieneScore: number;
}

interface Props {
  stats: Stats;
  partners: Partner[];
}

function formatDateKST(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AutoSeriesDashboard({ stats, partners }: Props) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          24시간 통계
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="전체 시도" value={stats.total} />
          <Stat label="발행됨" value={stats.published} accent="emerald" />
          <Stat label="위생 실패" value={stats.hygieneFail} accent="amber" />
          <Stat label="오류" value={stats.error} accent="rose" />
          <Stat label="사진 없음" value={stats.photoMissing} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          평균 위생 점수: {stats.avgHygieneScore.toFixed(2)}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          활성 Partner ({partners.length})
        </h2>
        {partners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            자동 시리즈 활성 파트너가 없어요.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">매장</th>
                  <th className="px-3 py-2">마지막 tick</th>
                  <th className="px-3 py-2">다음 슬롯</th>
                  <th className="px-3 py-2 text-right">발행</th>
                  <th className="px-3 py-2 text-right">실패</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {partners.map((p) => {
                  const cfg = p.autoSeries ?? DEFAULT_AUTO_SERIES;
                  const next = pickSlot(cfg.lastIndex);
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium">{p.businessName}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {cfg.lastTickAt ? formatDateKST(cfg.lastTickAt) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {ANGLE_EMOJI[next.slot.angle]} {ANGLE_LABELS[next.slot.angle]}
                        {" · "}
                        {POST_FORMAT_EMOJI[next.slot.format]} {POST_FORMAT_LABELS[next.slot.format]}
                      </td>
                      <td className="px-3 py-2 text-right">{cfg.totalPublished}</td>
                      <td className="px-3 py-2 text-right text-zinc-500">
                        {cfg.totalFailed}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}
