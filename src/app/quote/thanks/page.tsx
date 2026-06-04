import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, ChevronRight, Home, Sparkles } from "lucide-react";
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
    <div 
      className="mx-auto min-h-screen max-w-md bg-cover bg-center shadow-2xl border-x border-zinc-200/50 dark:border-zinc-800/50 relative flex items-center justify-center py-12 px-4"
      style={{ backgroundImage: "url('/images/clean_thanks_bg.png')" }}
    >
      {/* Premium semi-transparent white/blue glassmorphism overlay */}
      <div className="absolute inset-0 bg-zinc-900/35 dark:bg-zinc-950/65 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm rounded-[32px] border border-white/45 bg-white/90 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-zinc-800/40 dark:bg-zinc-950/85">
        <Suspense fallback={<ThanksSkeleton />}>
          <ThanksBody searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ThanksSkeleton() {
  return (
    <div className="animate-pulse text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-850" />
      <div className="mx-auto mb-6 h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-850" />
      <div className="mb-6 h-32 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="flex gap-2">
        <div className="h-11 flex-1 rounded-xl bg-zinc-200 dark:bg-zinc-850" />
        <div className="h-11 flex-1 rounded-xl bg-zinc-200 dark:bg-zinc-850" />
      </div>
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
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center text-emerald-600 dark:text-emerald-400" aria-hidden>
          <CheckCircle2 className="h-14 w-14 animate-bounce" />
        </div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          견적 요청 접수 완료!
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[240px] mx-auto">
          청명이 24시간 내로 <span className="font-semibold text-zinc-700 dark:text-zinc-300">{request.contactPhone}</span>으로 직접 연락드립니다.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-zinc-200/50 bg-white/95 p-4 dark:border-zinc-800/40 dark:bg-zinc-950/90 shadow-xs">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          요청서 요약
        </h2>
        <QuoteSummary request={request} />
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href="/quote/new"
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(43,102,246,0.25)] transition-colors hover:bg-blue-700"
        >
          다른 청소 요청하기
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Home className="h-4 w-4" />
          홈으로 가기
        </Link>
      </div>
    </>
  );
}
