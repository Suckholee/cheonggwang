import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { autoSeriesRepository } from "@/lib/firebase/auto-series-repository";
import { DEFAULT_AUTO_SERIES } from "@/types/auto-series";
import PartnerAutoSeriesPanel from "@/components/partner/PartnerAutoSeriesPanel";
import PartnerSeriesHistoryList from "@/components/partner/PartnerSeriesHistoryList";
import AutoPublishSettings from "@/components/partner/AutoPublishSettings";
import PartnerSeriesQueueEditor from "@/components/partner/PartnerSeriesQueueEditor";
import PartnerSeriesQueueAddDialog from "@/components/partner/PartnerSeriesQueueAddDialog";
import PartnerSeriesQueuePreview from "@/components/partner/PartnerSeriesQueuePreview";

/**
 * v1.13 cycle #26 partner-auto-series · §6.1 — 사장님 진행 현황 페이지.
 */

export const metadata = {
  title: "자동 시리즈 · 청광 파트너",
  robots: { index: false, follow: false },
};

export default function PartnerSeriesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">자동 시리즈</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          매장 정보로 매주 자동 글이 발행됩니다. GO만 누르면 잠자는 동안에도 매장 마케팅이 자율로 운영돼요.
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <SeriesBody />
      </Suspense>
    </div>
  );
}

async function SeriesBody() {
  await connection();
  const { partner } = await requirePartnerPage("/partner/series");
  const cfg = partner.autoSeries ?? DEFAULT_AUTO_SERIES;
  const history = await autoSeriesRepository.listHistory(partner.id, 20);
  const queue = partner.autoSeriesQueue ?? [];

  const photoCount = partner.profile?.photoUrls?.length ?? 0;
  const autoPublishOn = partner.autoPublish.enabled;
  const canEnable = photoCount >= 1 && autoPublishOn;

  return (
    <>
      <PartnerAutoSeriesPanel
        partnerId={partner.id}
        enabled={cfg.enabled}
        brandTone={cfg.brandTone}
        canEnable={canEnable}
        warnings={[
          ...(photoCount === 0
            ? ["매장 사진을 먼저 등록해주세요 (/partner/profile)"]
            : []),
          ...(!autoPublishOn
            ? ["자동발행이 OFF 상태입니다 (/partner/settings)"]
            : []),
        ]}
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold">발행 요일·시간</h2>
        <p className="mb-3 text-xs text-zinc-500">
          선택한 요일·시간 범위에 자동 시리즈가 글을 만들고 발행해요. KST 기준.
        </p>
        <AutoPublishSettings initial={partner.autoPublish} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold">발행 큐 편집</h2>
        <p className="mb-3 text-xs text-zinc-500">
          큐에 등록한 (angle × format) 조합을 위에서 아래로 순환 발행해요. 일시정지·삭제·드래그 정렬 가능.
        </p>
        <div className="space-y-3">
          <PartnerSeriesQueueEditor initialQueue={queue} />
          <PartnerSeriesQueueAddDialog
            currentQueue={queue}
            maxReached={queue.length >= 30}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-semibold">다음 5회 발행 예정</h2>
        <PartnerSeriesQueuePreview partner={partner} n={5} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="누적 발행" value={cfg.totalPublished} />
        <Stat label="누적 실패" value={cfg.totalFailed} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          최근 발행 이력
        </h2>
        <PartnerSeriesHistoryList history={history} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
