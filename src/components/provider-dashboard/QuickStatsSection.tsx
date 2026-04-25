import type { DashboardStats } from "@/types/dashboard";

interface Props {
  stats: DashboardStats;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

export function QuickStatsSection({ stats }: Props) {
  const workCountLabel =
    stats.completedWorkCount != null
      ? `${stats.completedWorkCount}건`
      : "아직 없음";
  const ratingLabel =
    stats.rating != null
      ? `${stats.rating.toFixed(1)} (${stats.reviewCount ?? 0})`
      : "아직 없음";
  const responseLabel =
    stats.responseTimeMinutes != null
      ? `${stats.responseTimeMinutes}분`
      : "아직 없음";

  return (
    <section aria-labelledby="stats-heading" className="mb-6">
      <h2
        id="stats-heading"
        className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        실적
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="누적 작업" value={workCountLabel} />
        <StatCard label="평점" value={ratingLabel} />
        <StatCard label="응답시간" value={responseLabel} />
      </div>
    </section>
  );
}
