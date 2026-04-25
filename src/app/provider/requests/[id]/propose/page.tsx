import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
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
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <Suspense fallback={<ProposeSkeleton />}>
        <ProposeBody params={props.params} />
      </Suspense>
    </div>
  );
}

function ProposeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 h-96 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
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

  return (
    <>
      <Link
        href="/provider/requests"
        className="mb-4 inline-block text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← 받은 요청
      </Link>
      <h1 className="mb-6 text-2xl font-bold">견적 작성</h1>
      <QuoteProposalForm request={request} providerId={providerId} />
    </>
  );
}
