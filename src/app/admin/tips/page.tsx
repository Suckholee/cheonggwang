import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipRepository } from "@/lib/firebase/tip-repository";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { getAdminDataErrorMessage } from "@/lib/errors";
import {
  calculateNextTickTime,
  formatNextTickKst,
} from "@/lib/tips/next-tick-time";
import AdminTipsAutoConfigToggle from "@/components/admin/AdminTipsAutoConfigToggle";
import AdminTipsHistoryTable from "@/components/admin/AdminTipsHistoryTable";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.10 — admin tips dashboard.
 * v1.18 cycle #31 tips-admin-config · §3.7 — Toggle + Schedule + History
 *   + TopicsLink 4 sections 확장. 각 신규 Suspense child는 await connection() (M4).
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

      {/* cycle #31 §3.7 — S2 toggle */}
      <Suspense fallback={<ToggleSkeleton />}>
        <AutoConfigSection />
      </Suspense>

      {/* cycle #31 §3.7 — S7 schedule info */}
      <Suspense fallback={<ScheduleSkeleton />}>
        <ScheduleInfo />
      </Suspense>

      <Suspense fallback={<StatSkeleton />}>
        <StatCards />
      </Suspense>

      {/* cycle #31 §3.7 — S8 history */}
      <Suspense fallback={<HistorySkeleton />}>
        <AdminTipsHistoryTable />
      </Suspense>

      <Suspense fallback={<DraftListSkeleton />}>
        <DraftList />
      </Suspense>

      {/* cycle #31 §3.7 — Topics link */}
      <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Topic pool 관리</div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              cron이 라운드 로빈으로 선택할 topic을 추가/제거/시즌 변경합니다.
            </p>
          </div>
          <Link
            href="/admin/tips/topics"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Topic 관리 →
          </Link>
        </div>
      </div>
    </div>
  );
}

async function AutoConfigSection() {
  await connection();
  await requireAdminPage("/admin/tips");
  const config = await tipsConfigRepository.getConfig();
  const isFallback = config.updatedAt.getTime() === 0;
  return (
    <AdminTipsAutoConfigToggle
      initialEnabled={config.enabled}
      isFallback={isFallback}
    />
  );
}

async function ScheduleInfo() {
  // M4 결의 — uncached data (new Date) 사용 시 connection() 필수
  await connection();
  const next = calculateNextTickTime();
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Schedule</div>
          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            cron <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-800">{`30 9-17 * * *`}</code> Asia/Seoul · 변경은 dev 요청
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            다음 발행 예정
          </div>
          <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {formatNextTickKst(next)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}

function ScheduleSkeleton() {
  return (
    <div className="h-16 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}

function HistorySkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
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
  try {
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
  } catch (e) {
    console.error("[admin/tips] StatCards fetch failed", e);
    return <AdminQueryError message={getAdminDataErrorMessage(e)} />;
  }
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
  let drafts;
  try {
    drafts = await tipRepository.listDrafts(20);
  } catch (e) {
    console.error("[admin/tips] DraftList fetch failed", e);
    return <AdminQueryError message={getAdminDataErrorMessage(e)} />;
  }
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

function AdminQueryError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      {message}
    </div>
  );
}
