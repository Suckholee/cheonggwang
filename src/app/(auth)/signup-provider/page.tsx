import Link from "next/link";
import { ProviderSignupForm } from "@/components/auth/ProviderSignupForm";

export const metadata = {
  title: "청명 가입 · 청광",
  description: "청소 업체를 청광 마켓플레이스에 등록하세요",
};

export default function SignupProviderPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex w-full items-center">
          <Link
            href="/login"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 로그인
          </Link>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">청명 가입</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            청소 업체를 청광에 등록하고 의뢰인의 견적 요청을 받아보세요
          </p>
        </div>
        <ProviderSignupForm />
      </div>
    </main>
  );
}
