import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
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
import { QuoteStepper } from "@/components/received/QuoteStepper";
import { QuoteCompareCard } from "@/components/received/QuoteCompareCard";

export const metadata = {
  title: "견적 비교 · 청광",
};

type Params = { requestId: string };

export default function ComparePage(props: {
  params: Promise<Params>;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <Suspense fallback={<CompareSkeleton />}>
        <CompareBody params={props.params} />
      </Suspense>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-8 w-60 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="flex flex-col gap-3">
        <div className="h-48 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-48 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
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
  // v1.3 booking · quote당 1 booking (singleton)
  const bookings = await Promise.all(
    quotes.map((q) => bookingRepository.findByQuoteId(q.id)),
  );
  const bookingScheduledAtMsByQuoteId = new Map<string, number>();
  bookings.forEach((b, i) => {
    if (b) bookingScheduledAtMsByQuoteId.set(quotes[i].id, b.scheduledAt.getTime());
  });

  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const sizeLabel = request.size
    ? `${request.size}평${request.roomType ? ` · ${request.roomType}` : ""}`
    : request.roomType ?? "";

  return (
    <>
      <Link
        href="/received"
        className="mb-4 inline-block text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← 받은 견적
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {emoji} {catLabel} {sizeLabel}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {request.region.district}
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <QuoteStepper status={request.status} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        받은 견적 {quotes.length}건
      </h2>

      {quotes.length === 0 ? (
        <p className="rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:bg-zinc-900">
          아직 도착한 견적이 없어요. 청명이 응답하면 여기에 표시됩니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote, i) => (
            <QuoteCompareCard
              key={quote.id}
              quote={quote}
              provider={providers[i]}
              requestStatus={request.status}
              bookingScheduledAtMs={
                bookingScheduledAtMsByQuoteId.get(quote.id) ?? null
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
