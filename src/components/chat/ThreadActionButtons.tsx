"use client";

import { useState, useEffect } from "react";
import { Calendar, CreditCard, Star } from "lucide-react";
import { BookingConfirmModal } from "@/components/booking/BookingConfirmModal";
import { RequestPaymentModal } from "./RequestPaymentModal";
import { ReviewCreateModal } from "./ReviewCreateModal";
import { doc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";

interface Props {
  threadId: string;
  role: "client" | "provider";
  bookingId: string | null;
  bookingStatus: "confirmed" | "completed" | "cancelled" | null;
  bookingAmount: number | null;
  canConfirmBooking: boolean;
  hasMessages?: boolean;
}

export function ThreadActionButtons({
  threadId,
  role,
  bookingId,
  bookingStatus,
  bookingAmount,
  canConfirmBooking,
  hasMessages = true,
}: Props) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [currentBookingStatus, setCurrentBookingStatus] = useState<string | null>(bookingStatus);
  const [hasReview, setHasReview] = useState<boolean>(false);

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

  const showConfirmBooking = role === "provider" && canConfirmBooking && hasMessages;
  const showRequestPayment = role === "provider" && currentBookingStatus === "confirmed";
  const showWriteReview = role === "client" && currentBookingStatus === "completed" && !hasReview;

  // Determine status card text and pill style
  let statusTitle = "일정 협의 중";
  let statusDesc = role === "provider" 
    ? "고객님과 대화하여 청소 일정을 제안하거나 확정해 주세요."
    : "업체와 대화하여 원하시는 청소 일정을 조율해 주세요.";
  let badgeBgColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/50";

  if (currentBookingStatus === "confirmed") {
    statusTitle = "일정 확정 완료";
    statusDesc = role === "provider"
      ? "청소 일정이 확정되었습니다. 작업 완료 후 결제를 요청하세요."
      : "청소 일정이 확정되었습니다. 작업 완료 후 결제를 진행해 주세요.";
    badgeBgColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50";
  } else if (currentBookingStatus === "completed") {
    statusTitle = "작업 및 결제 완료";
    statusDesc = "청소 작업 및 에스크로 안전 결제가 모두 완료되었습니다.";
    badgeBgColor = "bg-zinc-100 text-zinc-700 dark:bg-zinc-805 dark:text-zinc-350 border border-zinc-200/50";
  } else if (currentBookingStatus === "cancelled") {
    statusTitle = "예약 취소됨";
    statusDesc = "본 예약이 취소되었습니다.";
    badgeBgColor = "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100/50";
  }

  return (
    <>
      <div
        role="region"
        aria-label="거래 상태 정보"
        className="mx-4 mb-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
      >
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

          <div className="shrink-0">
            {showConfirmBooking && (
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                일정 확정
              </button>
            )}

            {showRequestPayment && (
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                결제 요청
              </button>
            )}

            {showWriteReview && (
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
              >
                <Star className="h-3.5 w-3.5 fill-white" aria-hidden />
                후기 작성
              </button>
            )}
          </div>
        </div>
      </div>

      <BookingConfirmModal
        threadId={threadId}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
      />

      {bookingId && bookingAmount && (
        <RequestPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          threadId={threadId}
          bookingId={bookingId}
          amount={bookingAmount}
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
