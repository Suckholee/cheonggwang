import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import RequestsList from "@/components/admin/RequestsList";

export const metadata = {
  title: "접수/예약 관리 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminRequestsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-55">접수 및 예약 관리</h1>
        <p className="mt-1 text-xs text-zinc-500">
          견적 요청 접수부터 정산 완료까지의 8단계 라이프사이클을 추적하고 배정/결제를 관리합니다.
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/requests");
  const requests = await quoteRequestRepository.listAll({ limit: 200 });
  return <RequestsList requests={requests} />;
}

function ListSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  );
}
