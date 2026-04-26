import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { contentTemplateRepository } from "@/lib/firebase/content-template-repository";
import ContentTemplateList from "@/components/admin/ContentTemplateList";

export const metadata = {
  title: "컨텐츠 템플릿 · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminContentTemplatesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">컨텐츠 템플릿 라이브러리</h1>
        <p className="mt-1 text-sm text-zinc-500">
          파트너 글 자동 발행 시 RAG context로 사용되는 업종별 블로그·카드뉴스
          템플릿입니다.
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/content-templates");
  const items = await contentTemplateRepository.listAll();
  return <ContentTemplateList items={items} />;
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}
