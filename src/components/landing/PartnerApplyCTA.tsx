import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

/**
 * v1.9 partner-application · §6.1 — 홈 하단 의뢰업체 등록 CTA.
 * 청광에서 청소를 맡기는 매장·사무실 운영자(고객) 대상 — 청소 의뢰 + 매장 홍보 두 가치 강조.
 */

export default function PartnerApplyCTA() {
  return (
    <section className="rounded-[28px] border border-[#cfe1ff] bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_60%,#dcebff_100%)] p-5 shadow-[0_10px_28px_rgba(43,102,246,0.10)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2B66F6] shadow-sm">
          <Store className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2B66F6]/70">
            매장·사무실 운영자라면
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            청소도 맡기고 광고도 맡기세요
          </p>
          <p className="mt-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
            정기 청소 의뢰부터 매장 홍보 콘텐츠 자동 발행까지, 한 계정에서 관리하세요.
            의뢰업체로 등록하면 운영팀 검토 후 승인됩니다.
          </p>
        </div>
      </div>
      <Link
        href="/signup-partner"
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2B66F6] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(43,102,246,0.25)] transition-colors hover:bg-[#1f57e6]"
      >
        의뢰업체 등록 신청하기
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
