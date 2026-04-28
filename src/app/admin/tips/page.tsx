import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipRepository } from "@/lib/firebase/tip-repository";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.10 — admin tips dashboard.
 *
 * Stat 4개 카드 + draft 검토 큐 + manual generate 진입.
 * cycle #19 publish 토글 (R13)은 게시글 상세 페이지 (/admin/posts/[id])에서 처리 — 별도 변경 X.
 */

export const metadata = {
  title: "청소 노하우 관리 · 청광 admin",
  robots: { index: false, follow: false },
};

interface SearchParams {
  "recently-generated"?: string;
  error?: string;
}

export default async function AdminTipsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">청소 노하우 관리</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            매일 09:30~17:30 KST cron이 1건 draft를 생성합니다. 검토 후 발행하세요.
          </p>
        </div>
        <Link
          href="/admin/tips/generate"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 즉시 생성
        </Link>
      </div>

      <Suspense fallback={null}>
        <FlashBanner searchParamsPromise={searchParams} />
      </Suspense>

      <Suspense fallback={<StatSkeleton />}>
        <StatCards />
      </Suspense>

      <Suspense fallback={<DraftListSkeleton />}>
        <DraftList />
      </Suspense>
    </div>
  );
}

async function FlashBanner({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  await connection();
  const sp = await searchParamsPromise;
  if (sp["recently-generated"]) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✅ 새로운 draft 생성 완료. 아래 목록에서 검토하세요.
      </div>
    );
  }
  if (sp.error === "compose-fail") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        ❌ AI 작성 실패. 잠시 후 다시 시도하세요.
      </div>
    );
  }
  if (sp.error === "hygiene-fail") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        ⚠️ Hygiene 점수 미달. 토픽을 바꿔 다시 시도하세요.
      </div>
    );
  }
  return null;
}

async function StatCards() {
  await connection();
  await requireAdminPage("/admin/tips");
  const stats = await tipRepository.getTipMonthlyStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="이번 달 생성" value={stats.generated} />
      <StatCard
        label="검토 대기"
        value={stats.drafted}
        highlight={stats.drafted > 0}
      />
      <StatCard label="이번 달 발행" value={stats.published} />
      <StatCard label="실패율" value={`${stats.failureRate}%`} />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

async function DraftList() {
  await connection();
  await requireAdminPage("/admin/tips");
  const drafts = await tipRepository.listDrafts(20);
  if (drafts.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        검토 대기 중인 draft가 없습니다.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        검토 대기 ({drafts.length})
      </div>
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {drafts.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{d.title}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {d.summary80}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {d.createdAt.toLocaleString("ko-KR")}
                {d.topicHint ? ` · ${d.topicHint}` : ""}
              </div>
            </div>
            <Link
              href={`/community/p/${d.slug}`}
              prefetch={false}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              미리보기
            </Link>
            <Link
              href={`/admin/posts/${d.id}`}
              prefetch={false}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              검토·발행
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DraftListSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
