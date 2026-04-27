import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { autoSeriesRepository } from "@/lib/firebase/auto-series-repository";
import { nextAutoPublishWindow } from "@/lib/partner/auto-publish-window";
import { pickSlot } from "@/domain/auto-series-rotation-pool";
import { ANGLE_LABELS, ANGLE_EMOJI } from "@/domain/auto-series-angle";
import { POST_FORMAT_LABELS, POST_FORMAT_EMOJI } from "@/domain/post-format";
import { DEFAULT_AUTO_SERIES } from "@/types/auto-series";
import PartnerAutoSeriesPanel from "@/components/partner/PartnerAutoSeriesPanel";
import PartnerSeriesHistoryList from "@/components/partner/PartnerSeriesHistoryList";

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
  const next = pickSlot(cfg.lastIndex);
  const nextWindow = nextAutoPublishWindow(partner.autoPublish);

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
        <h2 className="mb-2 text-sm font-semibold">다음 발행 예정</h2>
        {nextWindow.startsAt ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {nextWindow.startsAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {ANGLE_EMOJI[next.slot.angle]} {ANGLE_LABELS[next.slot.angle]}{" "}
              · {POST_FORMAT_EMOJI[next.slot.format]}{" "}
              {POST_FORMAT_LABELS[next.slot.format]}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            자동발행 윈도우가 비어있어 다음 발행 예정이 없습니다.
          </p>
        )}
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
