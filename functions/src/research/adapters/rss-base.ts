import Parser from "rss-parser";
import type { AdapterResult, RawSource, SourceType } from "../types/source";
import { urlHash } from "../lib/url-hash";
import { retry } from "../lib/retry";

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "cheonggwang-research-pipeline/1.0 (+https://cheonggwang.com)",
  },
});

interface RssItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
  categories?: string[];
  isoDate?: string;
  pubDate?: string;
}

function itemToRaw(
  item: RssItem,
  sourceType: SourceType,
  collectedAt: Date
): RawSource | null {
  if (!item.link) return null;
  const link = item.link;
  return {
    url: link,
    urlHash: urlHash(link),
    sourceType,
    title: (item.title ?? "").trim(),
    snippet: (item.contentSnippet ?? "").trim().slice(0, 500),
    body: item.content?.trim(),
    tags: item.categories ?? [],
    author: item.creator,
    publishedAt: item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : undefined,
    collectedAt,
    rawPayload: { ...item },
  };
}

export async function fetchFromRssFeeds(
  feeds: string[],
  sourceType: SourceType
): Promise<AdapterResult> {
  const collectedAt = new Date();
  const sources: RawSource[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const feedUrl of feeds) {
    try {
      const feed = await retry(() => parser.parseURL(feedUrl));
      for (const item of feed.items as RssItem[]) {
        const raw = itemToRaw(item, sourceType, collectedAt);
        if (!raw) continue;
        if (seen.has(raw.urlHash)) continue;
        seen.add(raw.urlHash);
        sources.push(raw);
      }
    } catch (e) {
      errors.push(
        `feed "${feedUrl}": ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return { sourceType, sources, errors };
}
