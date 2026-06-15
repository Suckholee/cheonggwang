"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  MessageCircle, 
  Check, 
  Inbox, 
  Calendar, 
  Users, 
  ChevronDown, 
  MapPin, 
  Home, 
  Sparkles 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { passRequest } from "@/app/actions/quote-response-actions";
import type { QuoteRequest } from "@/types/quote-request";
import type { Provider } from "@/types/provider";
import {
  QUOTE_CATEGORY_EMOJIS,
  QUOTE_CATEGORY_LABELS,
} from "@/domain/quote-category";

interface Props {
  initialRequests: QuoteRequest[];
  provider: Provider;
}

function approxDistanceLabel(
  providerRegions: Provider["regions"],
  region: QuoteRequest["region"],
): string {
  const exact = providerRegions.some(
    (r) => r.city === region.city && r.district === region.district,
  );
  if (exact) return "동네";
  const sameCity = providerRegions.some((r) => r.city === region.city);
  if (sameCity) return "같은 시";
  return "다른 지역";
}

function formatPreferredDate(preferredDateVal: Date | string | null): string {
  if (!preferredDateVal) return "협의";
  const date = typeof preferredDateVal === "string" ? new Date(preferredDateVal) : preferredDateVal;
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const hour = kst.getUTCHours();
  const ampm = hour < 12 ? "오전" : "오후";
  return `${m}월 ${d}일(${dow}) ${ampm}`;
}

function standardPriceRange(
  provider: Provider,
  category: QuoteRequest["category"],
): string | null {
  if (!provider.priceBook || provider.priceBook.length === 0) return null;
  const entry = provider.priceBook.find((p) => p.category === category);
  if (!entry) return null;
  const low = Math.round((entry.basePrice * 0.8) / 10000);
  const high = Math.round((entry.basePrice * 1.2) / 10000);
  return `${low}~${high}만원`;
}

