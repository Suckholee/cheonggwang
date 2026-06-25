import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Building2,
  TrendingUp,
  FileSearch,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata = {
  title: "의뢰업체 파트너 가입 · 청광",
  description: "청광과 함께하고 무료 기본 견적 및 사업장 홍보 혜택을 누리세요.",
};

export default function SignupClientHubPage() {
  const signupLink = `/login?mode=signup&next=${encodeURIComponent("/signup-partner")}`;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 py-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-650 hover:text-zinc-900 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              aria-label="홈으로 가기"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Link>
            <BrandLogo />
          </div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-400">
            For Business
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 mx-auto max-w-5xl px-6 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12 justify-center">
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/70 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>매장 사장님 전용 가입 혜택</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
            매장 청소부터<br />
            <span className="text-blue-600 dark:text-blue-400">업장 자동 홍보</span>까지 한 번에
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
            카페, 식당, 사무실 등 매장 청소를 청광의 정교한 견적 계산기로 계산해보세요. 청소 완료 시 사업장 자동 홍보글 발행 및 마케팅 연계 혜택을 드립니다.
          </p>

          {/* 주요 혜택 체크리스트 */}
          <ul className="space-y-2.5 text-sm font-semibold text-zinc-750 dark:text-zinc-300 max-w-xs mx-auto lg:mx-0">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span>1차 기본 견적 계산기 즉시 제공</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span>검증된 청명 파트너 1:1 자동 매칭</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span>청소 후 플랫폼 내 사업장 무료 광고</span>
            </li>
          </ul>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link
              href={signupLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.99] w-full sm:w-auto"
            >
              의뢰업체 가입 신청하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right Feature Panel */}
        <div className="flex-1 w-full max-w-md space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-850 dark:bg-zinc-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
              청광 의뢰업체 전용 3대 솔루션
            </h3>
            
            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="flex gap-4 items-start p-3.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-950 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <FileSearch className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">투명한 2단계 방문 견적 시스템</h4>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    플랫폼의 정밀한 기본 견적을 토대로, 현장에 방문한 전문가(청명)가 실측하여 납득 가능한 추가 비용만 투명하게 최종 청구합니다.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4 items-start p-3.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-950 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Building2 className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">청소 완료 후 무료 홍보 연계</h4>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    깨끗하게 단장된 매장의 Before & After 모습과 매장 소개글이 플랫폼 홍보 탭에 무료로 자동 발행되어 잠재 고객 노출을 늘려줍니다.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4 items-start p-3.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-950 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">엄격히 엄선된 마스터 청명 매칭</h4>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    단순 중개가 아닌 평판 점수와 배상보험 가입 여부가 확실하게 검증된 우수/마스터 등급 청소업체만 매칭 풀에 들어옵니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-200 text-center text-[11px] text-zinc-400 dark:border-zinc-800 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>© 2026 Cheonggwang Inc. All Rights Reserved.</span>
          <div className="flex gap-4 font-semibold">
            <Link href="/terms" className="hover:text-zinc-600">이용약관</Link>
            <Link href="/privacy" className="hover:text-zinc-600">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
