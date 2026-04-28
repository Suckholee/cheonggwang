import "server-only";
import type { Post } from "@/types/post";
import { getBaseUrl } from "./base-url";
import { extractFaqsFromMarkdown } from "./faq-extractor";
import {
  buildBreadcrumbListNode,
  type BreadcrumbListNode,
} from "./breadcrumb-jsonld";

/**
 * v1.7 — schema.org Article JSON-LD.
 * v1.15 cycle #28 partner-aeo-boost · §3.1, §5.1 (H5 결의):
 *   기존 단일 Article → @graph 마이그레이션. FAQPage + BreadcrumbList 통합.
 */

export interface ArticleNode {
  "@type": "Article";
  headline: string;
  description: string;
  image?: string[];
  datePublished: string;
  /** v1.15 cycle #28 (OQ4) — Post.updatedAt이 createdAt과 다르면 출력 */
  dateModified?: string;
  author: { "@type": "Organization" | "Person"; name: string };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: { "@type": "ImageObject"; url: string };
  };
  mainEntityOfPage: string;
}

export interface FaqPageNode {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export interface ArticleGraphJsonLd {
  "@context": "https://schema.org";
  "@graph": Array<ArticleNode | FaqPageNode | BreadcrumbListNode>;
}

/**
 * @deprecated v1.15 cycle #28 — use ArticleGraphJsonLd. 현재 호출자 0명 (validator 검증).
 */
export interface ArticleJsonLd extends ArticleNode {
  "@context": "https://schema.org";
}

export interface BreadcrumbContext {
  panelLabel: string;
  panelSlug: string;
}

/**
 * v1.15 cycle #28 partner-aeo-boost — @graph 통합 빌더.
 *
 * @graph items:
 *   1. Article (필수)
 *   2. FAQPage (post.format !== 'card-news' && faqs.length > 0)
 *   3. BreadcrumbList (opts.breadcrumb 제공 시)
 */
export async function buildArticleGraphJsonLd(
  post: Post,
  opts?: { breadcrumb?: BreadcrumbContext },
): Promise<ArticleGraphJsonLd> {
  const base = await getBaseUrl();
  const articleNode = buildArticleNode(post, base);
  const graph: Array<ArticleNode | FaqPageNode | BreadcrumbListNode> = [
    articleNode,
  ];

  // FAQPage — card-news는 슬라이드 형식 미적합 (M1)
  if (post.format !== "card-news") {
    const faqs = extractFaqsFromMarkdown(post.bodyMarkdown ?? "");
    if (faqs.length > 0) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }
  }

  // BreadcrumbList — community/p/[slug]에서만 (M9)
  if (opts?.breadcrumb) {
    graph.push(
      buildBreadcrumbListNode([
        { name: "청광", url: `${base}/` },
        {
          name: opts.breadcrumb.panelLabel,
          url: `${base}/community/${opts.breadcrumb.panelSlug}`,
        },
        {
          name: post.title,
          url: `${base}/community/p/${post.slug}`,
        },
      ]),
    );
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function buildArticleNode(post: Post, base: string): ArticleNode {
  // v1.7 P8: 3 postType 분기.
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
  const datePublished = (post.publishedAt ?? post.createdAt).toISOString();
  // v1.15 cycle #28 (OQ4): updatedAt이 createdAt과 다르면 dateModified 출력
  const dateModified =
    post.updatedAt && post.updatedAt.getTime() !== post.createdAt.getTime()
      ? post.updatedAt.toISOString()
      : undefined;

  return {
    "@type": "Article",
    headline: post.title,
    description: post.summary80,
    ...(image ? { image } : {}),
    datePublished,
    ...(dateModified ? { dateModified } : {}),
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

/**
 * @deprecated v1.15 cycle #28 — use buildArticleGraphJsonLd.
 * 기존 호출자(community/p/[slug]/page.tsx)가 마이그레이션될 때까지 보존.
 */
export async function buildArticleJsonLd(post: Post): Promise<ArticleJsonLd> {
  const base = await getBaseUrl();
  return {
    "@context": "https://schema.org",
    ...buildArticleNode(post, base),
  };
}
