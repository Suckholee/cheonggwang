import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { signOut } from "@/app/actions/auth-actions";
import { DashboardHero } from "@/components/provider-dashboard/DashboardHero";
import { ReceivedRequestsCta } from "@/components/provider-dashboard/ReceivedRequestsCta";
import { ActiveRequestsSection } from "@/components/provider-dashboard/ActiveRequestsSection";
import { TodayScheduleCard } from "@/components/provider-dashboard/TodayScheduleCard";
import { QuickStatsSection } from "@/components/provider-dashboard/QuickStatsSection";
import { ShortcutGrid } from "@/components/provider-dashboard/ShortcutGrid";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { DashboardStats } from "@/types/dashboard";

export const metadata = {
  title: "청명 홈 · 청광",
};

export default function ProviderHomePage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BrandLogo />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Partner
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-zinc-650 transition-all hover:bg-white hover:text-zinc-950 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-450 dark:hover:text-zinc-200"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-44 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-40 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-20 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function DashboardBody() {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/provider/home")}`);
  }

  const user = await userRepository.get(uid);
  const providerId = user?.providerId;
  if (!providerId) {
    redirect("/signup-provider");
  }

  const provider = await providerRepository.get(providerId);
  if (!provider) {
    redirect("/signup-provider");
  }

  const [activeRequests, totalCount] = await Promise.all([
    quoteRequestRepository.listForProvider({
      categories: provider.categories,
      status: "submitted",
      limit: 10,
    }),
    quoteRequestRepository.countForProvider({
      categories: provider.categories,
      status: "submitted",
    }),
  ]);

  const stats: DashboardStats = {
    completedWorkCount: provider.completedWorkCount ?? null,
    rating: provider.rating ?? null,
    reviewCount: provider.reviewCount ?? null,
    responseTimeMinutes: provider.responseTimeMinutes ?? null,
  };

  return (
    <>
      <DashboardHero provider={provider} totalCount={totalCount} />

      <ReceivedRequestsCta count={totalCount} />

      <ActiveRequestsSection
        provider={provider}
        requests={activeRequests}
        totalCount={totalCount}
      />

      <TodayScheduleCard />

      <QuickStatsSection stats={stats} />

      <ShortcutGrid requestBadgeCount={totalCount} />
    </>
  );
}
