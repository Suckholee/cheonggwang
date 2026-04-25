import Link from "next/link";
import { PartnerSignupForm } from "@/components/auth/PartnerSignupForm";

export const metadata = {
  title: "의뢰업체 등록 · 청광",
  description:
    "매장 청소 의뢰부터 AI 자동 홍보까지, 한 계정에서 관리하는 청광 의뢰업체 등록.",
};

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
            🏢 의뢰업체 등록 신청
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            매장 청소 의뢰부터 AI 자동 홍보글까지,
            <br />
            청광 한 계정에서 관리하세요
          </p>
        </div>
        <PartnerSignupForm />
        <p className="text-center text-xs text-zinc-500">
          이미 청광 계정이 있나요?{" "}
          <Link href="/login" className="underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
