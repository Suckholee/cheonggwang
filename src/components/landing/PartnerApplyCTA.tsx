import Link from "next/link";
import { ArrowRight, Sparkles, Briefcase, CreditCard } from "lucide-react";

/**
 * v2 partner-application — 청소 전문가(청명) 모집용 홈 CTA.
 * 매장 광고주 대상 SaaS 문구를 제거하고 청소 파트너 모집으로 통합.
 */

export default function PartnerApplyCTA() {
  return (
    <section 
      className="relative overflow-hidden rounded-[24px] border border-[#dbe8fb] p-5 shadow-[0_8px_24px_rgba(43,102,246,0.04)] bg-gradient-to-br from-[#f8faff] to-[#f1f6ff] dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900"
    >
      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#2563EB] dark:border-zinc-800 dark:bg-zinc-900 dark:text-[#3B82F6]">
          <Sparkles className="h-3 w-3" aria-hidden />
          청소 전문가 모집
        </div>
        <h2 className="text-xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
          청광의 청소 전문가 (청명)가 되어보세요
        </h2>
        <p className="mt-1.5 text-xs leading-normal text-zinc-600 dark:text-zinc-400 font-medium">
          청광 파트너로 가입하여 다양한 청소 견적 요청을 받고 일거리를 매칭해보세요.
        </p>

        {/* 파트너 핵심 가치 카드 */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-zinc-200/40 bg-white/80 p-3 shadow-sm dark:border-zinc-800/40 dark:bg-zinc-950/80">
            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f1ff] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400">
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
            </div>
            <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50">
              자유로운 일거리 매칭
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              원하는 지역과 일정의
              <br />
              견적 요청을 선택
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/40 bg-white/80 p-3 shadow-sm dark:border-zinc-800/40 dark:bg-zinc-950/80">
            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff3e0] text-[#f59e0b] dark:bg-amber-950/40 dark:text-amber-400">
              <CreditCard className="h-3.5 w-3.5" aria-hidden />
            </div>
            <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50">
              간편하고 안전한 수금
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              에스크로 안전 결제로
              <br />
              확실한 대금 정산
            </p>
          </div>
        </div>

        <Link
          href="/signup-provider"
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white border border-[#2563EB] px-4 py-2.5 text-xs font-bold text-[#2563EB] shadow-xs transition-colors hover:bg-blue-50/50"
        >
          청명 파트너 등록하기
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <p className="mt-2 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
          가입 및 간단한 프로필 등록 후 즉시 견적 발송이 가능합니다
        </p>
      </div>
    </section>
  );
}
