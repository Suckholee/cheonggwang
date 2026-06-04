import Link from "next/link";
import { ArrowRight, Sparkles, Store, Sparkle } from "lucide-react";

/**
 * v1.9 partner-application · §6.1 — 홈 핵심 CTA (HeroSection 직후 배치).
 * 청광의 핵심 가치 — 매장·사무실 운영자가 청소 의뢰 + AI 자동 홍보 두 가지를 한 계정에서.
 * v1.10 랜딩 강화: 듀얼 가치 시각화 + 폰트·여백 확대.
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
          매장·사무실 운영자라면
        </div>
        <h2 className="text-[22px] font-black leading-[1.25] tracking-tight text-zinc-950 dark:text-zinc-50">
          청소도 맡기고
          <br />
          <span className="text-[#2563EB] dark:text-[#3B82F6]">광고도 맡기세요</span>
        </h2>
        <p className="mt-2 text-[13px] leading-5 text-zinc-700 dark:text-zinc-300 font-medium">
          청광 한 계정에서 정기 청소 의뢰와 홍보글 자동 발행을 모두 관리합니다.
        </p>

        {/* 듀얼 가치 카드 */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-zinc-200/50 bg-white/90 p-3 shadow-sm backdrop-blur-xs dark:border-zinc-800/50 dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400">
              <Store className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              정기 청소 의뢰
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              검증된 청명에게
              <br />
              직접 연결
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/50 bg-white/90 p-3 shadow-sm backdrop-blur-xs dark:border-zinc-800/50 dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff3e0] text-[#f59e0b] dark:bg-amber-950/40 dark:text-amber-400">
              <Sparkle className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              홍보글 자동 발행
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
              사진과 키워드로
              <br />
              매장 홍보 작성
            </p>
          </div>
        </div>

        <Link
          href="/signup-partner"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(43,102,246,0.32)] transition-colors hover:bg-[#1D4ED8]"
        >
          파트너 등록 신청하기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          신청 후 운영팀 검토를 거쳐 승인됩니다
        </p>
      </div>
    </section>
  );
}
