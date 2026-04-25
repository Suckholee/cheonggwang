import type { MetadataRoute } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { PANELS } from "@/lib/feed/panel-config";
import { getBaseUrl } from "@/lib/seo/base-url";

/**
 * v1.6 Phase 5 — 홈 + 3패널 + 공개 posts 전수.
 *
 * Next 16 cacheComponents 모드: route segment `revalidate` 금지 → 기본 동적 렌더.
 * 사이트맵 호출은 검색엔진이 드물게 하므로 매 요청 Firestore read 1회 허용.
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

  try {
    const posts = await postRepository.listAllForSitemap(5000);
    for (const p of posts) {
      if (!p.slug) continue;
      // v1.7: published만 노출 (draft·withdrawn 제외)
      if (p.publishStatus !== "published") continue;
      entries.push({
        url: `${base}/community/p/${p.slug}`,
        lastModified: p.updatedAt ?? p.createdAt,
        priority: 0.6,
        changeFrequency: "weekly",
      });
    }
  } catch (e) {
    console.warn("[sitemap] listAllForSitemap failed, serving skeleton", e);
  }

  return entries;
}
