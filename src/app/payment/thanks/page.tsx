import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { CheckCircle, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import { QUOTE_CATEGORY_EMOJIS, QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";

export const metadata = {
  title: "결제 완료 · 청광",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    bookingId?: string;
  }>;
}

export default function PaymentThanksPage(props: PageProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Suspense fallback={<ThanksSkeleton />}>
        <ThanksBody searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ThanksSkeleton() {
  return (
    <div className="animate-pulse space-y-4 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-6 w-1/2 mx-auto rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-3/4 mx-auto rounded bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ThanksBody({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  if (!bookingId) {
    notFound();
  }

  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent(`/payment/thanks?bookingId=${bookingId}`)}`);
  }

  const booking = await bookingRepository.getWithParticipantCheck(bookingId, uid);
  if (!booking) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle className="h-10 w-10" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-black text-zinc-950 dark:text-zinc-50">안심결제가 완료되었습니다</h1>
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
          청광 에스크로 시스템에 의해 대금이 안전하게 보관되었습니다. 청소가 끝나면 거래 확정 및 후기 작성을 잊지 마세요!
        </p>
      </div>

      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left text-xs space-y-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex justify-between">
          <span className="text-zinc-400">결제 금액</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{booking.totalAmount.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">작업 업체</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{booking.companyName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">청소 종류</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {QUOTE_CATEGORY_EMOJIS[booking.category] || ""} {QUOTE_CATEGORY_LABELS[booking.category]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">작업 일정</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {formatScheduledLabel(booking.scheduledAt.getTime())}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link
          href={`/chat/${booking.threadId}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-98"
        >
          <MessageSquare className="h-4.5 w-4.5" />
          채팅방으로 이동
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          메인 화면으로 가기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
