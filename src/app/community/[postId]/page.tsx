import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { PostDetailView } from "@/components/community/PostDetailView";
import { PostProviderInfoCard } from "@/components/community/PostProviderInfoCard";
import { QuoteCTAButton } from "@/components/community/QuoteCTAButton";

interface PageProps {
  params: Promise<{ postId: string }>;
}

/**
 * v1.6 Legacy shim: postId 기반 URL은 canonical `/community/p/[slug]` 으로 301 리다이렉트.
 * slug가 비어있는 레거시 문서는 기존 UI로 인라인 렌더 (backward compat).
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { postId } = await props.params;
  const post = await postRepository.get(postId);
  if (!post) {
    return { title: "포스트를 찾을 수 없어요 · 청광" };
  }
  return {
    title: `${post.title} · 청광`,
    description: post.summary80,
    openGraph: {
      title: post.title,
      description: post.summary80,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
    // slug 존재 시 canonical은 /community/p/[slug] — 301 리다이렉트로 유저는 실제 도달하지 않음
    alternates: post.slug
      ? { canonical: `/community/p/${post.slug}` }
      : undefined,
  };
}

export default function LegacyPostPage(props: PageProps) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-24">
      <Suspense fallback={<PostSkeleton />}>
        <LegacyPostBody params={props.params} />
      </Suspense>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="aspect-[16/10] w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

async function LegacyPostBody({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await postRepository.get(postId);
  if (!post) notFound();

  // slug 존재 시 canonical URL로 permanentRedirect (301)
  if (post.slug) {
    permanentRedirect(`/community/p/${post.slug}`);
  }

  // Fallback: slug 없는 레거시 문서 — 기존 UI 유지
  const showProviderBlock =
    (post.postType === "provider" || post.postType === "tip") &&
    post.providerId &&
    post.providerId !== "customer";
  const provider = showProviderBlock
    ? await providerRepository.get(post.providerId)
    : null;

  return (
    <div className="space-y-6">
      <PostDetailView post={post} />
      {provider && <PostProviderInfoCard provider={provider} />}
      {showProviderBlock && (
        <QuoteCTAButton
          providerId={post.providerId}
          category={post.categories[0] ?? "move-in"}
        />
      )}
    </div>
  );
}
