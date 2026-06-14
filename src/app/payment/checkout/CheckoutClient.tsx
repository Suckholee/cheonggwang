"use client";

import { useState, useTransition } from "react";
import Script from "next/script";
import Link from "next/link";
import { CreditCard, ShieldCheck, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_EMOJIS, type QuoteCategory } from "@/domain/quote-category";
import { formatScheduledLabel } from "@/domain/booking-day-bucket";

interface Props {
  booking: {
    id: string;
    threadId: string;
    companyName: string;
    category: QuoteCategory;
    totalAmount: number;
    scheduledAtMs: number;
    clientDisplayName: string;
  };
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: {
          amount: number;
          orderId: string;
          orderName: string;
          customerName: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void>;
    };
  }
}

export function CheckoutClient({ booking }: Props) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTossPay = () => {
    if (!sdkLoaded || !window.TossPayments) {
      alert("결제 모듈을 불러오는 중입니다. 잠시만 기다려 주세요.");
      return;
    }

    try {
      const clientKey = "test_ck_D53wMx73Q3M1abawOw53MINQXz2y";
      const toss = window.TossPayments(clientKey);
      
      const orderId = `${booking.id}_${Date.now()}`;
      const successUrl = `${window.location.origin}/payment/success?bookingId=${booking.id}&threadId=${booking.threadId}`;
      const failUrl = `${window.location.origin}/payment/fail?bookingId=${booking.id}&threadId=${booking.threadId}`;

      toss.requestPayment("카드", {
        amount: booking.totalAmount,
        orderId,
        orderName: `${booking.companyName} ${QUOTE_CATEGORY_LABELS[booking.category] || "청소"} 서비스`,
        customerName: booking.clientDisplayName,
        successUrl,
        failUrl,
      });
    } catch (err) {
      console.error("[payment] Toss SDK request error:", err);
      alert("결제창을 여는 도중 오류가 발생했습니다. 모의 결제 승인으로 진행해 주세요.");
    }
  };

  const handleMockPay = () => {
    startTransition(() => {
      const orderId = `mock_${booking.id}_${Date.now()}`;
      const paymentKey = `mock_key_${Math.random().toString(36).substring(2, 12)}`;
      const url = `/payment/success?bookingId=${booking.id}&threadId=${booking.threadId}&paymentKey=${paymentKey}&orderId=${orderId}&amount=${booking.totalAmount}`;
      window.location.href = url;
    });
  };

  return (
    <>
      <Script
        src="https://js.tosspayments.com/v1/payment"
        onLoad={() => setSdkLoaded(true)}
      />

      <div className="flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href={`/chat/${booking.threadId}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">안심 결제하기</h1>
            <p className="text-xs text-zinc-500">결제를 완료하고 예약을 최종 확정하세요</p>
          </div>
        </header>

        {/* 결제 정보 카드 */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#f4f8ff_100%)] p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/20">
          <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            청광 안전 결제 시스템
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {booking.totalAmount.toLocaleString()}원
          </h2>

          <div className="mt-5 space-y-2.5 border-t border-blue-200/50 pt-4 text-xs text-zinc-650 dark:border-zinc-800 dark:text-zinc-400">
            <div className="flex justify-between">
              <span className="font-medium text-zinc-500">작업 업체</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{booking.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-500">청소 종류</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {QUOTE_CATEGORY_EMOJIS[booking.category]} {QUOTE_CATEGORY_LABELS[booking.category]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-500">작업 일정</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatScheduledLabel(booking.scheduledAtMs)}
              </span>
            </div>
          </div>
        </section>

        {/* 결제 수단 선택 및 실행 */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  안전 거래 (에스크로) 보증
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500 leading-relaxed">
                  결제 대금은 청광이 안전하게 보관하며, 청소 작업이 정상적으로 완료되고 고객이 확정해야 업체로 송금됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleTossPay}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50"
            >
              <CreditCard className="h-4.5 w-4.5" />
              신용카드 결제하기 (Toss)
            </button>

            <button
              onClick={handleMockPay}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/50 py-3.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  승인 처리 중...
                </>
              ) : (
                <>
                  🚀 즉시 모의 결제 승인 (Bypass)
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-zinc-400 leading-normal">
            Toss 결제 시 신용카드 결제창(테스트 모드)이 실행됩니다.
            <br />
            실제 대금 결제가 일어나지 않는 가상 결제창입니다.
          </p>
        </section>
      </div>
    </>
  );
}
