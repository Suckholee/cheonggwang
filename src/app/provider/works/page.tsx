import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import { providerResponseRepository } from "@/lib/firebase/provider-response-repository";
import {
  computeDayBucket,
  formatScheduledLabel,
} from "@/domain/booking-day-bucket";
import { WorksEmptyState } from "@/components/booking/WorksEmptyState";
import { WorksCalendar } from "@/components/booking/WorksCalendar";
import type {
  Booking,
  BookingListItemDTO,
  QuoteRequestCalendarDTO,
} from "@/types/booking";
import type { QuoteRequest } from "@/types/quote-request";
import type { Provider } from "@/types/provider";
import type { QuoteCategory } from "@/domain/quote-category";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "작업 관리 · 청광",
};

export default function ProviderWorksPage() {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_18%,#ffffff_100%)] px-5 pt-3 pb-28 dark:bg-none">
      <header className="sticky top-0 z-40 -mx-5 mb-5 border-b border-white/70 bg-[#f4f9ff]/90 px-5 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href="/provider/home"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2.5} />
            </Link>
            <BrandLogo />
          </div>
          <span className="rounded-full border border-[#d8e6ff] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Partner
          </span>
        </div>
        <div className="mt-4 rounded-[28px] border border-[#dbe8fb] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_46%,#dcebff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(43,102,246,0.08)] dark:border-zinc-850 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]/70 dark:text-zinc-400">
            Schedule
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            작업 일정 관리
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-zinc-650 dark:text-zinc-400">
            매칭 완료되어 확정된 청소 작업 일정과 상세 정보들을 한눈에 확인하세요.
          </p>
        </div>
      </header>
      <Suspense fallback={<WorksSkeleton />}>
        <WorksBody />
      </Suspense>
    </div>
  );
}

function WorksSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="작업 목록 로딩 중">
      <div className="h-44 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-40 w-full rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

function toListItemDTO(b: Booking): BookingListItemDTO {
  const scheduledAtMs = b.scheduledAt.getTime();
  return {
    id: b.id,
    threadId: b.threadId,
    counterpartName: b.clientDisplayName,
    category: b.category,
    regionLabel: b.regionLabel,
    scheduledAtMs,
    scheduledLabel: formatScheduledLabel(scheduledAtMs),
    totalAmount: b.totalAmount,
    memo: b.memo,
    bucket: computeDayBucket(scheduledAtMs),
  };
}

function approxDistanceLabel(
  providerRegions: { city: string; district: string }[],
  region: { city: string; district: string },
): string {
  const exact = providerRegions.some(
    (r) => r.city === region.city && r.district === region.district,
  );
  if (exact) return "동네";
  const sameCity = providerRegions.some((r) => r.city === region.city);
  if (sameCity) return "같은 시";
  return "다른 지역";
}

function formatPreferredDate(date: Date | null): string {
  if (!date) return "협의";
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const hour = kst.getUTCHours();
  const ampm = hour < 12 ? "오전" : "오후";
  return `${m}월 ${d}일(${dow}) ${ampm}`;
}

function standardPriceRange(
  priceBook: { category: QuoteCategory; basePrice: number }[],
  category: QuoteCategory,
): string | null {
  if (!priceBook || priceBook.length === 0) return null;
  const entry = priceBook.find((p) => p.category === category);
  if (!entry) return null;
  const low = Math.round((entry.basePrice * 0.8) / 10000);
  const high = Math.round((entry.basePrice * 1.2) / 10000);
  return `${low}~${high}만원`;
}

function toRequestDTO(
  r: QuoteRequest,
  provider: Provider,
): QuoteRequestCalendarDTO {
  const sizeLabel = r.size
    ? `${r.size}평${r.roomType ? ` · ${r.roomType}` : ""}`
    : r.roomType ?? "-";
  
  return {
    id: r.id,
    category: r.category,
    regionLabel: r.region.district,
    sizeLabel,
    preferredDateMs: r.preferredDate ? r.preferredDate.getTime() : null,
    preferredDateLabel: formatPreferredDate(r.preferredDate),
    distanceLabel: approxDistanceLabel(provider.regions || [], r.region),
    competitorsCount: r.notifiedProviderIds.length,
    priceRange: standardPriceRange(provider.priceBook || [], r.category),
    note: r.note,
    photos: r.photos.map((p) => ({ url: p.url })),
  };
}

async function WorksBody() {
  const jar = await cookies();
  let uid: string;
  try {
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    redirect(`/login?next=${encodeURIComponent("/provider/works")}`);
  }

  const user = await userRepository.get(uid);
  const providerId = user?.providerId;
  console.log("[DEBUG] providerId:", providerId);
  if (!providerId) {
    redirect("/signup-provider");
  }

  const provider = await providerRepository.get(providerId);
  if (!provider) {
    redirect("/signup-provider");
  }

  let bookings: Booking[] = [];
  try {
    bookings = await bookingRepository.listForProvider(providerId);
  } catch (e) {
    console.warn("[booking] listForProvider failed:", e);
  }

  let requests: QuoteRequest[] = [];
  try {
    const excludeRequestIds =
      await providerResponseRepository.listRespondedRequestIds(providerId);
    requests = await quoteRequestRepository.listForTriage({
      providerCategories: provider.categories,
      excludeRequestIds,
      limit: 50,
    });
  } catch (e) {
    console.warn("[booking] listForTriage failed for works page:", e);
  }

  const items = bookings.map(toListItemDTO);
  const requestDTOs = requests.map((r) => toRequestDTO(r, provider));

  return <WorksCalendar bookings={items} requests={requestDTOs} />;
}
