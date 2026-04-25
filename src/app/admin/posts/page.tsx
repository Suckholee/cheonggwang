import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { postRepository } from "@/lib/firebase/post-repository";
import PostsList from "@/components/admin/PostsList";

export const metadata = {
  title: "Posts · 청광 운영",
  robots: { index: false, follow: false },
};

export default function AdminPostsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Posts (관리)</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  await requireAdminPage("/admin/posts");
  // 관리 화면은 모든 status를 봐야 하므로 listAllForSitemap 재활용 (publishStatus 무관 전수)
  const posts = await postRepository.listAllForSitemap(500);
  return <PostsList posts={posts} />;
}

function ListSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
}
