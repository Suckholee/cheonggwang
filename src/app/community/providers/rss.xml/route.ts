import { postRepository } from "@/lib/firebase/post-repository";
import { PANELS } from "@/lib/feed/panel-config";
import { buildRss2_0 } from "@/lib/seo/rss-builder";
import { getBaseUrl } from "@/lib/seo/base-url";

export async function GET(): Promise<Response> {
  const cfg = PANELS.providers;
  const base = await getBaseUrl();
  const { posts } = await postRepository.listByType(cfg.postType, {
    limit: 50,
  });
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
        pubDate: p.createdAt,
        author: p.companyName,
      })),
  });
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
