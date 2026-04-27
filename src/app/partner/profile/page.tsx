import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { partnerProfileRepository } from "@/lib/firebase/partner-profile-repository";
import { PartnerProfileForm } from "@/components/partner/PartnerProfileForm";

/**
 * v1.11 partner-rag-system · §6.1 — 사장님 매장 RAG 자료 입력 페이지.
 */
export const metadata = {
  title: "매장 RAG 자료 · 청광 파트너",
};

export default function PartnerProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-20">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B7280]">
          <Link href="/partner/posts" className="hover:text-[#2563EB] transition-colors">
            파트너 홈
          </Link>
          <span>/</span>
          <span className="text-[#111827]">매장 정보</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">매장 RAG 자료</h1>
        <p className="text-base text-[#6B7280]">
          매장 정보, 강점, 메뉴 및 사진을 등록하여 AI 홍보글 자동 발행의 정확도를 높여보세요.
        </p>
      </header>

      <div className="chg-card">
        <Suspense fallback={<FormSkeleton />}>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}

async function Body() {
  await connection();
  const { partner } = await requirePartnerPage("/partner/profile");
  const profile = await partnerProfileRepository.getProfile(partner.id);
  return <PartnerProfileForm initial={profile} />;
}

function FormSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
