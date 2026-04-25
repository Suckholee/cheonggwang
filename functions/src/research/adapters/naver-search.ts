import type { AdapterResult, RawSource } from "../types/source";
import type { Category } from "../types/shared";
import { urlHash } from "../lib/url-hash";
import { retry } from "../lib/retry";
import { NAVER_QUERIES } from "./curated-feeds";

const ENDPOINT = "https://openapi.naver.com/v1/search/blog.json";
const DISPLAY = 100;

interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  bloggerlink?: string;
  postdate?: string;
}

interface NaverBlogResponse {
  total: number;
  items: NaverBlogItem[];
}

function parsePostdate(postdate: string | undefined): Date | undefined {
  if (!postdate || postdate.length !== 8) return undefined;
  const year = Number(postdate.slice(0, 4));
  const month = Number(postdate.slice(4, 6));
  const day = Number(postdate.slice(6, 8));
  if (!year || !month || !day) return undefined;
  return new Date(Date.UTC(year, month - 1, day));
}

function stripNaverHighlight(text: string): string {
  return text.replace(/<b>/g, "").replace(/<\/b>/g, "");
}

export interface NaverCredentials {
  id: string;
  secret: string;
}

async function queryOnce(
  query: string,
  creds: NaverCredentials
): Promise<NaverBlogResponse> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(
    query
  )}&display=${DISPLAY}&sort=sim`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": creds.id,
      "X-Naver-Client-Secret": creds.secret,
    },
  });
  if (!res.ok) {
    throw new Error(`Naver API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<NaverBlogResponse>;
}

function toRawSource(item: NaverBlogItem, collectedAt: Date): RawSource {
  return {
    url: item.link,
    urlHash: urlHash(item.link),
    sourceType: "naver",
    title: stripNaverHighlight(item.title),
    snippet: stripNaverHighlight(item.description),
    tags: [],
    author: item.bloggername,
    publishedAt: parsePostdate(item.postdate),
    collectedAt,
    rawPayload: { ...item },
  };
}

export async function fetchNaverSources(
  category: Category,
  creds: NaverCredentials
): Promise<AdapterResult> {
  const queries = NAVER_QUERIES[category];
  const collectedAt = new Date();
  const sources: RawSource[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const response = await retry(() => queryOnce(q, creds));
      for (const item of response.items) {
        const hash = urlHash(item.link);
        if (seen.has(hash)) continue;
        seen.add(hash);
        sources.push(toRawSource(item, collectedAt));
      }
    } catch (e) {
      errors.push(`query "${q}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sourceType: "naver", sources, errors };
}
