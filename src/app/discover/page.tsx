import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { decodeRegionParam } from "@/domain/region";
import type { Category, Region } from "@/types/page";
import { FeedControls } from "@/components/feed/FeedControls";
import { FeedRails } from "@/components/feed/FeedRails";
import {
  FeedSkeleton,
  FeedControlsSkeleton,
} from "@/components/feed/FeedSkeleton";

type SearchParams = {
  region?: string;
  category?: string;
  q?: string;
};

function parseCategory(raw: string | undefined): Category | "all" {
  if (raw === "restaurant" || raw === "salon" || raw === "cafe") return raw;
  return "all";
}

export const metadata = {
  title: "청광 피드 — 우리 동네 좋은 곳",
  description:
    "지역·컨셉·시간대별로 엄선된 맛집·미용실·카페 게시글을 모아봅니다.",
};

export default function DiscoverPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <FeedControls />
      <Suspense fallback={<FeedSkeleton />}>
        <FeedBody searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function FeedBody({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  
  // Decode comma-separated regions
  const regionParams = sp.region ? sp.region.split(",") : [];
  const regions = regionParams
    .map(decodeRegionParam)
    .filter((r): r is Region => r !== null);

  // Decode comma-separated categories
  const categoryParams = sp.category ? sp.category.split(",") : [];
  const categories = categoryParams
    .map(parseCategory)
    .filter((c): c is Category => c !== "all");

  const q = sp.q ?? "";
  return <FeedRails filter={{ regions, categories }} query={q} />;
}
