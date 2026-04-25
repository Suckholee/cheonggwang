import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import PartnerIssueForm from "@/components/admin/PartnerIssueForm";

export const metadata = {
  title: "새 partner 발급 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPartnerNewPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">새 partner 발급</h1>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Suspense fallback={<FormSkeleton />}>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/partners/new");
  return <PartnerIssueForm />;
}

function FormSkeleton() {
  return <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />;
}
