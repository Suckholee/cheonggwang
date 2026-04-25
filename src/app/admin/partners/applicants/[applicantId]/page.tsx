import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";
import ApplicantDetail from "@/components/admin/ApplicantDetail";

/**
 * v1.9 partner-application · §6.4 — admin 신청자 상세 페이지.
 */

export const metadata = {
  title: "신청자 상세 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminApplicantDetailPage({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/admin/partners"
        className="text-sm text-blue-600 hover:underline"
      >
        ← 목록으로
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <Body params={params} />
      </Suspense>
    </div>
  );
}

async function Body({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  await connection();
  await requireAdminPage("/admin/partners");
  const { applicantId } = await params;
  const applicant = await partnerApplicantRepository.getById(applicantId);
  if (!applicant) notFound();
  return (
    <>
      <h1 className="text-xl font-bold">{applicant.businessName}</h1>
      <ApplicantDetail applicant={applicant} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  );
}
