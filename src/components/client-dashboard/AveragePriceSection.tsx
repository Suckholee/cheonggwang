import { connection } from "next/server";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { computeAveragePrices } from "@/lib/dashboard/price-aggregator";
import { QUOTE_CATEGORIES } from "@/domain/quote-category";
import { AveragePriceCard } from "./AveragePriceCard";
import { EmptyDataCard } from "./EmptyDataCard";
import { SectionDisclaimer } from "./SectionDisclaimer";

export async function AveragePriceSection() {
  // Cache Components: Firestore fetch 전 dynamic 렌더 명시 (Next.js 16)
  await connection();
  let providers: Awaited<ReturnType<typeof providerRepository.listPriceBookAll>>;
  try {
    providers = await providerRepository.listPriceBookAll();
  } catch (e) {
    console.warn("[client-dashboard] listPriceBookAll failed:", e);
    providers = [];
  }

  const prices = computeAveragePrices(providers);
  const hasAnyData = QUOTE_CATEGORIES.some((c) => prices[c].sampleCount > 0);

  return (
    <section
      aria-labelledby="average-price-heading"
      className="mt-10"
    >
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70">
          Price Snapshot
        </p>
        <h2
          id="average-price-heading"
          className="mt-1 text-[22px] font-black tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          한눈에 보는 평균 시세
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          카테고리별 대략적인 가격대를 먼저 보고, 실제 견적은 청명별 제안으로 비교해보세요.
        </p>
      </div>

      {hasAnyData ? (
        <div
          role="list"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
        >
          {QUOTE_CATEGORIES.map((cat) => {
            const summary = prices[cat];
            if (summary.sampleCount === 0) {
              return (
                <div key={cat} role="listitem">
                  <EmptyDataCard
                    width="w-44"
                    title={`${cat} 준비 중`}
                    description="곧 업데이트"
                  />
                </div>
              );
            }
            return (
              <div key={cat} role="listitem">
                <AveragePriceCard summary={summary} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyDataCard
          title="아직 평균가 데이터가 없어요"
          description="청명 가입이 쌓이면 시세가 업데이트됩니다"
        />
      )}

      <SectionDisclaimer
        lines={[
          "참고 시세입니다 · 실제 비용은 청명 개별 제안에 따라 달라져요",
          "v2부터 주간 집계 데이터로 전환 예정",
        ]}
      />
    </section>
  );
}
