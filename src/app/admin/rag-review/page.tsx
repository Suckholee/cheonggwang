import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerProfileRepository } from "@/lib/firebase/partner-profile-repository";
import RagReviewList from "@/components/admin/RagReviewList";

export const metadata = {
  title: "RAG 검토 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminRagReviewPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">⏳ 검토 대기 RAG</h1>
        <p className="mt-1 text-sm text-zinc-500">
          파트너가 자동 검열 통과 못한 매장 RAG 자료를 검토합니다.
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
  await requireAdminPage("/admin/rag-review");
  const items = await partnerProfileRepository.listPendingReviews(100);
  return <RagReviewList items={items} />;
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}
