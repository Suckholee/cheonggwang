import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import PartnerEditor from "@/components/admin/PartnerEditor";

export const metadata = {
  title: "Partner 상세 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin/partners" className="text-sm text-blue-600 hover:underline">
        ← 목록으로
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <Body params={params} />
      </Suspense>
    </div>
  );
}

async function Body({ params }: { params: Promise<{ partnerId: string }> }) {
  await connection();
  await requireAdminPage("/admin/partners");
  const { partnerId } = await params;
  const partner = await partnerRepository.getById(partnerId);
  if (!partner) notFound();
  return (
    <>
      <h1 className="text-xl font-bold">{partner.businessName}</h1>
      <PartnerEditor partner={partner} />
    </>
  );
}

function DetailSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
}