export function TriageClient({ initialRequests, provider }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<QuoteRequest[]>(initialRequests);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [passingRequestId, setPassingRequestId] = useState<string | null>(null);

  const total = requests.length;

  if (total === 0) {
    return <EmptyQueue />;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function handlePass(requestId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPassingRequestId(requestId);
    startTransition(async () => {
      const result = await passRequest({ requestId });
      if (result.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (expandedRequestId === requestId) {
          setExpandedRequestId(null);
        }
        showToast("관심 없는 요청으로 처리되었습니다.");
      } else {
        showToast(result.message);
      }
      setPassingRequestId(null);
    });
  }

  function handleAsk(e: React.MouseEvent) {
    e.stopPropagation();
    showToast("문의 기능은 v1.2에 추가됩니다");
  }

  function handlePropose(requestId: string, e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/provider/requests/${requestId}/propose`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* CSS Animation Keyframes Inject */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); max-height: 400px; }
          to { opacity: 0; transform: scale(0.95); max-height: 0; padding-top: 0; padding-bottom: 0; margin-top: 0; margin-bottom: 0; border: none; overflow: hidden; }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />

      <div className="flex items-center justify-between px-1 mb-1">
        <h2 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400">
          대기 중인 요청 <span className="text-[#2563EB] dark:text-[#3B82F6]">{total}건</span>
        </h2>
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
          요청 카드를 선택하면 상세 정보를 볼 수 있습니다.
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {requests.map((req, idx) => {
          const isExpanded = expandedRequestId === req.id;
          const isPassing = passingRequestId === req.id;
          const emoji = QUOTE_CATEGORY_EMOJIS[req.category];
          const categoryLabel = QUOTE_CATEGORY_LABELS[req.category];
          const distance = approxDistanceLabel(provider.regions, req.region);
          const sizeLabel = req.size
            ? `${req.size}평${req.roomType ? ` · ${req.roomType}` : ""}`
            : req.roomType ?? "-";

          return (
            <div
              key={req.id}
              onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
              className={`group overflow-hidden rounded-[24px] border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.015)] transition-all duration-300 cursor-pointer animate-[slideUp_0.4s_ease-out_both] ${
                isPassing ? "animate-[fadeOut_0.35s_ease-out_forwards]" : ""
              } ${
                isExpanded 
                  ? "border-blue-200/80 ring-4 ring-blue-50/40 dark:border-blue-900/30 dark:ring-blue-950/10 dark:bg-zinc-950" 
                  : "border-zinc-200/50 hover:border-zinc-300 dark:border-zinc-850 dark:bg-zinc-950 hover:scale-[1.005]"
              }`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Item Summary Header */}
              <div className="p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Category Chip */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border leading-none ${
                      req.category === "move-in" ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400" :
                      req.category === "office" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400" :
                      req.category === "aircon" ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/20 dark:border-sky-900/40 dark:text-sky-400" :
                      req.category === "move-out" ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400" :
                      req.category === "special" ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400" :
                      "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400"
                    }`}>
                      {emoji} {categoryLabel}
                    </span>
                    <span className="rounded-full bg-zinc-50 border border-zinc-150 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 leading-none">
                      비정기 1회
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                      · {distance}
                    </span>
                  </div>
                  <ChevronDown className={`h-4.5 w-4.5 text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-180 text-blue-500" : ""}`} />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-[17px] font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                    {req.region.district} · {sizeLabel}
                  </h3>
                  
                  {/* Short Meta Info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{formatPreferredDate(req.preferredDate)}</span>
                    </span>
                    <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-400" />
                      <span>경쟁 {req.notifiedProviderIds.length}명</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable details */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-zinc-50/40 dark:bg-zinc-900/10 ${
                isExpanded ? "max-h-[800px] border-t border-zinc-100 dark:border-zinc-900/40 opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="p-5 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
                  {/* Photos Grid if any */}
                  {req.photos.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        현장 사진 ({req.photos.length}장)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {req.photos.map((photo) => (
                          <div
                            key={photo.path}
                            className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-800 shadow-sm"
                          >
                            <Image
                              src={photo.url}
                              alt="요청 사진"
                              fill
                              sizes="(max-width: 640px) 30vw, 150px"
                              className="object-cover hover:scale-105 transition-transform duration-250"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer requests/note */}
                  {req.note && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        고객 요청사항
                      </span>
                      <p className="whitespace-pre-wrap rounded-2xl bg-white border border-zinc-150 px-4 py-3.5 text-[13px] font-semibold text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800/80 dark:text-zinc-300 leading-relaxed shadow-xs">
                        {req.note}
                      </p>
                    </div>
                  )}

                  {/* Standard price range if available */}
                  {standardPriceRange(provider, req.category) && (
                    <div className="rounded-2xl bg-[#EFF6FF] border border-blue-100/50 px-4 py-3.5 dark:bg-blue-950/15 dark:border-blue-900/35">
                      <span className="text-[10px] font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-wider leading-none block mb-1">
                        표준 견적 범위
                      </span>
                      <span className="text-[18px] font-black text-[#2563EB] dark:text-[#3B82F6]">
                        {standardPriceRange(provider, req.category)}
                      </span>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <DetailRow
                      icon={<Calendar className="h-4 w-4 text-zinc-400" />}
                      label="희망 일정"
                      value={formatPreferredDate(req.preferredDate)}
                    />
                    <DetailRow
                      icon={<MapPin className="h-4 w-4 text-zinc-400" />}
                      label="지역"
                      value={req.region.district}
                    />
                    <DetailRow
                      icon={<Home className="h-4 w-4 text-zinc-400" />}
                      label="공간"
                      value={sizeLabel}
                    />
                    <DetailRow
                      icon={<Users className="h-4 w-4 text-zinc-400" />}
                      label="경쟁 청명"
                      value={`${req.notifiedProviderIds.length}명`}
                    />
                  </div>

                  {/* Action buttons inside the card */}
                  <div className="flex gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <button
                      type="button"
                      onClick={(e) => handlePass(req.id, e)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 border-b-[3px] border-b-zinc-300 py-3 text-xs font-bold text-zinc-750 active:scale-[0.98] transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-850"
                    >
                      <X className="h-4 w-4" />
                      관심없음
                    </button>
                    <button
                      type="button"
                      onClick={handleAsk}
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-400 opacity-40 cursor-not-allowed dark:border-zinc-850 dark:bg-zinc-900"
                    >
                      <MessageCircle className="h-4 w-4" />
                      문의
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handlePropose(req.id, e)}
                      disabled={isPending}
                      className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white hover:scale-[1.01] active:scale-[0.99] active:translate-y-[1px] transition-all"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                      제안하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
          style={{ bottom: "calc(var(--bottom-nav-height) + 1.5rem)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-zinc-50/70 border border-zinc-100/50 px-3.5 py-2.5 dark:bg-zinc-900/50 dark:border-zinc-850/50">
      <span className="mt-0.5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="truncate text-[13px] font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="overflow-hidden flex flex-col items-center rounded-[24px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-zinc-900 dark:border-zinc-800">
      <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-950">
        <Image
          src="/images/clean_office_cafe.png"
          alt="받은 요청 없음"
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
        />
        {/* Soft mask overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-zinc-900 dark:via-zinc-900/40" />

        {/* Floating icon badge */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-[#2563EB] text-white shadow-md dark:border-zinc-900 dark:bg-[#3B82F6]">
          <Inbox className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </div>

      <div className="px-5 pb-6 pt-10 text-center flex flex-col items-center">
        <h2 className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-50">
          모든 요청을 확인했어요!
        </h2>
        <p className="mt-1.5 max-w-xs text-xs font-bold text-zinc-400 dark:text-zinc-500 leading-normal">
          주변 지역에 새로운 청소 견적 요청이 등록되면 가장 먼저 알려드릴게요.
        </p>

        <Link
          href="/provider/home"
          className="mt-6 inline-flex w-full min-w-[200px] items-center justify-center gap-1.5 rounded-xl bg-white text-zinc-750 font-extrabold border border-zinc-200 border-b-[3px] border-b-zinc-300 px-4 py-2.5 text-xs shadow-xs hover:border-[#2563EB]/40 hover:scale-[1.02] active:scale-[0.96] active:translate-y-[1px] transition-all dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
