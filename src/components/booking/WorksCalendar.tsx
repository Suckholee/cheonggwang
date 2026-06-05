"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, List, CalendarDays, MapPin, Home, Users, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { BookingCard } from "./BookingCard";
import { BookingListSection } from "./BookingListSection";
import { WorksEmptyState } from "./WorksEmptyState";
import type { BookingListItemDTO, DayBucket, QuoteRequestCalendarDTO } from "@/types/booking";
import { QUOTE_CATEGORY_EMOJIS, QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

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
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/15 p-4 dark:border-amber-950/30 dark:bg-amber-950/10">
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
        <p className="line-clamp-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400">
          {request.note}
        </p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-dashed border-amber-200/50 dark:border-amber-950/20">
        <span className="text-[11px] font-medium text-zinc-500">
          표준 시세: <span className="font-bold text-zinc-700 dark:text-zinc-300">{request.priceRange || "협의"}</span>
        </span>
        <Link
          href={`/provider/requests/${request.id}/propose`}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-amber-600 active:scale-95 transition-all"
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const todayStr = toKstDateString(Date.now());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const handleDayClick = (dateString: string) => {
    setSelectedDateStr(dateString);
    dialogRef.current?.showModal();
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        dialogRef.current.close();
      }
    }
  };

  const [y, m, d] = todayStr.split("-").map(Number);
  const [currentYear, setCurrentYear] = useState(y);
  const [currentMonth, setCurrentMonth] = useState(m - 1); // 0-11

  // Group bookings by date string (KST)
  const bookingsByDate: Record<string, BookingListItemDTO[]> = {};
  for (const b of bookings) {
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
    return `${month}월 ${day}일 (${dayOfWeek})`;
  };

  // Grouped list data for List View
  const listGroups = groupByBucket(bookings);

  return (
    <div className="space-y-6">
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
          <Calendar className="h-4.5 w-4.5" />
          달력으로 보기
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
          그룹 리스트로 보기
        </button>
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-5">
          {/* Calendar Box */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-950">
            {/* Calendar Header */}
            <div className="mb-4.5 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                {currentYear}년 {currentMonth + 1}월
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
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

                let cellBgStyle = "";
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
                  cellBgStyle = "border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20";
                  textColor = "text-[#2563EB]";
                } else if (dayRequests.length > 0) {
                  cellBgStyle = "border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10 hover:bg-amber-100/60 dark:hover:bg-amber-950/25";
                  if (day.isCurrentMonth && dayOfWeek !== 0 && dayOfWeek !== 6) {
                    textColor = "text-amber-700 dark:text-amber-400";
                  }
                } else {
                  cellBgStyle = "hover:bg-zinc-100 dark:hover:bg-zinc-900";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day.dateString)}
                    className="relative flex flex-col items-center py-1.5 focus:outline-hidden"
                  >
                    {/* Day Selection Circle Background */}
                    <div
                      className={`flex h-8.5 w-8.5 items-center justify-center rounded-full text-xs font-bold transition-all ${cellBgStyle} ${textColor}`}
                    >
                      {dayNum}
                    </div>

                    {/* Booking & Request indicator dots */}
                    <div className="absolute bottom-0.5 flex gap-0.5 justify-center w-full h-1">
                      {/* Bookings (solid dots) */}
                      {dayBookings.slice(0, 3).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className={`h-1 w-1 rounded-full ${
                            CATEGORY_DOT_COLORS[b.category] || "bg-zinc-400"
                          }`}
                        />
                      ))}
                      {/* Requests (hollow amber rings) */}
                      {dayRequests.slice(0, 3 - Math.min(3, dayBookings.length)).map((r, rIdx) => (
                        <span
                          key={rIdx}
                          className="h-1 w-1 rounded-full border border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-transparent"
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Bottom Guide */}
          <div className="mt-5 rounded-[20px] bg-zinc-50/70 p-4 text-center dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-900">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-5">
              💡 달력의 날짜를 누르면 해당 날짜의 <span className="font-bold text-[#2563EB]">확정 일정</span> 및 <span className="font-bold text-amber-600">계약 가능한 작업 목록</span>이 모달 창으로 뜹니다.
            </p>
          </div>

          {/* Premium Dialog Modal */}
          <dialog
            ref={dialogRef}
            closedby="any"
            onClick={handleDialogClick}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-h-[80vh] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-[28px] border border-zinc-200/80 bg-white/98 p-5.5 shadow-2xl backdrop-blur-md focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950/98 animate-in fade-in zoom-in-95 duration-200"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className="mb-4.5 flex items-center justify-between border-b border-zinc-100 pb-3.5 dark:border-zinc-800">
              <h4 id="modal-title" className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                {getSelectedDateLabel()} 상세 일정
              </h4>
              <button
                onClick={() => dialogRef.current?.close()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 active:scale-90 transition-all dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Part 1: Confirmed Bookings */}
              <div className="space-y-2.5">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  확정된 일정 ({selectedBookings.length})
                </h5>
                {selectedBookings.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1 pl-1">
                    확정된 작업 일정이 없습니다.
                  </p>
                ) : (
                  <div role="list" className="space-y-2">
                    {selectedBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </div>
                )}
              </div>

              {/* Part 2: Inbound Requests (계약 가능한 작업 요청) */}
              <div className="space-y-2.5 pt-3 border-t border-dashed border-zinc-250/50 dark:border-zinc-800/50">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                  계약 가능한 작업 요청 ({selectedRequests.length})
                </h5>
                {selectedRequests.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1 pl-1">
                    이 날에 계약 가능한 작업 요청서가 없습니다.
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
            <div className="mt-5 border-t border-zinc-100 pt-3.5 flex justify-end dark:border-zinc-800">
              <button
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition-all dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                닫기
              </button>
            </div>
          </dialog>
        </div>
      ) : (
        /* List View (Grouped) */
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <WorksEmptyState />
          ) : (
            <>
              <BookingListSection bucket="today" items={listGroups.today} />
              <BookingListSection bucket="tomorrow" items={listGroups.tomorrow} />
              <BookingListSection bucket="thisWeek" items={listGroups.thisWeek} />
              <BookingListSection bucket="later" items={listGroups.later} />
              <BookingListSection bucket="past" items={listGroups.past} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
