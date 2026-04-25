import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requirePartnerPage } from "@/lib/auth/require-partner";
import { postRepository } from "@/lib/firebase/post-repository";
import PartnerPromoEditor from "@/components/partner/PartnerPromoEditor";

export const metadata = { title: "글 편집 · 청광 파트너" };

export default function EditPartnerPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">글 편집</h1>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Suspense fallback={<EditorSkeleton />}>
          <EditorBody params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function EditorBody({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  await connection();
  const { uid } = await requirePartnerPage();
  const { postId } = await params;
  const post = await postRepository.get(postId);
  if (!post) notFound();
  if (post.providerOwnerUid !== uid) notFound();
  if (post.postType !== "partner-promo") notFound();
  return <PartnerPromoEditor post={post} />;
}

function EditorSkeleton() {
  return (
    <div
      className="h-[600px] animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
      aria-label="불러오는 중"
    />
  );
}
