import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import AdminTipsTopicForm from "@/components/admin/AdminTipsTopicForm";
import { addTopic } from "@/app/actions/admin-tips-config-actions";

/**
 * v1.18 cycle #31 tips-admin-config · §3.7 (S4 신규 topic form).
 *
 * Next.js 16 cacheComponents 호환 — AuthGate Suspense child (cycle #29 N10 패턴).
 */

export const metadata = {
  title: "신규 topic · 청광 admin",
  robots: { index: false, follow: false },
};

interface SearchParams {
  error?: string;
}

export default function AdminTipsTopicNewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>

      <div>
        <a
          href="/admin/tips/topics"
          className="text-sm text-blue-600 hover:underline"
        >
          ← topic 목록
        </a>
        <h1 className="mt-2 text-xl font-bold">신규 topic 추가</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          저장 후 바로 active 상태가 됩니다. 다음 cron tick부터 candidate에 포함.
        </p>
      </div>

      <Suspense fallback={null}>
        <FlashBanner searchParamsPromise={searchParams} />
      </Suspense>

      <AdminTipsTopicForm
        action={addTopic}
        cancelHref="/admin/tips/topics"
        submitLabel="추가"
      />
    </div>
  );
}

async function AuthGate() {
  await connection();
  await requireAdminPage("/admin/tips/topics/new");
  return null;
}

async function FlashBanner({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  await connection();
  const sp = await searchParamsPromise;
  if (sp.error === "validation") {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        ❌ 입력 검증 실패. label 5~120자, 카테고리 필수.
      </div>
    );
  }
  return null;
}
