import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { PartnerSignupForm } from "@/components/auth/PartnerSignupForm";
import { loadActivePartner } from "@/lib/auth/require-partner";

export const metadata = {
  title: "파트너 등록 · 청광",
  description:
    "매장 청소 의뢰부터 홍보글 자동 발행까지, 한 계정에서 관리하는 청광 파트너 등록.",
};

/**
 * v1.10 partner-application — 회원가입 후 파트너 등록 흐름 (cycle #23).
 *
 *  진입 가드:
 *    - 비로그인     → /login?next=/signup-partner
 *    - 이미 partner → /partner/posts (이미 발급됨)
 *    - pending applicant → /signup-partner/submitted
 *    - rejected applicant → /signup-partner/submitted (재신청은 거기서)
 *    - 일반 client (정상) → 폼 표시
 */
export default function SignupPartnerPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex w-full items-center">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 홈으로
          </Link>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            🏢 파트너 등록 신청
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            매장 청소 의뢰부터 홍보글 자동 발행까지,
            <br />
            청광 한 계정에서 관리하세요
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <Body />
        </Suspense>
      </div>
    </main>
  );
}

async function Body() {
  await connection();
  const r = await loadActivePartner();

  if (r.ok) {
    // 이미 active partner — 파트너 작업 페이지로
    redirect("/partner/posts");
  }

  switch (r.reason) {
    case "no-session":
      redirect(
        `/login?mode=signup&next=${encodeURIComponent("/signup-partner")}`,
      );
    case "applicant-pending":
    case "applicant-rejected":
      redirect("/signup-partner/submitted");
    case "not-active":
      // 정지된 partner — 홈으로
      redirect("/");
    case "no-partner":
    default:
      // 정상 진입 케이스: 일반 client가 매장 정보 입력
      return <PartnerSignupForm />;
  }
}

function FormSkeleton() {
  return (
    <div className="h-96 w-full max-w-md animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
