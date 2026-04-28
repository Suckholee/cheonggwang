import type { MetadataRoute } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { pageRepository } from "@/lib/firebase/page-repository";
import { PANELS } from "@/lib/feed/panel-config";
import { getBaseUrl } from "@/lib/seo/base-url";

/**
 * v1.6 Phase 5 — 홈 + 3패널 + 공개 posts 전수.
 * v1.15 cycle #28 partner-aeo-boost · §3.5 (H4, M3, M8 결의):
 *   매장 페이지(/p/[slug]) 추가 + image:image 태그 + pages/posts 별도 try/catch.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getBaseUrl();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      priority: 1.0,
      changeFrequency: "weekly",
    },
  ];

  for (const cfg of Object.values(PANELS)) {
    entries.push({
      url: `${base}/community/${cfg.slug}`,
      priority: 0.8,
      changeFrequency: "daily",
    });
  }

  // 매장 페이지 (Page 모델, /p/[slug]) — H4 결의
  try {
    const pages = await pageRepository.listPublishedSlugsForSitemap(5000);
    for (const p of pages) {
      entries.push({
        url: `${base}/p/${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt,
        priority: 0.7,
        changeFrequency: "weekly",
      });
    }
  } catch (e) {
    console.warn("[sitemap] listPublishedSlugsForSitemap failed", e);
  }

  // 공개 posts — M3: images string[]
  try {
    const posts = await postRepository.listAllForSitemap(5000);
    for (const p of posts) {
      if (!p.slug) continue;
      if (p.publishStatus !== "published") continue;
      entries.push({
        url: `${base}/community/p/${p.slug}`,
        lastModified: p.updatedAt ?? p.createdAt,
        priority: 0.6,
        changeFrequency: "weekly",
        ...(p.coverImageUrl ? { images: [p.coverImageUrl] } : {}),
      });
    }
  } catch (e) {
    console.warn("[sitemap] listAllForSitemap failed", e);
  }

  return entries;
}
