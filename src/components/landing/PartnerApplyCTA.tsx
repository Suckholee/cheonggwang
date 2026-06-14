import Link from "next/link";
import { ArrowRight, Sparkles, Briefcase, CreditCard } from "lucide-react";

/**
 * v2 partner-application — 청소 전문가(청명) 모집용 홈 CTA.
 * 매장 광고주 대상 SaaS 문구를 제거하고 청소 파트너 모집으로 통합.
 */

export default function PartnerApplyCTA() {
  return (
    <section 
      className="relative overflow-hidden rounded-[28px] border border-[#2563EB]/20 p-6 shadow-[0_16px_40px_rgba(43,102,246,0.18)] bg-cover bg-center"
      style={{ backgroundImage: "url('/images/clean_office_cafe.png')" }}
    >
      {/* Premium semi-transparent white/blue glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60 dark:from-zinc-950/95 dark:via-zinc-950/85 dark:to-zinc-950/60" />

      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/30 bg-white/80 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#2563EB] dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-[#3B82F6]">
          <Sparkles className="h-3 w-3" aria-hidden />
          청소 전문가 모집
        </div>
        <h2 className="text-[22px] font-black leading-[1.25] tracking-tight text-zinc-950 dark:text-zinc-50">
          청광의 청소 전문가
          <br />
          <span className="text-[#2563EB] dark:text-[#3B82F6]">(청명)가 되어보세요</span>
        </h2>
        <p className="mt-2 text-[13px] leading-5 text-zinc-700 dark:text-zinc-300 font-medium font-sans">
          청광 파트너로 가입하여 다양한 청소 견적 요청을 받고 일거리를 매칭해보세요.
        </p>

        {/* 파트너 핵심 가치 카드 */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-zinc-200/50 bg-white/90 p-3 shadow-sm backdrop-blur-xs dark:border-zinc-800/50 dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400">
              <Briefcase className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              자유로운 일거리 매칭
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              원하는 지역과 일정의
              <br />
              견적 요청을 선택
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/50 bg-white/90 p-3 shadow-sm backdrop-blur-xs dark:border-zinc-800/50 dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff3e0] text-[#f59e0b] dark:bg-amber-950/40 dark:text-amber-400">
              <CreditCard className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              간편하고 안전한 수금
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              에스크로 안전 결제로
              <br />
              확실한 대금 정산
            </p>
          </div>
        </div>

        <Link
          href="/signup-provider"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(43,102,246,0.32)] transition-colors hover:bg-[#1D4ED8]"
        >
          청명 파트너 등록하기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          가입 및 간단한 프로필 등록 후 즉시 견적 발송이 가능합니다
        </p>
      </div>
    </section>
  );
}
