import type { AdapterResult } from "../types/source";
import type { Category } from "../types/shared";
import { TISTORY_FEEDS } from "./curated-feeds";
import { fetchFromRssFeeds } from "./rss-base";

export async function fetchTistorySources(
  category: Category
): Promise<AdapterResult> {
  return fetchFromRssFeeds(TISTORY_FEEDS[category], "tistory");
}
