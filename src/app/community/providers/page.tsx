import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { PostFeedGrid } from "@/components/community/PostFeedGrid";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { ProvidersSubcategoryChips } from "@/components/community/ProvidersSubcategoryChips";
import { CommunityPageShell } from "@/components/community/CommunityPageShell";
import {
  PANELS,
  PROVIDERS_SUBCATEGORIES,
  isProviderStoryCategory,
} from "@/lib/feed/panel-config";
import type { ProviderStoryCategory } from "@/types/post";

const CFG = PANELS.providers;

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

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default function ProvidersPanelPage(props: PageProps) {
  return (
    <CommunityPageShell
      active={CFG.slug}
      title={CFG.label}
      tagline={CFG.tagline}
    >
      <div className="space-y-4">
        <Suspense fallback={null}>
          <ChipsSlot searchParams={props.searchParams} />
        </Suspense>
        <Suspense fallback={<FeedSkeleton />}>
          <FeedBody searchParams={props.searchParams} />
        </Suspense>
      </div>
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

async function ChipsSlot({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const active: ProviderStoryCategory | null =
    cat && isProviderStoryCategory(cat) ? cat : null;
  return <ProvidersSubcategoryChips active={active} />;
}

async function FeedBody({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  await connection();
  const { cat } = await searchParams;
  const filter: ProviderStoryCategory | null =
    cat && isProviderStoryCategory(cat) ? cat : null;
  try {
    const page = filter
      ? await postRepository.listByTypeAndStoryCategory(
          CFG.postType,
          filter,
          { limit: 20 },
        )
      : await postRepository.listByType(CFG.postType, { limit: 20 });
    if (page.posts.length === 0) {
      if (filter) {
        const sub = PROVIDERS_SUBCATEGORIES.find((s) => s.slug === filter);
        return (
          <CommunityEmptyState
            heading={`아직 '${sub?.label}' 글이 없어요`}
            body={sub?.description ?? ""}
          />
        );
      }
      return (
        <CommunityEmptyState
          heading={CFG.emptyCopy.heading}
          body={CFG.emptyCopy.body}
        />
      );
    }
    return <PostFeedGrid posts={page.posts} />;
  } catch (e) {
    console.warn("[community/providers] listBy* failed:", e);
    return (
      <CommunityEmptyState
        heading={CFG.emptyCopy.heading}
        body={CFG.emptyCopy.body}
      />
    );
  }
}
