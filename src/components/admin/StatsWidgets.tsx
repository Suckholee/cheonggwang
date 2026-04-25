import type { AdminStats } from "@/lib/admin/stats";

/**
 * v1.8 admin-console · §5.2 — 대시보드 통계 카드.
 * v1.9 partner-application · H6 — 7번째 카드 "대기 신청" 추가.
 * Server Component — props로 stats 받음.
 */

interface Props {
  stats: AdminStats;
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function StatsWidgets({ stats }: Props) {
  const { partnersByStatus } = stats;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Card
        label="오늘 발행 (partner-promo)"
        value={String(stats.todayPartnerPromoPublished)}
        hint="KST 자정 이후"
      />
      <Card
        label="평균 hygiene (30d)"
        value={
          stats.avgHygiene30d === null
            ? "-"
            : (stats.avgHygiene30d * 100).toFixed(1) + "%"
        }
        hint="partner-promo generationMeta"
        tone={
          stats.avgHygiene30d === null
            ? "default"
            : stats.avgHygiene30d >= 0.85
              ? "good"
              : "warn"
        }
      />
      <Card
        label="활성 의뢰업체"
        value={String(partnersByStatus.active)}
        hint={`초대 ${partnersByStatus.invited} · 정지 ${partnersByStatus.suspended}`}
      />
      <Card
        label="Draft (partner-promo)"
        value={String(stats.draftPartnerPromo)}
        hint="발행 대기 중"
      />
      <Card
        label="Auto-published 비율 (72h)"
        value={
          stats.autoPublishedRatio72h === null
            ? "-"
            : (stats.autoPublishedRatio72h * 100).toFixed(0) + "%"
        }
        hint="자동 발행 / 전체 발행"
      />
      <Card
        label="정지된 의뢰업체"
        value={String(partnersByStatus.suspended)}
        hint="향후 작성 차단"
        tone={partnersByStatus.suspended > 0 ? "warn" : "default"}
      />
      <Card
        label="⏳ 대기 신청"
        value={String(stats.pendingApplicantsCount)}
        hint="검토 대기 중"
        tone={stats.pendingApplicantsCount > 0 ? "warn" : "default"}
      />
    </div>
  );
}
