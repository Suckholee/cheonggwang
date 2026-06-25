import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { quoteRequestRepository } from "@/lib/firebase/quote-request-repository";
import RequestDetailManager from "@/components/admin/RequestDetailManager";

export const metadata = {
  title: "접수 상세 관리 · 청광 운영",
  robots: { index: false, follow: false },
};

type Params = { requestId: string };

export default function AdminRequestDetailPage(props: {
  params: Promise<Params>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/requests"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-zinc-200 border-b-[3px] border-b-zinc-300 hover:border-zinc-350 active:scale-95 transition dark:bg-zinc-900 dark:border-zinc-800 dark:border-b-zinc-950"
        >
          <ChevronLeft className="h-5 w-5 text-zinc-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">접수 상세 관리</h1>
          <p className="text-xs text-zinc-500">
            상태 변경, 작업자 배정, 예약금 및 정산, 현장 작업 사진을 관리합니다.
          </p>
        </div>
      </div>

      <Suspense fallback={<DetailSkeleton />}>
        <Body params={props.params} />
      </Suspense>
    </div>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  const { requestId } = await params;
  await connection();
  await requireAdminPage(`/admin/requests/${requestId}`);

  const request = await quoteRequestRepository.get(requestId);
  if (!request) notFound();

  return <RequestDetailManager request={request} />;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
