import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePartnerPage } from "@/lib/auth/require-partner";
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/partner/posts"
              className="text-sm font-bold tracking-tight"
            >
              청광 파트너
            </Link>
            <Suspense fallback={null}>
              <PartnerNameLabel />
            </Suspense>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/partner/posts"
              className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
            >
              내 글
            </Link>
            <Link
              href="/partner/posts/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
            >
              + 새 초고
            </Link>
            <Link
              href="/partner/profile"
              className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
            >
              매장 정보
            </Link>
            <Link
              href="/partner/settings"
              className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
            >
              설정
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

async function PartnerNameLabel() {
  await connection();
  const { partner } = await requirePartnerPage();
  return <span className="text-xs text-zinc-500">· {partner.businessName}</span>;
}
