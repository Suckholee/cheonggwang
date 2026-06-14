import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { quoteRepository } from "@/lib/firebase/quote-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { isActive, isCompleted } from "@/domain/quote-status";
import { TabBar } from "@/components/received/TabBar";
import { RequestStatusCard } from "@/components/received/RequestStatusCard";
import { CompletedCard } from "@/components/received/CompletedCard";
import { ReceivedEmptyState } from "@/components/received/ReceivedEmptyState";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata = {
  title: "받은 견적 · 청광",
};

type SearchParams = { tab?: string };

export default function ReceivedPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:bg-zinc-950/90 dark:border-zinc-900">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80">
            Quotes
          </span>
        </div>
      </header>
      <div className="mt-4 mb-4 rounded-2xl border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
          Inbox
        </p>
        <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
          받은 견적
        </h1>
        <p className="mt-1 text-[12px] leading-5 text-zinc-600 dark:text-zinc-400">
          청명들로부터 도착한 견적서와 예약 진행 상황을 확인하세요.
        </p>
      </div>
      <Suspense fallback={<ReceivedSkeleton />}>
        <ReceivedBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ReceivedSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex gap-2">
        <div className="h-9 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

async function ReceivedBody({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: "active" | "completed" =
    rawTab === "completed" ? "completed" : "active";

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/received")}`);
  }

  const allRequests = await quoteRequestRepository.listForClient(uid);

  const activeRequests = allRequests.filter((r) => isActive(r.status));
  const completedRequests = allRequests.filter((r) => isCompleted(r.status));

  const filtered = tab === "active" ? activeRequests : completedRequests;

  if (allRequests.length === 0) {
    return <ReceivedEmptyState />;
  }

  // 각 request에 대해 quotes 병렬 fetch + priceRange 집계
  const enriched = await Promise.all(
    filtered.map(async (request) => {
      const quotes = await quoteRepository.listByRequest(request.id);
      const amounts = quotes.map((q) => q.totalAmount);
      const priceRange =
        amounts.length > 0
          ? {
              min: Math.min(...amounts),
              max: Math.max(...amounts),
              count: amounts.length,
            }
          : null;
      const winner =
        tab === "completed"
          ? quotes.find((q) => q.status === "accepted") ?? null
          : null;
      const winnerProvider = winner
        ? await providerRepository.get(winner.providerId)
        : null;
      return { request, priceRange, winner, winnerProvider };
    }),
  );

  return (
    <>
      <TabBar
        activeTab={tab}
        activeCount={activeRequests.length}
        completedCount={completedRequests.length}
      />
      <div className="mt-4 flex flex-col gap-3">
        {enriched.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {tab === "active"
              ? "진행중인 요청이 없어요"
              : "완료된 거래가 없어요"}
          </p>
        ) : (
          enriched.map((item) =>
            tab === "active" ? (
              <RequestStatusCard
                key={item.request.id}
                request={item.request}
                priceRange={item.priceRange}
              />
            ) : (
              <CompletedCard
                key={item.request.id}
                request={item.request}
                winner={item.winner}
                winnerProvider={item.winnerProvider}
              />
            ),
          )
        )}
      </div>
    </>
  );
}
