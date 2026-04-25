import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { loadAdminStats } from "@/lib/admin/stats";
import StatsWidgets from "@/components/admin/StatsWidgets";

export const metadata = {
  title: "운영 콘솔 · 청광",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-zinc-500">
          청광 운영 현황 한눈에. 클릭하면 상세 페이지로.
        </p>
      </div>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsBody />
      </Suspense>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickLink href="/admin/partners/new" label="새 의뢰업체 발급" emoji="➕" />
        <QuickLink href="/admin/posts" label="이상 글 관리" emoji="🚫" />
        <QuickLink href="/admin/providers" label="청명 자격 토글" emoji="✓" />
      </div>
    </div>
  );
}

async function StatsBody() {
  await connection();
  await requireAdminPage("/admin");
  const stats = await loadAdminStats();
  return <StatsWidgets stats={stats} />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

function QuickLink({
  href,
  label,
  emoji,
}: {
  href: string;
  label: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-4 text-sm transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
    >
      <span className="mr-2">{emoji}</span>
      {label}
    </Link>
  );
}
