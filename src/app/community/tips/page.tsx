import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { PostFeedGrid } from "@/components/community/PostFeedGrid";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityPageShell } from "@/components/community/CommunityPageShell";
import { TipsCategoryChips } from "@/components/community/TipsCategoryChips";
import { PANELS } from "@/lib/feed/panel-config";
import { isQuoteCategory, type QuoteCategory, QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";

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

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default function TipsPanelPage(props: PageProps) {
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

async function ChipsSlot({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const active: QuoteCategory | null =
    cat && isQuoteCategory(cat) ? cat : null;
  return <TipsCategoryChips active={active} />;
}

function FeedSkeleton() {
  return (
    <div
      className="flex flex-col divide-y divide-[#edf4ff]/60 border-t border-b border-[#edf4ff]/50 dark:divide-zinc-800 dark:border-zinc-800 animate-pulse"
      aria-label="불러오는 중"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-[22px] px-1">
          <div className="flex flex-1 flex-col min-w-0">
            <div className="h-5 w-3/4 rounded bg-[#eef5ff] dark:bg-zinc-900" />
            <div className="mt-2 h-4 w-5/6 rounded bg-[#eef5ff] dark:bg-zinc-900" />
            <div className="mt-3 h-3.5 w-1/3 rounded bg-[#eef5ff] dark:bg-zinc-900" />
          </div>
          <div className="h-24 w-24 shrink-0 rounded-[16px] bg-[#eef5ff] dark:bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}

async function FeedBody({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  await connection();
  const { cat } = await searchParams;
  const filter: QuoteCategory | null =
    cat && isQuoteCategory(cat) ? cat : null;

  try {
    // v1.7 published만 노출 (draft·withdrawn 제외)
    // 인메모리 필터링을 위해 limit를 100으로 상향
    const { posts } = await postRepository.listByTypeAndStatus(
      CFG.postType,
      "published",
      { limit: 100 },
    );
    
    const filteredPosts = filter
      ? posts.filter((p) => p.categories.includes(filter))
      : posts;

    if (filteredPosts.length === 0) {
      return (
        <CommunityEmptyState
          heading={
            filter
              ? `'${QUOTE_CATEGORY_LABELS[filter]}' 노하우 글이 아직 없어요`
              : CFG.emptyCopy.heading
          }
          body={filter ? "곧 유용한 청소 팁이 업로드될 예정입니다!" : CFG.emptyCopy.body}
        />
      );
    }
    return <PostFeedGrid posts={filteredPosts} />;
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
