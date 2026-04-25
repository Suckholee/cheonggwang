import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/base-url";

/**
 * v1.6 Phase 5 — robots.txt.
 * 공개 경로만 허용 · 개인/인증 영역 차단.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/provider/",
          "/partner/",
          "/received/",
          "/chat/",
          "/dashboard/",
          "/editor/",
          "/quote/",
          "/stories/",
          "/sample-accounts",
          "/login",
          "/signup-provider",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
