import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";
import PartnersList from "@/components/admin/PartnersList";
import ApplicantsList from "@/components/admin/ApplicantsList";

export const metadata = {
  title: "의뢰업체 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPartnersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">의뢰업체</h1>
        <Link
          href="/admin/partners/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새 발급
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          ⏳ 대기 신청
        </h2>
        <Suspense fallback={<ListSkeleton />}>
          <ApplicantsBody />
        </Suspense>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          발급된 파트너
        </h2>
        <Suspense fallback={<ListSkeleton />}>
          <PartnersBody />
        </Suspense>
      </section>
    </div>
  );
}

async function ApplicantsBody() {
  await connection();
  await requireAdminPage("/admin/partners");
  const applicants = await partnerApplicantRepository.listPending(100);
  return <ApplicantsList applicants={applicants} />;
}

async function PartnersBody() {
  await connection();
  await requireAdminPage("/admin/partners");
  const partners = await partnerRepository.listAll(200);
  return <PartnersList partners={partners} />;
}

function ListSkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
  );
}
