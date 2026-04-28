import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { autoSeriesRepository } from "@/lib/firebase/auto-series-repository";
import AutoSeriesDashboard from "@/components/admin/AutoSeriesDashboard";

/**
 * v1.13 cycle #26 partner-auto-series · §6.4 — admin 모니터링 페이지.
 */

export const metadata = {
  title: "자동 시리즈 모니터링 · 청광 admin",
  robots: { index: false, follow: false },
};

export default function AdminAutoSeriesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">자동 시리즈 모니터링</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          전체 활성 partner의 자동 발행 상태와 24h 통계.
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/auto-series");
  try {
    const [stats, partners] = await Promise.all([
      autoSeriesRepository.stats24h(),
      partnerRepository.listAutoSeriesEnabled(),
    ]);
    return <AutoSeriesDashboard stats={stats} partners={partners} />;
  } catch (e) {
    console.error("[admin/auto-series] Body fetch failed", e);
    throw e;
  }
}

function Skeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
