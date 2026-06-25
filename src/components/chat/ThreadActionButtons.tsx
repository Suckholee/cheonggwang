"use client";

import { useState, useEffect, useTransition } from "react";
import { Calendar, CreditCard, Star, CheckCircle2, Calculator } from "lucide-react";
import { BookingConfirmModal } from "@/components/booking/BookingConfirmModal";
import { RequestPaymentModal } from "./RequestPaymentModal";
import { ReviewCreateModal } from "./ReviewCreateModal";
import { doc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { confirmFinalEstimate } from "@/app/actions/quote-response-actions";
import { FieldEstimateModal } from "./FieldEstimateModal";
import type { Quote } from "@/types/quote";

interface Props {
  threadId: string;
  role: "client" | "provider";
  bookingId: string | null;
  bookingStatus: "confirmed" | "completed" | "cancelled" | null;
  bookingAmount: number | null;
  canConfirmBooking: boolean;
  hasMessages?: boolean;
  quoteId: string | null;
}

export function ThreadActionButtons({
  threadId,
  role,
  bookingId,
  bookingStatus,
  bookingAmount,
  canConfirmBooking,
  hasMessages = true,
  quoteId,
}: Props) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [currentBookingStatus, setCurrentBookingStatus] = useState<string | null>(bookingStatus);
  const [hasReview, setHasReview] = useState<boolean>(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [isConfirmingFinal, startConfirmFinalTransition] = useTransition();

  useEffect(() => {
    setCurrentBookingStatus(bookingStatus);
  }, [bookingStatus]);

  useEffect(() => {
    if (!bookingId) return;
    const unsub = onSnapshot(doc(clientDb, "bookings", bookingId), (snap) => {
      if (snap.exists()) {
        setCurrentBookingStatus(snap.data().status as string);
      }
    });
    return () => unsub();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const q = query(
      collection(clientDb, "reviews"),
      where("bookingId", "==", bookingId),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasReview(!snap.empty);
    });
    return () => unsub();
  }, [bookingId]);

  useEffect(() => {
    if (!quoteId) return;
    const unsub = onSnapshot(doc(clientDb, "quotes", quoteId), (snap) => {
      if (snap.exists()) {
        setQuote({ id: snap.id, ...snap.data() } as Quote);
      }
    });
    return () => unsub();
  }, [quoteId]);

  const hasFieldEstimate = quote && typeof quote.additionalAmount === "number";
  const isFinalConfirmed = quote && quote.finalConfirmed === true;

  // Determine status card text and pill style
  let statusTitle = "일정 협의 중";
  let statusDesc = role === "provider" 
    ? "고객님과 대화하여 청소 일정을 제안하거나 확정해 주세요."
    : "업체와 대화하여 원하시는 청소 일정을 조율해 주세요.";
  let badgeBgColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/50";

  if (currentBookingStatus === "confirmed") {
    statusTitle = "일정 확정 완료";
    statusDesc = role === "provider"
      ? "청소 일정이 확정되었습니다. 현장 방문 후 추가금이 있다면 등록하고 최종 결제를 요청해 주세요."
      : "청소 일정이 확정되었습니다. 업체가 현장 실측 후 최종 견적을 등록할 예정입니다.";
    badgeBgColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50";
  }

  if (hasFieldEstimate && !isFinalConfirmed) {
    if (role === "client") {
      statusTitle = "2차 현장 견적 도착";
      statusDesc = "청명님이 현장 실측 후 최종 견적을 보냈습니다. 아래 내역을 확인하시고 최종 수락을 눌러주세요.";
      badgeBgColor = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/50";
    } else {
      statusTitle = "최종 견적 수락 대기";
      statusDesc = "고객님께 2차 최종 견적서를 발송했습니다. 고객님의 최종 수락을 기다리고 있습니다.";
      badgeBgColor = "bg-zinc-150 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/50";
    }
  }

  if (isFinalConfirmed) {
    statusTitle = "최종 예약 확정 완료";
    statusDesc = `현장 실측이 포함된 최종 견적이 최종 수락되었습니다. 최종 금액: ${(quote.finalAmount || quote.totalAmount).toLocaleString()}원`;
    badgeBgColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50";
  }

  if (currentBookingStatus === "completed") {
    statusTitle = "작업 및 결제 완료";
    statusDesc = "청소 작업 및 에스크로 안전 결제가 모두 완료되었습니다.";
    badgeBgColor = "bg-zinc-100 text-zinc-700 dark:bg-zinc-805 dark:text-zinc-350 border border-zinc-200/50";
  } else if (currentBookingStatus === "cancelled") {
    statusTitle = "예약 취소됨";
    statusDesc = "본 예약이 취소되었습니다.";
    badgeBgColor = "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100/50";
  }

  const showConfirmBooking = role === "provider" && canConfirmBooking && hasMessages;
  const showRequestPayment = role === "provider" && currentBookingStatus === "confirmed" && isFinalConfirmed;
  const showWriteReview = role === "client" && currentBookingStatus === "completed" && !hasReview;

  const showFieldEstimateBtn = role === "provider" && quote && (quote.status === "accepted" || quote.status === "booked") && !isFinalConfirmed;
  const showFinalConfirmBtn = role === "client" && hasFieldEstimate && !isFinalConfirmed;

  function handleConfirmFinalEstimate() {
    if (!quoteId) return;
    startConfirmFinalTransition(async () => {
      const result = await confirmFinalEstimate({ quoteId });
      if (!result.ok) {
        alert(result.message);
      }
    });
  }

  return (
    <>
      <div
        role="region"
        aria-label="거래 상태 정보"
        className="mx-4 mb-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${badgeBgColor}`}>
                  {statusTitle}
                </span>
              </div>
              <p className="text-[11px] font-bold text-zinc-400 leading-relaxed dark:text-zinc-500">
                {statusDesc}
              </p>
            </div>

            <div className="shrink-0 flex gap-2">
              {showConfirmBooking && (
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  일정 확정
                </button>
              )}

              {showFieldEstimateBtn && (
                <button
                  type="button"
                  onClick={() => setFieldModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:from-blue-450 hover:to-blue-555 hover:shadow-md active:scale-95 shadow-sm cursor-pointer border-b-2 border-blue-750"
                >
                  <Calculator className="h-3.5 w-3.5" aria-hidden />
                  {hasFieldEstimate ? "2차 견적 수정" : "2차 현장 견적 등록"}
                </button>
              )}

              {showRequestPayment && (
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" aria-hidden />
                  결제 요청
                </button>
              )}

              {showWriteReview && (
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm cursor-pointer"
                >
                  <Star className="h-3.5 w-3.5 fill-white" aria-hidden />
                  후기 작성
                </button>
              )}
            </div>
          </div>

          {/* 2차 현장 실측 견적 명세 (신문고 스타일 영수증 미리보기) */}
          {hasFieldEstimate && quote && (
            <div className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-3.5 space-y-2 dark:border-zinc-850 dark:bg-zinc-900/40 text-xs">
              <span className="block text-[9.5px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                2차 현장 실측 견적 명세
              </span>
              <div className="flex justify-between items-center text-zinc-650 dark:text-zinc-400">
                <span>1차 기본 견적금</span>
                <span className="font-bold">{quote.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-start text-zinc-650 dark:text-zinc-400">
                <div className="space-y-0.5">
                  <span>현장 실측 추가금</span>
                  {quote.additionalReason && (
                    <p className="text-[10.5px] text-zinc-400 italic font-medium leading-normal">
                      사유: {quote.additionalReason}
                    </p>
                  )}
                </div>
                <span className="font-bold text-blue-650 dark:text-blue-400">
                  + {quote.additionalAmount?.toLocaleString()}원
                </span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex justify-between items-center dark:border-zinc-800 text-sm">
                <span className="font-bold text-zinc-850 dark:text-zinc-200">최종 확정 금액</span>
                <span className="font-black text-blue-600 dark:text-blue-400">
                  {quote.finalAmount?.toLocaleString()}원
                </span>
              </div>
              
              {showFinalConfirmBtn && (
                <button
                  type="button"
                  onClick={handleConfirmFinalEstimate}
                  disabled={isConfirmingFinal}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:from-emerald-450 hover:to-emerald-550 active:scale-95 disabled:opacity-50 shadow-sm border-b-2 border-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isConfirmingFinal ? "최종 수락 처리 중..." : "최종 견적 수락 및 예약 확정"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BookingConfirmModal
        threadId={threadId}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
      />

      {bookingId && quote && (
        <RequestPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          threadId={threadId}
          bookingId={bookingId}
          amount={quote.finalAmount || bookingAmount || quote.totalAmount}
        />
      )}

      {quoteId && quote && (
        <FieldEstimateModal
          quoteId={quoteId}
          baseAmount={quote.totalAmount}
          open={fieldModalOpen}
          onClose={() => setFieldModalOpen(false)}
        />
      )}

      {bookingId && (
        <ReviewCreateModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          bookingId={bookingId}
          onSubmitSuccess={() => setHasReview(true)}
        />
      )}
    </>
  );
}

