import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { tipsConfigRepository } from "@/lib/firebase/tips-config-repository";
import AdminTipsTopicForm from "@/components/admin/AdminTipsTopicForm";
import { updateTopic } from "@/app/actions/admin-tips-config-actions";
import { getAdminDataErrorMessage } from "@/lib/errors";
import type { TipsTopicDoc } from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S4 topic 편집 form).
 *
 * C6 결의 — action={updateTopic.bind(null, topicId)} bind 패턴.
 */

export const metadata = {
  title: "topic 편집 · 청광 admin",
  robots: { index: false, follow: false },
};

interface SearchParams {
  error?: string;
}

interface RouteParams {
  topicId: string;
}

export default function AdminTipsTopicEditPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton />}>
        <Body paramsPromise={params} searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<RouteParams>;
  searchParamsPromise: Promise<SearchParams>;
}) {
  await connection();
  await requireAdminPage("/admin/tips/topics");

  const { topicId } = await paramsPromise;
  const sp = await searchParamsPromise;

  let topic: TipsTopicDoc | null;
  try {
    topic = await tipsConfigRepository.getTopic(topicId);
  } catch (e) {
    console.error("[admin/tips/topics/[id]] getTopic failed", e);
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        {getAdminDataErrorMessage(e)}
      </div>
    );
  }

  if (!topic) notFound();

  return (
    <>
      <div>
        <Link
          href="/admin/tips/topics"
          className="text-sm text-blue-600 hover:underline"
        >
          ← topic 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold">topic 편집</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {topic.label}
        </p>
      </div>

      {sp.error === "validation" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          ❌ 입력 검증 실패. label 5~120자, 카테고리 필수.
        </div>
      )}

      <AdminTipsTopicForm
        initial={topic}
        action={updateTopic.bind(null, topic.id)}
        cancelHref="/admin/tips/topics"
        submitLabel="저장"
      />
    </>
  );
}

function Skeleton() {
  return (
    <div className="h-96 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
  );
}
