import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SuccessClient } from "./SuccessClient";

export const metadata = {
  title: "결제 완료 처리 중 · 청광",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    bookingId?: string;
    threadId?: string;
  }>;
}

export default function PaymentSuccessPage(props: PageProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Suspense fallback={<LoadingSpinner />}>
        <SuccessBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-350 border-t-blue-600" />
      <p className="text-sm font-semibold text-zinc-500">결제 정보를 처리하는 중입니다...</p>
    </div>
  );
}

async function SuccessBody({
  searchParams,
}: {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    bookingId?: string;
    threadId?: string;
  }>;
}) {
  const { paymentKey, orderId, amount, bookingId, threadId } = await searchParams;

  if (!paymentKey || !orderId || !amount || !bookingId || !threadId) {
    notFound();
  }

  return (
    <SuccessClient
      paymentKey={paymentKey}
      orderId={orderId}
      amount={Number(amount)}
      bookingId={bookingId}
      threadId={threadId}
    />
  );
}
