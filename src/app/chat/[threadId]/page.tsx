import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  threadRepository,
  resolveThreadRole,
} from "@/lib/firebase/thread-repository";
import { quoteRepository } from "@/lib/firebase/quote-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import { ThreadHeader } from "@/components/chat/ThreadHeader";
import {
  PinnedQuoteCard,
  type QuoteSummaryForThread,
} from "@/components/chat/PinnedQuoteCard";
import { ThreadDetailClient } from "@/components/chat/ThreadDetailClient";
import { ThreadActionButtons } from "@/components/chat/ThreadActionButtons";
import { BookingStatusBanner } from "@/components/booking/BookingStatusBanner";
import type { BookingBannerDTO } from "@/types/booking";

export const metadata = {
  title: "채팅 · 청광",
};

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default function ChatThreadPage(props: PageProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-zinc-50 pb-[var(--bottom-nav-height)] dark:bg-black">
      <Suspense fallback={<ThreadSkeleton />}>
        <ThreadBody params={props.params} />
      </Suspense>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-14 border-b border-zinc-200 bg-white animate-pulse dark:border-zinc-800 dark:bg-zinc-950" />
      <div className="flex-1 space-y-3 p-3">
        <div className="h-10 w-3/4 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-10 w-2/3 self-end rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

async function ThreadBody({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent(`/chat/${threadId}`)}`);
  }

  const thread = await threadRepository.getWithParticipantCheck(threadId, uid);
  if (!thread) notFound();

  const role = resolveThreadRole(thread, uid);
  if (!role) notFound();

  const counterpartName =
    role === "client" ? thread.companyName : thread.clientDisplayName;

  let summary: QuoteSummaryForThread | null = null;
  let bookingBanner: BookingBannerDTO | null = null;
  if (thread.quoteId) {
    const [quote, request, booking] = await Promise.all([
      quoteRepository.get(thread.quoteId),
      quoteRequestRepository.get(thread.requestId),
      bookingRepository.findByQuoteId(thread.quoteId),
    ]);
    if (quote && request) {
      summary = {
        quoteId: quote.id,
        requestId: thread.requestId,
        category: request.category,
        sizeLabel: request.size != null ? `${request.size}평` : null,
        totalAmount: quote.totalAmount,
        scheduledAtMs: quote.scheduledAt
          ? quote.scheduledAt.getTime()
          : null,
      };
    }
    if (booking) {
      bookingBanner = {
        scheduledAtMs: booking.scheduledAt.getTime(),
        scheduledLabel: "", // BookingStatusBanner가 내부에서 포맷
        memo: booking.memo,
      };
    }
  }

  const canConfirmBooking = role === "provider" && bookingBanner == null;

  return (
    <>
      <ThreadHeader
        counterpartName={counterpartName}
        role={role}
        quoteAmount={bookingBanner ? null : summary?.totalAmount ?? null}
        bookingScheduledAtMs={bookingBanner?.scheduledAtMs ?? null}
      />
      {bookingBanner && <BookingStatusBanner banner={bookingBanner} />}
      {summary && <PinnedQuoteCard summary={summary} role={role} />}
      {canConfirmBooking && (
        <ThreadActionButtons
          threadId={threadId}
          canConfirmBooking={canConfirmBooking}
        />
      )}
      <ThreadDetailClient threadId={threadId} uid={uid} />
    </>
  );
}
