import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import PartnerHeaderNav from "@/components/partner/PartnerHeaderNav";
import type { ReactNode } from "react";

/**
 * v1.7 partner-promo · §1.1 — /partner/* 영역 공통 레이아웃.
 *
 * Next 16 + cacheComponents 패턴 (community-feed-3panel R10):
 *  - 레이아웃 자체는 sync. 인증·partner 조회는 Suspense 자식에서 수행.
 *  - 각 page에서도 본인 보호 가드(requirePartnerPage)를 자체 Suspense에서 호출.
 */
export const metadata = {
  title: "파트너 · 청광",
  robots: { index: false, follow: false }, // /partner/*는 검색 비노출
};

export default function PartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950">
      <header className="border-b border-[#F3F4F6] bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sticky top-0 z-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between h-16">
          <div className="flex items-center gap-2 shrink-0 mr-4">
            <Link
              href="/partner/posts"
              className="whitespace-nowrap text-[15px] font-black tracking-tight text-[#2563EB]"
            >
              청광 파트너
            </Link>
            <Suspense fallback={null}>
              <PartnerNameLabel />
            </Suspense>
          </div>
          <div className="flex-1 flex justify-end min-w-0">
            <Suspense fallback={<NavSkeleton />}>
              <PartnerHeaderNav />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

async function PartnerNameLabel() {
  await connection();
  const { partner } = await requirePartnerPage();
  return <span className="hidden sm:inline whitespace-nowrap text-xs text-zinc-500">· {partner.businessName}</span>;
}

function NavSkeleton() {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-7 w-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}
