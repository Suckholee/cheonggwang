import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { QuoteSummary } from "@/components/quote/QuoteSummary";

type SearchParams = { id?: string };

export const metadata = {
  title: "견적 요청 접수 완료 — 청광",
};

export default function QuoteThanksPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<ThanksSkeleton />}>
        <ThanksBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ThanksSkeleton() {
  return (
    <div className="animate-pulse text-center">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="mx-auto mb-8 h-6 w-60 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ThanksBody({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const id = sp.id;
  if (!id) notFound();

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/quote/thanks?id=" + id)}`);
  }

  const request = await quoteRequestRepository.get(id);
  if (!request || request.clientUid !== uid) notFound();

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl" aria-hidden>
          ✅
        </div>
        <h1 className="mb-2 text-2xl font-bold">견적 요청이 접수됐어요!</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          청명이 24시간 내로 {request.contactPhone}으로 직접 연락드립니다.
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-xs font-semibold uppercase text-zinc-500">
          요청 요약
        </h2>
        <QuoteSummary request={request} />
      </section>

      <div className="flex justify-center gap-3">
        <Link
          href="/quote/new"
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          다른 청소도 요청하기
        </Link>
        <Link
          href="/"
          className="rounded border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          홈으로
        </Link>
      </div>
    </>
  );
}
