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

  if (!showConfirmBooking && !showRequestPayment && !showWriteReview) return null;

  return (
    <>
      <div
        role="toolbar"
        aria-label="빠른 액션"
        className="mx-4 mb-3 flex justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900/30 dark:bg-blue-950/10"
      >
        {showConfirmBooking && (
          <button
            type="button"
            onClick={() => setConfirmModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            📅 일정 확정
          </button>
        )}

        {showRequestPayment && (
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            💳 결제 요청
          </button>
        )}

        {showWriteReview && (
          <button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 shadow-sm"
          >
            <Star className="h-4 w-4 fill-white" aria-hidden />
            ⭐️ 후기 작성하기
          </button>
        )}
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
