"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { approvePayment } from "@/app/actions/payment-actions";

interface Props {
  paymentKey: string;
  orderId: string;
  amount: number;
  bookingId: string;
  threadId: string;
}

export function SuccessClient({
  paymentKey,
  orderId,
  amount,
  bookingId,
  threadId,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function runApproval() {
      const res = await approvePayment({
        paymentKey,
        orderId,
        amount,
        bookingId,
        threadId,
      });

      if (res.ok) {
        router.replace(`/payment/thanks?bookingId=${bookingId}`);
      } else {
        setStatus("error");
        setErrorMsg(res.message);
      }
    }

    void runApproval();
  }, [paymentKey, orderId, amount, bookingId, threadId, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">결제 승인 중</h1>
          <p className="mt-1 text-xs text-zinc-500">결제 대금을 승인하고 예약을 확정하고 있습니다. 잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">결제 승인 실패</h1>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {errorMsg || "결제를 승인하는 도중 예기치 못한 오류가 발생했습니다."}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
        >
          재시도하기
        </button>
        <button
          onClick={() => router.replace(`/chat/${threadId}`)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          채팅방으로 복귀
        </button>
      </div>
    </div>
  );
}
