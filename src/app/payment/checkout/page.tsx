import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = {
  title: "안심 결제 · 청광",
};

interface PageProps {
  searchParams: Promise<{
    bookingId?: string;
    threadId?: string;
  }>;
}

export default function CheckoutPage(props: PageProps) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 px-4 py-8 dark:bg-black">
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-44 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-12 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

async function CheckoutBody({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; threadId?: string }>;
}) {
  const { bookingId, threadId } = await searchParams;
  if (!bookingId || !threadId) {
    notFound();
  }

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent(`/payment/checkout?bookingId=${bookingId}&threadId=${threadId}`)}`);
  }

  const booking = await bookingRepository.getWithParticipantCheck(bookingId, uid);
  if (!booking) {
    notFound();
  }

  if (booking.status === "completed") {
    redirect(`/payment/thanks?bookingId=${bookingId}`);
  }

  return (
    <CheckoutClient
      booking={{
        id: booking.id,
        threadId: booking.threadId,
        companyName: booking.companyName,
        category: booking.category,
        totalAmount: booking.totalAmount,
        scheduledAtMs: booking.scheduledAt.getTime(),
        clientDisplayName: booking.clientDisplayName,
      }}
    />
  );
}
