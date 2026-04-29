import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import { setTopicActive } from "@/app/actions/admin-tips-config-actions";
import { getAdminDataErrorMessage } from "@/lib/errors";
import type { TipsTopicDoc } from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S4 + S5).
 *
 * Topic CRUD list:
 *   - 전체 topic 표시 (active + inactive 모두)
 *   - active count 표시 (M5 risk mitigation — 마지막 1개 비활성화 confirm)
 *   - row 토글 (S5) — setTopicActive 직접 호출 (server action)
 *   - 편집 진입 (/admin/tips/topics/[topicId])
 *   - 신규 진입 (/admin/tips/topics/new)
 *   - L6 결의 — added/updated/error 플래시 banner
 */

export const metadata = {
  title: "Tips topic 관리 · 청광 admin",
  robots: { index: false, follow: false },
};

interface SearchParams {
  added?: string;
  updated?: string;
  error?: string;
}

export default async function AdminTipsTopicsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/tips"
            className="text-sm text-blue-600 hover:underline"
          >
            ← 청소 노하우 관리
          </Link>
          <h1 className="mt-2 text-xl font-bold">Tips topic 관리</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            cron이 매 tick에서 active topic 중 1건을 라운드 로빈 + RAG anti-drift로 선택합니다.
          </p>
        </div>
        <Link
          href="/admin/tips/topics/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 신규 topic
        </Link>
      </div>

      <Suspense fallback={null}>
        <FlashBanner searchParamsPromise={searchParams} />
      </Suspense>

      <Suspense fallback={<TopicListSkeleton />}>
        <TopicList />
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
  if (sp.added) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✅ Topic 추가 완료. 다음 cron tick부터 candidate에 포함됩니다.
      </div>
    );
  }
  if (sp.updated) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✅ Topic 업데이트 완료.
      </div>
    );
  }
  if (sp.error === "validation") {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        ❌ 입력 검증 실패. label 5~120자, 카테고리 필수.
      </div>
    );
  }
  return null;
}

async function TopicList() {
  await connection();
  await requireAdminPage("/admin/tips/topics");

  let topics: TipsTopicDoc[];
  try {
    topics = await tipsConfigRepository.listTopics();
  } catch (e) {
    console.error("[admin/tips/topics] listTopics failed", e);
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        {getAdminDataErrorMessage(e)}
      </div>
    );
  }

  const activeCount = topics.filter((t) => t.isActive).length;

  if (topics.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <p>등록된 topic이 없습니다.</p>
        <p className="mt-1 text-xs">
          fallback: cron은 cycle #30 static pool 30개를 사용합니다 (R12·NEW-R24).
          신규 topic 추가 후 첫 active topic이 등록되면 fallback에서 Firestore pool로 전환됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          전체 ({topics.length}) · 활성{" "}
          <span
            className={
              activeCount === 0
                ? "text-rose-600 dark:text-rose-400"
                : activeCount === 1
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
            }
          >
            {activeCount}
          </span>
        </div>
        {activeCount === 0 && (
          <div className="text-xs text-rose-600 dark:text-rose-400">
            ⚠️ active topic 0개 — cron이 fallback static pool 사용
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">label</th>
              <th className="px-3 py-2">category</th>
              <th className="px-3 py-2">season</th>
              <th className="px-3 py-2">intent</th>
              <th className="px-3 py-2 text-center">photoless</th>
              <th className="px-3 py-2 text-center">active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {topics.map((t) => (
              <tr
                key={t.id}
                className={!t.isActive ? "bg-zinc-50/60 dark:bg-zinc-950/40" : ""}
              >
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[11px] text-zinc-400">
                    {t.createdAt.toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{t.category}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {t.season ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {t.intent ?? "—"}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {t.photoless ? "✓" : ""}
                </td>
                <td className="px-3 py-2 text-center">
                  <ActiveToggleForm
                    topicId={t.id}
                    isActive={t.isActive}
                    isLastActive={t.isActive && activeCount === 1}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/tips/topics/${encodeURIComponent(t.id)}`}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    편집
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveToggleForm({
  topicId,
  isActive,
  isLastActive,
}: {
  topicId: string;
  isActive: boolean;
  isLastActive: boolean;
}) {
  const next = !isActive;
  const action = setTopicActive.bind(null, topicId, next);
  return (
    <form action={action}>
      <button
        type="submit"
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
        aria-pressed={isActive}
        title={
          isLastActive
            ? "마지막 active topic — 비활성화 시 fallback static pool로 전환됨"
            : isActive
              ? "비활성화"
              : "활성화"
        }
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            isActive ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
        <span className="sr-only">{isActive ? "활성" : "비활성"}</span>
      </button>
    </form>
  );
}

function TopicListSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
