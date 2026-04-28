import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { postRepository } from "@/lib/firebase/post-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { PostDetailView } from "@/components/community/PostDetailView";
import { PostProviderInfoCard } from "@/components/community/PostProviderInfoCard";
import { QuoteCTAButton } from "@/components/community/QuoteCTAButton";
import { buildArticleGraphJsonLd } from "@/lib/seo/article-jsonld";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import {
  postTypeToPanelSlug,
  panelLabelForPost,
} from "@/lib/feed/post-panel";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v1.6 Phase 5 — 정적 기본 메타데이터.
 * 동적 title/description/og는 PostBody 내부에서 React 19 metadata hoisting 으로 주입.
 * (Next 16 cacheComponents 는 uncached 데이터의 generateMetadata 사용을 막음)
 */
export const metadata: Metadata = {
  title: "포스트 · 청광",
};

export default function PostBySlugPage(props: PageProps) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-24">
      <Suspense fallback={<PostSkeleton />}>
        <PostBody params={props.params} />
      </Suspense>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="aspect-[16/10] w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

/**
 * Next 16 Turbopack이 한국어 동적 세그먼트를 URL-encoded(`%EC%9A%A9...`) 로 전달하는 것을 확인.
 * Firestore slug는 디코드된 상태로 저장되므로 반드시 `decodeURIComponent` 필요.
 */
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function PostBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const post = await postRepository.findBySlug(slug);
  if (!post) notFound();

  // v1.7 Design §3.3 — publishStatus !== 'published' 시 본인만 접근 (preview 모드).
  // 그 외 (비로그인·다른 파트너·일반 사용자)는 404로 떨어뜨려 비공개 글의 존재 자체를 숨김.
  let isPreview = false;
  if (post.publishStatus !== "published") {
    const jar = await cookies();
    const viewerUid = await tryVerifySessionCookie(
      jar.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!viewerUid || viewerUid !== post.providerOwnerUid) {
      notFound();
    }
    isPreview = true;
  }

  // C3: provider/tip 포스트는 기존 info card + CTA 보존.
  const showProviderBlock =
    (post.postType === "provider" || post.postType === "tip") &&
    post.providerId &&
    post.providerId !== "customer";
  const provider = showProviderBlock
    ? await providerRepository.get(post.providerId)
    : null;

  const panelSlug = postTypeToPanelSlug(post.postType);
  const panelLabel = panelLabelForPost(post);
  const jsonLd = await buildArticleGraphJsonLd(post, {
    breadcrumb: { panelLabel, panelSlug },
  });

  return (
    <div className="space-y-6">
      {/* React 19 metadata hoisting: <head>로 자동 이동 */}
      <title>{`${post.title} · 청광`}</title>
      <meta name="description" content={post.summary80} />
      <link rel="canonical" href={`/community/p/${post.slug}`} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.summary80} />
      <meta property="og:type" content="article" />
      {/* v1.7: 비공개 글의 미리보기는 검색엔진 인덱싱 차단. */}
      {isPreview && <meta name="robots" content="noindex, nofollow" />}
      {post.coverImageUrl && (
        <meta property="og:image" content={post.coverImageUrl} />
      )}
      <JsonLdScript data={jsonLd} />
      {/* v1.15 cycle #28 hotfix — 뒤로 가기 nav. 패널별로 다른 라벨 표시. */}
      <Link
        href={`/community/${panelSlug}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{panelLabel}</span>
      </Link>
      {isPreview && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          {post.publishStatus === "draft"
            ? "📝 초고 미리보기 — 발행 전에는 다른 사용자에게 보이지 않습니다."
            : "🚫 철회된 글 — 본인만 볼 수 있습니다. 다시 발행하면 공개됩니다."}
        </div>
      )}
      <PostDetailView post={post} />
      {provider && <PostProviderInfoCard provider={provider} />}
      {showProviderBlock && (
        <QuoteCTAButton
          providerId={post.providerId}
          category={post.categories[0] ?? "move-in"}
        />
      )}
    </div>
  );
}
