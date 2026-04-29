import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { PostFeedGrid } from "@/components/community/PostFeedGrid";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityPageShell } from "@/components/community/CommunityPageShell";
import { PANELS } from "@/lib/feed/panel-config";

const CFG = PANELS.tips;

export const metadata: Metadata = {
  title: CFG.seoTitle,
  description: CFG.seoDescription,
  openGraph: {
    title: CFG.label,
    description: CFG.seoDescription,
    type: "website",
    url: `/community/${CFG.slug}`,
  },
  alternates: { canonical: `/community/${CFG.slug}` },
};

export default function TipsPanelPage() {
  return (
    <CommunityPageShell
      active={CFG.slug}
      title={CFG.label}
      tagline={CFG.tagline}
    >
        <Suspense fallback={<FeedSkeleton />}>
          <FeedBody />
        </Suspense>
    </CommunityPageShell>
  );
}

function FeedSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      aria-label="불러오는 중"
    >
      <div className="h-72 animate-pulse rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
      <div className="h-72 animate-pulse rounded-[24px] bg-[#eef5ff] dark:bg-zinc-900" />
    </div>
  );
}

async function FeedBody() {
  await connection();
  try {
    // v1.7 published만 노출 (draft·withdrawn 제외) — /community/partners 패턴 일치.
    // 잠복 버그 핫픽스: cycle #30/#31에서 listByType이 draft까지 노출 → /community/p/{slug}
    // 클릭 시 admin session으로 viewerUid 매칭 실패 → notFound() 404 발생.
    const { posts } = await postRepository.listByTypeAndStatus(
      CFG.postType,
      "published",
      { limit: 20 },
    );
    if (posts.length === 0) {
      return (
        <CommunityEmptyState
          heading={CFG.emptyCopy.heading}
          body={CFG.emptyCopy.body}
        />
      );
    }
    return <PostFeedGrid posts={posts} />;
  } catch (e) {
    console.warn("[community/tips] listByTypeAndStatus failed:", e);
    return (
      <CommunityEmptyState
        heading={CFG.emptyCopy.heading}
        body={CFG.emptyCopy.body}
      />
    );
  }
}
