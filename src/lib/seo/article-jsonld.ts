import "server-only";
import type { Post } from "@/types/post";
import { getBaseUrl } from "./base-url";

/**
 * v1.7 — schema.org Article JSON-LD. 3 postType 지원: tip / provider / partner-promo.
 *
 * Rich Results Test 권장 필드:
 *   headline · description · image · datePublished · author · publisher · mainEntityOfPage
 */
export interface ArticleJsonLd {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description: string;
  image?: string[];
  datePublished: string;
  author: { "@type": "Organization" | "Person"; name: string };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: { "@type": "ImageObject"; url: string };
  };
  mainEntityOfPage: string;
}

export async function buildArticleJsonLd(post: Post): Promise<ArticleJsonLd> {
  const base = await getBaseUrl();
  // v1.7 P8: 3 postType 분기.
  // tip: 청광 발행 · provider/partner-promo: post.companyName (parsers.businessName 스냅샷)
  let authorName: string;
  switch (post.postType) {
    case "tip":
      authorName = "청광";
      break;
    case "provider":
    case "partner-promo":
      authorName = post.companyName || "청광";
      break;
  }
  const image = post.coverImageUrl ? [post.coverImageUrl] : undefined;
  // v1.7: publishedAt이 있으면 우선 사용 (재발행 시 갱신됨), 없으면 createdAt 폴백
  const datePublished = (post.publishedAt ?? post.createdAt).toISOString();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary80,
    image,
    datePublished,
    author: {
      "@type": "Organization",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "청광",
      logo: {
        "@type": "ImageObject",
        url: `${base}/favicon.ico`,
      },
    },
    mainEntityOfPage: `${base}/community/p/${post.slug}`,
  };
}
