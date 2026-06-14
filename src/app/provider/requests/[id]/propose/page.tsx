import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChevronLeft } from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { providerResponseRepository } from "@/lib/firebase/provider-response-repository";
import { QuoteProposalForm } from "@/components/provider/QuoteProposalForm";
import { isRespondable } from "@/domain/quote-status";

type Params = { id: string };

export const metadata = {
  title: "견적 작성 · 청광",
};

export default function ProposePage(props: {
  params: Promise<Params>;
}) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3.5 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <Link
            href="/provider/requests"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            aria-label="받은 요청으로 가기"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
          </Link>
          <h1 className="text-[17px] font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            견적 작성
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <Suspense fallback={<ProposeSkeleton />}>
        <ProposeBody params={props.params} />
      </Suspense>
    </div>
  );
}

function ProposeSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 w-full rounded-[22px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-44 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-64 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function ProposeBody({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(
      `/login?next=${encodeURIComponent(`/provider/requests/${id}/propose`)}`,
    );
  }

  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;
  if (!providerId) {
    redirect("/signup-provider");
  }

  const request = await quoteRequestRepository.get(id);
  if (!request) notFound();
  if (!isRespondable(request.status)) {
    redirect("/provider/requests");
  }

  const pr = await providerResponseRepository.get(providerId, id);
  if (pr?.status === "quoted") {
    redirect("/provider/requests");
  }

  return <QuoteProposalForm request={request} providerId={providerId} />;
}
