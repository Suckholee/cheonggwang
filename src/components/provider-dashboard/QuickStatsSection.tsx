import type { DashboardStats } from "@/types/dashboard";
import { Award, Star, Zap, type LucideIcon } from "lucide-react";

interface Props {
  stats: DashboardStats;
}

function StatCard({
  label,
  value,
  Icon,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-zinc-200/80 border-b-[3.5px] border-b-zinc-300 bg-white p-4 text-center dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgClass} ${colorClass} mb-2`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="text-[15px] font-black text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

export function QuickStatsSection({ stats }: Props) {
  const workCountLabel =
    stats.completedWorkCount != null ? `${stats.completedWorkCount}건` : "0건";
  const ratingLabel =
    stats.rating != null
      ? `${stats.rating.toFixed(1)} (${stats.reviewCount ?? 0})`
      : "평가 대기";
  const responseLabel =
    stats.responseTimeMinutes != null ? `${stats.responseTimeMinutes}분` : "측정 대기";

  const isNewPartner =
    stats.completedWorkCount === null ||
    stats.completedWorkCount === 0 ||
    stats.rating === null;

  return (
    <section aria-labelledby="stats-heading" className="mb-6">
      <h2
        id="stats-heading"
        className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
      >
        실적 현황
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="누적 작업"
          value={workCountLabel}
          Icon={Award}
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50/70 dark:bg-blue-950/40"
        />
        <StatCard
          label="평점"
          value={ratingLabel}
          Icon={Star}
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-50/70 dark:bg-emerald-950/40"
        />
        <StatCard
          label="응답시간"
          value={responseLabel}
          Icon={Zap}
          colorClass="text-amber-600 dark:text-amber-450"
          bgClass="bg-amber-50/70 dark:bg-amber-950/40"
        />
      </div>

      {isNewPartner && (
        <div className="mt-3.5 rounded-2xl bg-zinc-50/50 border border-zinc-150 p-4 dark:bg-zinc-900/30 dark:border-zinc-800/80 shadow-2xs">
          <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>💡</span> 실적을 쌓기 위한 첫 단계
          </h4>
          <ul className="mt-2 space-y-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 list-disc list-inside">
            <li><span className="text-zinc-700 dark:text-zinc-300 font-bold">프로필 완성</span>: 상세 소개와 가격표를 완성하여 신뢰도를 높여보세요.</li>
            <li><span className="text-zinc-700 dark:text-zinc-300 font-bold">견적 제안</span>: 새로 도착한 수신 요청에 빠르게 맞춤 견적을 보내보세요.</li>
            <li>첫 작업을 완료하고 고객 리뷰를 받으면 평점과 누적 작업 수가 자동으로 활성화됩니다.</li>
          </ul>
        </div>
      )}
    </section>
  );
}
