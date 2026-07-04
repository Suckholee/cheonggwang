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
import { providerResponseRepository } from "@/lib/firebase/provider-response-repository";
import { TriageClient } from "@/components/provider/TriageClient";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "받은 요청 · 청광",
};

export default function ProviderRequestsPage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none md:bg-transparent md:px-0 md:py-0 md:pb-12 md:min-h-0 animate-[fadeIn_0.3s_ease-out]">
      <header className="sticky top-0 z-40 -mx-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90 md:mx-0 md:bg-transparent md:border-b-0 md:px-0 md:py-2 md:backdrop-blur-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/provider/home"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <span className="hidden md:inline text-lg font-black text-zinc-955 dark:text-zinc-50 ml-1">받은 요청 목록</span>
            <div className="md:hidden">
              <BrandLogo />
            </div>
          </div>
          <span className="md:hidden rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Partner
          </span>
        </div>
      </header>
      <div className="mt-4 mb-4 rounded-2xl border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 md:bg-transparent md:border-0 md:px-0 md:py-0 md:shadow-none md:mb-6 md:mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
          Requests
        </p>
        <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
          받은 요청 목록
        </h1>
        <p className="mt-1 text-[12px] leading-5 text-zinc-600 dark:text-zinc-400">
          지정된 지역의 매칭 대기 중인 청소 요청서들을 빠르게 확인하세요.
        </p>
      </div>
      <Suspense fallback={<TriageSkeleton />}>
        <TriageBody />
      </Suspense>
    </div>
  );
}

function TriageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="요청서 로딩 중">
      <div className="h-44 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-40 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function TriageBody() {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/provider/requests")}`);
  }

  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;
  if (!providerId) {
    redirect("/signup-provider");
  }

  const provider = await providerRepository.get(providerId);
  if (!provider) {
    redirect("/signup-provider");
  }

  const excludeRequestIds =
    await providerResponseRepository.listRespondedRequestIds(providerId);

  const requests = await quoteRequestRepository.listForTriage({
    providerCategories: provider.categories,
    excludeRequestIds,
    limit: 50,
  });

  return <TriageClient initialRequests={requests} provider={provider} />;
}
