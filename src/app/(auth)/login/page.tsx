import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "로그인 · 청광",
  description: "청광 청소 마켓플레이스 로그인",
};

export default function LoginPage() {
  return (
    <main 
      className="flex min-h-screen flex-1 items-center justify-center bg-cover bg-center px-4 py-8 relative"
      style={{ backgroundImage: "url('/images/cozy_login_bg.png')" }}
    >
      {/* Soft overlay to darken slightly and maintain high readability */}
      <div className="absolute inset-0 bg-zinc-900/30 dark:bg-zinc-950/65 backdrop-blur-[2px]" />

      {/* Floating Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20 shadow-sm"
        >
          <ChevronLeft className="h-5.5 w-5.5" />
        </Link>
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 rounded-[32px] border border-white/45 bg-white/90 px-6 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-zinc-800/40 dark:bg-zinc-950/85">
        <div className="text-center mb-1">
          <h1 className="text-[32px] font-black tracking-tight text-[#2563EB] dark:text-[#5B8DF6]">
            청광
          </h1>
          <p className="mt-1.5 text-[14px] font-semibold text-zinc-650 dark:text-zinc-350">
            당신의 완벽한 파트너, 청명 찾기
          </p>
        </div>
        <Suspense fallback={<div className="h-48 w-full animate-pulse bg-zinc-100 rounded-xl" />}>
          <LoginForm />
        </Suspense>
        <Link
          href="/"
          className="text-[13px] font-semibold text-zinc-500 hover:text-[#2563EB] transition-colors dark:text-zinc-400 dark:hover:text-[#5B8DF6] underline underline-offset-4"
        >
          둘러보기 먼저 할래요
        </Link>
      </div>
    </main>
  );
}
