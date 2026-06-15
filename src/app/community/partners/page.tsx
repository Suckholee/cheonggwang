import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { PostFeedGrid } from "@/components/community/PostFeedGrid";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityPageShell } from "@/components/community/CommunityPageShell";
import { PANELS } from "@/lib/feed/panel-config";

const CFG = PANELS.partners;

export const metadata: Metadata = {
  title: CFG.seoTitle,
  description: CFG.seoDescription,
  openGraph: {
    title: CFG.label,
    description: CFG.seoDescription,
    type: "website",
    url: `/community/${CFG.slug}`,
  },
  alternates: {
    canonical: `/community/${CFG.slug}`,
    types: {
      "application/rss+xml": `/community/${CFG.slug}/rss.xml`,
    },
  },
};

export default function PartnersPanelPage() {
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
      className="flex flex-col divide-y divide-[#edf4ff]/60 border-t border-b border-[#edf4ff]/50 dark:divide-zinc-800 dark:border-zinc-800 animate-pulse"
      aria-label="불러오는 중"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-5 px-1">
          <div className="flex flex-1 flex-col min-w-0">
            <div className="h-5 w-3/4 rounded bg-[#eef5ff] dark:bg-zinc-900" />
            <div className="mt-2 h-4 w-5/6 rounded bg-[#eef5ff] dark:bg-zinc-900" />
            <div className="mt-3.5 h-3.5 w-1/3 rounded bg-[#eef5ff] dark:bg-zinc-900" />
          </div>
          <div className="h-20 w-20 shrink-0 rounded-[16px] bg-[#eef5ff] dark:bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}

async function FeedBody() {
  await connection();
  try {
    // v1.7: published만 노출 (draft·withdrawn 제외)
    const page = await postRepository.listByTypeAndStatus(
      CFG.postType,
      "published",
      { limit: 20 },
    );
    if (page.posts.length === 0) {
      return (
        <CommunityEmptyState
          heading={CFG.emptyCopy.heading}
          body={CFG.emptyCopy.body}
        />
      );
    }
    return <PostFeedGrid posts={page.posts} />;
  } catch (e) {
    console.warn("[community/partners] listByTypeAndStatus failed:", e);
    return (
      <CommunityEmptyState
        heading={CFG.emptyCopy.heading}
        body={CFG.emptyCopy.body}
      />
    );
  }
}
