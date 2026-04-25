import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import PartnersList from "@/components/admin/PartnersList";

export const metadata = {
  title: "Partners · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPartnersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">의뢰업체 (Partners)</h1>
        <Link
          href="/admin/partners/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새 발급
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/partners");
  const partners = await partnerRepository.listAll(200);
  return <PartnersList partners={partners} />;
}

function ListSkeleton() {
  return <div className="h-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
}
