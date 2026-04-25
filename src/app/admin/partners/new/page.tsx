import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import IssuanceConsole from "@/components/admin/IssuanceConsole";

/**
 * v1.10 partner-issue-from-users · §6.1 — admin 발급 콘솔 호스팅.
 * 기존 PartnerIssueForm은 IssuanceConsole의 폴백 탭에서 그대로 노출 (R1·cycle #20 회귀 없음).
 */

export const metadata = {
  title: "새 의뢰업체 발급 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPartnerNewPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-bold">새 의뢰업체 발급</h1>
      <Suspense fallback={<ConsoleSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/partners/new");
  return <IssuanceConsole />;
}

function ConsoleSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
