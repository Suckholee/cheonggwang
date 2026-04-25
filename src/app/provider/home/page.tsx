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
import { ActiveRequestsSection } from "@/components/provider-dashboard/ActiveRequestsSection";
import { TodayScheduleCard } from "@/components/provider-dashboard/TodayScheduleCard";
import { QuickStatsSection } from "@/components/provider-dashboard/QuickStatsSection";
import { ShortcutGrid } from "@/components/provider-dashboard/ShortcutGrid";
import type { DashboardStats } from "@/types/dashboard";

export const metadata = {
  title: "청명 홈 · 청광",
};

export default function ProviderHomePage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-24">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
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
      limit: 3,
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
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">청명 홈</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            로그아웃
          </button>
        </form>
      </header>

      <DashboardHero provider={provider} />

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
