import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

/**
 * v1.9 partner-application · §6.1 — 홈 하단 의뢰업체 등록 CTA.
 * 첫 진입 사용자에게 "사업자라면 입점 신청" 경로 노출.
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
            For Business
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            청소 사업자이신가요? 의뢰업체로 등록 신청하세요
          </p>
          <p className="mt-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
            홍보글 자동 발행, 고객 문의 직접 연결까지. 신청 후 운영팀 검토를 거쳐
            승인됩니다.
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
