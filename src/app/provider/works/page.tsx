import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { bookingRepository } from "@/lib/firebase/booking-repository";
import {
  computeDayBucket,
  formatScheduledLabel,
} from "@/domain/booking-day-bucket";
import { BookingListSection } from "@/components/booking/BookingListSection";
import { WorksEmptyState } from "@/components/booking/WorksEmptyState";
import type {
  Booking,
  BookingListItemDTO,
  DayBucket,
} from "@/types/booking";

export const metadata = {
  title: "작업 관리 · 청광",
};

export default function ProviderWorksPage() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-6 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-bold">작업 관리</h1>
        <p className="mt-1 text-xs text-zinc-500">확정된 일정을 관리하세요</p>
      </header>
      <Suspense fallback={<WorksSkeleton />}>
        <WorksBody />
      </Suspense>
    </div>
  );
}

function WorksSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="불러오는 중">
      <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
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
  if (!providerId) {
    redirect("/signup-provider");
  }

  let bookings: Booking[] = [];
  try {
    bookings = await bookingRepository.listForProvider(providerId);
  } catch (e) {
    console.warn("[booking] listForProvider failed:", e);
  }

  if (bookings.length === 0) {
    return <WorksEmptyState />;
  }

  const items = bookings.map(toListItemDTO);
  const groups = groupByBucket(items);

  return (
    <>
      <BookingListSection bucket="today" items={groups.today} />
      <BookingListSection bucket="tomorrow" items={groups.tomorrow} />
      <BookingListSection bucket="thisWeek" items={groups.thisWeek} />
      <BookingListSection bucket="later" items={groups.later} />
      <BookingListSection bucket="past" items={groups.past} />
    </>
  );
}
