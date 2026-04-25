import type { AdapterResult } from "../types/source";
import type { Category } from "../types/shared";
import { WORDPRESS_FEEDS } from "./curated-feeds";
import { fetchFromRssFeeds } from "./rss-base";

export async function fetchWordPressSources(
  category: Category
): Promise<AdapterResult> {
  return fetchFromRssFeeds(WORDPRESS_FEEDS[category], "wordpress");
}
