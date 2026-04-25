import { Suspense } from "react";
import { connection } from "next/server";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { parseSearchParams } from "@/lib/search/parse-search-params";
import { FilterBar } from "@/components/search/FilterBar";
import { ActiveFiltersSummary } from "@/components/search/ActiveFiltersSummary";
import { ResultsCount } from "@/components/search/ResultsCount";
import { SearchResultsSection } from "@/components/search/SearchResultsSection";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { SearchFilters } from "@/types/search";

export const metadata = {
  title: "청명찾기 · 청광",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function SearchPage(props: PageProps) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-24">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2B66F6]/80">
            Search
          </span>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2B66F6]/70">
            Find Providers
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            청명찾기
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
            평점, 보험 여부, 응답 속도 같은 신뢰 신호를 먼저 보고 나에게 맞는 청명을 골라보세요.
          </p>
        </div>
      </header>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-24 rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-24 rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function SearchBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters: SearchFilters = parseSearchParams(raw);
  await connection();

  let providers: Awaited<ReturnType<typeof providerRepository.search>> = [];
  try {
    providers = await providerRepository.search(filters);
  } catch (e) {
    console.warn("[provider-search] search failed:", e);
    providers = [];
  }

  return (
    <>
      <FilterBar filters={filters} />
      <ActiveFiltersSummary filters={filters} />
      <ResultsCount count={providers.length} />
      <SearchResultsSection providers={providers} filters={filters} />
    </>
  );
}
