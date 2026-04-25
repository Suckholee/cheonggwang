import { postRepository } from "@/lib/firebase/post-repository";
import { PANELS } from "@/lib/feed/panel-config";
import { buildRss2_0 } from "@/lib/seo/rss-builder";
import { getBaseUrl } from "@/lib/seo/base-url";

/**
 * v1.7 partner-promo · §8.5 — partners 패널 RSS 2.0.
 * publishStatus='published'만 포함 (listByTypeAndStatus 사용).
 */
export async function GET(): Promise<Response> {
  const cfg = PANELS.partners;
  const base = await getBaseUrl();
  const { posts } = await postRepository.listByTypeAndStatus(
    cfg.postType,
    "published",
    { limit: 50 },
  );
  const xml = buildRss2_0({
    title: cfg.seoTitle,
    link: `${base}/community/${cfg.slug}`,
    description: cfg.seoDescription,
    items: posts
      .filter((p) => p.slug)
      .map((p) => ({
        title: p.title,
        link: `${base}/community/p/${p.slug}`,
        description: p.summary80,
        pubDate: p.publishedAt ?? p.createdAt,
        author: p.companyName,
      })),
  });
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
