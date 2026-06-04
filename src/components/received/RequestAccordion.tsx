"use client";

import { useState } from "react";
import { ChevronDown, Calendar, MapPin, Grid, MessageSquare } from "lucide-react";
import type { QuoteRequest } from "@/types/quote-request";
import { QuoteStepper } from "./QuoteStepper";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

interface Props {
  request: QuoteRequest;
}

function formatDate(date: Date | null): string {
  if (!date) return "협의 가능";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function RequestAccordion({ request }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const catLabel = QUOTE_CATEGORY_LABELS[request.category];
  const sizeLabel = request.size
    ? `${request.size}평${request.roomType ? ` · ${request.roomType}` : ""}`
    : request.roomType ?? "";

  return (
    <div className="relative z-20 mx-4 -mt-8 rounded-2xl border border-zinc-200 bg-white shadow-lg transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          내 요청서 보기
        </span>
        <ChevronDown
          className={`h-5 w-5 text-emerald-600 transition-transform duration-300 dark:text-emerald-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[500px] border-t border-zinc-100 opacity-100 dark:border-zinc-850" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-5 p-5">
          {/* Stepper progress inside request details */}
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-900">
            <QuoteStepper status={request.status} compact />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Grid className="mt-0.5 h-4 w-4 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-zinc-400">서비스 분야</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{catLabel}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-zinc-400">청소 위치</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {request.region.city} {request.region.district}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Grid className="mt-0.5 h-4 w-4 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-zinc-400">공간 크기</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {sizeLabel || "(미지정)"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-zinc-400">희망 날짜</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatDate(request.preferredDate)}
                </span>
              </div>
            </div>
          </div>

          {request.note && (
            <div className="flex flex-col gap-1.5 rounded-xl bg-zinc-50 p-3.5 text-xs dark:bg-zinc-900/50">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-350">
                <MessageSquare className="h-3.5 w-3.5" />
                상세 요청사항
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-all">
                {request.note}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
