"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { BookingConfirmModal } from "@/components/booking/BookingConfirmModal";

interface Props {
  threadId: string;
  canConfirmBooking: boolean;
}

export function ThreadActionButtons({ threadId, canConfirmBooking }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  if (!canConfirmBooking) return null;
  return (
    <>
      <div
        role="toolbar"
        aria-label="청명 빠른 액션"
        className="mx-3 mb-2 flex justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-2 dark:border-indigo-700 dark:bg-indigo-950/20"
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          📅 일정 확정
        </button>
      </div>
      <BookingConfirmModal
        threadId={threadId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
