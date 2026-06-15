import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { pageRepository } from "@/lib/firebase/page-repository";
import type { Category, Page } from "@/types/page";

export interface FeedFilter {
  categories?: Category[];
}

const FEED_LIMIT = 500;

/**
 * 공개 피드 페이지 전용 fetcher.
 * Cache Components: 'use cache' + cacheTag('feed') + cacheLife('minutes').
 * publishPage/savePage/saveSections/unpublishPage/deletePage Server Action에서
 * revalidateTag('feed', 'max')로 무효화된다.
 *
 * v0.2 (I5): FEED_LIMIT 도달 시 console.warn — 초과 시 레일별
 * array-contains-any 쿼리로 전환해야 한다는 운영 신호.
 */
export async function getFeedPosts(filter: FeedFilter = {}): Promise<Page[]> {
  "use cache";
  cacheTag("feed");
  cacheLife("minutes");

  const posts = await pageRepository.listPublished({
    limit: FEED_LIMIT,
  });

  if (filter.categories && filter.categories.length > 0) {
    return posts.filter((p) => filter.categories!.includes(p.category));
  }

  if (posts.length >= FEED_LIMIT) {
    console.warn(
      `[feed-service] FEED_LIMIT(${FEED_LIMIT}) reached — switch to rail-specific array-contains-any queries`
    );
  }

  return posts;
}
