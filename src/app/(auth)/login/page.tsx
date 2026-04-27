import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "로그인 · 청광",
  description: "청광 청소 마켓플레이스 로그인",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-white px-5 pt-12 pb-6 dark:bg-zinc-950">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-8">
        <div className="text-center mt-12 mb-4">
          <h1 className="text-[36px] font-extrabold tracking-tight text-[#2563EB] dark:text-[#5B8DF6]">
            청광
          </h1>
          <p className="mt-2 text-[15px] font-medium text-zinc-500 dark:text-zinc-400">
            당신의 완벽한 파트너, 청명 찾기
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <Link
          href="/"
          className="mt-6 text-[14px] font-medium text-zinc-400 underline-offset-4 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          둘러보기 먼저 할래요
        </Link>
      </div>
    </main>
  );
}
