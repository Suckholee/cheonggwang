"use client";

import { useState } from "react";
import Link from "next/link";
import { RequestPreviewCard } from "./RequestPreviewCard";
import { EmptyRequestsHint } from "./EmptyRequestsHint";
import type { Provider } from "@/types/provider";
import type { QuoteRequest } from "@/types/quote-request";
import type { QuoteRequestPreviewDTO } from "@/types/dashboard";
import { QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/domain/quote-category";

interface Props {
  provider: Provider;
  requests: QuoteRequest[];
  totalCount: number;
}

function toPreviewDTO(request: QuoteRequest): QuoteRequestPreviewDTO {
  const regionLabel =
    [request.region.city, request.region.district].filter(Boolean).join(" ") ||
    "지역 미지정";
  
  // Safe date checking across server-client boundary
  const createdAtMs = request.createdAt instanceof Date 
    ? request.createdAt.getTime() 
    : new Date(request.createdAt).getTime();

  return {
    id: request.id,
    category: request.category,
    regionLabel,
    sizeLabel: request.size != null ? `${request.size}평` : null,
    createdAtMs,
    note: request.note?.slice(0, 80) ?? null,
  };
}

export function ActiveRequestsSection({
  provider,
  requests,
  totalCount,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "waiting">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  if (totalCount === 0) {
    return (
      <section aria-labelledby="active-requests-heading" className="mb-6">
        <h2
          id="active-requests-heading"
          className="mb-3 text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
        >
          수신 요청
        </h2>
        <EmptyRequestsHint
          emphasizeCategories={(provider.categories?.length ?? 0) < 3}
          emphasizeProfile={
            !provider.description ||
            (provider.priceBook?.length ?? 0) === 0
          }
        />
      </section>
    );
  }

  const allPreviews = requests.map(toPreviewDTO);

  // Apply client-side filters
  const filteredPreviews = allPreviews.filter((req) => {
    // 1. Status Filter
    if (statusFilter === "unread") {
      const ageMs = Date.now() - req.createdAtMs;
      // Filter requests older than 24 hours
      if (ageMs > 24 * 60 * 60 * 1000) return false;
    }
    // 2. Category Filter
    if (categoryFilter !== "all" && req.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const displayPreviews = filteredPreviews.slice(0, 3);

  return (
    <section aria-labelledby="active-requests-heading" className="mb-6">
      <div className="mb-3.5 flex items-center justify-between">
        <h2
          id="active-requests-heading"
          className="text-[14px] font-extrabold text-zinc-800 dark:text-zinc-200"
        >
          수신 요청{" "}
          <span className="ml-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-550">
            ({totalCount}건)
          </span>
        </h2>
        <Link
          href="/provider/requests"
          className="text-xs font-extrabold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#3B82F6]"
        >
          전체 보기 →
        </Link>
      </div>

      {/* Filter Chips Container */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Status Filters (Row 1) */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mr-1.5">상태</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition-all border ${
              statusFilter === "all"
                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
            }`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("unread")}
            className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition-all border ${
              statusFilter === "unread"
                ? "bg-rose-500 border-rose-500 text-white"
                : "bg-white border-zinc-200 text-zinc-650 hover:bg-rose-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
            }`}
          >
            미확인
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("waiting")}
            className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition-all border ${
              statusFilter === "waiting"
                ? "bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500"
                : "bg-white border-zinc-200 text-zinc-650 hover:bg-[#2563EB]/10 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
            }`}
          >
            대기중
          </button>
        </div>

        {/* Category Filters (Row 2) */}
        {provider.categories && provider.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center border-t border-zinc-100/70 dark:border-zinc-850/80 pt-2 mt-0.5">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mr-1.5">유형</span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition-all border ${
                categoryFilter === "all"
                  ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                  : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
              }`}
            >
              전체
            </button>
            {provider.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition-all border ${
                  categoryFilter === cat
                    ? "bg-[#2563EB] border-[#2563EB] text-white dark:bg-[#3B82F6] dark:border-[#3B82F6]"
                    : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-850"
                }`}
              >
                {QUOTE_CATEGORY_LABELS[cat as QuoteCategory] || cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {displayPreviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/30 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
          <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
            해당 조건의 수신 요청이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayPreviews.map((request) => (
            <RequestPreviewCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </section>
  );
}
