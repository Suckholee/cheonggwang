import Link from "next/link";
import { ArrowRight, Sparkles, Store, Sparkle } from "lucide-react";

/**
 * v1.9 partner-application · §6.1 — 홈 핵심 CTA (HeroSection 직후 배치).
 * 청광의 핵심 가치 — 매장·사무실 운영자가 청소 의뢰 + AI 자동 홍보 두 가지를 한 계정에서.
 * v1.10 랜딩 강화: 듀얼 가치 시각화 + 폰트·여백 확대.
 */

export default function PartnerApplyCTA() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#2B66F6]/20 bg-[linear-gradient(135deg,#ffffff_0%,#e8f1ff_50%,#cfe0ff_100%)] p-6 shadow-[0_16px_40px_rgba(43,102,246,0.18)]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#7fb4ff]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-[#2B66F6]/15 blur-3xl" />

      <div className="relative">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#2B66F6]/30 bg-white/80 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#2B66F6]">
          <Sparkles className="h-3 w-3" aria-hidden />
          매장·사무실 운영자라면
        </div>
        <h2 className="text-[22px] font-black leading-[1.25] tracking-tight text-zinc-950 dark:text-zinc-50">
          청소도 맡기고
          <br />
          <span className="text-[#2B66F6]">광고도 맡기세요</span>
        </h2>
        <p className="mt-2 text-[13px] leading-5 text-zinc-700 dark:text-zinc-300">
          청광 한 계정에서 정기 청소 의뢰와 AI 자동 홍보글 발행을 모두 관리합니다.
        </p>

        {/* 듀얼 가치 카드 */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#2B66F6]">
              <Store className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              정기 청소 의뢰
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
              검증된 청명에게
              <br />
              직접 연결
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm dark:bg-zinc-900/90">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff3e0] text-[#f59e0b]">
              <Sparkle className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-50">
              AI 자동 홍보글
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
              사진+키워드만으로
              <br />
              매장 홍보 자동
            </p>
          </div>
        </div>

        <Link
          href="/signup-partner"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2B66F6] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(43,102,246,0.32)] transition-colors hover:bg-[#1f57e6]"
        >
          의뢰업체 등록 신청하기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          신청 후 운영팀 검토를 거쳐 승인됩니다
        </p>
      </div>
    </section>
  );
}
