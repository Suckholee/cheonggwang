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
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link
        href="/partner/posts"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← 파트너 홈
      </Link>
      <header>
        <h1 className="text-xl font-bold">매장 RAG 자료</h1>
        <p className="mt-1 text-sm text-zinc-500">
          매장 정보·강점·메뉴·영구 사진을 등록하면 홍보글 자동 발행에
          반영됩니다.
        </p>
      </header>
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
  const { partner } = await requirePartnerPage("/partner/profile");
  const profile = await partnerProfileRepository.getProfile(partner.id);
  return <PartnerProfileForm initial={profile} />;
}

function FormSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
