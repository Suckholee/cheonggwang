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
      <div className="absolute inset-0 bg-zinc-900/15 dark:bg-zinc-950/50 backdrop-blur-[3px]" />

      {/* Subtle blue glow behind the card for a premium aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Floating Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20 shadow-sm"
        >
          <ChevronLeft className="h-5.5 w-5.5" />
        </Link>
      </div>

      <div className="relative z-10 flex w-full max-w-[390px] flex-col items-center gap-5 rounded-[24px] border border-white/50 bg-white/90 px-5 py-7 shadow-[0_16px_48px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/85">
        <div className="text-center mb-0.5">
          <h1 className="text-[30px] font-black tracking-tight text-[#2563EB] dark:text-[#5B8DF6]">
            청광
          </h1>
          <p className="mt-1 text-[13.5px] font-semibold text-zinc-655 dark:text-zinc-350">
            당신의 완벽한 파트너, 청명 찾기
          </p>
        </div>
        <Suspense fallback={<div className="h-48 w-full animate-pulse bg-zinc-100 rounded-xl" />}>
          <LoginForm />
        </Suspense>
        <Link
          href="/"
          className="text-[13px] font-semibold text-zinc-550 hover:text-[#2563EB] transition-colors dark:text-zinc-400 dark:hover:text-[#5B8DF6] underline underline-offset-4"
        >
          서비스 둘러보기
        </Link>
      </div>
    </main>
  );
}
