import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChevronLeft } from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { quoteRepository } from "@/lib/firebase/quote-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";
import { RequestAccordion } from "@/components/received/RequestAccordion";
import { QuoteCompareCard } from "@/components/received/QuoteCompareCard";
import { RequestWorkflowCard } from "@/components/received/RequestWorkflowCard";

export const metadata = {
  title: "견적 비교 · 청광",
};

type Params = { requestId: string };

export default function ComparePage(props: {
  params: Promise<Params>;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 dark:bg-zinc-900 pb-12 shadow-2xl border-x border-zinc-200/50 dark:border-zinc-800/50 relative">
      <Suspense fallback={<CompareSkeleton />}>
        <CompareBody params={props.params} />
      </Suspense>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="mb-4 h-6 w-6 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-32 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="flex flex-col gap-3">
        <div className="h-20 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

async function CompareBody({ params }: { params: Promise<Params> }) {
  const { requestId } = await params;

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(
      `/login?next=${encodeURIComponent(`/received/${requestId}`)}`,
    );
  }

  const request = await quoteRequestRepository.get(requestId);
  if (!request) notFound();
  if (request.clientUid !== uid) notFound();

  const quotes = await quoteRepository.listByRequest(requestId, {
    order: "asc",
  });
  const providers = await Promise.all(
    quotes.map((q) => providerRepository.get(q.providerId)),
  );
  const bookings = await Promise.all(
    quotes.map((q) => bookingRepository.findByQuoteId(q.id)),
  );
  const bookingScheduledAtMsByQuoteId = new Map<string, number>();
  bookings.forEach((b, i) => {
    if (b) bookingScheduledAtMsByQuoteId.set(quotes[i].id, b.scheduledAt.getTime());
  });

  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];

  // Category gradients matching premium aesthetics
  const categoryGradients: Record<string, string> = {
    residential: "from-sky-500 to-indigo-600 dark:from-sky-700 dark:to-indigo-900",
    regular: "from-emerald-500 to-teal-700 dark:from-emerald-700 dark:to-teal-900",
    construction: "from-orange-500 to-amber-600 dark:from-orange-700 dark:to-amber-900",
    exterior: "from-indigo-500 to-violet-600 dark:from-indigo-700 dark:to-violet-900",
    sanitation: "from-emerald-500 to-teal-600 dark:from-emerald-700 dark:to-teal-900",
    specialist: "from-rose-500 to-pink-600 dark:from-rose-700 dark:to-pink-900",
    lodging: "from-violet-500 to-fuchsia-600 dark:from-violet-700 dark:to-fuchsia-900",
    industrial: "from-teal-500 to-slate-600 dark:from-teal-700 dark:to-slate-900",
    special: "from-purple-500 to-purple-800 dark:from-purple-700 dark:to-purple-950",
    etc: "from-slate-500 to-slate-700 dark:from-slate-700 dark:to-slate-900",
  };
  const gradient = categoryGradients[request.category] || "from-zinc-500 to-zinc-700";

  return (
    <>
      {/* Category Banner Header */}
      <header className={`relative bg-gradient-to-br ${gradient} px-5 pb-16 pt-6 text-white overflow-hidden`}>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 select-none pointer-events-none text-9xl">
          {emoji}
        </div>
        
        <div className="flex items-center gap-2.5 mb-5 relative z-10">
          <Link
            href="/received"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </Link>
          <span className="text-xs font-medium text-white/80">받은 견적 목록</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {catLabel}
          </h1>
          <p className="text-xs text-white/70">
            {formatDateString(request.createdAt)} · {request.region.district}
          </p>
        </div>
      </header>

      {/* Floating Request Metadata Accordion Card */}
      <RequestAccordion request={request} />

      {/* Real-time status, photos, assigned team & reviews */}
      <RequestWorkflowCard request={request} />

      {/* Received Quotes Section */}
      <div className="px-4 mt-6">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideUp {
            from {
              transform: translateY(24px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}} />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 pl-1">
          받은 견적 <span className="text-emerald-600 dark:text-emerald-400">{quotes.length}</span>건
        </h2>

        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-400">아직 도착한 견적이 없습니다.</p>
            <p className="text-xs text-zinc-400 mt-1">청명이 견적을 보내면 실시간으로 알림을 드립니다.</p>
          </div>
        ) : (
          /* Continuous Quote Cards Container with dividers */
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
            {quotes.map((quote, i) => (
              <QuoteCompareCard
                key={quote.id}
                quote={quote}
                provider={providers[i]}
                requestStatus={request.status}
                bookingScheduledAtMs={
                  bookingScheduledAtMsByQuoteId.get(quote.id) ?? null
                }
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
