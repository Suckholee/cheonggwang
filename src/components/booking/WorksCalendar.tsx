"use client";

import { useState, useTransition } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  List, 
  CalendarDays, 
  MapPin, 
  Home, 
  Users, 
  ArrowRight, 
  X, 
  Check, 
  FileText 
} from "lucide-react";
import Link from "next/link";
import { BookingCard } from "./BookingCard";
import { BookingListSection } from "./BookingListSection";
import { WorksEmptyState } from "./WorksEmptyState";
import type { BookingListItemDTO, DayBucket, QuoteRequestCalendarDTO } from "@/types/booking";
import { QUOTE_CATEGORY_EMOJIS, QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import { submitWorkReport } from "@/app/actions/booking-actions";

const CATEGORY_DOT_COLORS: Record<string, string> = {
  "move-in": "bg-blue-500",
  office: "bg-emerald-500",
  aircon: "bg-sky-500",
  "move-out": "bg-violet-500",
  special: "bg-rose-500",
  regular: "bg-amber-500",
};

interface Props {
  bookings: BookingListItemDTO[];
  requests?: QuoteRequestCalendarDTO[];
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toKstDateString(ms: number): string {
  const date = new Date(ms + 9 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function groupByBucket(
  items: BookingListItemDTO[],
): Record<DayBucket, BookingListItemDTO[]> {
  const result: Record<DayBucket, BookingListItemDTO[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    past: [],
  };
  for (const item of items) {
    result[item.bucket].push(item);
  }
  return result;
}

function CalendarRequestCard({ request }: { request: QuoteRequestCalendarDTO }) {
  const emoji = QUOTE_CATEGORY_EMOJIS[request.category];
  const categoryLabel = QUOTE_CATEGORY_LABELS[request.category];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/15 p-4.5 dark:border-amber-950/30 dark:bg-amber-950/10">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
          {emoji} {categoryLabel} · 대기중
        </span>
        <span className="text-[11px] font-semibold text-zinc-500">
          경쟁 {request.competitorsCount}명
        </span>
      </div>

      <h5 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
        {request.regionLabel} · {request.sizeLabel}
        <span className="ml-1.5 text-[11px] font-normal text-zinc-400">· {request.distanceLabel}</span>
      </h5>

      {request.note && (
        <p className="line-clamp-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-655 dark:bg-zinc-900 dark:text-zinc-450">
          {request.note}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-dashed border-amber-250/50 dark:border-amber-950/20">
        <span className="text-[11px] font-medium text-zinc-500">
          표준 시세: <span className="font-bold text-zinc-700 dark:text-zinc-300">{request.priceRange || "협의"}</span>
        </span>
        <Link
          href={`/provider/requests/${request.id}/propose`}
          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all"
        >
          제안하기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function WorksCalendar({ bookings, requests = [] }: Props) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isPending, startTransition] = useTransition();

  const todayStr = toKstDateString(Date.now());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [bookingsState, setBookingsState] = useState<BookingListItemDTO[]>(bookings);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Report Form State
  const [reportingBookingId, setReportingBookingId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState<string>("완료");
  const [reportChecklist, setReportChecklist] = useState<string[]>([
    "바닥 청소", "욕실 청소", "주방 청소", "창틀 청소", "쓰레기 정리"
  ]);
  const [reportNote, setReportNote] = useState<string>("");
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [y, m, d] = todayStr.split("-").map(Number);
  const [currentYear, setCurrentYear] = useState(y);
  const [currentMonth, setCurrentMonth] = useState(m - 1); // 0-11

  // Group bookings by date string (KST)
  const bookingsByDate: Record<string, BookingListItemDTO[]> = {};
  for (const b of bookingsState) {
    const dateStr = toKstDateString(b.scheduledAtMs);
    if (!bookingsByDate[dateStr]) {
      bookingsByDate[dateStr] = [];
    }
    bookingsByDate[dateStr].push(b);
  }

  // Group requests by date string (KST)
  const requestsByDate: Record<string, QuoteRequestCalendarDTO[]> = {};
  for (const r of requests) {
    if (r.preferredDateMs) {
      const dateStr = toKstDateString(r.preferredDateMs);
      if (!requestsByDate[dateStr]) {
        requestsByDate[dateStr] = [];
      }
      requestsByDate[dateStr].push(r);
    }
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleReportSubmit = () => {
    if (!reportingBookingId) return;

    startTransition(async () => {
      const result = await submitWorkReport({
        bookingId: reportingBookingId,
        completionStatus,
        checklist: reportChecklist,
        note: reportNote || null,
        photos: reportPhotos,
      });

      if (result.ok) {
        setBookingsState((prev) => 
          prev.map((b) => 
            b.id === reportingBookingId 
              ? { 
                  ...b, 
                  status: "completed" as const, 
                  report: { 
                    completionStatus, 
                    checklist: reportChecklist, 
                    note: reportNote || null, 
                    photos: reportPhotos, 
                    submittedAtMs: Date.now() 
                  } 
                } 
              : b
          )
        );
        showToast("보고서가 성공적으로 제출되었습니다!");
        setReportingBookingId(null);
        // Reset form
        setCompletionStatus("완료");
        setReportChecklist(["바닥 청소", "욕실 청소", "주방 청소", "창틀 청소", "쓰레기 정리"]);
        setReportNote("");
        setReportPhotos([]);
      } else {
        showToast(result.message);
      }
    });
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate 42 calendar slots
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const numDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const numDaysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  const days: Array<{ date: Date; isCurrentMonth: boolean; dateString: string }> = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = numDaysInPrevMonth - i;
    const d = new Date(prevMonthYear, prevMonth, dayNum);
    days.push({
      date: d,
      isCurrentMonth: false,
      dateString: toDateString(d),
    });
  }

  // Current month days
  for (let i = 1; i <= numDaysInMonth; i++) {
    const d = new Date(currentYear, currentMonth, i);
    days.push({
      date: d,
      isCurrentMonth: true,
      dateString: toDateString(d),
    });
  }

  // Next month padding (until 42 slots)
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const paddingNeeded = 42 - days.length;
  for (let i = 1; i <= paddingNeeded; i++) {
    const d = new Date(nextMonthYear, nextMonth, i);
    days.push({
      date: d,
      isCurrentMonth: false,
      dateString: toDateString(d),
    });
  }

  // Selected date details
  const selectedBookings = bookingsByDate[selectedDateStr] || [];
  const selectedRequests = requestsByDate[selectedDateStr] || [];
  
  // Format the selected date label (e.g., 6월 5일 금요일)
  const getSelectedDateLabel = () => {
    const [yVal, mVal, dVal] = selectedDateStr.split("-").map(Number);
    const dateObj = new Date(yVal, mVal - 1, dVal);
    const month = dateObj ? dateObj.getMonth() + 1 : 1;
    const day = dateObj ? dateObj.getDate() : 1;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = dateObj ? weekdays[dateObj.getDay()] : "일";
    return `${month}월 ${day}일 (${dayOfWeek}요일)`;
  };

  // Grouped list data for List View
  const listGroups = groupByBucket(bookingsState);

  return (
    <div className="space-y-5">
      {/* CSS Animation Keyframes Inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />

      {/* View Switcher Toggle */}
      <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/60">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
            viewMode === "calendar"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
          }`}
        >
          <CalendarIcon className="h-4.5 w-4.5" />
          달력 보기
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
            viewMode === "list"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
          }`}
        >
          <List className="h-4.5 w-4.5" />
          목록 보기
        </button>
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-4">
          {/* Calendar Box */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-zinc-855 dark:bg-zinc-950">
            {/* Calendar Header */}
            <div className="mb-4.5 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                {currentYear}년 {currentMonth + 1}월
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                  aria-label="다음 달"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2 text-center text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500">
              <div className="text-rose-500">일</div>
              <div>월</div>
              <div>화</div>
              <div>수</div>
              <div>목</div>
              <div>금</div>
              <div className="text-blue-500">토</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
              {days.map((day, idx) => {
                const dayBookings = bookingsByDate[day.dateString] || [];
                const dayRequests = requestsByDate[day.dateString] || [];
                const isSelected = selectedDateStr === day.dateString;
                const isToday = todayStr === day.dateString;
                const dayNum = day.date.getDate();
                const dayOfWeek = day.date.getDay();

                const hasUpcomingJob = dayBookings.some((b) => b.status === "confirmed" && day.dateString >= todayStr);
                const hasNewRequest = dayRequests.length > 0;
                const hasReportPending = dayBookings.some((b) => b.status === "confirmed" && day.dateString < todayStr);
                const hasReportCompleted = dayBookings.some((b) => b.status === "completed");

                let cellBgStyle = "hover:bg-zinc-100 dark:hover:bg-zinc-900/40";
                let textColor = "text-zinc-850 dark:text-zinc-200";
                if (!day.isCurrentMonth) {
                  textColor = "text-zinc-300 dark:text-zinc-700";
                } else if (dayOfWeek === 0) {
                  textColor = "text-rose-500";
                } else if (dayOfWeek === 6) {
                  textColor = "text-blue-500";
                }

                if (isSelected) {
                  cellBgStyle = "bg-[#2563EB] shadow-md shadow-blue-500/20 scale-105 active:scale-95";
                  textColor = "text-white";
                } else if (isToday) {
                  cellBgStyle = "border border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20";
                  textColor = "text-[#2563EB]";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDateStr(day.dateString);
                      setIsModalOpen(true);
                    }}
                    className="relative flex flex-col items-center py-1.5 focus:outline-hidden group"
                  >
                    {/* Day Selection Circle Background */}
                    <div
                      className={`relative flex h-8.5 w-8.5 items-center justify-center rounded-full text-xs font-bold transition-all ${cellBgStyle} ${textColor}`}
                    >
                      {dayNum}

                      {/* Top-Right Report Pending Indicator (Red dot) */}
                      {hasReportPending && (
                        <span 
                          className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950 animate-pulse" 
                          title="보고서 미작성"
                        />
                      )}
                    </div>

                    {/* Booking & Request indicator dots */}
                    <div className="mt-1 flex gap-1 justify-center w-full h-1">
                      {hasUpcomingJob && (
                        <span className="h-1 w-1 rounded-full bg-[#2563EB]" title="확정 작업 예정" />
                      )}
                      {hasNewRequest && (
                        <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" title="신규 요청" />
                      )}
                      {hasReportCompleted && (
                        <span className="h-1 w-1 rounded-full bg-emerald-500" title="보고서 제출 완료" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend (범례) */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-xl bg-zinc-50/60 p-2.5 text-[10px] font-extrabold text-zinc-500 dark:bg-zinc-900/30 dark:text-zinc-400 border border-zinc-100/50 dark:border-zinc-900/60 leading-none">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                확정 작업
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                신규 요청
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                보고서 필요
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                보고서 완료
              </span>
            </div>
          </div>

          {/* Calendar Bottom Guide */}
          <div className="mt-4 rounded-[20px] bg-zinc-50/70 p-4 text-center dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-5">
              💡 달력의 날짜를 누르면 해당 날짜의 <span className="font-bold text-[#2563EB]">확정 일정</span> 및 <span className="font-bold text-amber-600">계약 가능한 작업 목록</span>이 모달 창으로 뜹니다.
            </p>
          </div>

          {/* Daily Schedule details modal (Popup/Bottom-sheet) */}
          {isModalOpen && (
            <div 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-[fadeIn_0.2s_ease-out]"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white rounded-[28px] p-5.5 shadow-2xl dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 max-h-[82vh] flex flex-col gap-4 animate-[scaleIn_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800 shrink-0">
                  <h4 className="text-[15px] font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {getSelectedDateLabel()} 일정 상세
                  </h4>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    aria-label="닫기"
                  >
                    <X className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-5 pr-1.5 min-h-0">
                  {/* Part 1: Confirmed Bookings */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 pl-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                      확정된 작업 ({selectedBookings.length}건)
                    </h5>
                    {selectedBookings.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1 pl-1">
                        확정된 작업 일정이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedBookings.map((b) => {
                          const isPast = toKstDateString(b.scheduledAtMs) < todayStr;
                          const needsReport = b.status === "confirmed" && isPast;
                          const reportCompleted = b.status === "completed";
                          
                          return (
                            <div 
                              key={b.id} 
                              className={`rounded-2xl border p-4.5 flex flex-col gap-3 transition-all ${
                                needsReport 
                                  ? "border-rose-200 bg-rose-50/5 dark:border-rose-950/20" 
                                  : reportCompleted 
                                  ? "border-emerald-200 bg-emerald-50/5 dark:border-emerald-950/20"
                                  : "border-zinc-200 bg-white dark:border-zinc-855 dark:bg-zinc-900/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 leading-none">
                                  {QUOTE_CATEGORY_LABELS[b.category]}
                                </span>
                                
                                {/* Status Badge */}
                                {needsReport ? (
                                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30 leading-none">
                                    보고서 대기 📄
                                  </span>
                                ) : reportCompleted ? (
                                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-rose-900/30 leading-none">
                                    보고서 완료 ✓
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-rose-900/30 leading-none">
                                    작업 예정 🗓️
                                  </span>
                                )}
                              </div>

                              <div>
                                <h6 className="text-[14px] font-black text-zinc-900 dark:text-zinc-50 leading-snug">
                                  {b.counterpartName} 고객님 · {b.regionLabel}
                                </h6>
                                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 mt-1">
                                  시간: {new Date(b.scheduledAtMs).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 총 {b.totalAmount.toLocaleString()}원
                                </p>
                              </div>

                              {/* Report submission details */}
                              {reportCompleted && b.report && (
                                <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-650 dark:bg-zinc-900 dark:text-zinc-455 border border-zinc-105 dark:border-zinc-850 flex flex-col gap-1.5 leading-relaxed">
                                  <div className="flex justify-between items-center text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 border-b border-zinc-150/45 pb-1 dark:border-zinc-800">
                                    <span>상태: {b.report.completionStatus}</span>
                                    <span>작성: {new Date(b.report.submittedAtMs).toLocaleDateString()}</span>
                                  </div>
                                  {b.report.checklist.length > 0 && (
                                    <p className="font-bold text-zinc-700 dark:text-zinc-350">
                                      ✓ 수행: {b.report.checklist.join(", ")}
                                    </p>
                                  )}
                                  {b.report.note && (
                                    <p className="italic text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-150/40">
                                      " {b.report.note} "
                                    </p>
                                  )}
                                  {b.report.photos && b.report.photos.length > 0 && (
                                    <div className="flex gap-1.5 mt-1">
                                      {b.report.photos.map((url, imgIdx) => (
                                        <div key={imgIdx} className="relative w-11 h-11 rounded-lg overflow-hidden border border-zinc-150 dark:border-zinc-800">
                                          <img src={url} alt="보고 사진" className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Write Report Action Button */}
                              {needsReport && (
                                <button
                                  type="button"
                                  onClick={() => setReportingBookingId(b.id)}
                                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 shadow-[0_4px_12px_rgba(225,29,72,0.15)] border-b-[3px] border-b-rose-800 transition-all active:scale-[0.98] active:translate-y-[1px]"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  보고서 작성하기
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Part 2: Inbound Requests */}
                  <div className="space-y-3 pt-3 border-t border-dashed border-zinc-150 dark:border-zinc-800">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1.5 pl-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      계약 가능한 작업 요청 ({selectedRequests.length}건)
                    </h5>
                    {selectedRequests.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1 pl-1">
                        이 날짜에 대기 중인 신규 요청서가 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedRequests.map((req) => (
                          <CalendarRequestCard key={req.id} request={req} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-zinc-100 pt-3 flex justify-end dark:border-zinc-800 shrink-0">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition-all dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View (Grouped) */
        <div className="space-y-2">
          {bookingsState.length === 0 ? (
            <WorksEmptyState />
          ) : (
            <div className="animate-[scaleIn_0.25s_ease-out]">
              <BookingListSection bucket="today" items={listGroups.today} />
              <BookingListSection bucket="tomorrow" items={listGroups.tomorrow} />
              <BookingListSection bucket="thisWeek" items={listGroups.thisWeek} />
              <BookingListSection bucket="later" items={listGroups.later} />
              <BookingListSection bucket="past" items={listGroups.past} />
            </div>
          )}
        </div>
      )}

      {/* Write Report Modal Overlay */}
      {reportingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4 animate-[scaleIn_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">
                작업 완료 보고서 작성
              </h3>
              <button
                onClick={() => setReportingBookingId(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. 작업 완료 여부 */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  1. 작업 완료 여부
                </span>
                <div className="flex gap-2">
                  {["완료", "부분 완료", "추가 작업 필요"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCompletionStatus(status)}
                      className={`flex-1 rounded-xl py-2 px-1 text-[11px] font-bold border transition-all ${
                        completionStatus === status
                          ? "bg-[#2563EB] text-white border-[#2563EB] dark:bg-[#3B82F6] dark:border-[#3B82F6]"
                          : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 작업 사진 */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  2. 작업 현장 사진
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {reportPhotos.map((photo, pIdx) => (
                    <div key={pIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-150 dark:border-zinc-800">
                      <img src={photo} alt="작업 보고 사진" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReportPhotos(prev => prev.filter((_, i) => i !== pIdx))}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {reportPhotos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setReportPhotos(prev => [...prev, "/images/clean_office_cafe.png"])}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-zinc-300 hover:border-blue-400 dark:border-zinc-800 text-zinc-400 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <span>+ 추가</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. 작업 내용 체크 */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  3. 작업 세부 체크리스트
                </span>
                <div className="flex flex-col gap-2 rounded-xl border border-zinc-150 p-3.5 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
                  {["바닥 청소", "욕실 청소", "주방 청소", "창틀 청소", "쓰레기 정리"].map((item) => {
                    const checked = reportChecklist.includes(item);
                    return (
                      <label key={item} className="flex items-center gap-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setReportChecklist(prev => prev.filter(x => x !== item));
                            } else {
                              setReportChecklist(prev => [...prev, item]);
                            }
                          }}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={checked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 line-through font-medium"}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. 고객 전달 메시지 */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  4. 고객 전달 메시지 / 특이사항
                </span>
                <textarea
                  rows={3}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="청소 완료 상세 내용이나 전달하실 메시지를 기재해 주세요."
                  className="w-full text-xs font-bold border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleReportSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3.5 shadow-md border-b-[3px] border-b-rose-800 transition-all active:scale-[0.98] active:translate-y-[1px]"
            >
              {isPending ? "보고서 제출 중..." : "제출 및 작업 완료 처리"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 z-55 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg dark:bg-zinc-105 dark:text-zinc-900 transition-all animate-[fadeIn_0.2s_ease-out]"
          style={{ bottom: "calc(var(--bottom-nav-height) + 1.5rem)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
