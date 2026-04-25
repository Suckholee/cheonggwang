import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { decodeRegionParam } from "@/domain/region";
import type { Category } from "@/types/page";
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
      <Suspense fallback={<FeedControlsSkeleton />}>
        <FeedHeader />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedBody searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function FeedHeader() {
  const jar = await cookies();
  const uid = await tryVerifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value
  );
  const authSlot = (
    <Link
      href={uid ? "/dashboard" : "/login"}
      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {uid ? "대시보드" : "로그인"}
    </Link>
  );
  return <FeedControls authSlot={authSlot} />;
}

async function FeedBody({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const region = decodeRegionParam(sp.region);
  const category = parseCategory(sp.category);
  const q = sp.q ?? "";
  return <FeedRails filter={{ region, category }} query={q} />;
}
